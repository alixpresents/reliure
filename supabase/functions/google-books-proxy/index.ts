import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

function normalizeQuery(q: string): string {
  return q.toLowerCase().trim().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

const KEYS = [
  Deno.env.get("GOOGLE_BOOKS_KEY_1"),
  Deno.env.get("GOOGLE_BOOKS_KEY_2"),
  Deno.env.get("GOOGLE_BOOKS_KEY_3"),
].filter(Boolean) as string[];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return Response.json({ items: [] }, { headers: getCorsHeaders(req) });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cacheKey = "gb:" + normalizeQuery(query);

    // Check cache (6h TTL)
    const { data: cached } = await supabase
      .from("search_cache")
      .select("response")
      .eq("query_normalized", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached) {
      return Response.json(cached.response, { headers: getCorsHeaders(req) });
    }

    // Try each key, then anonymous
    const enc = encodeURIComponent(query.trim());
    const base = `https://www.googleapis.com/books/v1/volumes?q=${enc}&orderBy=relevance&printType=books&maxResults=15&langRestrict=fr`;

    let response = null;
    for (const key of KEYS) {
      const res = await fetch(`${base}&key=${key}`, { signal: AbortSignal.timeout(5000) });
      if (res.status === 429) continue;
      if (res.ok) {
        response = await res.json();
        break;
      }
    }

    // Fallback: anonymous (IP-based quota)
    if (!response) {
      const res = await fetch(base, { signal: AbortSignal.timeout(5000) });
      if (res.status === 429) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 429,
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }
      if (res.ok) response = await res.json();
    }

    const result = response || { items: [] };

    // Cache for 6 hours (fire-and-forget)
    supabase.from("search_cache").upsert({
      query_normalized: cacheKey,
      response: result,
      hit_count: 1,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }).then(() => {});

    return Response.json(result, { headers: getCorsHeaders(req) });
  } catch (error) {
    console.error("google-books-proxy error:", error);
    return Response.json({ items: [] }, { status: 200, headers: getCorsHeaders(req) });
  }
});
