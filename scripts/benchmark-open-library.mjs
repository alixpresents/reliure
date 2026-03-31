#!/usr/bin/env node

/**
 * Benchmark Open Library Search API vs Google Books
 *
 * Teste 30 queries représentatives (titres FR, auteurs, partielles, mangas, obscurs)
 * et compare recall, temps de réponse, couvertures, métadonnées.
 *
 * Usage: node scripts/benchmark-open-library.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv() {
  const envPath = resolve(ROOT, ".env");
  let vars = {};
  try {
    const raw = readFileSync(envPath, "utf-8");
    for (const line of raw.split("\n")) {
      const cleaned = line.replace(/^export\s+/, "").trim();
      if (!cleaned || cleaned.startsWith("#")) continue;
      const eq = cleaned.indexOf("=");
      if (eq < 0) continue;
      vars[cleaned.slice(0, eq).trim()] = cleaned.slice(eq + 1).trim();
    }
  } catch {}
  return vars;
}

const env = loadEnv();
const GOOGLE_KEY = env.VITE_GOOGLE_BOOKS_KEY;

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
// 30 queries benchmark
// ═══════════════════════════════════════════════

const QUERIES = [
  // 10 titres populaires FR
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

  // 5 auteurs seuls
  { query: "Albert Camus", expected: "L'étranger", category: "Auteurs" },
  { query: "Victor Hugo", expected: "Les Misérables", category: "Auteurs" },
  { query: "Borges", expected: "Ficciones", category: "Auteurs" },
  { query: "Émile Zola", expected: "Germinal", category: "Auteurs" },
  { query: "Marcel Proust", expected: "Du côté de chez Swann", category: "Auteurs" },

  // 5 queries partielles
  { query: "petit pri", expected: "Le Petit Prince", category: "Partielles" },
  { query: "miser", expected: "Les Misérables", category: "Partielles" },
  { query: "bovary", expected: "Madame Bovary", category: "Partielles" },
  { query: "peste camus", expected: "La Peste", category: "Partielles" },
  { query: "etranger", expected: "L'étranger", category: "Partielles" },

  // 5 mangas/BD
  { query: "Naruto", expected: "Naruto", category: "Mangas/BD" },
  { query: "One Piece", expected: "One Piece", category: "Mangas/BD" },
  { query: "Sakamoto Days", expected: "Sakamoto Days", category: "Mangas/BD" },
  { query: "Dragon Ball", expected: "Dragon Ball", category: "Mangas/BD" },
  { query: "L'Arabe du futur", expected: "L'Arabe du futur", category: "Mangas/BD" },

  // 5 titres obscurs ou récents
  { query: "Je rouille", expected: "Je rouille", category: "Obscurs/Récents" },
  { query: "Pedro Páramo", expected: "Pedro Páramo", category: "Obscurs/Récents" },
  { query: "Austerlitz Sebald", expected: "Austerlitz", category: "Obscurs/Récents" },
  { query: "Les détectives sauvages", expected: "Les détectives sauvages", category: "Obscurs/Récents" },
  { query: "L'ordre du jour", expected: "L'ordre du jour", category: "Obscurs/Récents" },
];

// ═══════════════════════════════════════════════
// Open Library Search
// ═══════════════════════════════════════════════

async function searchOpenLibrary(query) {
  const start = Date.now();
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&language=fre&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const elapsed = Date.now() - start;
    if (!res.ok) return { results: [], elapsed, error: `HTTP ${res.status}` };
    const data = await res.json();
    const docs = (data.docs || []).slice(0, 10);
    return {
      elapsed,
      totalFound: data.numFound || 0,
      results: docs.map(d => ({
        title: d.title || null,
        authors: d.author_name || [],
        isbn13: (d.isbn || []).find(i => i.length === 13) || null,
        hasCover: !!(d.cover_i || d.cover_edition_key),
        coverId: d.cover_i || null,
        coverEditionKey: d.cover_edition_key || null,
        publisher: (d.publisher || [])[0] || null,
        publishYear: (d.publish_year || [])[0] || null,
        pageCount: d.number_of_pages_median || null,
        language: d.language || [],
        editionCount: d.edition_count || 0,
        hasFrench: (d.language || []).includes("fre"),
      })),
    };
  } catch (e) {
    return { results: [], elapsed: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════════════
// Google Books Search
// ═══════════════════════════════════════════════

async function searchGoogleBooks(query) {
  const start = Date.now();
  try {
    const enc = encodeURIComponent(query);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${enc}&orderBy=relevance&printType=books&maxResults=10&langRestrict=fr${GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const elapsed = Date.now() - start;
    if (!res.ok) return { results: [], elapsed, error: `HTTP ${res.status}` };
    const data = await res.json();
    const items = data.items || [];
    return {
      elapsed,
      totalFound: data.totalItems || 0,
      results: items.slice(0, 10).map(it => {
        const v = it.volumeInfo || {};
        const isbn = (v.industryIdentifiers || []).find(i => i.type === "ISBN_13");
        const cover = v.imageLinks?.thumbnail || null;
        return {
          title: v.title || null,
          authors: v.authors || [],
          isbn13: isbn?.identifier || null,
          hasCover: !!cover,
          publisher: v.publisher || null,
          publishYear: v.publishedDate?.slice(0, 4) || null,
          pageCount: v.pageCount || null,
          language: v.language || null,
          description: !!v.description,
        };
      }),
    };
  } catch (e) {
    return { results: [], elapsed: Date.now() - start, error: e.message };
  }
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Benchmark Open Library vs Google Books          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);

  const results = [];

  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    process.stdout.write(`\r  [${String(i + 1).padStart(2)}/${QUERIES.length}] ${q.query.padEnd(40)}`);

    const ol = await searchOpenLibrary(q.query);
    await sleep(500);
    const gb = await searchGoogleBooks(q.query);
    await sleep(500);

    // Find recall rank
    function findRank(items, expected) {
      for (let j = 0; j < Math.min(items.length, 3); j++) {
        if (titleMatch(items[j].title, expected)) return j + 1;
      }
      return -1;
    }

    const olRank = findRank(ol.results, q.expected);
    const gbRank = findRank(gb.results, q.expected);

    const olCoverPct = ol.results.length > 0 ? ol.results.filter(r => r.hasCover).length / ol.results.length : 0;
    const gbCoverPct = gb.results.length > 0 ? gb.results.filter(r => r.hasCover).length / gb.results.length : 0;

    // French presence in OL results
    const olFrenchPct = ol.results.length > 0 ? ol.results.filter(r => r.hasFrench).length / ol.results.length : 0;

    // Metadata completeness (publisher + year + pageCount)
    function metaScore(items) {
      if (items.length === 0) return 0;
      let score = 0;
      const top = items.slice(0, 3);
      for (const r of top) {
        if (r.publisher) score++;
        if (r.publishYear) score++;
        if (r.pageCount) score++;
      }
      return score / (top.length * 3);
    }

    const row = {
      query: q.query,
      expected: q.expected,
      category: q.category,
      ol: {
        elapsed: ol.elapsed,
        totalFound: ol.totalFound,
        count: ol.results.length,
        rank: olRank,
        recall3: olRank >= 1 && olRank <= 3,
        coverPct: olCoverPct,
        frenchPct: olFrenchPct,
        metaScore: metaScore(ol.results),
        top3: ol.results.slice(0, 3).map(r => `${r.title} — ${(r.authors || [])[0] || "?"}`),
        error: ol.error || null,
      },
      gb: {
        elapsed: gb.elapsed,
        totalFound: gb.totalFound,
        count: gb.results.length,
        rank: gbRank,
        recall3: gbRank >= 1 && gbRank <= 3,
        coverPct: gbCoverPct,
        metaScore: metaScore(gb.results),
        top3: gb.results.slice(0, 3).map(r => `${r.title} — ${(r.authors || [])[0] || "?"}`),
        error: gb.error || null,
      },
    };

    results.push(row);

    const olIcon = row.ol.recall3 ? `${C.green}✅` : `${C.red}❌`;
    const gbIcon = row.gb.recall3 ? `${C.green}✅` : `${C.red}❌`;
    process.stdout.write(`\r  ${olIcon}${C.reset}/${gbIcon}${C.reset} "${C.bold}${q.query}${C.reset}" ${C.dim}OL:${ol.elapsed}ms GB:${gb.elapsed}ms${C.reset}\n`);
  }

  // ═══════════════════════════════════════════════
  // Aggregate stats
  // ═══════════════════════════════════════════════

  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);

  const olRecall = results.filter(r => r.ol.recall3).length;
  const gbRecall = results.filter(r => r.gb.recall3).length;
  const olTimes = results.map(r => r.ol.elapsed).sort((a, b) => a - b);
  const gbTimes = results.map(r => r.gb.elapsed).sort((a, b) => a - b);
  const p50 = arr => arr[Math.floor(arr.length * 0.5)];
  const p90 = arr => arr[Math.floor(arr.length * 0.9)];
  const avg = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);

  const olAvgCover = results.reduce((s, r) => s + r.ol.coverPct, 0) / results.length;
  const gbAvgCover = results.reduce((s, r) => s + r.gb.coverPct, 0) / results.length;
  const olAvgMeta = results.reduce((s, r) => s + r.ol.metaScore, 0) / results.length;
  const gbAvgMeta = results.reduce((s, r) => s + r.gb.metaScore, 0) / results.length;
  const olAvgFrench = results.reduce((s, r) => s + r.ol.frenchPct, 0) / results.length;

  console.log(`  Recall@3       OL: ${olRecall}/${results.length} (${((olRecall / results.length) * 100).toFixed(0)}%)  |  GB: ${gbRecall}/${results.length} (${((gbRecall / results.length) * 100).toFixed(0)}%)`);
  console.log(`  Temps P50      OL: ${p50(olTimes)}ms  |  GB: ${p50(gbTimes)}ms`);
  console.log(`  Temps P90      OL: ${p90(olTimes)}ms  |  GB: ${p90(gbTimes)}ms`);
  console.log(`  Temps moyen    OL: ${avg(olTimes)}ms  |  GB: ${avg(gbTimes)}ms`);
  console.log(`  Couvertures    OL: ${(olAvgCover * 100).toFixed(0)}%  |  GB: ${(gbAvgCover * 100).toFixed(0)}%`);
  console.log(`  Métadonnées    OL: ${(olAvgMeta * 100).toFixed(0)}%  |  GB: ${(gbAvgMeta * 100).toFixed(0)}%`);
  console.log(`  % FR dans OL   ${(olAvgFrench * 100).toFixed(0)}%`);

  // Recall by category
  console.log(`\n  ${C.dim}Recall@3 par catégorie :${C.reset}`);
  const cats = [...new Set(QUERIES.map(q => q.category))];
  for (const cat of cats) {
    const catResults = results.filter(r => r.category === cat);
    const olC = catResults.filter(r => r.ol.recall3).length;
    const gbC = catResults.filter(r => r.gb.recall3).length;
    console.log(`    ${cat.padEnd(25)} OL: ${olC}/${catResults.length}  GB: ${gbC}/${catResults.length}`);
  }

  // Queries where OL wins over GB
  const olWins = results.filter(r => r.ol.recall3 && !r.gb.recall3);
  const gbWins = results.filter(r => r.gb.recall3 && !r.ol.recall3);
  if (olWins.length > 0) {
    console.log(`\n  ${C.green}OL gagne (recall@3 où GB échoue) :${C.reset}`);
    olWins.forEach(r => console.log(`    "${r.query}" → OL rank ${r.ol.rank}`));
  }
  if (gbWins.length > 0) {
    console.log(`\n  ${C.yellow}GB gagne (recall@3 où OL échoue) :${C.reset}`);
    gbWins.forEach(r => console.log(`    "${r.query}" → GB rank ${r.gb.rank}`));
  }

  // Save detailed JSON for report generation
  mkdirSync(resolve(ROOT, "reports"), { recursive: true });
  writeFileSync(
    resolve(ROOT, "reports", "benchmark-ol-raw.json"),
    JSON.stringify({ results, summary: { olRecall, gbRecall, olTimes: { p50: p50(olTimes), p90: p90(olTimes), avg: avg(olTimes) }, gbTimes: { p50: p50(gbTimes), p90: p90(gbTimes), avg: avg(gbTimes) }, olAvgCover, gbAvgCover, olAvgMeta, gbAvgMeta, olAvgFrench } }, null, 2),
  );
  console.log(`\n  ${C.dim}Données brutes → reports/benchmark-ol-raw.json${C.reset}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
