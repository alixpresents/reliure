#!/usr/bin/env node
/**
 * enrich-from-wikidata.mjs
 * ──────────────────────────────────────────────────────────────────
 * Enrichissement batch depuis Wikidata (CC0).
 * Parfait pour les classiques et œuvres canoniques (latence 2-5s,
 * jamais utilisé en temps réel).
 *
 * Modes :
 *   --mode enrich   (défaut) Enrichit les livres existants en base
 *                   dont description/genres sont manquants
 *   --mode import   Importe les classiques depuis
 *                   reports/wikidata-candidates.json
 *
 * Options :
 *   --apply         Exécute réellement (dry-run par défaut)
 *   --limit N       Limite à N livres (défaut: 100)
 *   --offset N      Commence à l'entrée N (défaut: 0)
 *
 * Usage :
 *   node --env-file=.env scripts/enrich-from-wikidata.mjs --mode enrich
 *   node --env-file=.env scripts/enrich-from-wikidata.mjs --mode enrich --apply --limit 50
 *   node --env-file=.env scripts/enrich-from-wikidata.mjs --mode import --apply
 *   node --env-file=.env scripts/enrich-from-wikidata.mjs --mode import --apply --limit 20
 * ──────────────────────────────────────────────────────────────────
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("[wikidata] SUPABASE_URL et SUPABASE_SERVICE_KEY requis.");
  console.error("   Lance avec : node --env-file=.env scripts/enrich-from-wikidata.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── CLI ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const APPLY    = args.includes("--apply");
const DRY_RUN  = !APPLY;
const modeIdx  = args.indexOf("--mode");
const MODE     = modeIdx >= 0 ? args[modeIdx + 1] : "enrich";
const limIdx   = args.indexOf("--limit");
const offIdx   = args.indexOf("--offset");
const LIMIT    = limIdx >= 0 ? parseInt(args[limIdx + 1], 10) || 100 : 100;
const OFFSET   = offIdx >= 0 ? parseInt(args[offIdx + 1], 10) || 0   : 0;

if (!["enrich", "import"].includes(MODE)) {
  console.error(`[wikidata] Mode inconnu : "${MODE}". Utiliser --mode enrich ou --mode import`);
  process.exit(1);
}

// ─── Couleurs terminal ───────────────────────────────────────────

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

// ─── Helpers ─────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function ensureReports() {
  const dir = resolve(ROOT, "reports");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ─── Validation ISBN-13 ──────────────────────────────────────────
// Leçon critique : ne jamais faire confiance à un ISBN sans validation
// checksum (88% d'hallucinations LLM constatées sur ce projet).

function validateISBN13(raw) {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length !== 13) return null;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  if (check !== parseInt(digits[12], 10)) return null;
  return digits;
}

// ─── Normalisation titre (miroir de deduplicateBook.js) ──────────

function normalizeTitle(title) {
  return (title || "")
    .replace(/[\u2018\u2019\u201A\u2039\u203A''`]/g, " ")
    .toLowerCase().trim()
    .split(/\s*[:/]\s/)[0]
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function extractLastName(fullName) {
  if (!fullName) return null;
  let name = fullName.replace(/\([^)]*\)/g, "").trim();
  if (name.includes(",")) name = name.split(",")[0].trim();
  else { const p = name.split(/\s+/); name = p[p.length - 1]; }
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ─── Slug (miroir de slugify.js) ─────────────────────────────────

function slugify(text) {
  return (text || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

async function generateSlug(title, authors = [], year = null) {
  const check = async (s) => {
    const { data } = await supabase.from("books").select("id").eq("slug", s).limit(1).maybeSingle();
    return !!data;
  };
  const base = slugify(title);
  if (!base) return `book-${Date.now()}`;
  if (!await check(base)) return base;
  const lastName = (authors[0] || "").split(/\s+/).pop();
  if (lastName) {
    const wa = `${base}-${slugify(lastName)}`;
    if (wa !== base && !await check(wa)) return wa;
    const y = (year || "").toString().slice(0, 4);
    if (y) { const wy = `${wa}-${y}`; if (!await check(wy)) return wy; }
  }
  for (let i = 2; i <= 50; i++) { if (!await check(`${base}-${i}`)) return `${base}-${i}`; }
  return `${base}-${Date.now()}`;
}

// ─── Anti-doublons ───────────────────────────────────────────────

async function findExisting(title, authors, isbn13) {
  if (isbn13) {
    const { data } = await supabase.from("books").select("id, title, slug")
      .eq("isbn_13", isbn13).limit(1).maybeSingle();
    if (data) return data;
  }
  if (!title) return null;
  const nt = normalizeTitle(title);
  const firstWord = nt.split(" ")[0];
  if (firstWord.length < 2) return null;
  const authorLast = extractLastName(Array.isArray(authors) ? authors[0] : authors);

  const { data: candidates } = await supabase.from("books")
    .select("id, title, slug, authors").ilike("title", `%${firstWord}%`).limit(30);
  if (!candidates?.length) return null;

  for (const c of candidates) {
    if (normalizeTitle(c.title) !== nt) continue;
    const cAuthor = extractLastName(Array.isArray(c.authors) ? c.authors[0] : null);
    if (!authorLast || !cAuthor || cAuthor === authorLast) return c;
  }
  return null;
}

// ─── SPARQL / Wikidata ────────────────────────────────────────────

const SPARQL_ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "Reliure/1.0 (contact@reliure.app) Node.js/enrichment-script";

async function sparqlQuery(sparql) {
  const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/sparql-results+json",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    return { results: data.results?.bindings || [] };
  } catch (e) {
    return { error: e.message };
  }
}

// Recherche par titre + auteur (Mode A — enrichissement livres existants)
async function searchByTitleAuthor(title, author) {
  // On utilise une version simplifiée du titre pour le CONTAINS
  // Prend les 3 premiers mots significatifs pour éviter les faux positifs
  const titleWords = normalizeTitle(title).split(" ").filter(w => w.length > 2).slice(0, 3).join(" ");
  if (!titleWords) return { results: [] };

  // Cherche d'abord instances de literary work (Q7725634) et book (Q571)
  const sparql = `
SELECT DISTINCT ?item ?titleLabel ?authorLabel ?isbn13 ?descFR ?descEN ?genreLabel ?pubDate WHERE {
  VALUES ?bookType { wd:Q7725634 wd:Q571 wd:Q8261 wd:Q49084 }
  ?item wdt:P31 ?bookType .
  ?item rdfs:label ?titleLabel .
  FILTER(LANG(?titleLabel) = "fr")
  FILTER(CONTAINS(LCASE(?titleLabel), "${titleWords.replace(/"/g, "'")}"))
  OPTIONAL {
    ?item wdt:P50 ?author .
    ?author rdfs:label ?authorLabel .
    FILTER(LANG(?authorLabel) = "fr" || LANG(?authorLabel) = "en")
  }
  OPTIONAL { ?item wdt:P212 ?isbn13 }
  OPTIONAL { ?item schema:description ?descFR . FILTER(LANG(?descFR) = "fr") }
  OPTIONAL { ?item schema:description ?descEN . FILTER(LANG(?descEN) = "en") }
  OPTIONAL {
    ?item wdt:P136 ?genre .
    ?genre rdfs:label ?genreLabel .
    FILTER(LANG(?genreLabel) = "fr")
  }
  OPTIONAL { ?item wdt:P577 ?pubDate }
}
LIMIT 5
`.trim();

  const result = await sparqlQuery(sparql);
  return result;
}

// Fetch complet par QID (Mode B — import classiques)
async function fetchByQID(qid) {
  // QID peut être "Q180736" ou "wd:Q180736"
  const cleanQid = qid.replace(/^wd:/, "");

  const sparql = `
SELECT ?isbn13 ?titleFR ?titleEN ?authorLabel ?descFR ?descEN ?genreLabel ?pubDate ?publisherLabel WHERE {
  BIND(wd:${cleanQid} AS ?item)
  OPTIONAL { ?item wdt:P212 ?isbn13 }
  OPTIONAL { ?item rdfs:label ?titleFR . FILTER(LANG(?titleFR) = "fr") }
  OPTIONAL { ?item rdfs:label ?titleEN . FILTER(LANG(?titleEN) = "en") }
  OPTIONAL {
    ?item wdt:P50 ?author .
    ?author rdfs:label ?authorLabel .
    FILTER(LANG(?authorLabel) = "fr" || LANG(?authorLabel) = "en")
  }
  OPTIONAL { ?item schema:description ?descFR . FILTER(LANG(?descFR) = "fr") }
  OPTIONAL { ?item schema:description ?descEN . FILTER(LANG(?descEN) = "en") }
  OPTIONAL {
    ?item wdt:P136 ?genre .
    ?genre rdfs:label ?genreLabel .
    FILTER(LANG(?genreLabel) = "fr")
  }
  OPTIONAL { ?item wdt:P577 ?pubDate }
  OPTIONAL {
    ?item wdt:P123 ?publisher .
    ?publisher rdfs:label ?publisherLabel .
    FILTER(LANG(?publisherLabel) = "fr" || LANG(?publisherLabel) = "en")
  }
}
LIMIT 10
`.trim();

  return sparqlQuery(sparql);
}

// ─── Extraction des données SPARQL ───────────────────────────────

function getValue(binding, key) {
  return binding[key]?.value || null;
}

// Extrait les données uniques d'un groupe de bindings (même item, plusieurs genres/auteurs)
function extractFromBindings(bindings) {
  if (!bindings?.length) return null;

  const first = bindings[0];
  const title = getValue(first, "titleFR") || getValue(first, "titleLabel") || getValue(first, "titleEN");
  const descFR = getValue(first, "descFR");
  const descEN = getValue(first, "descEN");
  const pubDate = getValue(first, "pubDate")?.slice(0, 10) || null;
  const publisherLabel = getValue(first, "publisherLabel");

  // Dédoublonne les auteurs et genres sur l'ensemble des bindings
  const authorsSet = new Set();
  const genresSet = new Set();
  const isbnsSet = new Set();

  for (const b of bindings) {
    const author = getValue(b, "authorLabel");
    if (author) authorsSet.add(author);
    const genre = getValue(b, "genreLabel");
    if (genre) genresSet.add(genre);
    const isbn = validateISBN13(getValue(b, "isbn13"));
    if (isbn) isbnsSet.add(isbn);
  }

  return {
    title: title || null,
    authors: [...authorsSet],
    description: descFR || descEN || null,
    genres: [...genresSet],
    publication_date: pubDate,
    publisher: publisherLabel || null,
    isbn13: isbnsSet.size > 0 ? [...isbnsSet][0] : null, // prend le premier ISBN valide
  };
}

// Choisit le meilleur résultat de recherche par correspondance titre+auteur
function scoreTitleMatch(bindings, targetTitle, targetAuthor) {
  if (!bindings?.length) return null;

  const nt = normalizeTitle(targetTitle);
  const na = extractLastName(targetAuthor);

  // Regroupe par item
  const byItem = {};
  for (const b of bindings) {
    const itemId = getValue(b, "item");
    if (!itemId) continue;
    if (!byItem[itemId]) byItem[itemId] = [];
    byItem[itemId].push(b);
  }

  let best = null;
  let bestScore = -1;

  for (const [, itemBindings] of Object.entries(byItem)) {
    const data = extractFromBindings(itemBindings);
    if (!data?.title) continue;

    const wikiTitle = normalizeTitle(data.title);
    let score = 0;

    if (wikiTitle === nt) score += 100;
    else if (wikiTitle.includes(nt) || nt.includes(wikiTitle)) score += 50;
    else {
      // Token overlap
      const t1 = new Set(nt.split(" ").filter(w => w.length > 2));
      const t2 = new Set(wikiTitle.split(" ").filter(w => w.length > 2));
      const overlap = [...t1].filter(w => t2.has(w)).length;
      const union = new Set([...t1, ...t2]).size;
      if (union > 0) score += Math.round((overlap / union) * 40);
    }

    if (na && data.authors.length > 0) {
      const wikiAuthor = extractLastName(data.authors[0]);
      if (wikiAuthor && (wikiAuthor === na || wikiAuthor.includes(na) || na.includes(wikiAuthor))) {
        score += 30;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = { data, score };
    }
  }

  // Seuil minimum : au moins 40 points (sinon trop risqué)
  return bestScore >= 40 ? best?.data : null;
}

// ─── Edge function book_import ────────────────────────────────────

async function importViaEdge(isbn) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/book_import`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isbn }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) return { error: `Edge function HTTP ${res.status}` };
  return await res.json();
}

// ─── Checkpoint / rapport ─────────────────────────────────────────

function saveCheckpoint(processed, stats, mode) {
  ensureReports();
  writeFileSync(
    resolve(ROOT, "reports", "wikidata-progress.json"),
    JSON.stringify({ mode, processed, stats, updatedAt: new Date().toISOString() }, null, 2),
  );
}

function saveReport(mode, stats, log) {
  ensureReports();
  const report = {
    mode,
    generatedAt: new Date().toISOString(),
    stats,
    log,
  };
  writeFileSync(resolve(ROOT, "reports", "wikidata-report.json"), JSON.stringify(report, null, 2));
  console.log(`\n  ${C.dim}Rapport → reports/wikidata-report.json${C.reset}`);
}

// ─── MODE A : Enrichissement des livres existants ─────────────────

async function modeEnrich() {
  console.log(`\n  ${C.dim}Récupération des livres à enrichir depuis Supabase...${C.reset}`);

  // Livres avec description NULL OU genres vides
  const { data: books, error } = await supabase
    .from("books")
    .select("id, title, authors, isbn_13, description, genres, publication_date")
    .or("description.is.null,genres.eq.[]")
    .not("title", "is", null)
    .range(OFFSET, OFFSET + LIMIT - 1)
    .order("rating_count", { ascending: false }); // priorité aux livres les plus populaires

  if (error) { console.error("[wikidata] Erreur Supabase:", error.message); process.exit(1); }
  if (!books?.length) { console.log("  Aucun livre à enrichir."); return; }

  console.log(`  ${books.length} livre(s) à traiter (offset=${OFFSET}, limit=${LIMIT})\n`);

  const stats = { processed: 0, enriched: 0, skipped: 0, noMatch: 0, errors: 0 };
  const log = [];

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const authorStr = Array.isArray(book.authors) ? book.authors[0] : null;
    const shortTitle = (book.title || "").slice(0, 45).padEnd(45);

    process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${books.length}] ${shortTitle}`);
    stats.processed++;

    // Déjà enrichi (genres ET description présents) → skip
    const hasDesc = !!book.description;
    const hasGenres = Array.isArray(book.genres) && book.genres.length > 0;
    if (hasDesc && hasGenres) {
      stats.skipped++;
      log.push({ id: book.id, title: book.title, status: "already_complete" });
      continue;
    }

    // Requête Wikidata
    const { results, error: qErr } = await searchByTitleAuthor(book.title, authorStr);

    if (qErr) {
      stats.errors++;
      log.push({ id: book.id, title: book.title, status: "error", error: qErr });
      process.stdout.write(`\r  ${C.red}✗${C.reset} "${book.title.slice(0, 40)}" — ${qErr}\n`);
      await sleep(500);
      continue;
    }

    const match = scoreTitleMatch(results, book.title, authorStr);

    if (!match) {
      stats.noMatch++;
      log.push({ id: book.id, title: book.title, status: "no_match" });
      await sleep(200);
      continue;
    }

    // Prépare les mises à jour
    const updates = {};
    if (!hasDesc && match.description) {
      updates.description = match.description;
    }
    if (!hasGenres && match.genres.length > 0) {
      updates.genres = match.genres;
    }
    if (!book.publication_date && match.publication_date) {
      updates.publication_date = match.publication_date;
    }

    if (Object.keys(updates).length === 0) {
      stats.skipped++;
      log.push({ id: book.id, title: book.title, status: "no_useful_data" });
      await sleep(200);
      continue;
    }

    if (DRY_RUN) {
      process.stdout.write(`\r  ${C.yellow}~${C.reset} "${book.title.slice(0, 40)}" → ${Object.keys(updates).join(", ")}\n`);
      stats.enriched++;
      log.push({ id: book.id, title: book.title, status: "would_update", updates });
    } else {
      const { error: upErr } = await supabase.from("books").update(updates).eq("id", book.id);
      if (upErr) {
        stats.errors++;
        log.push({ id: book.id, title: book.title, status: "error", error: upErr.message });
        process.stdout.write(`\r  ${C.red}✗${C.reset} "${book.title.slice(0, 40)}" — ${upErr.message}\n`);
      } else {
        stats.enriched++;
        log.push({ id: book.id, title: book.title, status: "enriched", updates });
        process.stdout.write(`\r  ${C.green}✓${C.reset} "${book.title.slice(0, 40)}" → ${Object.keys(updates).join(", ")}\n`);
      }
    }

    // Checkpoint toutes les 50 requêtes
    if ((i + 1) % 50 === 0) saveCheckpoint(i + 1, stats, "enrich");

    await sleep(200); // 1 requête Wikidata / 200ms
  }

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  printSummary(stats);
  saveReport("enrich", stats, log);
}

// ─── MODE B : Import de classiques manquants ─────────────────────

async function modeImport() {
  const candidatesPath = resolve(ROOT, "reports", "wikidata-candidates.json");
  if (!existsSync(candidatesPath)) {
    console.error(`[wikidata] ${candidatesPath} introuvable.`);
    console.error("  Créer le fichier reports/wikidata-candidates.json ou utiliser le seed initial.");
    process.exit(1);
  }

  const allCandidates = JSON.parse(readFileSync(candidatesPath, "utf-8"));
  const candidates = allCandidates.slice(OFFSET, OFFSET + LIMIT);

  console.log(`  ${allCandidates.length} candidats total, traitement de ${candidates.length} (offset=${OFFSET}, limit=${LIMIT})\n`);

  const stats = { processed: 0, imported: 0, enrichedEdge: 0, enrichedDirect: 0, skipped: 0, errors: 0 };
  const log = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const label = `${candidate.title} (${candidate.author || "?"})`;
    const shortLabel = label.slice(0, 45).padEnd(45);

    process.stdout.write(`\r  [${String(i + 1).padStart(3)}/${candidates.length}] ${shortLabel}`);
    stats.processed++;

    // Fetch metadata depuis Wikidata
    let wikidataData = null;

    if (candidate.qid) {
      const { results, error: qErr } = await fetchByQID(candidate.qid);
      if (qErr) {
        stats.errors++;
        log.push({ ...candidate, status: "error", error: qErr });
        process.stdout.write(`\r  ${C.red}✗${C.reset} "${label.slice(0, 40)}" — SPARQL: ${qErr}\n`);
        await sleep(500);
        continue;
      }
      wikidataData = extractFromBindings(results);
      // Si pas de titre FR dans Wikidata, utiliser le titre du candidat
      if (!wikidataData?.title) {
        if (wikidataData) wikidataData.title = candidate.title;
        else wikidataData = { title: candidate.title, authors: candidate.author ? [candidate.author] : [], description: null, genres: [], publication_date: null, publisher: null, isbn13: null };
      }
      if (!wikidataData.authors?.length && candidate.author) wikidataData.authors = [candidate.author];
    } else {
      // Pas de QID : recherche par titre+auteur
      const { results, error: qErr } = await searchByTitleAuthor(candidate.title, candidate.author);
      if (qErr) {
        stats.errors++;
        log.push({ ...candidate, status: "error", error: qErr });
        process.stdout.write(`\r  ${C.red}✗${C.reset} "${label.slice(0, 40)}" — SPARQL: ${qErr}\n`);
        await sleep(500);
        continue;
      }
      wikidataData = scoreTitleMatch(results, candidate.title, candidate.author);
      if (!wikidataData) {
        wikidataData = { title: candidate.title, authors: candidate.author ? [candidate.author] : [], description: null, genres: [], publication_date: null, publisher: null, isbn13: null };
      }
    }

    // Anti-doublons
    const existing = await findExisting(wikidataData.title, wikidataData.authors, wikidataData.isbn13);
    if (existing) {
      stats.skipped++;
      log.push({ ...candidate, status: "already_exists", dbId: existing.id, dbTitle: existing.title });
      process.stdout.write(`\r  ${C.dim}=${C.reset} "${label.slice(0, 40)}" — déjà en base\n`);
      await sleep(200);
      continue;
    }

    if (DRY_RUN) {
      const method = wikidataData.isbn13 ? "edge_function" : "direct_wikidata";
      process.stdout.write(`\r  ${C.yellow}~${C.reset} "${label.slice(0, 40)}" → ${method} (ISBN: ${wikidataData.isbn13 || "aucun"})\n`);
      stats.imported++;
      log.push({ ...candidate, status: "would_import", wikidataData, method });
      await sleep(200);
      continue;
    }

    // Import réel
    let result = null;

    if (wikidataData.isbn13) {
      // ISBN validé → edge function (Google + BnF + OL, meilleure qualité)
      try {
        result = await importViaEdge(wikidataData.isbn13);
        if (result?.id || result?.book?.id) {
          stats.imported++;
          stats.enrichedEdge++;
          const bookId = result.id || result.book?.id;
          const slug = result.slug || result.book?.slug;
          log.push({ ...candidate, status: "imported_edge", dbId: bookId, slug, isbn13: wikidataData.isbn13 });
          process.stdout.write(`\r  ${C.green}✓${C.reset} "${label.slice(0, 40)}" → edge (${slug || bookId})\n`);
        } else {
          // Edge function failed → fallback direct Wikidata
          result = null;
        }
      } catch (e) {
        result = null;
      }
    }

    if (!result) {
      // Insert direct depuis les données Wikidata
      try {
        const slug = await generateSlug(wikidataData.title, wikidataData.authors, wikidataData.publication_date);
        const { data: inserted, error: insErr } = await supabase
          .from("books")
          .insert({
            isbn_13: wikidataData.isbn13 || null,
            title: wikidataData.title,
            authors: wikidataData.authors,
            publisher: wikidataData.publisher || null,
            publication_date: wikidataData.publication_date || null,
            description: wikidataData.description || null,
            genres: wikidataData.genres.length > 0 ? wikidataData.genres : [],
            language: "fr",
            source: "wikidata",
            slug,
          })
          .select("id, title, slug")
          .single();

        if (insErr) {
          stats.errors++;
          log.push({ ...candidate, status: "error", error: insErr.message });
          process.stdout.write(`\r  ${C.red}✗${C.reset} "${label.slice(0, 40)}" — ${insErr.message}\n`);
        } else {
          stats.imported++;
          stats.enrichedDirect++;
          log.push({ ...candidate, status: "imported_direct", dbId: inserted.id, slug: inserted.slug });
          process.stdout.write(`\r  ${C.green}✓${C.reset} "${label.slice(0, 40)}" → direct (${inserted.slug})\n`);
        }
      } catch (e) {
        stats.errors++;
        log.push({ ...candidate, status: "error", error: e.message });
        process.stdout.write(`\r  ${C.red}✗${C.reset} "${label.slice(0, 40)}" — ${e.message}\n`);
      }
    }

    // Checkpoint toutes les 50 requêtes
    if ((i + 1) % 50 === 0) saveCheckpoint(i + 1, stats, "import");

    await sleep(200); // respecter les serveurs Wikidata
  }

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  printSummary(stats);
  saveReport("import", stats, log);
}

// ─── Affichage résumé ─────────────────────────────────────────────

function printSummary(stats) {
  console.log(`\n${C.bold}═══ Résumé [wikidata --mode ${MODE}] ═══${C.reset}`);
  console.log(`  Traités    : ${stats.processed}`);
  if (MODE === "enrich") {
    console.log(`  ${C.green}Enrichis${C.reset}   : ${stats.enriched}${DRY_RUN ? " (dry-run)" : ""}`);
    console.log(`  ${C.dim}Sans match${C.reset} : ${stats.noMatch}`);
  } else {
    console.log(`  ${C.green}Importés${C.reset}   : ${stats.imported}${DRY_RUN ? " (dry-run)" : ""}`);
    if (!DRY_RUN) {
      console.log(`    Via edge    : ${stats.enrichedEdge}`);
      console.log(`    Via direct  : ${stats.enrichedDirect}`);
    }
  }
  console.log(`  ${C.dim}Skippés${C.reset}    : ${stats.skipped} (déjà en base ou complet)`);
  console.log(`  ${C.red}Erreurs${C.reset}    : ${stats.errors}`);
  if (DRY_RUN) {
    console.log(`\n  ${C.yellow}Dry-run — aucune modification en base.${C.reset}`);
    console.log(`  Pour exécuter : ajouter --apply\n`);
  }
}

// ─── Point d'entrée ───────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Enrichissement Wikidata — Reliure               ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode   : ${C.bold}${MODE}${C.reset}`);
  console.log(`  Action : ${APPLY ? `${C.red}APPLY${C.reset} (modifications réelles)` : `${C.yellow}DRY-RUN${C.reset} (lecture seule)`}`);
  console.log(`  Limit  : ${LIMIT} | Offset : ${OFFSET}\n`);

  // Interception Ctrl+C propre
  process.on("SIGINT", () => {
    console.log(`\n\n  ${C.yellow}Interruption. Relancer avec --offset pour reprendre.${C.reset}\n`);
    process.exit(0);
  });

  if (MODE === "enrich") await modeEnrich();
  else await modeImport();
}

main().catch(e => { console.error("[wikidata] Erreur fatale:", e.message); process.exit(1); });
