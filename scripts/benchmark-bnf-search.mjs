#!/usr/bin/env node

/**
 * Benchmark BnF SRU en recherche titre libre
 *
 * Teste les mêmes 30 queries que le benchmark Open Library.
 * Parse le Dublin Core (comme bnfSearch.js côté client).
 *
 * Usage: node scripts/benchmark-bnf-search.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

function norm(s) {
  return (s || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function titleMatch(result, expected) {
  const rn = norm(result);
  const en = norm(expected);
  if (rn === en) return true;
  if (rn.includes(en) || en.includes(rn)) return true;
  const rTokens = rn.split(" ");
  const eTokens = en.split(" ").filter(t => t.length > 2);
  if (eTokens.length === 0) return rn === en;
  const overlap = eTokens.filter(t => rTokens.some(rt => rt.includes(t) || t.includes(rt))).length;
  return overlap / eTokens.length >= 0.8;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// BnF SRU parser (adapted from bnfSearch.js + book_import UNIMARC)
// ═══════════════════════════════════════════════

const BNF_SRU_BASE = "https://catalogue.bnf.fr/api/SRU";

function cleanTitle(raw) {
  return raw.split(/ : | \/ /)[0].trim();
}

function cleanAuthor(raw) {
  let s = raw.replace(/\.\s+.+$/, "").trim();
  s = s.replace(/\s*\([^)]*\)/g, "").trim();
  const parts = s.split(",").map(p => p.trim());
  if (parts.length === 2 && parts[1]) return `${parts[1]} ${parts[0]}`;
  return parts[0];
}

function buildSRUQuery(query) {
  const words = query.trim().split(/\s+/);
  // Detect author-only queries (1-2 words, capitalized)
  const looksLikeAuthor = words.length <= 2 && words.every(w => /^[A-ZÀ-Ö]/.test(w));

  if (words.length === 1) {
    return `((bib.title all "${query}") or (bib.author all "${query}")) and (bib.doctype any "a")`;
  }
  if (looksLikeAuthor) {
    return `(bib.author all "${query}") and (bib.doctype any "a")`;
  }
  return `(bib.title all "${query}") and (bib.doctype any "a")`;
}

function parseDublinCoreXML(xmlText) {
  // Regex-based parser (no DOM dependency needed in Node)
  const getDcField = (block, name) => {
    const re = new RegExp(`<dc:${name}[^>]*>([^<]*)</dc:${name}>`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : null;
  };
  const getAllDcFields = (block, name) => {
    const re = new RegExp(`<dc:${name}[^>]*>([^<]*)</dc:${name}>`, "gi");
    const out = [];
    let m;
    while ((m = re.exec(block)) !== null) out.push(m[1].trim());
    return out.filter(Boolean);
  };

  const results = [];
  // Split by recordData blocks
  const recordRe = /<(?:srw:)?recordData[^>]*>([\s\S]*?)<\/(?:srw:)?recordData>/gi;
  let rm;
  while ((rm = recordRe.exec(xmlText)) !== null) {
    const block = rm[1];

    const rawTitle = getDcField(block, "title");
    if (!rawTitle) continue;
    const title = cleanTitle(rawTitle);

    const creators = getAllDcFields(block, "creator").map(cleanAuthor);
    const publisher = getDcField(block, "publisher");
    const date = getDcField(block, "date");
    const language = getDcField(block, "language");
    const format = getDcField(block, "format");
    const identifiers = getAllDcFields(block, "identifier");

    let isbn = null;
    for (const id of identifiers) {
      const m = id.match(/(?:ISBN\s*)?(\d{13}|\d{10}|\d[\d-]{10,})/i);
      if (m) { isbn = m[1].replace(/-/g, ""); if (isbn.length === 13) break; }
    }

    let pageCount = null;
    if (format) {
      const m = format.match(/(\d+)\s*p/);
      if (m) pageCount = parseInt(m[1]);
    }

    let ark = null;
    for (const id of identifiers) {
      const m = id.match(/(ark:\/\d+\/\w+)/);
      if (m) { ark = m[1]; break; }
    }

    results.push({
      title,
      authors: creators,
      isbn: isbn || null,
      publisher: publisher || null,
      publishYear: date || null,
      pageCount,
      language: language || null,
      ark,
    });
  }
  return results;
}

async function searchBnF(query) {
  const start = Date.now();
  try {
    const params = new URLSearchParams({
      version: "1.2",
      operation: "searchRetrieve",
      query: buildSRUQuery(query),
      recordSchema: "dublincore",
      maximumRecords: "10",
    });

    const res = await fetch(`${BNF_SRU_BASE}?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    const elapsed = Date.now() - start;
    if (!res.ok) return { results: [], elapsed, error: `HTTP ${res.status}` };

    const xml = await res.text();
    const parsed = parseDublinCoreXML(xml);

    // Extract total from SRU response
    const totalMatch = xml.match(/<srw:numberOfRecords>(\d+)<\/srw:numberOfRecords>/);
    const totalFound = totalMatch ? parseInt(totalMatch[1]) : parsed.length;

    return { results: parsed, elapsed, totalFound };
  } catch (e) {
    return { results: [], elapsed: Date.now() - start, error: e.message };
  }
}

// Optional: check if BnF cover exists via ARK
async function checkBnFCover(ark) {
  if (!ark) return false;
  try {
    const url = `https://catalogue.bnf.fr/couverture?&appName=NE&idArk=${encodeURIComponent(ark)}&couession=1`;
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000), redirect: "follow" });
    // BnF returns 200 even for no-cover (returns a placeholder), check content-type or content-length
    const ct = res.headers.get("content-type") || "";
    const cl = parseInt(res.headers.get("content-length") || "0");
    // Placeholder images are typically very small
    return res.ok && ct.includes("image") && cl > 5000;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════
// Queries (same as OL benchmark)
// ═══════════════════════════════════════════════

const QUERIES = [
  { query: "L'étranger", expected: "L'étranger", category: "Titres populaires FR" },
  { query: "Les Misérables", expected: "Les Misérables", category: "Titres populaires FR" },
  { query: "Madame Bovary", expected: "Madame Bovary", category: "Titres populaires FR" },
  { query: "Le Petit Prince", expected: "Le Petit Prince", category: "Titres populaires FR" },
  { query: "La Peste", expected: "La Peste", category: "Titres populaires FR" },
  { query: "Germinal", expected: "Germinal", category: "Titres populaires FR" },
  { query: "Le Maître et Marguerite", expected: "Le Maître et Marguerite", category: "Titres populaires FR" },
  { query: "Du côté de chez Swann", expected: "Du côté de chez Swann", category: "Titres populaires FR" },
  { query: "Les Fleurs du mal", expected: "Les Fleurs du mal", category: "Titres populaires FR" },
  { query: "1984", expected: "1984", category: "Titres populaires FR" },

  { query: "Albert Camus", expected: "L'étranger", category: "Auteurs" },
  { query: "Victor Hugo", expected: "Les Misérables", category: "Auteurs" },
  { query: "Borges", expected: "Ficciones", category: "Auteurs" },
  { query: "Émile Zola", expected: "Germinal", category: "Auteurs" },
  { query: "Marcel Proust", expected: "Du côté de chez Swann", category: "Auteurs" },

  { query: "petit pri", expected: "Le Petit Prince", category: "Partielles" },
  { query: "miser", expected: "Les Misérables", category: "Partielles" },
  { query: "bovary", expected: "Madame Bovary", category: "Partielles" },
  { query: "peste camus", expected: "La Peste", category: "Partielles" },
  { query: "etranger", expected: "L'étranger", category: "Partielles" },

  { query: "Naruto", expected: "Naruto", category: "Mangas/BD" },
  { query: "One Piece", expected: "One Piece", category: "Mangas/BD" },
  { query: "Sakamoto Days", expected: "Sakamoto Days", category: "Mangas/BD" },
  { query: "Dragon Ball", expected: "Dragon Ball", category: "Mangas/BD" },
  { query: "L'Arabe du futur", expected: "L'Arabe du futur", category: "Mangas/BD" },

  { query: "Je rouille", expected: "Je rouille", category: "Obscurs/Récents" },
  { query: "Pedro Páramo", expected: "Pedro Páramo", category: "Obscurs/Récents" },
  { query: "Austerlitz Sebald", expected: "Austerlitz", category: "Obscurs/Récents" },
  { query: "Les détectives sauvages", expected: "Les détectives sauvages", category: "Obscurs/Récents" },
  { query: "L'ordre du jour", expected: "L'ordre du jour", category: "Obscurs/Récents" },
];

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Benchmark BnF SRU — Recherche titre libre       ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);

  const results = [];

  // Check first if covers are available (sample 3 ARKs)
  let coverChecked = 0;
  let coverFound = 0;

  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    process.stdout.write(`\r  [${String(i + 1).padStart(2)}/${QUERIES.length}] ${q.query.padEnd(40)}`);

    const bnf = await searchBnF(q.query);
    await sleep(500);

    function findRank(items, expected) {
      for (let j = 0; j < Math.min(items.length, 3); j++) {
        if (titleMatch(items[j].title, expected)) return j + 1;
      }
      return -1;
    }

    const rank = findRank(bnf.results, q.expected);

    // Check covers for first 5 queries only (slow)
    let hasCoverCheck = null;
    if (i < 5 && bnf.results.length > 0 && bnf.results[0].ark) {
      hasCoverCheck = await checkBnFCover(bnf.results[0].ark);
      coverChecked++;
      if (hasCoverCheck) coverFound++;
    }

    // Metadata completeness
    function metaScore(items) {
      if (items.length === 0) return 0;
      let score = 0;
      const top = items.slice(0, 3);
      for (const r of top) {
        if (r.publisher) score++;
        if (r.publishYear) score++;
        if (r.pageCount) score++;
        if (r.isbn) score++;
      }
      return score / (top.length * 4); // 4 fields for BnF (includes ISBN)
    }

    const row = {
      query: q.query,
      expected: q.expected,
      category: q.category,
      elapsed: bnf.elapsed,
      totalFound: bnf.totalFound,
      count: bnf.results.length,
      rank,
      recall3: rank >= 1 && rank <= 3,
      metaScore: metaScore(bnf.results),
      top3: bnf.results.slice(0, 3).map(r => `${r.title} — ${(r.authors || [])[0] || "?"}`),
      hasISBN: bnf.results.slice(0, 3).some(r => r.isbn),
      hasPublisher: bnf.results.slice(0, 3).some(r => r.publisher),
      hasPages: bnf.results.slice(0, 3).some(r => r.pageCount),
      coverCheck: hasCoverCheck,
      error: bnf.error || null,
    };

    results.push(row);

    const icon = row.recall3 ? `${C.green}✅` : `${C.red}❌`;
    process.stdout.write(`\r  ${icon}${C.reset} "${C.bold}${q.query}${C.reset}" ${C.dim}${bnf.elapsed}ms, ${bnf.results.length} résultats${row.rank > 0 ? `, rang ${row.rank}` : ""}${C.reset}\n`);
  }

  // ═══════════════════════════════════════════════
  // Aggregate
  // ═══════════════════════════════════════════════

  console.log(`\n${C.bold}═══ Résumé BnF SRU ═══${C.reset}\n`);

  const recall = results.filter(r => r.recall3).length;
  const times = results.map(r => r.elapsed).sort((a, b) => a - b);
  const p50 = arr => arr[Math.floor(arr.length * 0.5)];
  const p90 = arr => arr[Math.floor(arr.length * 0.9)];
  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  console.log(`  Recall@3       ${recall}/${results.length} (${((recall / results.length) * 100).toFixed(0)}%)`);
  console.log(`  Temps P50      ${p50(times)}ms`);
  console.log(`  Temps P90      ${p90(times)}ms`);
  console.log(`  Temps moyen    ${avg(times)}ms`);
  console.log(`  Métadonnées    ${(results.reduce((s, r) => s + r.metaScore, 0) / results.length * 100).toFixed(0)}%`);
  if (coverChecked > 0) {
    console.log(`  Couvertures    ${coverFound}/${coverChecked} testées (${((coverFound / coverChecked) * 100).toFixed(0)}%)`);
  }

  // By category
  console.log(`\n  ${C.dim}Recall@3 par catégorie :${C.reset}`);
  const cats = [...new Set(QUERIES.map(q => q.category))];
  for (const cat of cats) {
    const catResults = results.filter(r => r.category === cat);
    const catRecall = catResults.filter(r => r.recall3).length;
    const catAvg = Math.round(catResults.reduce((s, r) => s + r.elapsed, 0) / catResults.length);
    console.log(`    ${cat.padEnd(25)} ${catRecall}/${catResults.length}  ${C.dim}(avg ${catAvg}ms)${C.reset}`);
  }

  // Failures detail
  const failures = results.filter(r => !r.recall3);
  if (failures.length > 0) {
    console.log(`\n  ${C.red}Échecs (${failures.length}) :${C.reset}`);
    for (const f of failures) {
      const got = f.top3[0] || "(vide)";
      console.log(`    "${f.query}" → attendu "${f.expected}", reçu: ${C.dim}${got}${C.reset}`);
    }
  }

  // Save raw data
  mkdirSync(resolve(ROOT, "reports"), { recursive: true });
  writeFileSync(
    resolve(ROOT, "reports", "benchmark-bnf-raw.json"),
    JSON.stringify({ results, summary: { recall, times: { p50: p50(times), p90: p90(times), avg: avg(times) }, coverChecked, coverFound } }, null, 2),
  );
  console.log(`\n  ${C.dim}Données brutes → reports/benchmark-bnf-raw.json${C.reset}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
