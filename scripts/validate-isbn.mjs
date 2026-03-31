#!/usr/bin/env node

/**
 * Valide les ISBN dans reports/missing-books.json via Open Library + BnF SRU.
 *
 * Usage:
 *   node scripts/validate-isbn.mjs            # dry-run, affiche les résultats
 *   node scripts/validate-isbn.mjs --apply    # corrige missing-books.json (null les ISBN invalides)
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
  // Token overlap
  const ta = na.split(" "), tb = nb.split(" ").filter(t => t.length > 2);
  if (tb.length === 0) return na === nb;
  const overlap = tb.filter(t => ta.some(rt => rt.includes(t) || t.includes(rt))).length;
  return overlap / tb.length >= 0.6;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ═══════════════════════════════════════════════
// ISBN checksum validation (ISBN-13)
// ═══════════════════════════════════════════════

function isValidISBN13Checksum(isbn) {
  if (!isbn || isbn.length !== 13 || !/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12]);
}

// ═══════════════════════════════════════════════
// Open Library lookup by ISBN
// ═══════════════════════════════════════════════

async function checkOpenLibrary(isbn) {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (res.status === 404) return { found: false };
    if (!res.ok) return { found: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      found: true,
      title: data.title || null,
      authors: data.authors || null, // These are refs like {key: "/authors/OL123A"}
      publishers: data.publishers || null,
    };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════
// BnF SRU lookup by ISBN
// ═══════════════════════════════════════════════

async function checkBnF(isbn) {
  try {
    const url = `https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&query=bib.isbn+adj+"${isbn}"&recordSchema=dublincore&maximumRecords=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { found: false, error: `HTTP ${res.status}` };
    const xml = await res.text();
    if (xml.includes("<srw:numberOfRecords>0</srw:numberOfRecords>")) return { found: false };

    const m = xml.match(/<dc:title[^>]*>([^<]*)<\/dc:title>/i);
    if (!m) return { found: false };
    const title = m[1].trim().split(/ : | \/ /)[0].trim();
    return { found: true, title };
  } catch (e) {
    return { found: false, error: e.message };
  }
}

// ═══════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════

async function main() {
  const path = resolve(ROOT, "reports", "missing-books.json");
  const books = JSON.parse(readFileSync(path, "utf-8"));
  const withISBN = books.filter(b => b.isbn13);

  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Validation ISBN — missing-books.json            ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode     : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Livres   : ${books.length} total, ${withISBN.length} avec ISBN\n`);

  // Step 0: detect duplicate ISBNs
  const isbnMap = {};
  for (const b of withISBN) {
    const k = b.isbn13;
    if (!isbnMap[k]) isbnMap[k] = [];
    isbnMap[k].push(b.title);
  }
  const dupes = Object.entries(isbnMap).filter(([, titles]) => titles.length > 1);
  if (dupes.length > 0) {
    console.log(`  ${C.red}${C.bold}⚠ ISBN dupliqués (${dupes.length}) :${C.reset}`);
    for (const [isbn, titles] of dupes) {
      console.log(`    ${isbn} → ${titles.map(t => `"${t}"`).join(", ")}`);
    }
    console.log();
  }

  // Step 1: checksum validation
  console.log(`${C.bold}═══ Étape 1 : Checksum ISBN-13 ═══${C.reset}\n`);
  let checksumFail = 0;
  for (const b of withISBN) {
    if (!isValidISBN13Checksum(b.isbn13)) {
      checksumFail++;
      console.log(`  ${C.red}✗${C.reset} Checksum invalide : ${b.isbn13} — "${b.title}"`);
    }
  }
  console.log(`  ${checksumFail === 0 ? C.green + "✓ Tous les checksums sont valides" : C.red + checksumFail + " checksums invalides"}${C.reset}\n`);

  // Step 2: Open Library verification
  console.log(`${C.bold}═══ Étape 2 : Vérification Open Library + BnF ═══${C.reset}\n`);

  const results = [];
  let verified = 0, suspect = 0, notFound = 0, checksumBad = 0;

  // Dedupe: only check each ISBN once
  const uniqueISBNs = [...new Set(withISBN.map(b => b.isbn13))];

  for (let i = 0; i < uniqueISBNs.length; i++) {
    const isbn = uniqueISBNs[i];
    const booksWithThisISBN = withISBN.filter(b => b.isbn13 === isbn);
    const expectedTitle = booksWithThisISBN[0].title;

    process.stdout.write(`\r  [${String(i + 1).padStart(2)}/${uniqueISBNs.length}] ${isbn} ${expectedTitle.padEnd(40).slice(0, 40)}`);

    // Checksum first
    if (!isValidISBN13Checksum(isbn)) {
      for (const b of booksWithThisISBN) {
        results.push({ isbn, title: b.title, status: "checksum_invalid" });
      }
      checksumBad += booksWithThisISBN.length;
      await sleep(100);
      continue;
    }

    // Duplicate ISBN = definitely hallucinated
    if (booksWithThisISBN.length > 1) {
      for (const b of booksWithThisISBN) {
        results.push({ isbn, title: b.title, status: "suspect", reason: `ISBN partagé avec ${booksWithThisISBN.length} livres` });
      }
      suspect += booksWithThisISBN.length;
      await sleep(100);
      continue;
    }

    // Check Open Library
    const ol = await checkOpenLibrary(isbn);
    await sleep(500);

    if (ol.found && ol.title) {
      if (titleMatch(ol.title, expectedTitle)) {
        results.push({ isbn, title: expectedTitle, status: "verified", olTitle: ol.title });
        verified++;
        process.stdout.write(`\r  ${C.green}✓${C.reset} ${isbn} "${expectedTitle}" ${C.dim}= OL: "${ol.title}"${C.reset}\n`);
        continue;
      }
      // OL found but title doesn't match — suspect
      // Try BnF as second opinion
      const bnf = await checkBnF(isbn);
      await sleep(500);

      if (bnf.found && bnf.title && titleMatch(bnf.title, expectedTitle)) {
        results.push({ isbn, title: expectedTitle, status: "verified", bnfTitle: bnf.title, note: "OL mismatch, BnF confirmed" });
        verified++;
        process.stdout.write(`\r  ${C.green}✓${C.reset} ${isbn} "${expectedTitle}" ${C.dim}= BnF: "${bnf.title}" (OL: "${ol.title}")${C.reset}\n`);
        continue;
      }

      results.push({ isbn, title: expectedTitle, status: "suspect", reason: `OL: "${ol.title}"${bnf.found ? `, BnF: "${bnf.title}"` : ""}` });
      suspect++;
      process.stdout.write(`\r  ${C.yellow}?${C.reset} ${isbn} "${expectedTitle}" ${C.dim}→ OL: "${ol.title}"${bnf.found ? `, BnF: "${bnf.title}"` : ""}${C.reset}\n`);
      continue;
    }

    if (!ol.found) {
      // OL doesn't know this ISBN — try BnF
      const bnf = await checkBnF(isbn);
      await sleep(500);

      if (bnf.found && bnf.title) {
        if (titleMatch(bnf.title, expectedTitle)) {
          results.push({ isbn, title: expectedTitle, status: "verified", bnfTitle: bnf.title, note: "OL 404, BnF confirmed" });
          verified++;
          process.stdout.write(`\r  ${C.green}✓${C.reset} ${isbn} "${expectedTitle}" ${C.dim}= BnF: "${bnf.title}" (OL: 404)${C.reset}\n`);
          continue;
        }
        results.push({ isbn, title: expectedTitle, status: "suspect", reason: `OL: 404, BnF: "${bnf.title}"` });
        suspect++;
        process.stdout.write(`\r  ${C.yellow}?${C.reset} ${isbn} "${expectedTitle}" ${C.dim}→ OL: 404, BnF: "${bnf.title}"${C.reset}\n`);
        continue;
      }

      results.push({ isbn, title: expectedTitle, status: "isbn_not_found", reason: "OL 404, BnF 0 résultats" });
      notFound++;
      process.stdout.write(`\r  ${C.red}✗${C.reset} ${isbn} "${expectedTitle}" ${C.dim}→ introuvable (OL + BnF)${C.reset}\n`);
    }
  }

  // ═══════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════

  process.stdout.write("\r" + " ".repeat(80) + "\r");
  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
  console.log(`  ${C.green}Verified${C.reset}         : ${verified}`);
  console.log(`  ${C.yellow}Suspect${C.reset}          : ${suspect}`);
  console.log(`  ${C.red}Not found${C.reset}        : ${notFound}`);
  console.log(`  ${C.red}Checksum invalid${C.reset} : ${checksumBad}`);
  console.log(`  Sans ISBN          : ${books.length - withISBN.length}`);
  console.log(`  ${C.bold}Total avec ISBN${C.reset}   : ${withISBN.length}`);

  const invalid = results.filter(r => r.status !== "verified");
  if (invalid.length > 0) {
    console.log(`\n  ${C.bold}ISBN à retirer (${invalid.length}) :${C.reset}`);
    for (const r of invalid) {
      console.log(`    ${C.red}${r.isbn}${C.reset} "${r.title}" — ${r.status}${r.reason ? ` (${r.reason})` : ""}`);
    }
  }

  // Save validation report
  writeFileSync(
    resolve(ROOT, "reports", "isbn-validation.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`\n  ${C.dim}Rapport → reports/isbn-validation.json${C.reset}`);

  // Apply: null out bad ISBNs
  if (APPLY) {
    const badISBNs = new Set(invalid.map(r => r.isbn));
    let fixed = 0;
    for (const b of books) {
      if (b.isbn13 && badISBNs.has(b.isbn13)) {
        b.isbn13 = null;
        if (b.priority === "medium") b.priority = "low";
        fixed++;
      }
    }
    writeFileSync(path, JSON.stringify(books, null, 2));
    console.log(`  ${C.green}✓${C.reset} ${fixed} ISBN retirés de missing-books.json`);
  } else {
    const badCount = invalid.length;
    if (badCount > 0) {
      console.log(`\n  ${C.dim}Pour corriger : node scripts/validate-isbn.mjs --apply${C.reset}`);
    }
  }

  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
