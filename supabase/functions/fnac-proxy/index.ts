import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: getCorsHeaders(req) });
  }

  try {
    const { query } = await req.json();
    if (!query || query.trim().length < 2) {
      return new Response("", {
        status: 200,
        headers: { ...getCorsHeaders(req), "Content-Type": "text/plain" },
      });
    }

    console.log("fnac-proxy: received query", query);

    const url = `https://www.fnac.com/SearchResult/ResultList.aspx?Search=${encodeURIComponent(query.trim())}&sft=1&sa=0`;

    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    console.log("fnac-proxy: fetch status", res.status);

    if (res.status !== 200) {
      return Response.json(
        { error: res.status, html: "" },
        { status: 200, headers: getCorsHeaders(req) },
      );
    }

    const html = await res.text();

    console.log("fnac-proxy: html length", html.length);

    return new Response(html, {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("fnac-proxy error:", error);
    return new Response("", {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "text/plain" },
    });
  }
});
