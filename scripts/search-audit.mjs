#!/usr/bin/env node
/**
 * Search pipeline audit v2 — mesure le rang, la source décisive, et l'apport de chaque tier
 * Usage: node --env-file=.env scripts/search-audit.mjs
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// ── Helpers ─────────────────────────────────────

function strip(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Find rank (1-based) of expected result in a list */
function findRank(results, expectedIsbn, expectedTitle) {
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isbn = r.isbn_13 || r.isbn || null;
    if (expectedIsbn && isbn === expectedIsbn) return i + 1;
    if (expectedTitle && strip(r.title) === strip(expectedTitle)) return i + 1;
  }
  return null;
}

// ── Sources ─────────────────────────────────────

async function searchDB(query) {
  const t0 = performance.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_books_v2`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: query.trim(), n: 10 }),
  });
  const data = await res.json();
  const ms = Math.round(performance.now() - t0);
  return { results: Array.isArray(data) ? data : [], ms };
}

async function searchDilicom(query) {
  const t0 = performance.now();
  const digits = query.replace(/[^0-9]/g, "");
  const isISBN = digits.length >= 10 && digits.length <= 13;
  const body = isISBN ? { isbn: digits } : { query: query.trim(), limit: 10 };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/dilicom-search`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const ms = Math.round(performance.now() - t0);
  return { results: data?.results || [], ms };
}

