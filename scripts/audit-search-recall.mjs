#!/usr/bin/env node

/**
 * Audit recall de search_books_v2
 *
 * Teste la qualité du recall de la RPC PostgreSQL search_books_v2
 * sur la base Reliure (~3700 livres francophones).
 *
 * Usage: node scripts/audit-search-recall.mjs
 *
 * Génère: reports/search-recall-audit.md
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ═══════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════

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

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function norm(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleMatch(result, expected) {
  const rn = norm(result);
  const en = norm(expected);
  if (rn === en) return true;
  // Partial: expected is contained in result or vice versa
  if (rn.includes(en) || en.includes(rn)) return true;
  // Token overlap: at least 80% of expected tokens present in result
  const rTokens = rn.split(" ");
  const eTokens = en.split(" ").filter(t => t.length > 2);
  if (eTokens.length === 0) return rn === en;
  const overlap = eTokens.filter(t => rTokens.some(rt => rt.includes(t) || t.includes(rt))).length;
  return overlap / eTokens.length >= 0.8;
}

function pad(s, n) { return (s + " ".repeat(n)).slice(0, n); }
function padL(s, n) { return (" ".repeat(n) + s).slice(-n); }

const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
};

// ═══════════════════════════════════════════════
// Étape 1 — Inventaire de la base
// ═══════════════════════════════════════════════

async function snapshot() {
  console.log(`\n${C.bold}═══ ÉTAPE 1 : Inventaire de la base ═══${C.reset}\n`);

  const { count: total } = await supabase
    .from("books").select("*", { count: "exact", head: true });

  const { data: top20 } = await supabase
    .from("books").select("title, authors, rating_count, isbn_13, cover_url, slug")
    .order("rating_count", { ascending: false }).limit(20);

  const { count: noCover } = await supabase
    .from("books").select("*", { count: "exact", head: true }).is("cover_url", null);

  const { count: authNull } = await supabase
    .from("books").select("*", { count: "exact", head: true }).is("authors", null);

  const { data: allBooks } = await supabase
    .from("books").select("title, authors, id, cover_url, rating_count").limit(4000);

  // Count empty authors arrays
  const authEmpty = allBooks.filter(b => Array.isArray(b.authors) && b.authors.length === 0).length;

  // Find duplicates
  const byTitle = {};
  for (const b of allBooks) {
    const k = norm(b.title);
    if (!byTitle[k]) byTitle[k] = [];
    byTitle[k].push(b);
  }
  const dupes = Object.entries(byTitle).filter(([, books]) => books.length > 1);

  const snap = {
    total,
    top20,
    noCover,
    authNull,
    authEmpty,
    dupes,
  };

  console.log(`  Total livres : ${C.bold}${total}${C.reset}`);
  console.log(`  Sans couverture : ${noCover} (${((noCover / total) * 100).toFixed(1)}%)`);
  console.log(`  Auteurs null : ${authNull}`);
  console.log(`  Auteurs [] vide : ${authEmpty}`);
  console.log(`  Doublons potentiels : ${dupes.length} groupes`);
  console.log(`\n  ${C.dim}Top 10 :${C.reset}`);
  top20.slice(0, 10).forEach((b, i) =>
    console.log(`    ${padL(String(i + 1), 2)}. ${b.title} — ${(b.authors || [])[0] || "?"} ${C.dim}(rc:${b.rating_count})${C.reset}`)
  );

  return snap;
}

// ═══════════════════════════════════════════════
// Étape 2 — Test suite
// ═══════════════════════════════════════════════

// Test cases adaptés aux données réelles de la base
const TEST_CASES = [
  // ─── A. Apostrophes françaises ───
  { query: "L\u2019étranger", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "A. Apostrophes" },
  { query: "L'étranger", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "A. Apostrophes" },
  { query: "l'etranger", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "A. Apostrophes" },
  { query: "l etranger", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "A. Apostrophes" },
  { query: "L'Adversaire", expectedTitle: "L'Adversaire", expectedAuthor: "Emmanuel Carrère", category: "A. Apostrophes" },
  { query: "L'Ombre du vent", expectedTitle: "L'Ombre du vent", expectedAuthor: "Carlos Ruiz Zafón", category: "A. Apostrophes" },
  { query: "l ordre du jour", expectedTitle: "L'ordre du jour", expectedAuthor: "Eric Vuillard", category: "A. Apostrophes" },
  { query: "Si par une nuit d'hiver", expectedTitle: "Si par une nuit d'hiver un voyageur", expectedAuthor: "Italo Calvino", category: "A. Apostrophes" },
  { query: "Qu'est-ce que l'intersectionnalité", expectedTitle: "Qu'est-ce que l'intersectionnalité ?", expectedAuthor: null, category: "A. Apostrophes" },

  // ─── B. Accents et diacritiques ───
  { query: "etranger camus", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "B. Accents" },
  { query: "Emile Zola", expectedTitle: "Germinal", expectedAuthor: "Émile Zola", category: "B. Accents" },
  { query: "Amelie Nothomb", expectedTitle: "Stupeur et tremblements", expectedAuthor: "Amélie Nothomb", category: "B. Accents" },
  { query: "chateau", expectedTitle: "Le Château", expectedAuthor: "Franz Kafka", category: "B. Accents" },
  { query: "Pedro Paramo", expectedTitle: "Pedro Páramo", expectedAuthor: "Juan Rulfo", category: "B. Accents" },
  { query: "Mikhaïl Boulgakov", expectedTitle: "Le Maître et Marguerite", expectedAuthor: "Mikhaïl Boulgakov", category: "B. Accents" },
  { query: "maitre marguerite", expectedTitle: "Le Maître et Marguerite", expectedAuthor: "Mikhaïl Boulgakov", category: "B. Accents" },
  { query: "LETRANGER", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "B. Accents" },

  // ─── C. Queries partielles ───
  { query: "ficc", expectedTitle: "Ficciones", expectedAuthor: "Jorge Luis Borges", category: "C. Partielles" },
  { query: "petit pri", expectedTitle: "Le Petit Prince", expectedAuthor: "Antoine de Saint-Exupéry", category: "C. Partielles" },
  { query: "miser", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "C. Partielles" },
  { query: "peste", expectedTitle: "La Peste", expectedAuthor: "Albert Camus", category: "C. Partielles" },
  { query: "detecti", expectedTitle: "Les détectives sauvages", expectedAuthor: "Roberto Bolaño", category: "C. Partielles" },
  { query: "bovary", expectedTitle: "Madame Bovary", expectedAuthor: "Gustave Flaubert", category: "C. Partielles" },
  { query: "germi", expectedTitle: "Germinal", expectedAuthor: "Émile Zola", category: "C. Partielles" },
  { query: "sakamoto", expectedTitle: "SAKAMOTO DAYS", expectedAuthor: "Yuto Suzuki", category: "C. Partielles" },

  // ─── D. Auteurs ───
  { query: "Camus", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "D. Auteurs" },
  { query: "Albert Camus", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "D. Auteurs" },
  { query: "Borges", expectedTitle: "Ficciones", expectedAuthor: "Jorge Luis Borges", category: "D. Auteurs" },
  { query: "Bolaño", expectedTitle: "Les détectives sauvages", expectedAuthor: "Roberto Bolaño", category: "D. Auteurs" },
  { query: "Bolano", expectedTitle: "Les détectives sauvages", expectedAuthor: "Roberto Bolaño", category: "D. Auteurs" },
  { query: "Perec", expectedTitle: "Les Choses", expectedAuthor: "Georges Perec", category: "D. Auteurs" },
  { query: "Victor Hugo", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "D. Auteurs" },
  { query: "Hugo", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "D. Auteurs" },

  // ─── E. Titres avec articles/prépositions ───
  { query: "Les Misérables", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "E. Articles" },
  { query: "Misérables", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "E. Articles" },
  { query: "miserables", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "E. Articles" },
  { query: "La Peste", expectedTitle: "La Peste", expectedAuthor: "Albert Camus", category: "E. Articles" },
  { query: "Peste", expectedTitle: "La Peste", expectedAuthor: "Albert Camus", category: "E. Articles" },
  { query: "Du côté de chez Swann", expectedTitle: "Du côté de chez Swann", expectedAuthor: "Marcel Proust", category: "E. Articles" },
  { query: "côté chez Swann", expectedTitle: "Du côté de chez Swann", expectedAuthor: "Marcel Proust", category: "E. Articles" },
  { query: "Le Petit Prince", expectedTitle: "Le Petit Prince", expectedAuthor: "Antoine de Saint-Exupéry", category: "E. Articles" },
  { query: "Les Choses", expectedTitle: "Les Choses", expectedAuthor: "Georges Perec", category: "E. Articles" },

  // ─── F. Mangas et séries ───
  { query: "Naruto", expectedTitle: "Naruto", expectedAuthor: "Masashi Kishimoto", category: "F. Mangas" },
  { query: "Naruto 7", expectedTitle: "Naruto", expectedAuthor: "Masashi Kishimoto", category: "F. Mangas" },
  { query: "Sakamoto Days 15", expectedTitle: "SAKAMOTO DAYS 15", expectedAuthor: "Yuto Suzuki", category: "F. Mangas" },
  { query: "Sakamoto Days 23", expectedTitle: "SAKAMOTO DAYS 23", expectedAuthor: "Yuto Suzuki", category: "F. Mangas" },
  { query: "Harry Potter", expectedTitle: "Harry Potter", expectedAuthor: "J.K. Rowling", category: "F. Mangas" },
  { query: "Madame Bovary Flaubert", expectedTitle: "Madame Bovary", expectedAuthor: "Gustave Flaubert", category: "F. Mangas" },

  // ─── G. Cas limites ───
  { query: "", expectedTitle: null, expectedAuthor: null, category: "G. Limites", expectEmpty: true },
  { query: "a", expectedTitle: null, expectedAuthor: null, category: "G. Limites", expectEmpty: true },
  { query: "le", expectedTitle: null, expectedAuthor: null, category: "G. Limites", expectEmpty: true },
  { query: "la", expectedTitle: null, expectedAuthor: null, category: "G. Limites", expectEmpty: true },
  { query: "1984", expectedTitle: "1984", expectedAuthor: "George Orwell", category: "G. Limites" },
  { query: "2666", expectedTitle: "2666", expectedAuthor: "Roberto Bolaño", category: "G. Limites" },
  { query: "9782070306022", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "G. Limites" },
  { query: "l'étranger #1", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "G. Limites" },
  { query: "un très très très très très très long titre de livre qui ne correspond à rien dans la base", expectedTitle: null, expectedAuthor: null, category: "G. Limites", expectEmpty: true },

  // ─── H. Queries multi-mots (titre + auteur) ───
  { query: "camus etranger", expectedTitle: "L'étranger", expectedAuthor: "Albert Camus", category: "H. Multi-mots" },
  { query: "camus peste", expectedTitle: "La Peste", expectedAuthor: "Albert Camus", category: "H. Multi-mots" },
  { query: "borges ficciones", expectedTitle: "Ficciones", expectedAuthor: "Jorge Luis Borges", category: "H. Multi-mots" },
  { query: "Victor Hugo Les Misérables", expectedTitle: "Les Misérables", expectedAuthor: "Victor Hugo", category: "H. Multi-mots" },
  { query: "Flaubert Bovary", expectedTitle: "Madame Bovary", expectedAuthor: "Gustave Flaubert", category: "H. Multi-mots" },
  { query: "Sebald Austerlitz", expectedTitle: "Austerlitz", expectedAuthor: "W.G. Sebald", category: "H. Multi-mots" },
];

// ═══════════════════════════════════════════════
// Étape 3 — Exécution
// ═══════════════════════════════════════════════

async function runTests() {
  console.log(`\n${C.bold}═══ ÉTAPE 2 : Exécution des ${TEST_CASES.length} tests ═══${C.reset}\n`);

  const results = [];
  let done = 0;

  for (const tc of TEST_CASES) {
    done++;
    process.stdout.write(`\r  [${padL(String(done), 2)}/${TEST_CASES.length}] ${pad(tc.query || '""', 50)}`);

    const start = Date.now();
    let data = [];
    let error = null;

    if (tc.query && tc.query.length >= 2) {
      const res = await supabase.rpc("search_books_v2", { q: tc.query });
      data = res.data || [];
      error = res.error;
    }
    const elapsed = Date.now() - start;

    // Scoring
    let rank = -1;
    let score = "❌ absent";

    if (tc.expectEmpty) {
      score = data.length === 0 ? "✅ vide (attendu)" : `⚠️ ${data.length} résultats (attendu: 0)`;
      rank = data.length === 0 ? 0 : -1;
    } else if (error) {
      score = `💥 erreur: ${error.message}`;
    } else if (tc.expectedTitle) {
      for (let i = 0; i < data.length; i++) {
        if (titleMatch(data[i].title, tc.expectedTitle)) {
          rank = i + 1;
          break;
        }
      }
      if (rank === 1) score = "✅ recall@1";
      else if (rank > 0 && rank <= 3) score = "✅ recall@3";
      else if (rank > 3) score = `⚠️ rang ${rank}`;
      else score = "❌ absent";
    }

    results.push({
      ...tc,
      data: data.slice(0, 5),
      rank,
      score,
      elapsed,
      error,
      totalResults: data.length,
    });
  }

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  console.log(`  ${C.green}✓${C.reset} ${TEST_CASES.length} tests exécutés\n`);
  return results;
}

// ═══════════════════════════════════════════════
// Étape 4 — Rapport
// ═══════════════════════════════════════════════

function generateReport(snap, results) {
  console.log(`${C.bold}═══ ÉTAPE 3 : Génération du rapport ═══${C.reset}\n`);

  // Compute metrics
  const testable = results.filter(r => !r.expectEmpty);
  const emptyTests = results.filter(r => r.expectEmpty);
  const recall1 = testable.filter(r => r.rank === 1).length;
  const recall3 = testable.filter(r => r.rank >= 1 && r.rank <= 3).length;
  const absent = testable.filter(r => r.rank === -1).length;
  const rankGt3 = testable.filter(r => r.rank > 3).length;
  const emptyCorrect = emptyTests.filter(r => r.rank === 0).length;

  const ranksWhenFound = testable.filter(r => r.rank > 0).map(r => r.rank);
  const avgRank = ranksWhenFound.length
    ? (ranksWhenFound.reduce((a, b) => a + b, 0) / ranksWhenFound.length).toFixed(2)
    : "N/A";

  // Per-category metrics
  const categories = [...new Set(results.map(r => r.category))];
  const catStats = categories.map(cat => {
    const catResults = results.filter(r => r.category === cat && !r.expectEmpty);
    const catEmpty = results.filter(r => r.category === cat && r.expectEmpty);
    const r1 = catResults.filter(r => r.rank === 1).length;
    const r3 = catResults.filter(r => r.rank >= 1 && r.rank <= 3).length;
    const total = catResults.length;
    const emptyOk = catEmpty.filter(r => r.rank === 0).length;
    return { cat, r1, r3, total, absent: catResults.filter(r => r.rank === -1).length, emptyOk, emptyTotal: catEmpty.length };
  });

  // Worst results
  const worst = testable
    .filter(r => r.rank === -1 || r.rank > 3)
    .sort((a, b) => {
      if (a.rank === -1 && b.rank !== -1) return -1;
      if (b.rank === -1 && a.rank !== -1) return 1;
      return (b.rank || 999) - (a.rank || 999);
    })
    .slice(0, 15);

  // Duplicates found during queries
  const dupeFindings = [];
  for (const r of results) {
    if (r.data.length < 2) continue;
    const seen = {};
    for (const d of r.data) {
      const k = norm(d.title);
      if (seen[k]) {
        dupeFindings.push({
          query: r.query,
          title: d.title,
          orig: seen[k],
          dup: d,
        });
      } else {
        seen[k] = d;
      }
    }
  }

  // ─── Console summary ───
  console.log(`  ${C.bold}Recall@1${C.reset} : ${recall1}/${testable.length} (${((recall1 / testable.length) * 100).toFixed(1)}%)`);
  console.log(`  ${C.bold}Recall@3${C.reset} : ${recall3}/${testable.length} (${((recall3 / testable.length) * 100).toFixed(1)}%)`);
  console.log(`  ${C.bold}Absents${C.reset}  : ${absent}/${testable.length}`);
  console.log(`  ${C.bold}Rang > 3${C.reset} : ${rankGt3}/${testable.length}`);
  console.log(`  ${C.bold}Rang moyen${C.reset} (quand trouvé) : ${avgRank}`);
  console.log(`  ${C.bold}Tests vide${C.reset} : ${emptyCorrect}/${emptyTests.length} corrects`);

  console.log(`\n  ${C.bold}Par catégorie :${C.reset}`);
  for (const cs of catStats) {
    const pct1 = cs.total ? ((cs.r1 / cs.total) * 100).toFixed(0) : "-";
    const pct3 = cs.total ? ((cs.r3 / cs.total) * 100).toFixed(0) : "-";
    const emptyStr = cs.emptyTotal ? ` | vides: ${cs.emptyOk}/${cs.emptyTotal}` : "";
    const color = cs.absent > 0 ? C.red : cs.r3 === cs.total ? C.green : C.yellow;
    console.log(`    ${color}${pad(cs.cat, 20)}${C.reset} r@1: ${padL(pct1, 3)}%  r@3: ${padL(pct3, 3)}%  absents: ${cs.absent}/${cs.total}${emptyStr}`);
  }

  if (worst.length) {
    console.log(`\n  ${C.bold}${C.red}Pires résultats :${C.reset}`);
    for (const w of worst.slice(0, 8)) {
      console.log(`    ${C.red}${w.score}${C.reset} "${w.query}" → attendu: "${w.expectedTitle}"`);
      if (w.data.length) {
        console.log(`      ${C.dim}reçu: ${w.data.slice(0, 3).map(d => d.title).join(" | ")}${C.reset}`);
      } else {
        console.log(`      ${C.dim}(aucun résultat)${C.reset}`);
      }
    }
  }

  // ─── Markdown report ───
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  let md = `# Audit recall — search_books_v2\n\n`;
  md += `> Généré le ${now} sur une base de ${snap.total} livres.\n\n`;

  md += `## Définition SQL testée\n\n`;
  md += "```sql\n";
  md += `-- search_books_v2(q text, n integer DEFAULT 10)\n`;
  md += `-- RETURNS SETOF books, LANGUAGE sql, STABLE\n`;
  md += `-- Logique: unaccent+lower sur q et title, LIKE '%mot%', bool_and sur titre,\n`;
  md += `-- bool_or sur auteurs (uniquement si ≤2 mots significatifs), ORDER BY rating_count DESC\n`;
  md += "```\n\n";

  md += `## Inventaire de la base\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Total livres | ${snap.total} |\n`;
  md += `| Sans couverture | ${snap.noCover} (${((snap.noCover / snap.total) * 100).toFixed(1)}%) |\n`;
  md += `| Auteurs null | ${snap.authNull} |\n`;
  md += `| Auteurs [] vide | ${snap.authEmpty} |\n`;
  md += `| Doublons potentiels | ${snap.dupes.length} groupes |\n\n`;

  md += `### Top 20 par rating_count\n\n`;
  md += `| # | Titre | Auteur | rc | Couverture |\n|---|---|---|---|---|\n`;
  snap.top20.forEach((b, i) => {
    md += `| ${i + 1} | ${b.title} | ${(b.authors || [])[0] || "—"} | ${b.rating_count} | ${b.cover_url ? "✅" : "❌"} |\n`;
  });
  md += "\n";

  if (snap.dupes.length) {
    md += `### Doublons potentiels dans la base\n\n`;
    for (const [k, books] of snap.dupes) {
      md += `- **"${k}"** (${books.length} entrées) :\n`;
      for (const b of books) {
        md += `  - ${b.title} — ${(b.authors || [])[0] || "NO AUTHOR"} (cover: ${b.cover_url ? "oui" : "non"}, rc: ${b.rating_count})\n`;
      }
    }
    md += "\n";
  }

  md += `---\n\n## Métriques globales\n\n`;
  md += `| Métrique | Score |\n|---|---|\n`;
  md += `| **Recall@1** | ${recall1}/${testable.length} (${((recall1 / testable.length) * 100).toFixed(1)}%) |\n`;
  md += `| **Recall@3** | ${recall3}/${testable.length} (${((recall3 / testable.length) * 100).toFixed(1)}%) |\n`;
  md += `| Absents | ${absent}/${testable.length} |\n`;
  md += `| Rang > 3 | ${rankGt3}/${testable.length} |\n`;
  md += `| Rang moyen (quand trouvé) | ${avgRank} |\n`;
  md += `| Tests "vide attendu" corrects | ${emptyCorrect}/${emptyTests.length} |\n\n`;

  md += `## Par catégorie\n\n`;
  md += `| Catégorie | Recall@1 | Recall@3 | Absents | Tests vides |\n|---|---|---|---|---|\n`;
  for (const cs of catStats) {
    const r1Str = cs.total ? `${cs.r1}/${cs.total} (${((cs.r1 / cs.total) * 100).toFixed(0)}%)` : "—";
    const r3Str = cs.total ? `${cs.r3}/${cs.total} (${((cs.r3 / cs.total) * 100).toFixed(0)}%)` : "—";
    const emptyStr = cs.emptyTotal ? `${cs.emptyOk}/${cs.emptyTotal}` : "—";
    md += `| ${cs.cat} | ${r1Str} | ${r3Str} | ${cs.absent}/${cs.total} | ${emptyStr} |\n`;
  }
  md += "\n";

  md += `## Résultats détaillés\n\n`;
  for (const cat of categories) {
    md += `### ${cat}\n\n`;
    md += `| Query | Attendu | Score | Résultat #1 | #2 | #3 |\n|---|---|---|---|---|---|\n`;
    for (const r of results.filter(rr => rr.category === cat)) {
      const exp = r.expectEmpty ? "(vide attendu)" : r.expectedTitle;
      const r1 = r.data[0] ? r.data[0].title : "—";
      const r2 = r.data[1] ? r.data[1].title : "—";
      const r3 = r.data[2] ? r.data[2].title : "—";
      md += `| \`${r.query || '""'}\` | ${exp} | ${r.score} | ${r1} | ${r2} | ${r3} |\n`;
    }
    md += "\n";
  }

  md += `## Pires résultats\n\n`;
  if (worst.length === 0) {
    md += "Aucun — tous les résultats sont dans le top 3. 🎉\n\n";
  } else {
    for (const w of worst) {
      md += `### \`${w.query}\`\n\n`;
      md += `- **Attendu** : ${w.expectedTitle} (${w.expectedAuthor || "?"})\n`;
      md += `- **Score** : ${w.score}\n`;
      md += `- **Résultats** (${w.totalResults} total) :\n`;
      if (w.data.length === 0) {
        md += `  - (aucun résultat)\n`;
      } else {
        w.data.slice(0, 5).forEach((d, i) => {
          md += `  ${i + 1}. ${d.title} — ${(d.authors || [])[0] || "?"} (rc: ${d.rating_count})\n`;
        });
      }

      // Diagnostic
      const diag = [];
      if (w.totalResults === 0) {
        const qWords = norm(w.query).split(" ").filter(t => t.length > 2);
        if (qWords.length > 2) diag.push("**>2 mots significatifs** → branche auteurs désactivée, tous les mots doivent matcher dans le titre (bool_and)");
        if (qWords.length === 0) diag.push("**0 mots significatifs** → aucun mot > 2 chars → query ignorée");
        if (w.query.includes("'") || w.query.includes("\u2019")) diag.push("Apostrophe dans la query");
      } else if (w.rank === -1) {
        diag.push("Le livre attendu n'est pas dans les résultats retournés");
        const qWords = norm(w.query).split(" ").filter(t => t.length > 2);
        if (qWords.some(t => norm(w.expectedAuthor || "").includes(t))) {
          diag.push("Un mot de la query correspond à l'auteur, pas au titre → branche auteurs peut-être désactivée (>2 mots)");
        }
      } else {
        diag.push(`Trouvé mais rang ${w.rank} — le tri par rating_count a fait remonter d'autres livres`);
      }
      if (diag.length) {
        md += `- **Diagnostic** : ${diag.join(" ; ")}\n`;
      }
      md += "\n";
    }
  }

  if (dupeFindings.length) {
    md += `## Doublons détectés dans les résultats\n\n`;
    const seen = new Set();
    for (const d of dupeFindings) {
      const k = `${norm(d.title)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      md += `- Query \`${d.query}\` → "${d.orig.title}" et "${d.dup.title}" (même titre normalisé)\n`;
    }
    md += "\n";
  }

  md += `## Bugs connus confirmés par l'audit\n\n`;
  md += `1. **>2 mots significatifs → branche auteurs désactivée** : la condition \`(SELECT count(*) FROM significant) <= 2\` `;
  md += `empêche le matching auteur dès que la query a 3+ tokens (ex: "camus etranger" = 2 mots OK, "Victor Hugo Les Misérables" = 4 mots KO).\n`;
  md += `2. **Mots courts ignorés** : les tokens ≤2 caractères sont filtrés par \`length(w) > 2\`. `;
  md += `Les queries comme "le", "la", "du" produisent 0 mots significatifs → \`bool_and(NULL)\` = rien.\n`;
  md += `3. **Pas de scoring de pertinence** : tri uniquement par \`rating_count DESC\`, pas de pondération titre exact vs partiel.\n`;
  md += `4. **ISBN non recherché** : la RPC ne cherche que dans title et authors, pas dans isbn_13.\n\n`;

  md += `## Recommandations\n\n`;
  md += `### Priorité haute\n\n`;
  md += `1. **Supprimer la limite ≤2 mots sur la branche auteurs** — ou mieux, utiliser un scoring combiné :\n`;
  md += `   - Score titre = nombre de mots matchés / nombre de mots significatifs\n`;
  md += `   - Score auteur = idem\n`;
  md += `   - Score total = max(score_titre, score_auteur * 0.8)\n`;
  md += `   - Permettrait "camus etranger", "Victor Hugo Les Misérables", "Flaubert Bovary"\n\n`;
  md += `2. **Abaisser le seuil de mots significatifs** à \`length(w) > 1\` au lieu de \`> 2\` :\n`;
  md += `   - Permettrait de trouver "Du côté de chez Swann" avec la query "du cote"\n`;
  md += `   - Garder \`> 2\` exclut des tokens comme "vu", "lu", "un" qui sont du bruit, mais aussi des tokens utiles\n\n`;
  md += `3. **Scoring hybride titre × auteur** (cross-field) pour ne pas exiger que TOUS les mots soient dans le même champ.\n\n`;

  md += `### Priorité moyenne\n\n`;
  md += `4. **Ajouter un fallback ISBN** : \`OR b.isbn_13 = q\` (si la query ressemble à un ISBN)\n`;
  md += `5. **Trigrams** (\`pg_trgm\`) pour le matching fuzzy et le scoring de pertinence\n`;
  md += `6. **Boost exact match** : si le titre normalisé = query normalisée, score maximal\n\n`;

  md += `### Priorité basse\n\n`;
  md += `7. **ts_vector / FTS** PostgreSQL pour un vrai scoring BM25-like (long terme)\n`;
  md += `8. **Recherche partielle sur slug** : \`b.slug LIKE '%' || slugify(q) || '%'\`\n`;

  return md;
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Audit recall — search_books_v2          ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  const snap = await snapshot();
  const results = await runTests();
  const md = generateReport(snap, results);

  const reportPath = resolve(ROOT, "reports", "search-recall-audit.md");
  mkdirSync(resolve(ROOT, "reports"), { recursive: true });
  writeFileSync(reportPath, md, "utf-8");

  console.log(`\n  ${C.green}✓${C.reset} Rapport écrit : ${C.bold}reports/search-recall-audit.md${C.reset}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
