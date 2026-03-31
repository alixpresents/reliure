#!/usr/bin/env node

/**
 * Test post-fix de search_books_v2
 *
 * Vérifie que les 5 bugs corrigés passent ET que 10 queries existantes ne régressent pas.
 * Lecture seule — ne modifie rien en base.
 *
 * Usage: node scripts/test-search-v3.mjs
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_KEY requis dans .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

function norm(s) {
  return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
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

// ═══════════════════════════════════════════════
// Test cases
// ═══════════════════════════════════════════════

const FIXES = [
  { query: "Madame Bovary Flaubert", expectedTitle: "Madame Bovary", criterion: "recall@3", group: "FIX" },
  { query: "Victor Hugo Les Misérables", expectedTitle: "Les Misérables", criterion: "recall@3", group: "FIX" },
  { query: "LETRANGER", expectedTitle: "L'étranger", criterion: "recall@3", group: "FIX" },
  { query: "9782070306022", expectedTitle: "L'étranger", criterion: "recall@1", group: "FIX" },
  { query: "Les Misérables", expectedTitle: "Les Misérables", criterion: "recall@3", group: "FIX" },
];

const REGRESSIONS = [
  { query: "L'étranger", expectedTitle: "L'étranger", criterion: "recall@1", group: "REG" },
  { query: "l'etranger", expectedTitle: "L'étranger", criterion: "recall@1", group: "REG" },
  { query: "Camus", expectedTitle: "L'étranger", criterion: "recall@1", group: "REG" },
  { query: "camus etranger", expectedTitle: "L'étranger", criterion: "recall@1", group: "REG" },
  { query: "ficc", expectedTitle: "Ficciones", criterion: "recall@1", group: "REG" },
  { query: "Borges", expectedTitle: "Ficciones", criterion: "recall@1", group: "REG" },
  { query: "Albert Camus", expectedTitle: "L'étranger", criterion: "recall@1", group: "REG" },
  { query: "La Peste", expectedTitle: "La Peste", criterion: "recall@1", group: "REG" },
  { query: "Sakamoto Days 15", expectedTitle: "SAKAMOTO DAYS 15", criterion: "recall@1", group: "REG" },
  { query: "Du côté de chez Swann", expectedTitle: "Du côté de chez Swann", criterion: "recall@1", group: "REG" },
];

const ALL = [...FIXES, ...REGRESSIONS];

// ═══════════════════════════════════════════════
// Run
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔═════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Test post-fix — search_books_v2            ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═════════════════════════════════════════════╝${C.reset}\n`);

  let passed = 0;
  let failed = 0;
  const rows = [];

  for (const tc of ALL) {
    const { data, error } = await supabase.rpc("search_books_v2", { q: tc.query });
    const results = data || [];

    let rank = -1;
    for (let i = 0; i < results.length; i++) {
      if (titleMatch(results[i].title, tc.expectedTitle)) {
        rank = i + 1;
        break;
      }
    }

    const maxRank = tc.criterion === "recall@1" ? 1 : 3;
    const ok = rank >= 1 && rank <= maxRank;

    if (ok) passed++; else failed++;

    const icon = ok ? `${C.green}✅` : `${C.red}❌`;
    const rankStr = rank === -1 ? "absent" : `rang ${rank}`;
    const top3 = results.slice(0, 3).map(r => r.title).join(" | ") || "(vide)";

    rows.push({ tc, rank, ok, rankStr, top3 });

    console.log(`  ${icon}${C.reset} ${tc.group === "FIX" ? "FIX" : "REG"} ${C.bold}${tc.query}${C.reset}`);
    console.log(`     ${ok ? C.green : C.red}${rankStr}${C.reset} ${C.dim}(${tc.criterion})${C.reset} → ${C.dim}${top3.slice(0, 80)}${C.reset}`);
  }

  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}`);

  const fixPassed = rows.filter(r => r.tc.group === "FIX" && r.ok).length;
  const regPassed = rows.filter(r => r.tc.group === "REG" && r.ok).length;

  console.log(`  Fixes    : ${fixPassed}/${FIXES.length} ${fixPassed === FIXES.length ? C.green + "✓" : C.red + "✗"}${C.reset}`);
  console.log(`  Non-rég  : ${regPassed}/${REGRESSIONS.length} ${regPassed === REGRESSIONS.length ? C.green + "✓" : C.red + "✗"}${C.reset}`);
  console.log(`  ${C.bold}Total    : ${passed}/${ALL.length}${C.reset} ${failed === 0 ? C.green + "ALL PASS ✓" : C.red + failed + " FAILED"}${C.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
