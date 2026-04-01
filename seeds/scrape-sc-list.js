#!/usr/bin/env node
/**
 * scrape-sc-list.js
 * ─────────────────────────────────────────────────────────────────
 * Scrape une ou plusieurs listes SensCritique (livres) et produit
 * un JSON compatible avec seed-from-sc.js / sc_listes_agregees.json.
 *
 * Prérequis :
 *   npm install -D playwright && npx playwright install chromium
 *
 * Usage :
 *   node seeds/scrape-sc-list.js --url="https://www.senscritique.com/liste/les_meilleurs_livres/139082"
 *   node seeds/scrape-sc-list.js --id=139082
 *   node seeds/scrape-sc-list.js --ids=139082,79557,45414
 *   node seeds/scrape-sc-list.js --id=139082 --with-isbn
 *   node seeds/scrape-sc-list.js --id=139082 --merge
 *   node seeds/scrape-sc-list.js --id=139082 --limit=50 --dry-run
 *   node seeds/scrape-sc-list.js --id=139082 --output=seeds/my-list.json
 * ─────────────────────────────────────────────────────────────────
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── CLI args ────────────────────────────────────────────────────

function getArg(name) {
  const entry = process.argv.find(a => a.startsWith(`--${name}=`));
  return entry ? entry.split('=').slice(1).join('=') : null;
}

const WITH_ISBN = process.argv.includes('--with-isbn');
const MERGE     = process.argv.includes('--merge');
const DRY_RUN   = process.argv.includes('--dry-run');
const LIMIT     = getArg('limit') ? parseInt(getArg('limit'), 10) : null;
const OUTPUT    = getArg('output');

// Collect list IDs/URLs
const listIds = [];
const listUrls = new Map();
const rawUrl = getArg('url');
if (rawUrl) {
  const m = rawUrl.match(/\/(\d+)\/?$/);
  if (m) { listIds.push(m[1]); listUrls.set(m[1], rawUrl); }
  else { console.error('❌ Impossible d\'extraire l\'ID depuis l\'URL fournie.'); process.exit(1); }
}
const rawId = getArg('id');
if (rawId) listIds.push(rawId);
const rawIds = getArg('ids');
if (rawIds) listIds.push(...rawIds.split(',').map(s => s.trim()));

if (listIds.length === 0) {
  console.error('❌ Fournis au moins --url, --id ou --ids.');
  console.error('   Ex: node seeds/scrape-sc-list.js --id=139082');
  process.exit(1);
}

// ─── Paths ───────────────────────────────────────────────────────

const EXISTING_FILE = join(__dirname, 'sc_listes_agregees.json');
const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const DEFAULT_OUTPUT = join(__dirname, `sc-new-${timestamp}.json`);
const OUTPUT_FILE = OUTPUT ? join(process.cwd(), OUTPUT) : DEFAULT_OUTPUT;

// ─── Helpers ─────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalize(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeKey(title, author) {
  const normTitle = normalize(title.split(/[:/]/)[0]);
  const parts = (author || '').trim().split(/\s+/);
  const lastName = normalize(parts[parts.length - 1]);
  return `${normTitle}|${lastName}`;
}

function loadExisting() {
  if (!existsSync(EXISTING_FILE)) return [];
  try {
    return JSON.parse(readFileSync(EXISTING_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

// ─── Scraping ────────────────────────────────────────────────────

async function scrapeList(page, listId, fullUrl) {
  const url = fullUrl || `https://www.senscritique.com/liste/${listId}`;
  console.log(`\n  ${C.cyan}[PAGE]${C.reset} Chargement de la liste ID: ${listId}`);
  console.log(`        ${C.dim}${url}${C.reset}`);

  let attempts = 0;
  while (attempts < 3) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
      break;
    } catch (e) {
      attempts++;
      if (attempts >= 3) throw new Error(`Impossible de charger la liste ${listId}: ${e.message}`);
      console.log(`  ${C.yellow}[RETRY]${C.reset} Tentative ${attempts + 1}/3...`);
      await sleep(2000);
    }
  }

  // Try to get list title
  let listTitle = `Liste ${listId}`;
  try {
    listTitle = await page.locator('h1').first().textContent({ timeout: 5000 }) || listTitle;
    listTitle = listTitle.trim();
  } catch {}
  console.log(`  ${C.bold}${listTitle}${C.reset}`);

  const books = [];
  let lastCount = 0;
  let noChangeCount = 0;

  // Scrape with infinite scroll / load-more button
  while (true) {
    if (LIMIT && books.length >= LIMIT) break;

    // Extract current items
    const items = await page.evaluate(() => {
      const results = [];

      // Try multiple selector patterns SC has used historically
      // Pattern 1: list items with product links
      const cards = document.querySelectorAll(
        'li[class*="ListItem"], li[class*="list-item"], ' +
        'div[class*="ProductItem"], div[class*="product-item"], ' +
        'article[class*="item"], ' +
        '[data-testid*="item"], [data-testid*="product"]'
      );

      for (const card of cards) {
        // Title
        const titleEl = card.querySelector(
          'a[class*="title"], span[class*="title"], h2, h3, ' +
          '[class*="Title"], [class*="product-title"], ' +
          '[data-testid*="title"]'
        );
        const title = titleEl?.textContent?.trim();
        if (!title) continue;

        // Author
        const authorEl = card.querySelector(
          'a[class*="creator"], a[class*="author"], span[class*="creator"], ' +
          '[class*="Creator"], [class*="author"], [class*="Artist"], ' +
          '[data-testid*="creator"], [data-testid*="author"]'
        );
        const author = authorEl?.textContent?.trim() || '';

        // Cover
        const imgEl = card.querySelector('img');
        let cover_url = imgEl?.src || imgEl?.getAttribute('data-src') || '';
        // Upgrade to 300px if we got a smaller size
        cover_url = cover_url.replace(/\/(\d+)\/([^/]+)$/, (m, size, file) =>
          parseInt(size) < 300 ? `/300/${file}` : m
        );

        // URL
        const linkEl = card.querySelector('a[href*="/livre/"], a[href*="/book/"]');
        const url_sc = linkEl?.href || '';

        if (title) results.push({ title, author, cover_url, url_sc });
      }

      // Fallback: look for JSON-LD on the page (sometimes SC includes structured data)
      if (results.length === 0) {
        const jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
        for (const el of jsonLd) {
          try {
            const data = JSON.parse(el.textContent);
            const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
            for (const item of items) {
              if (item['@type'] === 'Book' || item['@type'] === 'Product') {
                results.push({
                  title: item.name || '',
                  author: item.author?.name || item.creator?.name || '',
                  cover_url: item.image || '',
                  url_sc: item.url || '',
                });
              }
            }
          } catch {}
        }
      }

      return results;
    });

    // Merge unique new items by title+author
    for (const item of items) {
      if (LIMIT && books.length >= LIMIT) break;
      const key = dedupeKey(item.title, item.author);
      if (!books.some(b => dedupeKey(b.title, b.author) === key)) {
        books.push(item);
      }
    }

    process.stdout.write(`\r  ${C.cyan}[SCROLL]${C.reset} ${books.length} livres chargés...`);

    if (books.length === lastCount) {
      noChangeCount++;
      if (noChangeCount >= 2) break; // 2 scrolls without new items = done
    } else {
      noChangeCount = 0;
      lastCount = books.length;
    }

    // Try clicking "load more" button if present
    const loadMoreClicked = await page.evaluate(() => {
      const btn = document.querySelector(
        'button[class*="more"], button[class*="More"], ' +
        'a[class*="more"], a[class*="More"], ' +
        '[data-testid*="load-more"], [data-testid*="loadMore"]'
      );
      if (btn && btn.offsetParent !== null) { btn.click(); return true; }
      return false;
    });

    if (!loadMoreClicked) {
      // Scroll to bottom to trigger infinite scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    }

    await sleep(1500);

    // Save every 100 items as checkpoint
    if (books.length > 0 && books.length % 100 === 0 && !DRY_RUN) {
      writeCheckpoint(books);
    }
  }

  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  console.log(`  ${C.green}[DONE]${C.reset} ${books.length} livres extraits de la liste`);

  return books;
}

// ─── ISBN extraction ─────────────────────────────────────────────

async function extractIsbn(page, book) {
  if (!book.url_sc) return null;

  let attempts = 0;
  while (attempts < 3) {
    try {
      await page.goto(book.url_sc, { waitUntil: 'domcontentloaded', timeout: 30000 });
      break;
    } catch (e) {
      attempts++;
      if (attempts >= 3) return null;
      await sleep(2000);
    }
  }

  return page.evaluate(() => {
    // 1. JSON-LD
    for (const el of document.querySelectorAll('script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(el.textContent);
        const items = data['@graph'] || (Array.isArray(data) ? data : [data]);
        for (const item of items) {
          if (item.isbn) return item.isbn.replace(/[^0-9X]/g, '');
        }
      } catch {}
    }

    // 2. Meta tags
    const ogMeta = document.querySelector('meta[property="book:isbn"]');
    if (ogMeta?.content) return ogMeta.content.replace(/[^0-9X]/g, '');

    // 3. Page content — look for ISBN pattern
    const text = document.body.innerText;
    const m = text.match(/ISBN[:\s]*(97[89][0-9]{10}|[0-9]{10})/i);
    if (m) return m[1];

    // 4. Infos section
    const infoEls = document.querySelectorAll('[class*="info"], [class*="Info"], dt, dd');
    for (let i = 0; i < infoEls.length; i++) {
      const el = infoEls[i];
      if (/isbn/i.test(el.textContent)) {
        const val = (infoEls[i + 1]?.textContent || el.textContent).replace(/[^0-9X]/g, '');
        if (val.length >= 10) return val;
      }
    }

    return null;
  });
}

// ─── Checkpoint ──────────────────────────────────────────────────

const CHECKPOINT_FILE = join(__dirname, '.scrape-checkpoint.json');

function writeCheckpoint(books) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify(books, null, 2));
}

function clearCheckpoint() {
  try { require('fs').unlinkSync(CHECKPOINT_FILE); } catch {}
}

// ─── Graceful shutdown ───────────────────────────────────────────

let scraped = [];
let browser = null;

process.on('SIGINT', async () => {
  console.log(`\n\n  ${C.yellow}[SIGINT]${C.reset} Interruption reçue — sauvegarde en cours...`);
  if (scraped.length > 0 && !DRY_RUN) {
    const out = OUTPUT_FILE.replace('.json', '-partial.json');
    writeFileSync(out, JSON.stringify(scraped, null, 2));
    console.log(`  ${C.green}[SAVE]${C.reset} ${scraped.length} livres sauvegardés dans ${out}`);
  }
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
});

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Scrape SensCritique → seed JSON                 ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Listes    : ${listIds.join(', ')}`);
  console.log(`  Mode      : ${DRY_RUN ? `${C.yellow}DRY-RUN${C.reset}` : `${C.red}APPLY${C.reset}`}`);
  console.log(`  ISBN      : ${WITH_ISBN ? `${C.green}oui (--with-isbn)${C.reset}` : `${C.dim}non${C.reset}`}`);
  console.log(`  Fusion    : ${MERGE ? `${C.green}oui (--merge)${C.reset}` : `${C.dim}non${C.reset}`}`);
  if (LIMIT) console.log(`  Limite    : ${LIMIT} livres`);
  console.log();

  // Load existing data for dedup
  const existing = loadExisting();
  const existingKeys = new Set(existing.map(b => dedupeKey(b.title, b.author)));
  console.log(`  Existants : ${existing.length} livres dans sc_listes_agregees.json`);

  // Launch browser
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });

  try {
    // Scrape each list
    for (const listId of listIds) {
      const page = await context.newPage();
      const books = await scrapeList(page, listId, listUrls.get(listId));
      scraped.push(...books);
      await page.close();
    }

    if (LIMIT) scraped = scraped.slice(0, LIMIT);

    // Dedup against existing
    const newBooks = scraped.filter(b => !existingKeys.has(dedupeKey(b.title, b.author)));
    const dupCount = scraped.length - newBooks.length;

    console.log(`\n  ${C.cyan}[DEDUP]${C.reset} ${newBooks.length} nouveaux, ${dupCount} déjà dans sc_listes_agregees.json`);

    // Enrich with ISBN if requested
    if (WITH_ISBN && !DRY_RUN && newBooks.length > 0) {
      console.log(`\n  ${C.cyan}[ISBN]${C.reset} Extraction ISBN (${newBooks.length} fiches)...\n`);
      const isbnPage = await context.newPage();
      let isbnFound = 0;

      for (let i = 0; i < newBooks.length; i++) {
        const b = newBooks[i];
        process.stdout.write(`\r  ${C.cyan}[ISBN]${C.reset} ${i + 1}/${newBooks.length} "${b.title.slice(0, 50)}"`);

        if (b.url_sc) {
          const isbn = await extractIsbn(isbnPage, b);
          if (isbn) {
            b.isbn = isbn;
            isbnFound++;
          }
          await sleep(1000);
        }

        // Checkpoint every 50
        if ((i + 1) % 50 === 0) writeCheckpoint(newBooks);
      }

      await isbnPage.close();
      process.stdout.write('\r' + ' '.repeat(80) + '\r');
      console.log(`  ${C.green}[ISBN]${C.reset} ${isbnFound}/${newBooks.length} ISBN extraits`);
    }

    // Normalize output: ensure isbn field exists
    const output = newBooks.map(b => ({
      isbn: b.isbn || '',
      title: b.title,
      author: b.author,
      cover_url: b.cover_url,
      url_sc: b.url_sc || undefined,
      source: 'senscritique',
    }));

    if (DRY_RUN) {
      console.log(`\n${C.bold}Aperçu (dry-run) — ${output.length} nouveaux livres :${C.reset}\n`);
      for (const b of output.slice(0, 20)) {
        console.log(`  ${C.green}✓${C.reset} "${b.title}" — ${b.author || C.dim + 'auteur inconnu' + C.reset} ${b.isbn ? `(${b.isbn})` : C.dim + '(sans ISBN)' + C.reset}`);
      }
      if (output.length > 20) console.log(`  ${C.dim}... et ${output.length - 20} autres${C.reset}`);
    } else {
      // Write output
      let finalData = output;
      if (MERGE && existsSync(EXISTING_FILE)) {
        finalData = [...existing, ...output];
        writeFileSync(EXISTING_FILE, JSON.stringify(finalData, null, 2));
        console.log(`\n  ${C.green}[SAVE]${C.reset} Fusionné dans ${EXISTING_FILE} (${finalData.length} livres au total)`);
      } else {
        writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
        console.log(`\n  ${C.green}[SAVE]${C.reset} Écrit dans ${OUTPUT_FILE}`);
      }
    }

    // Summary
    const withIsbn = output.filter(b => b.isbn).length;
    console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
    console.log(`  Livres extraits       : ${scraped.length}`);
    console.log(`  Nouveaux              : ${newBooks.length}`);
    console.log(`  Déjà existants        : ${dupCount}`);
    if (WITH_ISBN) {
      console.log(`  Avec ISBN             : ${withIsbn}`);
      console.log(`  Sans ISBN             : ${newBooks.length - withIsbn}`);
    }
    if (!DRY_RUN) {
      console.log(`  Fichier               : ${MERGE ? EXISTING_FILE : OUTPUT_FILE}`);
    }
    console.log();

    // Warn if no books found (likely selector issue)
    if (scraped.length === 0) {
      console.log(`  ${C.yellow}⚠ Aucun livre extrait. Les sélecteurs SC ont peut-être changé.${C.reset}`);
      console.log(`  ${C.dim}  Lance avec --debug pour inspecter le DOM.${C.reset}`);
    }

  } finally {
    await browser.close();
    browser = null;
  }
}

main().catch(e => {
  console.error(`\n${C.red}Erreur fatale :${C.reset}`, e.message);
  if (browser) browser.close().catch(() => {});
  process.exit(1);
});
