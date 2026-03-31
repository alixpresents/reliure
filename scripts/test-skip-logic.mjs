#!/usr/bin/env node

/**
 * Test de la skip logic Google Books.
 *
 * Simule le pipeline searchBooks() en appelant la RPC locale,
 * puis vérifie si la décision skip/call serait correcte.
 *
 * Usage: node scripts/test-skip-logic.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
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
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing env"); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  bold: "\x1b[1m", dim: "\x1b[2m", cyan: "\x1b[36m",
};

// Reproduce the skip logic from searchBooks()
function computeSkip(query, dbCount) {
  const digits = query.replace(/[^0-9]/g, "");
  const isISBN = digits.length >= 10 && digits.length <= 13;
  const dbSufficient = dbCount >= 3;
  const isbnFound = isISBN && dbCount >= 1;
  const skipGoogle = dbSufficient || isbnFound;
  const skipReason = skipGoogle
    ? (isbnFound ? "isbn_found" : "db_sufficient")
    : null;
  return { skipGoogle, skipReason };
}

const TEST_CASES = [
  { query: "L'étranger",       expectSkip: true,  expectReason: "db_sufficient", desc: "DB ≥ 3 (étranger + corps + en terre)" },
  { query: "Camus",            expectSkip: true,  expectReason: "db_sufficient", desc: "DB ≥ 3 (auteur populaire)" },
  { query: "ficc",             expectSkip: false,  expectReason: null,            desc: "DB = 1 (Ficciones seul)" },
  { query: "harry potter philosopher stone", expectSkip: false, expectReason: null, desc: "DB 0-1 (titre anglais long)" },
  { query: "9782070306022",    expectSkip: true,  expectReason: "isbn_found",    desc: "ISBN trouvé en DB" },
  { query: "un roman sur la solitude", expectSkip: false, expectReason: null,   desc: "NL query, DB ~0" },
  { query: "Sakamoto Days",    expectSkip: true,  expectReason: "db_sufficient", desc: "DB ≥ 3 (manga série)" },
  { query: "La Peste",         expectSkip: true,  expectReason: "db_sufficient", desc: "DB ≥ 3 (peste + variantes)" },
  { query: "xyz nonexistent book", expectSkip: false, expectReason: null,       desc: "Livre inconnu, DB = 0" },
  { query: "Borges",           expectSkip: true,  expectReason: "db_sufficient", desc: "DB ≥ 3 (auteur avec plusieurs livres)" },
];

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Test skip logic — Google Books API         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═════════════════════════════════════════════╝${C.reset}\n`);

  let passed = 0;
  let failed = 0;

  for (const tc of TEST_CASES) {
    const { data, error } = await supabase.rpc("search_books_v2", { q: tc.query });
    const dbCount = (data || []).length;
    const { skipGoogle, skipReason } = computeSkip(tc.query, dbCount);

    const skipOk = skipGoogle === tc.expectSkip;
    const reasonOk = tc.expectSkip ? (skipReason === tc.expectReason) : true;
    const ok = skipOk && reasonOk;

    if (ok) passed++; else failed++;

    const icon = ok ? `${C.green}✅` : `${C.red}❌`;
    console.log(`  ${icon}${C.reset} "${C.bold}${tc.query}${C.reset}"`);
    console.log(`     db=${dbCount} skip=${skipGoogle}${skipReason ? ` (${skipReason})` : ""} ${C.dim}— ${tc.desc}${C.reset}`);
    if (!ok) {
      console.log(`     ${C.red}attendu: skip=${tc.expectSkip}${tc.expectReason ? ` (${tc.expectReason})` : ""}${C.reset}`);
    }
  }

  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}`);
  console.log(`  ${passed}/${TEST_CASES.length} ${failed === 0 ? `${C.green}ALL PASS ✓` : `${C.red}${failed} FAILED`}${C.reset}\n`);

  // Estimation d'économie
  const skipCount = TEST_CASES.filter(tc => tc.expectSkip).length;
  const pct = ((skipCount / TEST_CASES.length) * 100).toFixed(0);
  console.log(`  ${C.dim}Estimation économie sur cet échantillon : ${skipCount}/${TEST_CASES.length} (${pct}%) des requêtes skip Google${C.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
