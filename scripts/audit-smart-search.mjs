#!/usr/bin/env node

/**
 * Audit ROI smart-search (Haiku)
 *
 * Analyse la table search_cache pour mesurer l'utilisation réelle,
 * estimer le coût, et recommander des optimisations.
 *
 * Usage: node scripts/audit-smart-search.mjs
 * Génère: reports/smart-search-roi.md
 */

import { createClient } from "@supabase/supabase-js";
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
const SUPABASE_URL = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_KEY || env.VITE_SUPABASE_SERVICE_KEY;
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

// Coût Haiku 4.5 : ~$0.80/1M input, ~$4/1M output
// Estimation conservatrice : ~500 input tokens + ~200 output tokens par appel
const COST_PER_CALL = (500 * 0.80 + 200 * 4.0) / 1_000_000; // ~$0.0012

// ═══════════════════════════════════════════════
// Étape 1 — Analyse search_cache
// ═══════════════════════════════════════════════

async function analyzeCache() {
  console.log(`\n${C.bold}═══ ÉTAPE 1 : Analyse search_cache ═══${C.reset}\n`);

  // Fetch all cache entries
  const { data: allEntries, error } = await supabase
    .from("search_cache")
    .select("query_normalized, response, hit_count, created_at, expires_at")
    .order("hit_count", { ascending: false });

  if (error) {
    console.error("Erreur:", error.message);
    process.exit(1);
  }

  const now = new Date();
  const total = allEntries.length;
  const active = allEntries.filter(e => new Date(e.expires_at) >= now).length;
  const expired = total - active;

  console.log(`  Total entrées  : ${C.bold}${total}${C.reset}`);
  console.log(`  Actives        : ${active}`);
  console.log(`  Expirées       : ${expired}`);

  // hit_count distribution
  // Note: hit_count starts at 1 on creation, incremented on each cache read
  // So hit_count=1 means 0 cache reads, hit_count=2 means 1 cache read, etc.
  const buckets = { "1 (jamais relu)": 0, "2-3": 0, "4-10": 0, "11+": 0 };
  for (const e of allEntries) {
    const h = e.hit_count || 1;
    if (h <= 1) buckets["1 (jamais relu)"]++;
    else if (h <= 3) buckets["2-3"]++;
    else if (h <= 10) buckets["4-10"]++;
    else buckets["11+"]++;
  }

  console.log(`\n  ${C.dim}Distribution hit_count :${C.reset}`);
  for (const [bucket, count] of Object.entries(buckets)) {
    const pct = total ? ((count / total) * 100).toFixed(1) : "0";
    const bar = "█".repeat(Math.round(count / total * 40));
    console.log(`    ${bucket.padEnd(20)} ${String(count).padStart(4)} (${pct}%) ${C.dim}${bar}${C.reset}`);
  }

  // Cache hit rate: each entry = 1 initial miss (Haiku call)
  // Total reads from cache = sum(hit_count - 1) for all entries (because hit_count=1 is the initial write)
  const totalCacheReads = allEntries.reduce((sum, e) => sum + Math.max(0, (e.hit_count || 1) - 1), 0);
  const totalRequests = total + totalCacheReads; // initial misses + cache reads
  const cacheHitRate = totalRequests > 0 ? (totalCacheReads / totalRequests * 100).toFixed(1) : "0";

  console.log(`\n  Appels Haiku (misses)  : ${total}`);
  console.log(`  Lectures cache (hits)  : ${totalCacheReads}`);
  console.log(`  ${C.bold}Taux de cache hit${C.reset}      : ${C.bold}${cacheHitRate}%${C.reset}`);

  // Top 20 queries
  const top20 = allEntries.slice(0, 20);
  console.log(`\n  ${C.dim}Top 20 queries par hit_count :${C.reset}`);
  top20.forEach((e, i) => {
    const books = e.response?.books || [];
    const ghost = e.response?.ghost ? "👻" : "";
    console.log(`    ${String(i + 1).padStart(2)}. "${e.query_normalized}" ${C.dim}hits:${e.hit_count} livres:${books.length} ${ghost}${C.reset}`);
  });

  // Empty responses
  const emptyResponses = allEntries.filter(e => {
    const books = e.response?.books;
    return !books || books.length === 0;
  }).length;
  const emptyPct = total ? ((emptyResponses / total) * 100).toFixed(1) : "0";
  console.log(`\n  Réponses vides (0 livre) : ${emptyResponses}/${total} (${emptyPct}%)`);

  // Book count distribution
  const bookCounts = {};
  for (const e of allEntries) {
    const n = e.response?.books?.length || 0;
    bookCounts[n] = (bookCounts[n] || 0) + 1;
  }

  // Ghost text stats
  const withGhost = allEntries.filter(e => e.response?.ghost && e.response.ghost.trim()).length;
  const ghostPct = total ? ((withGhost / total) * 100).toFixed(1) : "0";
  console.log(`  Avec ghost text         : ${withGhost}/${total} (${ghostPct}%)`);

  // Cost estimation
  const estimatedCost = (total * COST_PER_CALL).toFixed(2);
  const costPerEffective = totalRequests > 0 ? (total * COST_PER_CALL / totalRequests * 1000).toFixed(2) : "0";
  console.log(`\n  ${C.bold}Coût estimé total${C.reset}     : $${estimatedCost}`);
  console.log(`  Coût/1000 requêtes eff. : $${costPerEffective}`);

  // Age distribution
  const ageHours = allEntries.map(e => (now - new Date(e.created_at)) / (1000 * 60 * 60));
  const last24h = ageHours.filter(h => h <= 24).length;
  const last7d = ageHours.filter(h => h <= 168).length;

  console.log(`\n  Entrées < 24h  : ${last24h}`);
  console.log(`  Entrées < 7j   : ${last7d}`);

  return {
    allEntries, total, active, expired,
    buckets, totalCacheReads, cacheHitRate, totalRequests,
    top20, emptyResponses, emptyPct,
    bookCounts, withGhost, ghostPct,
    estimatedCost, costPerEffective,
    last24h, last7d,
  };
}

