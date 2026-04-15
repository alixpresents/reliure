// TEST CURL :
// curl -X POST https://surapdwhffynilpwdlkx.supabase.co/functions/v1/dilicom-search \
//   -H "Content-Type: application/json" \
//   -d '{"query": "Proust"}'
// curl -X POST https://surapdwhffynilpwdlkx.supabase.co/functions/v1/dilicom-search \
//   -H "Content-Type: application/json" \
//   -d '{"isbn": "9782070360024"}'

import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// SOAP envelope builders
// ---------------------------------------------------------------------------

function buildSoapEnvelope(
  login: string,
  password: string,
  opts: { isbn?: string; query?: string; page?: number; limit?: number; forceQuickSearch?: boolean },
): string {
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 10, 30);

  let searchClause: string;
  if (opts.isbn) {
    searchClause = `<def:advancedSearch><def:GTIN13>${opts.isbn}</def:GTIN13></def:advancedSearch>`;
  } else {
    const query = opts.query!;
    const wordCount = query.trim().split(/\s+/).length;
    if (wordCount <= 4 && !opts.forceQuickSearch) {
      // Requête courte → advancedSearch titre (évite matchs sur descriptions)
      searchClause = `<def:advancedSearch><def:title>${escapeXml(query)}</def:title></def:advancedSearch>`;
    } else {
      // Requête longue ou fallback → quickSearch (titre + auteur + thème + description)
      searchClause = `<def:quickSearch>${escapeXml(query)}</def:quickSearch>`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:def="http://fel-dlc-sne.dilicom.net/definitions/">
  <soapenv:Header/>
  <soapenv:Body>
    <def:WebSearchRequest>
      <def:login>${login}</def:login>
      <def:password>${password}</def:password>
      <def:pagination>
        <def:nbResultsPerPage>${limit}</def:nbResultsPerPage>
        <def:currentPage>${page}</def:currentPage>
        <def:sortBy>RELEVANCE</def:sortBy>
        <def:sortOrder>ASCENDING</def:sortOrder>
        <def:includeNotice>true</def:includeNotice>
      </def:pagination>
      <def:catalog>MAT</def:catalog>
      <def:availabilityFilter>ALL</def:availabilityFilter>
      ${searchClause}
    </def:WebSearchRequest>
  </soapenv:Body>
</soapenv:Envelope>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------------------------------------------------------------------
// HTML entity decoding + strip (descriptions Dilicom contiennent du HTML encodé)
// ---------------------------------------------------------------------------

function decodeHtmlEntities(str: string | null): string | null {
  if (!str) return null;

  function decodeOnce(s: string): string {
    return s
      .replace(/&amp;([a-z]+;)/gi, "&$1")
      .replace(/&amp;#(\d+);/g, "&#$1;")
      .replace(/&eacute;/g, "é").replace(/&egrave;/g, "è")
      .replace(/&ecirc;/g, "ê").replace(/&euml;/g, "ë")
      .replace(/&ocirc;/g, "ô").replace(/&iuml;/g, "ï")
      .replace(/&icirc;/g, "î").replace(/&agrave;/g, "à")
      .replace(/&acirc;/g, "â").replace(/&ugrave;/g, "ù")
      .replace(/&ucirc;/g, "û").replace(/&ccedil;/g, "ç")
      .replace(/&rsquo;/g, "\u2019").replace(/&lsquo;/g, "\u2018")
      .replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
      .replace(/&hellip;/g, "…").replace(/&mdash;/g, "—")
      .replace(/&ndash;/g, "–").replace(/&nbsp;/g, " ")
      .replace(/&Eacute;/g, "É").replace(/&Egrave;/g, "È")
      .replace(/&Ecirc;/g, "Ê").replace(/&Agrave;/g, "À")
      .replace(/&Ccedil;/g, "Ç")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (_: string, code: string) =>
        String.fromCharCode(parseInt(code)));
  }

  let result = decodeOnce(str);
  if (/&[a-z]+;/i.test(result) || /&#\d+;/.test(result)) {
    result = decodeOnce(result);
  }
  return result;
}

function stripHtml(str: string | null): string | null {
  if (!str) return null;
  return decodeHtmlEntities(str)!
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// Regex-based XML parsing (reliable in Deno Edge Functions)
// ---------------------------------------------------------------------------

/** Extract text content of a tag, namespace-agnostic */
function tag(xml: string, name: string): string | null {
  // Match <ns2:name>content</ns2:name> or <name>content</name>
  const re = new RegExp(`<(?:[\\w-]+:)?${name}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${name}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Extract all occurrences of a tag block */
function tagAll(xml: string, name: string): string[] {
  const re = new RegExp(`<(?:[\\w-]+:)?${name}[^>]*>[\\s\\S]*?<\\/(?:[\\w-]+:)?${name}>`, "gi");
  return xml.match(re) || [];
}

/** Extract attribute value from an opening tag */
function attr(tagBlock: string, attrName: string): string | null {
  const re = new RegExp(`${attrName}="([^"]*)"`, "i");
  const m = tagBlock.match(re);
  return m ? m[1] : null;
}

interface DilicomResult {
  isbn: string | null;
  title: string | null;
  subtitle: string | null;
  authors: string[];
  publisher: string | null;
  publicationDate: string | null;
  description: string | null;
  coverLarge: string | null;
  coverMedium: string | null;
  coverSmall: string | null;
  pages: number | null;
  clilLabel: string | null;
  clilCode: string | null;
  language: string | null;
  price: string | null;
  availability: string | null;
  distributor: string | null;
  source: "dilicom";
}

function parseResults(xml: string): { total: number; results: DilicomResult[] } {
  // Total from paginationRs > nbFoundResults
  const paginationBlock = tag(xml, "paginationRs") || "";
  const total = parseInt(tag(paginationBlock, "nbFoundResults") || "0") || 0;

  // Each product is wrapped in <ns2:begin>...</ns2:begin>
  const products = tagAll(xml, "begin");
  const results: DilicomResult[] = [];

  for (const prod of products) {
    // Product info (nested in <product>)
    const productBlock = tag(prod, "product") || prod;
    const isbn = tag(productBlock, "GTIN13");
    const title = decodeHtmlEntities(tag(productBlock, "title"));
    if (!title) continue;

    const publisher = tag(productBlock, "imprintName");

    // Authors: contributorRole with Description="Auteur"
    const contributorBlocks = tagAll(prod, "contributorRole");
    const authors: string[] = [];
    for (const cb of contributorBlocks) {
      if (attr(cb, "Description") === "Auteur") {
        const prenom = tag(cb, "nameBeforeKey") || "";
        const nom = tag(cb, "keyName") || "";
        const full = [prenom, nom].filter(Boolean).join(" ");
        if (full) authors.push(full);
      }
    }

    // Subject/CLIL
    const clilRaw = tag(prod, "level2-codeClil") || "";
    const clilMatch = clilRaw.match(/\((\d+)\)/);
    const clilCode = clilMatch ? clilMatch[1] : null;
    const clilLabel = clilRaw.replace(/\s*\(\d+\)/, "").trim() || null;

    const language = tag(prod, "language");

    // Covers & description (inside supportingResource)
    const coverLarge = tag(prod, "frontCoverLarge");
    const coverMedium = tag(prod, "frontCoverMedium");
    const coverSmall = tag(prod, "frontCoverSmall");
    const description = stripHtml(tag(prod, "description"));

    // Descriptive detail
    const pagesRaw = tag(prod, "pagesNumber");
    const pages = pagesRaw ? parseInt(pagesRaw) || null : null;

    // Supply detail
    const publicationDate = tag(prod, "publicationDate");
    const availability = tag(prod, "productAvailability");
    const distributor = tag(prod, "supplierName");

    // Price
    const priceRaw = tag(prod, "priceAmount") || "";
    const priceMatch = priceRaw.match(/([\d.,]+)/);
    const price = priceMatch ? priceMatch[1].replace(",", ".") : null;

    results.push({
      isbn,
      title,
      subtitle: decodeHtmlEntities(tag(productBlock, "subTitle")),
      authors,
      publisher,
      publicationDate,
      description,
      coverLarge,
      coverMedium,
      coverSmall,
      pages,
      clilLabel,
      clilCode,
      language,
      price,
      availability,
      distributor,
      source: "dilicom",
    });
  }

  return { total, results };
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const { query, isbn, page, limit } = await req.json();

    if (!query && !isbn) {
      return new Response(
        JSON.stringify({ error: "query or isbn required" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // ── Cache lookup (6h TTL) ──
    const cacheKey = `dilicom:${isbn || query.trim().toLowerCase()}`;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cached } = await supabase
      .from("search_cache")
      .select("response, hit_count")
      .eq("query_normalized", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (cached?.response) {
      supabase
        .from("search_cache")
        .update({ hit_count: (cached.hit_count || 0) + 1 })
        .eq("query_normalized", cacheKey)
        .then(null, () => {});
      console.log(`[dilicom-search] CACHE HIT: ${cacheKey}`);
      return new Response(
        JSON.stringify(cached.response),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    const login = Deno.env.get("DILICOM_LOGIN");
    const password = Deno.env.get("DILICOM_PASSWORD");

    if (!login || !password) {
      console.error("[dilicom-search] Missing DILICOM_LOGIN or DILICOM_PASSWORD");
      return new Response(
        JSON.stringify({ total: 0, results: [] }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    async function callDilicom(forceQuickSearch = false) {
      const soap = buildSoapEnvelope(login, password, {
        isbn: isbn || undefined,
        query: isbn ? undefined : query,
        page: page || 1,
        limit: limit || 10,
        forceQuickSearch,
      });

      const res = await fetch("https://search-fel.centprod.com/v2/search-fel", {
        method: "POST",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          "SOAPAction": "",
        },
        body: soap,
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) {
        console.error(`[dilicom-search] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
        return null;
      }

      // Handle possible latin-1 encoding
      const buffer = await res.arrayBuffer();
      let text: string;
      try {
        text = new TextDecoder("utf-8").decode(buffer);
        if (text.includes("\u00c3\u00a9") || text.includes("\u00c3\u00a8") || text.includes("\u00c3\u00a0")) {
          text = new TextDecoder("latin1").decode(buffer);
        }
      } catch {
        text = new TextDecoder("latin1").decode(buffer);
      }

      return parseResults(text);
    }

    let parsed = await callDilicom();

    if (!parsed) {
      return new Response(
        JSON.stringify({ total: 0, results: [] }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
      );
    }

    // Fallback: advancedSearch titre → 0 résultats → retry quickSearch
    const wordCount = query ? query.trim().split(/\s+/).length : 0;
    if (!isbn && parsed.results.length === 0 && wordCount <= 4) {
      console.log(`[dilicom-search] advancedSearch 0 results for "${query}", fallback quickSearch`);
      const fallback = await callDilicom(true);
      if (fallback && fallback.results.length > 0) {
        parsed = fallback;
      }
    }

    console.log(`[dilicom-search] ${isbn ? `ISBN:${isbn}` : `q:"${query}"`} → ${parsed.results.length} results (total: ${parsed.total})`);

    const responseBody = { total: parsed.total, page: page || 1, results: parsed.results };

    // ── Cache write (6h TTL, fire-and-forget) ──
    supabase.from("search_cache").upsert({
      query_normalized: cacheKey,
      response: responseBody,
      hit_count: 1,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }).then(null, () => {});

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[dilicom-search] error:", (err as Error).message);
    return new Response(
      JSON.stringify({ total: 0, results: [] }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } },
    );
  }
});
