#!/usr/bin/env node
/**
 * Search pipeline audit — mesure le recall et les faux positifs
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

// ── Sources ──────────────────────────────────────────────────

async function searchDB(query) {
  const t0 = performance.now();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_books_v2`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: query.trim(), n: 10 }),
  });
  const data = await res.json();
  const ms = Math.round(performance.now() - t0);
  const results = Array.isArray(data) ? data : [];
  return { results, ms };
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
  const results = data?.results || [];
  return { results, ms };
}

// ── Test suite ───────────────────────────────────────────────

const TEST_QUERIES = [
  { query: "L'Étranger", expected_isbn: "9782070360024", expected_source: "db" },
  { query: "Belle du Seigneur", expected_isbn: "9782070368761", expected_source: "db" },
  { query: "Sécher tes larmes", expected_isbn: "9782386433542", expected_source: "dilicom" },
  { query: "Modiano", expected_isbn: null, expected_source: "db" },
  { query: "Annie Ernaux", expected_isbn: null, expected_source: "db" },
  { query: "Du côté de chez", expected_isbn: "9782070360048", expected_source: "db" },
  { query: "Recherche du temps", expected_isbn: null, expected_source: "db" },
  { query: "roman court fantômes mexique", expected_isbn: "9782070413478", expected_source: "smart" },
  { query: "existentialisme algérie soleil", expected_isbn: "9782070360024", expected_source: "smart" },
  { query: "9782070360024", expected_isbn: "9782070360024", expected_source: "db" },
  { query: "Sécher tes larmes Meï Lepage", expected_isbn: "9782386433542", expected_source: "dilicom" },
  { query: "9782386433542", expected_isbn: "9782386433542", expected_source: "dilicom" },
  { query: "L'etranger Camus", expected_isbn: "9782070360024", expected_source: "db" },
  { query: "Prout à la recherche", expected_isbn: null, expected_source: "db" },
  { query: "Les Misérables", expected_isbn: null, expected_source: "db" },
  { query: "Notre-Dame de Paris", expected_isbn: null, expected_source: "db" },
];

function strip(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Run ──────────────────────────────────────────────────────

async function runAudit() {
  const results = [];

  for (const test of TEST_QUERIES) {
    process.stdout.write(`  Testing: "${test.query}" ... `);

    const [db, dilicom] = await Promise.all([
      searchDB(test.query),
      searchDilicom(test.query),
    ]);

    const dbTop3 = db.results.slice(0, 3);
    const dilicomTop3 = dilicom.results.slice(0, 3);

    const dbTopIsbn = db.results[0]?.isbn_13 || null;
    const dbTopTitle = db.results[0]?.title || null;
    const dilicomTopIsbn = dilicom.results[0]?.isbn || null;
    const dilicomTopTitle = dilicom.results[0]?.title || null;

    const dbMatch = test.expected_isbn
      ? dbTop3.some(r => r.isbn_13 === test.expected_isbn)
      : null;
    const dilicomMatch = test.expected_isbn
      ? dilicomTop3.some(r => r.isbn === test.expected_isbn)
      : null;

    // Simulate current skip logic
    const skipTriggered = db.results.length >= 3;

    // False positive: skip triggered but expected book not in DB top 3
    const falsePositive = test.expected_isbn
      ? skipTriggered && !dbMatch
      : false;

    // Determine result
    let result;
    if (!test.expected_isbn) {
      // No expected ISBN — pass if we got any results from expected source
      result = db.results.length > 0 ? "pass" : "miss";
    } else if (dbMatch) {
      result = "pass";
    } else if (!skipTriggered && dilicomMatch) {
      result = "pass";
    } else if (falsePositive && dilicomMatch) {
      result = "false_positive"; // Dilicom WOULD have found it but was skipped
    } else if (dilicomMatch || dbTop3.some(r => strip(r.title) === strip(test.query))) {
      result = "partial";
    } else {
      // Check if found anywhere in top 10
      const anyDbMatch = db.results.some(r => r.isbn_13 === test.expected_isbn);
      const anyDilicomMatch = dilicom.results.some(r => r.isbn === test.expected_isbn);
      if (anyDbMatch || anyDilicomMatch) result = "partial";
      else result = "miss";
    }

    const entry = {
      query: test.query,
      expected_isbn: test.expected_isbn,
      expected_source: test.expected_source,
      db_results: db.results.length,
      db_top_isbn: dbTopIsbn,
      db_top_title: dbTopTitle,
      db_match: dbMatch,
      dilicom_results: dilicom.results.length,
      dilicom_top_isbn: dilicomTopIsbn,
      dilicom_top_title: dilicomTopTitle,
      dilicom_match: dilicomMatch,
      skip_triggered: skipTriggered,
      false_positive: falsePositive,
      t_db: db.ms,
      t_dilicom: dilicom.ms,
      result,
    };

    // For false positives, log DB top 3 titles
    if (falsePositive) {
      entry.db_top3_titles = dbTop3.map(r => r.title);
    }

    results.push(entry);

    const icon = result === "pass" ? "✓" : result === "false_positive" ? "⚠" : result === "partial" ? "◐" : "✗";
    console.log(`${icon} ${result} (DB:${db.results.length}/${db.ms}ms Dilicom:${dilicom.results.length}/${dilicom.ms}ms)`);
  }

  return results;
}

// ── Main ─────────────────────────────────────────────────────

console.log("\n═══ SEARCH PIPELINE AUDIT ═══\n");

const results = await runAudit();

// Write JSON report
const fs = await import("fs");
fs.writeFileSync(
  new URL("./search-audit-results.json", import.meta.url),
  JSON.stringify(results, null, 2),
);
console.log("\n→ Results saved to scripts/search-audit-results.json\n");

// Summary
const total = results.length;
const withExpected = results.filter(r => r.expected_isbn);
const passes = results.filter(r => r.result === "pass").length;
const falsePositives = results.filter(r => r.result === "false_positive").length;
const misses = results.filter(r => r.result === "miss").length;
const partials = results.filter(r => r.result === "partial").length;

console.log("═══ SUMMARY ═══");
console.log(`  Total tests:       ${total}`);
console.log(`  Pass:              ${passes}/${total} (${Math.round(passes / total * 100)}%)`);
console.log(`  False positives:   ${falsePositives}`);
console.log(`  Partial:           ${partials}`);
console.log(`  Miss:              ${misses}`);
console.log(`  Pass rate (ISBN):  ${withExpected.filter(r => r.result === "pass").length}/${withExpected.length}`);

const avgDb = Math.round(results.reduce((s, r) => s + r.t_db, 0) / total);
const avgDilicom = Math.round(results.reduce((s, r) => s + r.t_dilicom, 0) / total);
console.log(`  Avg latency DB:    ${avgDb}ms`);
console.log(`  Avg latency Dili:  ${avgDilicom}ms`);

if (falsePositives > 0) {
  console.log("\n═══ FALSE POSITIVES DETAIL ═══");
  for (const r of results.filter(r => r.result === "false_positive")) {
    console.log(`  "${r.query}" → DB returned ${r.db_results} results, top 3:`);
    for (const t of r.db_top3_titles || []) console.log(`    - ${t}`);
    console.log(`    Expected: ${r.expected_isbn} (found in Dilicom: ${r.dilicom_match})`);
  }
}

console.log("");
