#!/usr/bin/env node
/**
 * submit-to-metasbooks.js
 * ─────────────────────────────────────────────────────────────────
 * Soumet les livres Reliure vers l'API MetasBooks.
 *
 * Prérequis :
 *   .env avec SUPABASE_URL, SUPABASE_SERVICE_KEY, METASBOOKS_API_KEY
 *
 * Usage :
 *   node --env-file=.env seeds/submit-to-metasbooks.js               # dry-run
 *   node --env-file=.env seeds/submit-to-metasbooks.js --apply
 *   node --env-file=.env seeds/submit-to-metasbooks.js --apply --limit 200
 *   node --env-file=.env seeds/submit-to-metasbooks.js --apply --offset 500 --limit 200
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL      = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const METASBOOKS_KEY    = process.env.METASBOOKS_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY requis.');
  process.exit(1);
}
if (!METASBOOKS_KEY) {
  console.error('METASBOOKS_API_KEY requis.');
  process.exit(1);
}

// ─── CLI ─────────────────────────────────────────────────────────

const APPLY  = process.argv.includes('--apply');
const limIdx = process.argv.indexOf('--limit');
const offIdx = process.argv.indexOf('--offset');
const LIMIT  = limIdx !== -1 ? parseInt(process.argv[limIdx + 1], 10) : null;
const OFFSET = offIdx !== -1 ? parseInt(process.argv[offIdx + 1], 10) : 0;

const CONCURRENCY    = 3;
const PROGRESS_EVERY = 100;

const METASBOOKS_URL = 'https://metasbooks.fr/api/v1/books/submit';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatAuthors(authors) {
  if (!authors) return '';
  let list = authors;
  if (typeof authors === 'string') {
    try { list = JSON.parse(authors); } catch { return authors; }
  }
  if (!Array.isArray(list)) return String(authors);
  return list.join(', ');
}

function buildPayload(book) {
  const auteur = formatAuthors(book.authors);
  const description = (book.description || '').slice(0, 2000);
  return {
    ean:         book.isbn_13.replace(/[^0-9]/g, ''),
    titre:       book.title,
    auteur:      auteur || '',
    editeur:     book.publisher || '',
    description,
    image_url:   book.cover_url,
  };
}

// ─── API MetasBooks ───────────────────────────────────────────────

let _firstBook = true;

async function submitBook(book) {
  const payload = buildPayload(book);

  const isFirst = _firstBook;
  if (isFirst) {
    _firstBook = false;
    console.log(`\n${C.cyan}[DEBUG] Payload premier livre :${C.reset}`);
    console.log(JSON.stringify(payload, null, 2));
  }

  try {
    const res = await fetch(METASBOOKS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': METASBOOKS_KEY,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const rawBody = await res.text();

    if (isFirst) {
      console.log(`\n${C.cyan}[DEBUG] Réponse MetasBooks (status ${res.status}) :${C.reset}`);
      console.log(rawBody || '(body vide)');
      console.log();
    }

    let data = null;
    try { data = JSON.parse(rawBody); } catch { /* body non-JSON */ }

    if (res.status === 201) return { status: 'created' };
    if (res.status === 200) return { status: 'exists' };
    if (res.status === 403) return { status: 'forbidden' };

    const message = data
      ? (data.message || data.error || JSON.stringify(data))
      : rawBody.slice(0, 200);

    if (res.status === 400) {
      if (!isFirst) {
        // Logger le body 400 en entier même pour les suivants
        console.log(`\n${C.red}[400 body]${C.reset} ${book.title.slice(0, 50)}`);
        console.log(rawBody);
      }
      return { status: 'invalid', message };
    }

    return { status: 'unexpected', code: res.status, message };

  } catch (e) {
    if (e.name === 'TimeoutError') return { status: 'error', message: 'timeout' };
    return { status: 'error', message: e.message };
  }
}

// ─── Progress ────────────────────────────────────────────────────