async function searchGoogle(query) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/google-books-proxy`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: query.trim() }),
    });
    const data = await res.json();
    const ms = Math.round(performance.now() - t0);
    const items = (data?.items || []).map(it => ({
      title: it.volumeInfo?.title,
      authors: it.volumeInfo?.authors,
      isbn: it.volumeInfo?.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier || null,
      _source: "google",
    }));
    return { results: items.slice(0, 10), ms };
  } catch {
    return { results: [], ms: Math.round(performance.now() - t0) };
  }
}

// ── Simulate the merge/scoring pipeline ─────────

function scoreResult(r, q) {
  const t = strip(r.title || "");
  const qn = strip(q);
  let s = 0;
  if (t === qn) s += 200;
  else if (t.startsWith(qn)) s += 100;
  else if (t.includes(qn)) s += 50;
  const a = strip((r.authors?.[0]) || "");
  if (a === qn || a.startsWith(qn)) s += 40;
  if (r._source === "db") s += 15;
  s += Math.min(r.rating_count || r._ratingCount || 0, 20);
  return s;
}

function mergeResults(dbResults, dilicomResults, googleResults, query) {
  // Tag sources
  const db = dbResults.map(r => ({ ...r, _source: "db", isbn: r.isbn_13 }));
  const dili = dilicomResults.map(r => ({ ...r, _source: "dilicom" }));
  const goog = googleResults.map(r => ({ ...r, _source: "google" }));

  // Dedup Dilicom vs DB
  const dbIsbns = new Set(db.map(r => r.isbn).filter(Boolean));
  const dbTitles = new Set(db.map(r => strip(r.title)));
  const uniqueDili = dili.filter(d => {
    if (d.isbn && dbIsbns.has(d.isbn)) return false;
    if (dbTitles.has(strip(d.title))) return false;
    return true;
  });

  // Fused pool Tier 1
  const fused = [...db, ...uniqueDili]
    .map(r => ({ ...r, _score: scoreResult(r, query) }))
    .sort((a, b) => b._score - a._score);

  // Dedup Google vs fused
  const fusedIsbns = new Set(fused.map(r => r.isbn).filter(Boolean));
  const fusedTitles = new Set(fused.map(r => strip(r.title)));
  const uniqueGoogle = goog.filter(g => {
    if (g.isbn && fusedIsbns.has(g.isbn)) return false;
    if (fusedTitles.has(strip(g.title))) return false;
    return true;
  });

  // Final: fused + google, dedup by title+author
  const seen = new Set();
  return [...fused, ...uniqueGoogle]
    .filter(r => {
      const key = strip(r.title) + "|" + strip(r.authors?.[0] || "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

// ── Test suite ──────────────────────────────────

const TEST_QUERIES = [
  // Titres exacts récents
  { query: "Volare", expected_isbn: "9782702194423", expected_title: "Volare" },
  { query: "Voir venir", expected_isbn: "9782386630484", expected_title: "Voir venir" },
  { query: "Sécher tes larmes", expected_isbn: "9782386433542", expected_title: "Sécher tes larmes" },
  { query: "Bonjour tristesse", expected_isbn: null, expected_title: "Bonjour tristesse" },

  // Classiques (doivent être en DB)
  { query: "L'Étranger", expected_isbn: "9782070360024", expected_title: "L'Étranger" },
  { query: "Belle du Seigneur", expected_isbn: null, expected_title: "Belle du Seigneur" },
  { query: "Madame Bovary", expected_isbn: null, expected_title: "Madame Bovary" },
  { query: "Les Misérables", expected_isbn: null, expected_title: "Les Misérables" },

  // Titres partiels
  { query: "Du côté de chez", expected_isbn: null, expected_title: "Du côté de chez Swann" },
  { query: "la vie devant", expected_isbn: null, expected_title: "La Vie devant soi" },
  { query: "le rouge et", expected_isbn: null, expected_title: "Le Rouge et le Noir" },
  { query: "cent ans de", expected_isbn: null, expected_title: "Cent ans de solitude" },

  // Noms d'auteurs seuls
  { query: "Modiano", expected_isbn: null, expected_title: null },
  { query: "Annie Ernaux", expected_isbn: null, expected_title: null },
  { query: "Kerangal", expected_isbn: null, expected_title: null },
  { query: "Mbougar Sarr", expected_isbn: null, expected_title: null },
  { query: "Lucile Novat", expected_isbn: null, expected_title: "Voir venir" },
  { query: "Serena Giuliano", expected_isbn: null, expected_title: "Volare" },

  // Auteur + mot du titre
  { query: "Ernaux années", expected_isbn: null, expected_title: "Les Années" },
  { query: "Houellebecq particules", expected_isbn: null, expected_title: "Les Particules élémentaires" },
  { query: "Cohen seigneur", expected_isbn: null, expected_title: "Belle du Seigneur" },

  // Fautes d'orthographe
  { query: "L'etranger Camus", expected_isbn: "9782070360024", expected_title: "L'Étranger" },
  { query: "Dostoïevky idiot", expected_isbn: null, expected_title: "L'Idiot" },
  { query: "Modianno deuil", expected_isbn: null, expected_title: null },

  // ISBN directs
  { query: "9782070360024", expected_isbn: "9782070360024", expected_title: "L'Étranger" },
  { query: "9782386433542", expected_isbn: "9782386433542", expected_title: "Voir venir" },

  // Requêtes NL courtes
  { query: "roman Sicile été", expected_isbn: null, expected_title: null },
  { query: "polar femme commissaire", expected_isbn: null, expected_title: null },

  // Cas ambigus (même titre, auteurs différents)
  { query: "Notre-Dame de Paris", expected_isbn: null, expected_title: "Notre-Dame de Paris" },
  { query: "La Peste", expected_isbn: null, expected_title: "La Peste" },
];

// ── Run ─────────────────────────────────────────

async function runAudit() {
  const results = [];

  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const test = TEST_QUERIES[i];
    if (i > 0) await new Promise(r => setTimeout(r, 400));
    process.stdout.write(`  [${String(i + 1).padStart(2)}/${TEST_QUERIES.length}] "${test.query}" ... `);

    const t0 = performance.now();

    // Call all 3 sources in parallel
    const [db, dilicom, google] = await Promise.all([
      searchDB(test.query),
      searchDilicom(test.query),
      searchGoogle(test.query),
    ]);

    const latencyTotal = Math.round(performance.now() - t0);

    // Per-source ranks
    const dbRank = findRank(db.results, test.expected_isbn, test.expected_title);
    const dilicomRank = findRank(dilicom.results, test.expected_isbn, test.expected_title);
    const googleRank = findRank(google.results, test.expected_isbn, test.expected_title);

    // Simulate the real pipeline: Google only if fused pool < 3
    const fusedCountTier1 = db.results.length + dilicom.results.length; // before dedup, approximate
    const googleCalled = fusedCountTier1 < 3;
    const googleForMerge = googleCalled ? google.results : [];

    // Merge
    const merged = mergeResults(db.results, dilicom.results, googleForMerge, test.query);
    const finalRank = findRank(merged, test.expected_isbn, test.expected_title);
    const finalTop = merged[0] || null;
    const finalSource = finalRank ? merged[finalRank - 1]?._source : null;

    // Google results in top 5 final
    const googleInTop5 = merged.slice(0, 5).filter(r => r._source === "google").length;

    // Determine result
    let result;
    const hasExpected = test.expected_isbn || test.expected_title;
    if (!hasExpected) {
      // Author/NL queries: pass if any results
      result = merged.length > 0 ? "has_results" : "miss";
    } else if (finalRank === 1) {
      result = "rank1";
    } else if (finalRank && finalRank <= 3) {
      result = "top3";
    } else if (finalRank) {
      result = "found";
    } else {
      result = "miss";
    }

    // DB alone sufficiency
    const dbAloneSufficient = dbRank === 1;
    // Dilicom decisive = rank1 in merged AND source is dilicom, OR dilicom has it but DB doesn't
    const dilicomDecisive = hasExpected && !dbRank && dilicomRank != null;
    const googleDecisive = hasExpected && !dbRank && !dilicomRank && googleRank != null;

    const entry = {
      query: test.query,
      expected_isbn: test.expected_isbn,
      expected_title: test.expected_title,
      db_count: db.results.length,
      db_rank: dbRank,
      dilicom_count: dilicom.results.length,
      dilicom_rank: dilicomRank,
      google_called: googleCalled,
      google_count: google.results.length,
      google_rank: googleRank,
      final_rank: finalRank,
      final_source: finalSource,
      final_title: finalTop?.title || null,
      google_in_top5: googleInTop5,
      db_alone_sufficient: dbAloneSufficient,
      dilicom_decisive: dilicomDecisive,
      google_decisive: googleDecisive,
      result,
      latency_db: db.ms,
      latency_dilicom: dilicom.ms,
      latency_google: google.ms,
      latency_total: latencyTotal,
    };

    results.push(entry);

    const icon = result === "rank1" ? "✓" : result === "top3" ? "◐" : result === "found" ? "△" : result === "has_results" ? "·" : "✗";
    const rankStr = finalRank ? `#${finalRank}` : "—";
    const sourceStr = finalSource ? `[${finalSource}]` : "";
    console.log(`${icon} ${result.padEnd(12)} ${rankStr.padEnd(4)} ${sourceStr.padEnd(10)} (DB:${db.results.length}/${db.ms}ms Dili:${dilicom.results.length}/${dilicom.ms}ms G:${google.results.length}/${google.ms}ms)`);
  }

  return results;
}

