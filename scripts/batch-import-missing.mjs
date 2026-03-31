#!/usr/bin/env node

/**
 * Import batch des livres manquants identifiés par identify-missing-books.mjs.
 *
 * Modes :
 *   --dry-run       (défaut) affiche ce qui serait importé
 *   --apply         importe réellement
 *   --limit N       limite à N livres
 *   --source edge   utilise book_import edge function (ISBN requis, consomme Google)
 *   --source direct insère directement via BnF+OL (0 appel Google, ISBN requis)
 *   --source google cherche sur Google d'abord pour trouver ISBN (pour les livres sans ISBN)
 *
 * Usage:
 *   node scripts/batch-import-missing.mjs --dry-run
 *   node scripts/batch-import-missing.mjs --apply --limit 20
 *   node scripts/batch-import-missing.mjs --apply --source direct --limit 50
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "fs";
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
const GOOGLE_KEY = env.VITE_GOOGLE_BOOKS_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Missing env"); process.exit(1); }
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// Args
// ═══════════════════════════════════════════════

const args = process.argv.slice(2);
const DRY_RUN = !args.includes("--apply");
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) || Infinity : Infinity;
const sourceIdx = args.indexOf("--source");
const SOURCE = sourceIdx >= 0 ? args[sourceIdx + 1] : "edge";

// ═══════════════════════════════════════════════
// Anti-doublons (mirrors deduplicateBook.js)
// ═══════════════════════════════════════════════

function normalizeTitle(title) {
  return title
    .replace(/[\u2018\u2019\u201A\u2039\u203A''`]/g, " ")
    .toLowerCase().trim()
    .split(/\s*[:/]\s/)[0]
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function extractLastName(authors) {
  if (!authors?.length) return null;
  let name = authors[0].replace(/\([^)]*\)/g, "").replace(/\.\s*[A-Z].*$/, "").trim();
  if (name.includes(",")) name = name.split(",")[0].trim();
  else { const p = name.split(/\s+/); name = p[p.length - 1]; }
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function findExisting(title, authors, isbn13) {
  if (isbn13) {
    const { data } = await supabase.from("books").select("id, title, slug")
      .eq("isbn_13", isbn13.replace(/-/g, "")).limit(1).maybeSingle();
    if (data) return data;
  }
  if (!title) return null;
  const nt = normalizeTitle(title);
  const firstWord = nt.split(" ")[0];
  if (firstWord.length < 2) return null;
  const authorLast = extractLastName(authors ? [authors].flat() : null);

  const { data: candidates } = await supabase.from("books").select("id, title, slug, authors")
    .ilike("title", `%${firstWord}%`).limit(20);
  if (!candidates?.length) return null;

  for (const c of candidates) {
    if (normalizeTitle(c.title) !== nt) continue;
    const cAuthor = extractLastName(Array.isArray(c.authors) ? c.authors : null);
    if (!authorLast || !cAuthor || cAuthor === authorLast) return c;
  }
  return null;
}

// ═══════════════════════════════════════════════
// Slug generation (mirrors slugify.js)
// ═══════════════════════════════════════════════

function slugify(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function generateSlug(title, authors, year) {
  const check = async (s) => {
    const { data } = await supabase.from("books").select("id").eq("slug", s).limit(1).maybeSingle();
    return !!data;
  };
  const base = slugify(title);
  if (!base) return `book-${Date.now()}`;
  if (!(await check(base))) return base;
  const lastName = (authors || [])[0]?.split(" ").pop();
  if (lastName) {
    const wa = `${base}-${slugify(lastName)}`;
    if (wa !== base && !(await check(wa))) return wa;
    const y = year?.toString().slice(0, 4);
    if (y) { const wy = `${wa}-${y}`; if (!(await check(wy))) return wy; }
  }
  for (let i = 2; i <= 100; i++) { if (!(await check(`${base}-${i}`))) return `${base}-${i}`; }
  return `${base}-${Date.now()}`;
}

// ═══════════════════════════════════════════════
// Source: Edge function book_import (ISBN → 3 sources)
// ═══════════════════════════════════════════════

async function importViaEdge(isbn) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/book_import`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isbn }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  return await res.json();
}

// ═══════════════════════════════════════════════
// Source: Direct insert via BnF + Open Library (0 Google)
// ═══════════════════════════════════════════════

async function fetchBnFByISBN(isbn) {
  try {
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn+adj+"${isbn}"&recordSchema=dublincore&maximumRecords=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const xml = await res.text();
    if (xml.includes("<srw:numberOfRecords>0</srw:numberOfRecords>")) return null;

    const get = (name) => { const m = xml.match(new RegExp(`<dc:${name}[^>]*>([^<]*)</dc:${name}>`, "i")); return m ? m[1].trim() : null; };
    const getAll = (name) => { const re = new RegExp(`<dc:${name}[^>]*>([^<]*)</dc:${name}>`, "gi"); const out = []; let m; while ((m = re.exec(xml)) !== null) out.push(m[1].trim()); return out; };

    const rawTitle = get("title");
    if (!rawTitle) return null;
    const title = rawTitle.split(/ : | \/ /)[0].trim();

    const creators = getAll("creator").map(raw => {
      let s = raw.replace(/\.\s+.+$/, "").trim().replace(/\s*\([^)]*\)/g, "").trim();
      const parts = s.split(",").map(p => p.trim());
      return parts.length === 2 && parts[1] ? `${parts[1]} ${parts[0]}` : parts[0];
    });

    const format = get("format");
    const pageMatch = format?.match(/(\d+)\s*p/);

    return {
      title,
      authors: creators.length > 0 ? creators : null,
      publisher: get("publisher"),
      publication_date: get("date"),
      page_count: pageMatch ? parseInt(pageMatch[1]) : null,
      language: get("language") || "fr",
    };
  } catch { return null; }
}

async function fetchOLByISBN(isbn) {
  try {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json();
    const entry = data[`ISBN:${isbn}`];
    if (!entry) return null;
    return {
      title: entry.title || null,
      authors: entry.authors?.map(a => a.name) || null,
      publisher: entry.publishers?.[0]?.name || null,
      page_count: entry.number_of_pages || null,
      cover_url: entry.cover?.large || entry.cover?.medium || null,
      description: entry.notes || null,
    };
  } catch { return null; }
}

async function importDirect(book) {
  const isbn = book.isbn13?.replace(/-/g, "");
  if (!isbn) return { error: "no ISBN for direct import" };

  const [bnf, ol] = await Promise.all([
    fetchBnFByISBN(isbn).catch(() => null),
    fetchOLByISBN(isbn).catch(() => null),
  ]);

  // Merge: BnF > OL > curated list for metadata
  const pick = (...vals) => vals.find(v => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)) || null;
  const title = pick(bnf?.title, ol?.title, book.title) || book.title;
  const authors = pick(bnf?.authors, ol?.authors, book.author ? [book.author] : null) || [];
  const publisher = pick(bnf?.publisher, ol?.publisher);
  const pubDate = pick(bnf?.publication_date);
  const pageCount = pick(ol?.page_count, bnf?.page_count);
  const coverUrl = pick(ol?.cover_url);
  const description = pick(ol?.description);

  const slug = await generateSlug(title, authors, pubDate);

  const { data, error } = await supabase
    .from("books")
    .insert({
      isbn_13: isbn,
      title,
      authors,
      publisher,
      publication_date: pubDate,
      page_count: pageCount,
      cover_url: coverUrl,
      description,
      language: bnf?.language || "fr",
      source: "bnf_ol_batch",
      slug,
    })
    .select("id, title, slug")
    .single();

  if (error) return { error: error.message };
  return data;
}

// ═══════════════════════════════════════════════
// Source: Google search → find ISBN → edge import
// ═══════════════════════════════════════════════

async function importViaGoogle(book) {
  const q = `intitle:${book.title}${book.author ? `+inauthor:${book.author}` : ""}`;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=fr&maxResults=3${GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ""}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { error: `Google HTTP ${res.status}` };
    const data = await res.json();
    const items = data.items || [];

    // Find first item with ISBN-13
    for (const it of items) {
      const v = it.volumeInfo || {};
      const isbn = (v.industryIdentifiers || []).find(i => i.type === "ISBN_13");
      if (isbn?.identifier) {
        // Use edge function with found ISBN
        return await importViaEdge(isbn.identifier);
      }
    }

    // No ISBN found — try direct insert from Google data
    const first = items[0]?.volumeInfo;
    if (!first) return { error: "Google: no results" };

    const cover = (first.imageLinks?.thumbnail || "")
      .replace("http://", "https://").replace("&zoom=1", "&zoom=2").replace("&edge=curl", "") || null;

    const slug = await generateSlug(first.title, first.authors || [], first.publishedDate);

    const { data: inserted, error } = await supabase
      .from("books")
      .insert({
        title: first.title,
        authors: first.authors || [],
        publisher: first.publisher || null,
        publication_date: first.publishedDate || null,
        page_count: first.pageCount || null,
        cover_url: cover,
        description: first.description || null,
        language: first.language || "fr",
        source: "google_batch",
        slug,
      })
      .select("id, title, slug")
      .single();

    if (error) return { error: error.message };
    return inserted;
  } catch (e) {
    return { error: e.message };
  }
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  const missingPath = resolve(ROOT, "reports", "missing-books.json");
  if (!existsSync(missingPath)) {
    console.error("❌ reports/missing-books.json introuvable. Lancez d'abord :");
    console.error("   node scripts/identify-missing-books.mjs");
    process.exit(1);
  }

  const missing = JSON.parse(readFileSync(missingPath, "utf-8"));

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Import batch — livres manquants                 ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);

  console.log(`  Mode      : ${DRY_RUN ? `${C.yellow}DRY-RUN${C.reset} (rien ne sera importé)` : `${C.red}APPLY${C.reset} (import réel !)`}`);
  console.log(`  Source    : ${SOURCE}`);
  console.log(`  Limite    : ${LIMIT === Infinity ? "aucune" : LIMIT}`);
  console.log(`  Candidats : ${missing.length}`);

  // Filter based on source capability
  let candidates = missing;
  if (SOURCE === "edge" || SOURCE === "direct") {
    candidates = missing.filter(b => b.isbn13);
  }
  candidates = candidates.slice(0, LIMIT);

  console.log(`  À traiter : ${candidates.length}${SOURCE !== "google" ? ` (avec ISBN uniquement)` : ""}\n`);

  if (DRY_RUN) {
    console.log(`  ${C.dim}── Dry-run : voici ce qui serait importé ──${C.reset}\n`);
    const stats = { edge: 0, direct: 0, google: 0 };
    for (const b of candidates) {
      const method = b.isbn13 ? (SOURCE === "direct" ? "direct" : "edge") : "google";
      stats[method]++;
      console.log(`    ${b.isbn13 ? C.green + "ISBN" + C.reset : C.yellow + "SEARCH" + C.reset} [${b.priority}] "${b.title}" — ${b.author} ${C.dim}(${b.category})${C.reset}`);
    }
    console.log(`\n  ${C.bold}Plan d'import :${C.reset}`);
    console.log(`    Via edge function (ISBN → Google+BnF+OL) : ${stats.edge}`);
    console.log(`    Via direct (ISBN → BnF+OL, 0 Google)     : ${stats.direct}`);
    console.log(`    Via Google search (cherche ISBN)          : ${stats.google}`);
    console.log(`    Google API calls estimés                  : ${stats.edge + stats.google}`);
    console.log(`\n  ${C.dim}Pour importer : node scripts/batch-import-missing.mjs --apply [--limit N]${C.reset}\n`);

    // Generate enrichment plan report
    generateReport(missing, candidates, stats);
    return;
  }

  // ═══ APPLY MODE ═══
  const log = [];
  let imported = 0, skipped = 0, failed = 0;

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${candidates.length}] ${b.title.padEnd(40).slice(0, 40)}`);

    // Double-check dedup
    const existing = await findExisting(b.title, b.author ? [b.author] : null, b.isbn13);
    if (existing) {
      skipped++;
      log.push({ ...b, status: "already_exists", dbId: existing.id, dbTitle: existing.title });
      await sleep(100);
      continue;
    }

    let result;
    try {
      if (SOURCE === "direct" && b.isbn13) {
        result = await importDirect(b);
      } else if (SOURCE === "google" && !b.isbn13) {
        result = await importViaGoogle(b);
      } else if (b.isbn13) {
        result = await importViaEdge(b.isbn13);
      } else {
        result = await importViaGoogle(b);
      }
    } catch (e) {
      result = { error: e.message };
    }

    if (result?.error) {
      failed++;
      log.push({ ...b, status: "error", error: result.error });
      process.stdout.write(`\r  ${C.red}✗${C.reset} "${b.title}" — ${result.error}\n`);
    } else if (result?.id) {
      imported++;
      log.push({ ...b, status: "imported", dbId: result.id, slug: result.slug });
      process.stdout.write(`\r  ${C.green}✓${C.reset} "${b.title}" → ${result.slug || result.id}\n`);
    } else {
      failed++;
      log.push({ ...b, status: "unknown", result });
      process.stdout.write(`\r  ${C.yellow}?${C.reset} "${b.title}" — réponse inattendue\n`);
    }

    // Rate limiting
    await sleep(SOURCE === "direct" ? 500 : 1000);
  }

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}`);
  console.log(`  ${C.green}Importés${C.reset}   : ${imported}`);
  console.log(`  ${C.yellow}Skippés${C.reset}    : ${skipped} (déjà en base)`);
  console.log(`  ${C.red}Erreurs${C.reset}    : ${failed}`);
  console.log(`  Total       : ${candidates.length}\n`);

  // Save log
  writeFileSync(
    resolve(ROOT, "reports", "batch-import-log.json"),
    JSON.stringify(log, null, 2),
  );
  console.log(`  ${C.dim}Log → reports/batch-import-log.json${C.reset}\n`);
}

function generateReport(allMissing, candidates, stats) {
  const withISBN = allMissing.filter(b => b.isbn13).length;
  const noISBN = allMissing.length - withISBN;
  const high = allMissing.filter(m => m.priority === "high").length;
  const medium = allMissing.filter(m => m.priority === "medium").length;
  const low = allMissing.filter(m => m.priority === "low").length;

  const catStats = {};
  for (const b of allMissing) {
    catStats[b.category] = (catStats[b.category] || 0) + 1;
  }

  const report = `# Plan d'enrichissement — Base Reliure

> Généré le ${new Date().toISOString().slice(0, 10)}. Basé sur l'analyse de ~200 livres curatés + cache smart-search.

## 1. Inventaire des manquants

| Métrique | Valeur |
|---|---|
| Total manquants identifiés | ${allMissing.length} |
| Priorité haute (cherchés + curatés) | ${high} |
| Priorité moyenne (ISBN connu) | ${medium} |
| Priorité basse (pas d'ISBN) | ${low} |
| Avec ISBN (importables directement) | ${withISBN} |
| Sans ISBN (recherche Google nécessaire) | ${noISBN} |

### Par catégorie

| Catégorie | Manquants |
|---|---|
${Object.entries(catStats).sort((a, b) => b[1] - a[1]).map(([cat, count]) => `| ${cat} | ${count} |`).join("\n")}

### Top 20 manquants

| # | Titre | Auteur | ISBN | Priorité | Catégorie |
|---|---|---|---|---|---|
${allMissing.slice(0, 20).map((b, i) => `| ${i + 1} | ${b.title} | ${b.author} | ${b.isbn13 || "—"} | ${b.priority} | ${b.category} |`).join("\n")}

## 2. Plan d'import

### Option A : Via edge function \`book_import\` (recommandé)
- **${withISBN} livres** importables directement par ISBN
- Consomme ~${withISBN} appels Google Books (1 par livre)
- Enrichissement automatique BnF + Open Library
- Qualité maximale (fusion 3 sources)
- Commande : \`node scripts/batch-import-missing.mjs --apply --source edge --limit ${Math.min(withISBN, 50)}\`

### Option B : Via BnF + Open Library (0 Google)
- **${withISBN} livres** importables sans Google
- Métadonnées BnF excellentes (éditeur, date, pages)
- Couvertures via Open Library (variable)
- Commande : \`node scripts/batch-import-missing.mjs --apply --source direct --limit ${Math.min(withISBN, 50)}\`

### Option C : Import complet (avec recherche Google pour les sans-ISBN)
- **${allMissing.length} livres** total
- Consomme ~${withISBN + noISBN} appels Google
- Commande : \`node scripts/batch-import-missing.mjs --apply --source google\`

## 3. Projection d'impact

| Scénario | Livres en base | Skip logic estimé | Google calls/jour |
|---|---|---|---|
| Actuel | ~3737 | ~60% | ~400 |
| +${withISBN} (ISBN connus) | ~${3737 + withISBN} | ~70% | ~300 |
| +${allMissing.length} (tous) | ~${3737 + allMissing.length} | ~75-80% | ~200-250 |

### ROI par catégorie

Les classiques français et la littérature contemporaine offrent le meilleur ROI : ce sont les livres les plus recherchés sur une app francophone, et chaque ajout élimine potentiellement des dizaines de futures requêtes Google.

Les mangas offrent un ROI modéré : chaque tome est un livre distinct, donc le ratio livres-ajoutés/queries-économisées est plus faible.

## 4. Recommandation

**Phase 1** (immédiat) : Importer les ${withISBN} livres avec ISBN via \`--source direct\` (0 appel Google).
\`\`\`
node scripts/batch-import-missing.mjs --apply --source direct --limit 50
\`\`\`

**Phase 2** (si phase 1 OK) : Importer les restants via edge function (consomme Google).
\`\`\`
node scripts/batch-import-missing.mjs --apply --source edge
\`\`\`

**Phase 3** : Relancer \`identify-missing-books.mjs\` dans 2 semaines pour mesurer l'impact sur le cache et la skip logic.
`;

  writeFileSync(resolve(ROOT, "reports", "enrichment-plan.md"), report);
  console.log(`  ${C.green}✓${C.reset} Rapport → ${C.bold}reports/enrichment-plan.md${C.reset}`);
}

main().catch(e => { console.error(e); process.exit(1); });