// ═══════════════════════════════════════════════
// Étape 2 — Qualité des résultats IA
// ═══════════════════════════════════════════════

async function analyzeQuality(allEntries) {
  console.log(`\n${C.bold}═══ ÉTAPE 2 : Qualité des résultats IA ═══${C.reset}\n`);

  // Analyze top 30 entries by hit_count (most impactful)
  const top30 = allEntries
    .filter(e => e.response?.books?.length > 0)
    .slice(0, 30);

  let totalBooks = 0;
  let inDB = 0;
  let notInDB = 0;
  const details = [];

  for (const entry of top30) {
    const books = entry.response.books || [];
    const entryDetail = { query: entry.query_normalized, hits: entry.hit_count, books: [] };

    for (const aiBook of books) {
      totalBooks++;
      const titleNorm = norm(aiBook.title);
      if (!titleNorm) { notInDB++; continue; }

      // Search in DB by normalized title
      const { data } = await supabase
        .from("books")
        .select("id, title, authors, slug")
        .ilike("title", `%${titleNorm.split(" ").filter(w => w.length > 3).slice(0, 3).join("%")}%`)
        .limit(3);

      // Check if any result is a real match
      const match = (data || []).find(b => {
        const bn = norm(b.title);
        return bn === titleNorm || bn.includes(titleNorm) || titleNorm.includes(bn);
      });

      if (match) {
        inDB++;
        entryDetail.books.push({ ...aiBook, _inDB: true, _dbTitle: match.title });
      } else {
        notInDB++;
        entryDetail.books.push({ ...aiBook, _inDB: false });
      }
    }
    details.push(entryDetail);
  }

  const redundantPct = totalBooks > 0 ? ((inDB / totalBooks) * 100).toFixed(1) : "0";
  const uniquePct = totalBooks > 0 ? ((notInDB / totalBooks) * 100).toFixed(1) : "0";

  console.log(`  Livres IA analysés     : ${totalBooks} (top 30 queries)`);
  console.log(`  ${C.yellow}Redondants avec DB${C.reset}   : ${inDB} (${redundantPct}%)`);
  console.log(`  ${C.green}Uniques (valeur ajoutée)${C.reset} : ${notInDB} (${uniquePct}%)`);

  // Show some examples
  console.log(`\n  ${C.dim}Exemples redondants (IA suggère un livre déjà en base) :${C.reset}`);
  let shown = 0;
  for (const d of details) {
    for (const b of d.books) {
      if (b._inDB && shown < 5) {
        console.log(`    "${d.query}" → IA: "${b.title}" ${C.dim}= DB: "${b._dbTitle}"${C.reset}`);
        shown++;
      }
    }
  }

  console.log(`\n  ${C.dim}Exemples uniques (IA apporte de la valeur) :${C.reset}`);
  shown = 0;
  for (const d of details) {
    for (const b of d.books) {
      if (!b._inDB && shown < 5) {
        console.log(`    "${d.query}" → IA: "${b.title}" ${C.dim}(pas en base)${C.reset}`);
        shown++;
      }
    }
  }

  // Ghost text examples
  const ghostExamples = allEntries
    .filter(e => e.response?.ghost?.trim())
    .slice(0, 5)
    .map(e => ({ query: e.query_normalized, ghost: e.response.ghost }));

  if (ghostExamples.length) {
    console.log(`\n  ${C.dim}Exemples ghost text :${C.reset}`);
    ghostExamples.forEach(g => console.log(`    "${g.query}" → "${g.ghost}"`));
  }

  return { totalBooks, inDB, notInDB, redundantPct, uniquePct, details, ghostExamples };
}