// ── Main ────────────────────────────────────────

console.log("\n═══ SEARCH PIPELINE AUDIT v2 ═══\n");

const results = await runAudit();

// Write JSON
const fs = await import("fs");
fs.writeFileSync(
  new URL("./search-audit-results.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
console.log("\n→ Results saved to scripts/search-audit-results.json\n");

// ── Summary ─────────────────────────────────────

const total = results.length;
const withExpected = results.filter(r => r.expected_isbn || r.expected_title);
const authorNL = results.filter(r => !r.expected_isbn && !r.expected_title);

const rank1 = results.filter(r => r.result === "rank1").length;
const top3 = results.filter(r => r.result === "top3").length;
const found = results.filter(r => r.result === "found").length;
const hasResults = results.filter(r => r.result === "has_results").length;
const miss = results.filter(r => r.result === "miss").length;

console.log("═══ RANKING SUMMARY ═══");
console.log(`  Total tests:          ${total} (${withExpected.length} with expected, ${authorNL.length} open-ended)`);
console.log(`  Rank 1 (perfect):     ${rank1}/${withExpected.length} (${Math.round(rank1 / withExpected.length * 100)}%)`);
console.log(`  Top 3:                ${top3}/${withExpected.length}`);
console.log(`  Found (4-10):         ${found}/${withExpected.length}`);
console.log(`  Has results (open):   ${hasResults}/${authorNL.length}`);
console.log(`  Miss:                 ${miss}/${total}`);

console.log("\n═══ SOURCES REPORT ═══");

const dbSufficient = results.filter(r => r.db_alone_sufficient).length;
const dilicomDecisive = results.filter(r => r.dilicom_decisive).length;
const googleDecisive = results.filter(r => r.google_decisive).length;
const noMechanical = withExpected.filter(r => r.result === "miss").length;
const googleCalledCount = results.filter(r => r.google_called).length;
const googleUseful = results.filter(r => r.google_called && r.google_in_top5 > 0).length;

console.log(`  DB seule suffisait (rank1):              ${dbSufficient}/${total}`);
console.log(`  Dilicom décisif (trouvé, absent DB):     ${dilicomDecisive}/${total}`);
console.log(`  Google décisif (trouvé, absent DB+Dili): ${googleDecisive}/${total}`);
console.log(`  Aucune source mécanique:                 ${noMechanical}/${withExpected.length} (→ NL only)`);
console.log(`  Google appelé:                           ${googleCalledCount} fois`);
console.log(`  Google utile (≥1 dans top 5 final):      ${googleUseful} fois`);

const avgDb = Math.round(results.reduce((s, r) => s + r.latency_db, 0) / total);
const avgDili = Math.round(results.reduce((s, r) => s + r.latency_dilicom, 0) / total);
const avgGoogle = Math.round(results.reduce((s, r) => s + r.latency_google, 0) / total);
const avgTotal = Math.round(results.reduce((s, r) => s + r.latency_total, 0) / total);

console.log(`\n  Latence moyenne DB:       ${avgDb}ms`);
console.log(`  Latence moyenne Dilicom:  ${avgDili}ms`);
console.log(`  Latence moyenne Google:   ${avgGoogle}ms`);
console.log(`  Latence moyenne totale:   ${avgTotal}ms`);

// Detail table for expected queries
console.log("\n═══ DETAIL — EXPECTED QUERIES ═══");
console.log("  Query".padEnd(32) + "Result".padEnd(10) + "Rank".padEnd(6) + "Source".padEnd(10) + "DB#".padEnd(5) + "Dili#".padEnd(6) + "G#".padEnd(5) + "Final title");
console.log("  " + "─".repeat(110));
for (const r of withExpected) {
  const q = r.query.length > 28 ? r.query.slice(0, 25) + "..." : r.query;
  const rank = r.final_rank ? `#${r.final_rank}` : "—";
  const src = r.final_source || "—";
  const title = (r.final_title || "—").slice(0, 35);
  console.log(`  ${q.padEnd(30)} ${r.result.padEnd(10)} ${rank.padEnd(6)} ${src.padEnd(10)} ${String(r.db_count).padEnd(5)} ${String(r.dilicom_count).padEnd(6)} ${String(r.google_count).padEnd(5)} ${title}`);
}

// Detail for open-ended queries
console.log("\n═══ DETAIL — OPEN-ENDED QUERIES ═══");
console.log("  Query".padEnd(32) + "DB#".padEnd(5) + "Dili#".padEnd(6) + "G#".padEnd(5) + "Top 1 title");
console.log("  " + "─".repeat(90));
for (const r of authorNL) {
  const q = r.query.length > 28 ? r.query.slice(0, 25) + "..." : r.query;
  const title = (r.final_title || "—").slice(0, 45);
  console.log(`  ${q.padEnd(30)} ${String(r.db_count).padEnd(5)} ${String(r.dilicom_count).padEnd(6)} ${String(r.google_count).padEnd(5)} ${title}`);
}

console.log("");
