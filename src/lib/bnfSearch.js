/**
 * Recherche de livres via l'API SRU du Catalogue général de la BnF.
 * Documentation : https://api.bnf.fr/fr/api-sru-catalogue-general
 *
 * Retourne des objets au format { _source: 'bnf', volumeInfo: {...} }
 * compatibles avec le pipeline de scoring de googleBooks.js.
 */

const BNF_SRU_BASE = "https://catalogue.bnf.fr/api/SRU";

function buildSRUQuery(query) {
  const words = query.trim().split(/\s+/);
  let cql =
    words.length === 1
      ? `(bib.title all "${query}") or (bib.author all "${query}")`
      : `(bib.title all "${query}")`;
  // Livres imprimés uniquement (doctype "a" = monographie)
  return `(${cql}) and (bib.doctype any "a")`;
}

function parseDublinCoreXML(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const DC_NS = "http://purl.org/dc/elements/1.1/";

  const getField = (recordData, localName) => {
    const els = recordData.getElementsByTagNameNS(DC_NS, localName);
    return els[0]?.textContent?.trim() || null;
  };

  const getAllFields = (recordData, localName) => {
    const els = recordData.getElementsByTagNameNS(DC_NS, localName);
    return Array.from(els)
      .map((el) => el.textContent?.trim())
      .filter(Boolean);
  };

  const results = [];

  for (const record of doc.querySelectorAll("record")) {
    const recordData = record.querySelector("recordData");
    if (!recordData) continue;

    const title = getField(recordData, "title");
    if (!title) continue;

    const creators = getAllFields(recordData, "creator");
    const publisher = getField(recordData, "publisher");
    const date = getField(recordData, "date");
    const language = getField(recordData, "language");
    const format = getField(recordData, "format");
    const identifiers = getAllFields(recordData, "identifier");

    // Extraire l'ISBN depuis dc:identifier
    let isbn = null;
    for (const id of identifiers) {
      const m = id.match(/(?:ISBN\s*)?(\d{13}|\d{10}|\d[\d-]{10,})/i);
      if (m) {
        isbn = m[1].replace(/-/g, "");
        if (isbn.length === 13) break; // Préférer ISBN-13
      }
    }

    // Nombre de pages depuis dc:format ("160 p.")
    let pageCount = null;
    if (format) {
      const m = format.match(/(\d+)\s*p/);
      if (m) pageCount = parseInt(m[1]);
    }

    // Couverture via le service BnF (peut retourner 404 — Img gère le fallback)
    const coverUrl = isbn
      ? `https://couverture.bnf.fr/ark/isbn/${isbn}`
      : null;

    results.push({
      _source: "bnf",
      volumeInfo: {
        title,
        authors: creators.length > 0 ? creators : undefined,
        publisher: publisher || undefined,
        publishedDate: date || undefined,
        language: language || "fr",
        pageCount: pageCount || undefined,
        industryIdentifiers: isbn
          ? [{ type: isbn.length === 13 ? "ISBN_13" : "ISBN_10", identifier: isbn }]
          : undefined,
        imageLinks: coverUrl ? { thumbnail: coverUrl } : undefined,
      },
    });
  }

  return results;
}

/**
 * Recherche dans le catalogue BnF via SRU.
 * Timeout 3s, retourne [] en cas d'erreur (ne bloque jamais la recherche principale).
 */
export async function searchBnF(query, maxResults = 10) {
  if (!query || query.trim().length < 2) return [];

  try {
    const params = new URLSearchParams({
      version: "1.2",
      operation: "searchRetrieve",
      query: buildSRUQuery(query),
      recordSchema: "dublincore",
      maximumRecords: String(maxResults),
    });

    const res = await fetch(`${BNF_SRU_BASE}?${params}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return [];

    return parseDublinCoreXML(await res.text());
  } catch (err) {
    console.warn("BnF SRU search failed:", err.message);
    return [];
  }
}
