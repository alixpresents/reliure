import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// A) Claude Haiku — métadonnées de base
// ---------------------------------------------------------------------------
async function fetchFromHaiku(
  title: string,
  author: string,
  isbn13: string | null,
) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const prompt = `Tu es une base de données littéraire exhaustive.
Pour le livre "${title}" de "${author}"${isbn13 ? ` (ISBN: ${isbn13})` : ""},
retourne UNIQUEMENT un JSON valide sans markdown, sans explication :
{
  "title": "titre exact canonique",
  "author": "prénom nom de l'auteur principal",
  "isbn13": "ISBN-13 le plus probable (null si inconnu)",
  "publication_year": 1984,
  "publisher": "éditeur de référence francophone si dispo, sinon éditeur original",
  "page_count": 320,
  "description": "résumé sobre de 80-120 mots en français, sans spoiler",
  "genres": ["Roman", "Littérature française"],
  "language": "fr",
  "confidence": 0.95
}
Règles :
- Si le livre est traduit, donner l'éditeur de la traduction française de référence
- description toujours en français
- genres : entre 1 et 4 valeurs, utiliser des genres littéraires précis
- confidence : 1.0 si tu es certain, < 0.7 si tu estimes/inventes
- Ne jamais inventer un ISBN — mettre null si incertain`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        temperature: 0,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Haiku API error:", res.status);
      return null;
    }

    const data = await res.json();
    const text =
      data.content?.[0]?.type === "text" ? data.content[0].text : "";
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Haiku error:", (e as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// B) Open Library — confirmation + OLID
// ---------------------------------------------------------------------------
interface OLResult {
  title: string | null;
  author: string | null;
  isbn13: string | null;
  cover_i: number | null;
  page_count: number | null;
  publisher: string | null;
}

async function fetchOpenLibrary(
  title: string,
  author: string,
): Promise<OLResult | null> {
  try {
    const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=3&lang=fre`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return null;

    const isbns: string[] = doc.isbn || [];
    const isbn13 = isbns.find((i: string) => i.length === 13) || null;

    return {
      title: doc.title || null,
      author: doc.author_name?.[0] || null,
      isbn13,
      cover_i: doc.cover_i || null,
      page_count: doc.number_of_pages_median || null,
      publisher: doc.publisher?.[0] || null,
    };
  } catch (e) {
    console.error("Open Library error:", (e as Error).message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// C) Couverture — cascade de 4 sources
// ---------------------------------------------------------------------------
async function findCover(
  isbn13: string | null,
  coverId: number | null,
  title: string,
  author: string,
): Promise<string | null> {
  const candidates: string[] = [];

  // 1. Open Library par ISBN
  if (isbn13) {
    candidates.push(
      `https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`,
    );
  }

  // 1b. Open Library par cover_i (du search initial)
  if (coverId) {
    candidates.push(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`);
  }

  // 2. BnF par ISBN
  if (isbn13) {
    candidates.push(`https://couverture.bnf.fr/ark/isbn/${isbn13}`);
  }

  // 3. Open Library search par titre+auteur → cover_i
  try {
    const olRes = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (olRes.ok) {
      const olData = await olRes.json();
      const searchCoverId = olData.docs?.[0]?.cover_i;
      if (searchCoverId && searchCoverId !== coverId) {
        candidates.push(
          `https://covers.openlibrary.org/b/id/${searchCoverId}-L.jpg`,
        );
      }
    }
  } catch {
    // Ne pas bloquer la cascade
  }

  // 4. Google Books en dernier recours
  if (isbn13) {
    candidates.push(
      `https://books.google.com/books/content?vid=ISBN${isbn13}&printsec=frontcover&img=1&zoom=2`,
    );
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.startsWith("image")) {
        return url;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// D) Fusion et réponse
// ---------------------------------------------------------------------------
function pick<T>(...values: (T | null | undefined)[]): T | null {
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    return v;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const { title, author, isbn13 } = await req.json();

    if (!title) {
      return Response.json(
        { error: "title required" },
        { status: 400, headers: getCorsHeaders(req) },
      );
    }

    const authorStr = author || "inconnu";

    // A) Claude Haiku
    const aiData = await fetchFromHaiku(title, authorStr, isbn13 || null);

    // B) Open Library (utilise le titre IA si disponible, sinon l'original)
    const olTitle = aiData?.title || title;
    const olAuthor = aiData?.author || authorStr;
    const olData = await fetchOpenLibrary(olTitle, olAuthor);

    // C) Couverture — cascade
    const bestIsbn = pick(
      olData?.isbn13,
      aiData?.confidence > 0.8 ? aiData?.isbn13 : null,
      isbn13,
    );
    const coverUrl = await findCover(bestIsbn, olData?.cover_i || null, aiData?.title || title, aiData?.author || authorStr);

    // D) Fusion
    const confidence = aiData?.confidence ?? 0.5;

    const result = {
      title: pick(aiData?.title, olData?.title) || title,
      author: pick(aiData?.author, olData?.author) || authorStr,
      isbn13: bestIsbn,
      publisher: pick(aiData?.publisher, olData?.publisher),
      publication_date: aiData?.publication_year
        ? String(aiData.publication_year)
        : null,
      description: aiData?.description || null,
      cover_url: coverUrl,
      page_count: pick(olData?.page_count, aiData?.page_count),
      genres: aiData?.genres || [],
      language: aiData?.language || "fr",
      source: "ai_enriched",
      ai_confidence: confidence,
      ...(confidence < 0.7 ? { uncertain: true } : {}),
    };

    console.log(
      `[book_ai_enrich] "${title}" → confidence:${confidence} cover:${!!coverUrl} isbn:${bestIsbn}`,
    );

    return Response.json(result, { headers: getCorsHeaders(req) });
  } catch (err) {
    console.error("book_ai_enrich error:", err);
    return Response.json(
      { error: (err as Error).message },
      { status: 500, headers: getCorsHeaders(req) },
    );
  }
});