function saveProgress(processed, stats) {
  try {
    writeFileSync('seeds/metasbooks-progress.json', JSON.stringify({
      processed,
      ...stats,
      last_offset: OFFSET + processed,
      saved_at: new Date().toISOString(),
    }, null, 2));
  } catch { /* ignore */ }
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  console.log(`\n${C.bold}${C.cyan}======================================================${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Soumission MetasBooks                                ${C.reset}`);
  console.log(`${C.bold}${C.cyan}======================================================${C.reset}\n`);
  console.log(`  Mode         : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  if (LIMIT)  console.log(`  Limite       : ${LIMIT}`);
  if (OFFSET) console.log(`  Offset       : ${OFFSET}`);
  console.log(`  Parallelisme : ${CONCURRENCY}`);
  console.log();

  // ─── Chargement des livres ────────────────────────────────────

  console.log('  Chargement des livres...');
  const candidates = [];
  const PAGE_SIZE = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('books')
      .select('id, isbn_13, title, authors, publisher, description, cover_url, publication_date')
      .not('isbn_13', 'is', null)
      .not('description', 'is', null)
      .not('cover_url', 'is', null)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) { console.error('Supabase:', error.message); process.exit(1); }
    candidates.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    process.stdout.write(`\r  ... ${candidates.length} chargés`);
  }

  // Filtrer les couvertures Google Books (URLs instables)
  const filtered = candidates.filter(b => !b.cover_url.includes('books.google'));
  const skippedGoogle = candidates.length - filtered.length;

  let list = filtered;
  if (OFFSET) list = list.slice(OFFSET);
  if (LIMIT)  list = list.slice(0, LIMIT);

  console.log(`\r  ${C.bold}${candidates.length}${C.reset} livres éligibles au total`);
  if (skippedGoogle > 0) {
    console.log(`  ${C.dim}${skippedGoogle} ignorés (cover_url Google Books)${C.reset}`);
  }
  console.log(`  ${C.bold}${list.length}${C.reset} à traiter dans cette exécution\n`);

  // ─── Dry-run ─────────────────────────────────────────────────

  if (!APPLY) {
    console.log(`${C.bold}Aperçu (dry-run) — 10 premiers payloads :${C.reset}\n`);
    for (const b of list.slice(0, 10)) {
      const p = buildPayload(b);
      console.log(`  ${C.cyan}---${C.reset} ${p.titre}`);
      console.log(`  ${C.dim}ean:${p.ean} | auteur:${p.auteur.slice(0, 40)} | editeur:${(p.editeur || '-').slice(0, 30)}${C.reset}`);
      console.log(`  ${C.dim}image_url:${p.image_url.slice(0, 70)}${C.reset}`);
      console.log(`  ${C.dim}description: ${p.description.length} chars${C.reset}\n`);
    }
    if (list.length > 10) console.log(`  ${C.dim}... et ${list.length - 10} autres${C.reset}`);
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env seeds/submit-to-metasbooks.js --apply${C.reset}\n`);
    return;
  }

  // ─── Apply mode ───────────────────────────────────────────────

  let created = 0, exists = 0, invalid = 0, errors = 0;
  let stopAll = false;

  // Ctrl+C safe : sauvegarder avant de quitter
  process.on('SIGINT', () => {
    process.stdout.write('\n');
    saveProgress(created + exists + invalid + errors, { created, exists, invalid, errors });
    console.log(`\n  ${C.yellow}Interrompu. Checkpoint sauvegardé.${C.reset}\n`);
    process.exit(0);
  });

  async function processBook(b) {
    if (stopAll) return;

    const result = await submitBook(b);

    if (result.status === 'created') {
      created++;
      process.stdout.write(`\n  ${C.green}✓${C.reset} créé (+50 crédits) — ${b.title.slice(0, 60)}\n`);
    } else if (result.status === 'exists') {
      exists++;
      // Silencieux pour ne pas spammer — comptabilisé dans le résumé
    } else if (result.status === 'invalid') {
      invalid++;
      process.stdout.write(`\n  ${C.red}✗${C.reset} données invalides : ${result.message} — ${b.title.slice(0, 50)}\n`);
    } else if (result.status === 'forbidden') {
      process.stdout.write(`\n  ${C.red}✗ clé invalide — stopper${C.reset}\n`);
      stopAll = true;
    } else {
      errors++;
      const detail = result.message ? ` : ${result.message}` : '';
      const code = result.code ? ` [${result.code}]` : '';
      process.stdout.write(`\n  ${C.yellow}?${C.reset} statut inattendu${code}${detail} — ${b.title.slice(0, 50)}\n`);
    }
  }

  for (let i = 0; i < list.length; i += CONCURRENCY) {
    if (stopAll) break;

    const batch = list.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(b => processBook(b)));

    const done = Math.min(i + CONCURRENCY, list.length);
    process.stdout.write(
      `\r  [${String(done).padStart(5)}/${list.length}] ` +
      `${C.green}créés:${created}${C.reset} → déjà:${exists} ` +
      `${C.red}invalides:${invalid} err:${errors}${C.reset}` +
      `  `.padEnd(10)
    );

    if (done % PROGRESS_EVERY === 0) {
      saveProgress(done, { created, exists, invalid, errors });
    }
  }

  saveProgress(list.length, { created, exists, invalid, errors });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`\n\n${C.bold}=== Résumé ===${C.reset}\n`);
  console.log(`  ${C.green}Livres créés${C.reset}         : ${created} (+${created * 50} crédits estimés)`);
  console.log(`  Déjà existants        : ${exists}`);
  console.log(`  ${C.red}Données invalides${C.reset}    : ${invalid}`);
  console.log(`  ${C.yellow}Erreurs${C.reset}              : ${errors}`);
  console.log(`  Durée                 : ${minutes}m ${seconds}s`);
  console.log(`  Checkpoint            : seeds/metasbooks-progress.json\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