// ═══════════════════════════════════════════════
// Étape 3 — Rapport
// ═══════════════════════════════════════════════

function generateReport(cache, quality) {
  console.log(`\n${C.bold}═══ ÉTAPE 3 : Génération du rapport ═══${C.reset}`);

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  let md = `# Audit ROI smart-search (Haiku)\n\n`;
  md += `> Généré le ${now}. Analyse de la table \`search_cache\`.\n\n`;

  // Section 1: Métriques d'utilisation
  md += `## 1. Métriques d'utilisation\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Total entrées cache | ${cache.total} |\n`;
  md += `| Actives (non expirées) | ${cache.active} |\n`;
  md += `| Expirées | ${cache.expired} |\n`;
  md += `| Appels Haiku (misses) | ${cache.total} |\n`;
  md += `| Lectures cache (hits) | ${cache.totalCacheReads} |\n`;
  md += `| **Taux de cache hit** | **${cache.cacheHitRate}%** |\n`;
  md += `| Entrées < 24h | ${cache.last24h} |\n`;
  md += `| Entrées < 7 jours | ${cache.last7d} |\n\n`;

  md += `### Distribution hit_count\n\n`;
  md += `> hit_count=1 signifie 0 relectures du cache (Haiku appelé puis jamais relu).\n\n`;
  md += `| Bucket | Entrées | % |\n|---|---|---|\n`;
  for (const [bucket, count] of Object.entries(cache.buckets)) {
    const pct = cache.total ? ((count / cache.total) * 100).toFixed(1) : "0";
    md += `| ${bucket} | ${count} | ${pct}% |\n`;
  }
  md += `\n`;

  md += `### Distribution nombre de livres par réponse\n\n`;
  md += `| Livres retournés | Entrées |\n|---|---|\n`;
  for (const [n, count] of Object.entries(cache.bookCounts).sort((a, b) => a[0] - b[0])) {
    md += `| ${n} | ${count} |\n`;
  }
  md += `\n`;

  md += `### Top 20 queries\n\n`;
  md += `| # | Query | Hits | Livres | Ghost |\n|---|---|---|---|---|\n`;
  cache.top20.forEach((e, i) => {
    const books = e.response?.books?.length || 0;
    const ghost = e.response?.ghost ? "✅" : "—";
    md += `| ${i + 1} | \`${e.query_normalized}\` | ${e.hit_count} | ${books} | ${ghost} |\n`;
  });
  md += `\n`;

  md += `### Coût estimé\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Coût/appel Haiku (est.) | $${COST_PER_CALL.toFixed(4)} |\n`;
  md += `| Coût total (${cache.total} appels) | $${cache.estimatedCost} |\n`;
  md += `| Coût/1000 requêtes effectives | $${cache.costPerEffective} |\n`;
  md += `| Requêtes effectives totales | ${cache.totalRequests} |\n\n`;

  // Section 2: Qualité
  md += `## 2. Qualité des résultats IA\n\n`;
  md += `Analyse des ${quality.totalBooks} livres suggérés par Haiku sur les 30 queries les plus fréquentes.\n\n`;
  md += `| Métrique | Valeur |\n|---|---|\n`;
  md += `| Réponses vides (0 livre) | ${cache.emptyResponses}/${cache.total} (${cache.emptyPct}%) |\n`;
  md += `| Avec ghost text | ${cache.withGhost}/${cache.total} (${cache.ghostPct}%) |\n`;
  md += `| **Redondants avec DB** | **${quality.inDB}/${quality.totalBooks} (${quality.redundantPct}%)** |\n`;
  md += `| **Uniques (valeur ajoutée)** | **${quality.notInDB}/${quality.totalBooks} (${quality.uniquePct}%)** |\n\n`;

  md += `### Exemples redondants\n\n`;
  md += `Livres suggérés par Haiku qui sont déjà en base (l'IA n'apporte rien) :\n\n`;
  let shown = 0;
  for (const d of quality.details) {
    for (const b of d.books) {
      if (b._inDB && shown < 10) {
        md += `- \`${d.query}\` → IA: "${b.title}" = DB: "${b._dbTitle}"\n`;
        shown++;
      }
    }
  }
  md += `\n`;

  md += `### Exemples uniques\n\n`;
  md += `Livres suggérés par Haiku qui ne sont PAS en base (valeur ajoutée) :\n\n`;
  shown = 0;
  for (const d of quality.details) {
    for (const b of d.books) {
      if (!b._inDB && shown < 10) {
        md += `- \`${d.query}\` → IA: "${b.title}" par ${b.author || "?"}\n`;
        shown++;
      }
    }
  }
  md += `\n`;

  if (quality.ghostExamples.length) {
    md += `### Ghost text (exemples)\n\n`;
    for (const g of quality.ghostExamples) {
      md += `- \`${g.query}\` → \`${g.ghost}\`\n`;
    }
    md += `\n`;
  }

  // Section 3: Recommandations
  md += `## 3. Recommandations\n\n`;

  const hitRate = parseFloat(cache.cacheHitRate);
  const redundantRate = parseFloat(quality.redundantPct);
  const emptyRate = parseFloat(cache.emptyPct);

  // Cache performance
  if (hitRate > 50) {
    md += `### ✅ Cache performant (${cache.cacheHitRate}% hit rate)\n\n`;
    md += `Le cache fonctionne bien — chaque appel Haiku sert en moyenne ${(cache.totalCacheReads / Math.max(cache.total, 1)).toFixed(1)} lectures supplémentaires. `;
    md += `Le coût effectif par requête est bas ($${cache.costPerEffective}/1000).\n\n`;
  } else if (hitRate > 20) {
    md += `### ⚠️ Cache modéré (${cache.cacheHitRate}% hit rate)\n\n`;
    md += `Le cache a un taux de hit moyen. Les queries sont variées et rarement répétées. `;
    md += `Considérer allonger le TTL de 7 à 30 jours pour les entrées populaires (hit_count > 3).\n\n`;
  } else {
    md += `### ❌ Cache peu utilisé (${cache.cacheHitRate}% hit rate)\n\n`;
    md += `La majorité des entrées ne sont jamais relues du cache. Soit la base de queries est très diverse, `;
    md += `soit les utilisateurs ne répètent pas les mêmes recherches. Le TTL de 7 jours est probablement suffisant.\n\n`;
  }

  // Redundancy
  if (redundantRate > 60) {
    md += `### ⚠️ Forte redondance IA/DB (${quality.redundantPct}%)\n\n`;
    md += `Plus de la moitié des livres suggérés par Haiku existent déjà en base. `;
    md += `La skip logic Agent 2 (désactivation quand DB ≥ 3) devrait réduire ce taux. `;
    md += `**Action** : vérifier après quelques jours que les nouvelles entrées cache (post-skip) `;
    md += `sont moins redondantes que les anciennes.\n\n`;
  } else if (redundantRate > 30) {
    md += `### ⚠️ Redondance modérée IA/DB (${quality.redundantPct}%)\n\n`;
    md += `Environ un tiers des suggestions IA sont redondantes. C'est normal — Haiku recommande les classiques `;
    md += `qui sont aussi les plus présents en base. La skip logic devrait aider.\n\n`;
  } else {
    md += `### ✅ Faible redondance IA/DB (${quality.redundantPct}%)\n\n`;
    md += `La majorité des suggestions IA apportent de la valeur (livres pas en base). Smart-search est utile.\n\n`;
  }

  // Empty responses
  if (emptyRate > 30) {
    md += `### ⚠️ Taux de réponses vides élevé (${cache.emptyPct}%)\n\n`;
    md += `Haiku est appelé trop souvent sur des queries non-pertinentes. `;
    md += `**Action** : renforcer le filtre \`looksLikeNaturalLanguage()\` ou augmenter la longueur minimum de query.\n\n`;
  } else {
    md += `### ✅ Peu de réponses vides (${cache.emptyPct}%)\n\n`;
    md += `Haiku retourne presque toujours des résultats pertinents. Le filtre d'activation fonctionne.\n\n`;
  }

  // Actionable recommendations
  md += `### Actions concrètes\n\n`;
  if (cache.expired > 0) {
    md += `1. **Purger le cache expiré** : ${cache.expired} entrées expirées (normalement nettoyées par pg_cron horaire, vérifier que le cron tourne)\n`;
  }
  md += `2. **Allonger le TTL** pour les queries populaires : les entrées avec hit_count ≥ 5 pourraient avoir un TTL de 30 jours\n`;
  md += `3. **Mesurer l'impact Agent 2** : dans 7 jours, relancer cet audit et comparer le volume de nouvelles entrées\n`;
  md += `4. **Pré-filtre titre exact** : si la query matche exactement un titre en base, ne pas appeler Haiku\n`;
  md += `5. **Dashboard** : si le volume augmente, créer une vue Supabase pour monitorer le cache en continu\n`;

  return md;
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Audit ROI — smart-search (Haiku)        ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════╝${C.reset}`);

  const cache = await analyzeCache();
  const quality = await analyzeQuality(cache.allEntries);
  const md = generateReport(cache, quality);

  const reportPath = resolve(ROOT, "reports", "smart-search-roi.md");
  mkdirSync(resolve(ROOT, "reports"), { recursive: true });
  writeFileSync(reportPath, md, "utf-8");

  console.log(`\n  ${C.green}✓${C.reset} Rapport écrit : ${C.bold}reports/smart-search-roi.md${C.reset}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
