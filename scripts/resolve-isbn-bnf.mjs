#!/usr/bin/env node

/**
 * Résout les ISBN manquants via BnF SRU (recherche titre + auteur).
 *
 * Usage:
 *   node scripts/resolve-isbn-bnf.mjs            # dry-run
 *   node scripts/resolve-isbn-bnf.mjs --apply    # met à jour missing-books.json
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const APPLY = process.argv.includes("--apply");

const C = {
  reset: "\x1b[0m", green: "\x1b[32m", red: "\x1b[31m",
  yellow: "\x1b[33m", dim: "\x1b[2m", bold: "\x1b[1m", cyan: "\x1b[36m",
};

function norm(s) {
  return (s || "")
    .replace(/[\u2018\u2019\u201A\u2039\u203A''`]/g, " ")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function titleMatch(a, b) {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  const ta = na.split(" "), tb = nb.split(" ").filter(t => t.length > 2);
  if (tb.length === 0) return na === nb;
  const overlap = tb.filter(t => ta.some(rt => rt.includes(t) || t.includes(rt))).length;
  return overlap / tb.length >= 0.6;
}

function isValidISBN13(isbn) {
  if (!isbn || isbn.length !== 13 || !/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10 === parseInt(isbn[12]);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// BnF SRU — UNIMARC parser (from book_import)
// ═══════════════════════════════════════════════

function getDatafields(xml, tag) {
  const results = [];
  const dfRe = new RegExp(`<[^>]*datafield[^>]*tag="${tag}"[^>]*>([\\s\\S]*?)<\\/[^>]*datafield>`, "g");
  let m;
  while ((m = dfRe.exec(xml)) !== null) {
    const fields = {};
    const sfRe = /<[^>]*subfield[^>]*code="([^"]+)"[^>]*>([^<]*)</g;
    let sf;
    while ((sf = sfRe.exec(m[1])) !== null) fields[sf[1]] = sf[2].trim();
    results.push(fields);
  }
  return results;
}

function parseBnFResult(xml) {
  if (xml.includes("<srw:numberOfRecords>0</srw:numberOfRecords>") || !xml.includes("datafield")) {
    return [];
  }

  // Split records
  const records = [];
  const recRe = /<srw:record>([\s\S]*?)<\/srw:record>/g;
  let rm;
  while ((rm = recRe.exec(xml)) !== null) {
    const rec = rm[1];

    // Zone 200 $a → titre
    const z200 = getDatafields(rec, "200")[0];
    const title = z200?.a || null;
    if (!title) continue;

    // Zone 700/701 → auteurs
    const authors = [];
    for (const tag of ["700", "701"]) {
      for (const f of getDatafields(rec, tag)) {
        const name = [f.b, f.a].filter(Boolean).join(" ");
        if (name) authors.push(name);
      }
    }

    // Zone 010 $a → ISBN
    const z010List = getDatafields(rec, "010");
    let isbn13 = null;
    for (const z of z010List) {
      const raw = (z.a || "").replace(/[- ]/g, "");
      if (raw.length === 13 && /^\d{13}$/.test(raw) && isValidISBN13(raw)) {
        isbn13 = raw;
        break;
      }
    }
    // Fallback: ISBN-10 → convert
    if (!isbn13) {
      for (const z of z010List) {
        const raw = (z.a || "").replace(/[- ]/g, "");
        if (raw.length === 10) {
          const isbn13Candidate = isbn10to13(raw);
          if (isbn13Candidate) { isbn13 = isbn13Candidate; break; }
        }
      }
    }

    // Zone 210 $c → éditeur, $d → date
    const z210 = getDatafields(rec, "210")[0];
    const publisher = z210?.c?.replace(/^[\s:]+|[\s,]+$/g, "") || null;
    const dateMatch = (z210?.d || "").match(/(\d{4})/);
    const pubDate = dateMatch ? dateMatch[1] : null;

    records.push({ title, authors, isbn13, publisher, pubDate });
  }
  return records;
}

function isbn10to13(isbn10) {
  if (isbn10.length !== 10) return null;
  const base = "978" + isbn10.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(base[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  const isbn13 = base + check;
  return isValidISBN13(isbn13) ? isbn13 : null;
}

// ═══════════════════════════════════════════════
// BnF SRU search by title + author
// ═══════════════════════════════════════════════

async function searchBnF(title, author) {
  // Build CQL query
  let cql = `bib.title all "${title}"`;
  if (author) {
    // Extract last name for more reliable matching
    const lastName = author.split(/\s+/).pop();
    if (lastName && lastName.length > 2) {
      cql += ` and bib.author all "${lastName}"`;
    }
  }
  cql += ` and (bib.doctype any "a")`;

  const params = new URLSearchParams({
    version: "1.2",
    operation: "searchRetrieve",
    query: cql,
    recordSchema: "unimarcXchange",
    maximumRecords: "3",
  });

  try {
    const res = await fetch(`https://catalogue.bnf.fr/api/SRU?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { results: [], error: `HTTP ${res.status}` };
    const xml = await res.text();
    return { results: parseBnFResult(xml) };
  } catch (e) {
    return { results: [], error: e.message };
  }
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  const path = resolve(ROOT, "reports", "missing-books.json");
  const books = JSON.parse(readFileSync(path, "utf-8"));
  const noISBN = books.filter(b => !b.isbn13);

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Résolution ISBN via BnF SRU                     ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode      : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Total     : ${books.length} livres`);
  console.log(`  Avec ISBN : ${books.length - noISBN.length}`);
  console.log(`  Sans ISBN : ${noISBN.length} (à résoudre)\n`);

  let resolved = 0, notFound = 0, noMatch = 0;
  const results = [];

  for (let i = 0; i < noISBN.length; i++) {
    const b = noISBN[i];
    process.stdout.write(`\r  [${String(i + 1).padStart(2)}/${noISBN.length}] ${b.title.padEnd(45).slice(0, 45)}`);

    const { results: bnfResults, error } = await searchBnF(b.title, b.author);

    if (error) {
      results.push({ title: b.title, author: b.author, status: "error", error });
      notFound++;
      process.stdout.write(`\r  ${C.red}✗${C.reset} "${b.title}" — erreur: ${error}\n`);
      await sleep(1000);
      continue;
    }

    if (bnfResults.length === 0) {
      results.push({ title: b.title, author: b.author, status: "not_found" });
      notFound++;
      process.stdout.write(`\r  ${C.red}✗${C.reset} "${b.title}" — BnF: 0 résultats\n`);
      await sleep(1000);
      continue;
    }

    // Find best match
    let bestMatch = null;
    for (const r of bnfResults) {
      if (titleMatch(r.title, b.title) && r.isbn13) {
        bestMatch = r;
        break;
      }
    }

    if (!bestMatch) {
      // Title match but no ISBN?
      const titleOnly = bnfResults.find(r => titleMatch(r.title, b.title));
      if (titleOnly) {
        results.push({
          title: b.title, author: b.author, status: "match_no_isbn",
          bnfTitle: titleOnly.title, bnfAuthors: titleOnly.authors,
        });
        noMatch++;
        process.stdout.write(`\r  ${C.yellow}~${C.reset} "${b.title}" — BnF: "${titleOnly.title}" ${C.dim}(pas d'ISBN)${C.reset}\n`);
      } else {
        results.push({
          title: b.title, author: b.author, status: "no_title_match",
          bnfTop: bnfResults[0]?.title || "?",
        });
        noMatch++;
        process.stdout.write(`\r  ${C.yellow}?${C.reset} "${b.title}" — BnF: "${bnfResults[0]?.title}" ${C.dim}(pas de match)${C.reset}\n`);
      }
      await sleep(1000);
      continue;
    }

    // Found a match with ISBN
    resolved++;
    results.push({
      title: b.title, author: b.author, status: "resolved",
      isbn13: bestMatch.isbn13,
      bnfTitle: bestMatch.title, bnfAuthors: bestMatch.authors,
      bnfPublisher: bestMatch.publisher, bnfDate: bestMatch.pubDate,
    });
    process.stdout.write(`\r  ${C.green}✓${C.reset} "${b.title}" → ${C.bold}${bestMatch.isbn13}${C.reset} ${C.dim}(BnF: "${bestMatch.title}")${C.reset}\n`);
    await sleep(1000);
  }

  // Summary
  process.stdout.write("\r" + " ".repeat(80) + "\r");
  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
  console.log(`  ${C.green}ISBN résolus${C.reset}         : ${resolved}`);
  console.log(`  ${C.yellow}Match sans ISBN${C.reset}      : ${results.filter(r => r.status === "match_no_isbn").length}`);
  console.log(`  ${C.yellow}Pas de match titre${C.reset}  : ${results.filter(r => r.status === "no_title_match").length}`);
  console.log(`  ${C.red}Non trouvés${C.reset}         : ${notFound}`);
  console.log(`  ${C.bold}Toujours sans ISBN${C.reset}   : ${noISBN.length - resolved}/${noISBN.length}`);

  // Save detailed results
  writeFileSync(
    resolve(ROOT, "reports", "isbn-resolution-bnf.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n  ${C.dim}Détails → reports/isbn-resolution-bnf.json${C.reset}`);

  if (resolved > 0) {
    console.log(`\n  ${C.green}ISBN résolus :${C.reset}`);
    for (const r of results.filter(r => r.status === "resolved")) {
      console.log(`    ${r.isbn13} — "${r.title}" ${C.dim}(BnF: "${r.bnfTitle}")${C.reset}`);
    }
  }

  // Apply
  if (APPLY && resolved > 0) {
    const resolvedMap = new Map();
    for (const r of results.filter(r => r.status === "resolved")) {
      resolvedMap.set(norm(r.title), r.isbn13);
    }

    let updated = 0;
    for (const b of books) {
      if (b.isbn13) continue;
      const isbn = resolvedMap.get(norm(b.title));
      if (isbn) {
        b.isbn13 = isbn;
        b.priority = b.priority === "low" ? "medium" : b.priority;
        b.isbn_source = "bnf_sru";
        updated++;
      }
    }

    writeFileSync(path, JSON.stringify(books, null, 2));
    console.log(`\n  ${C.green}✓${C.reset} ${updated} ISBN ajoutés à missing-books.json`);
  } else if (!APPLY && resolved > 0) {
    console.log(`\n  ${C.dim}Pour appliquer : node scripts/resolve-isbn-bnf.mjs --apply${C.reset}`);
  }

  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
