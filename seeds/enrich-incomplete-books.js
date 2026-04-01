// seeds/enrich-incomplete-books.js
// Enrichit les livres avec ISBN mais sans cover ou description
// en les repassant dans l'edge function book_import.
//
// Usage:
//   node --env-file=.env seeds/enrich-incomplete-books.js              # dry-run
//   node --env-file=.env seeds/enrich-incomplete-books.js --apply      # exécute
//   node --env-file=.env seeds/enrich-incomplete-books.js --apply --limit 20
//   node --env-file=.env seeds/enrich-incomplete-books.js --apply --cover-only

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis.');
  console.error('   Lance avec : node --env-file=.env seeds/enrich-incomplete-books.js');
  process.exit(1);
}

const APPLY      = process.argv.includes('--apply');
const COVER_ONLY = process.argv.includes('--cover-only');
const limitIdx   = process.argv.indexOf('--limit');
const LIMIT      = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Fetch candidates ────────────────────────────────────────────

async function fetchCandidates() {
  let query = supabase
    .from('books')
    .select('id, isbn_13, title, cover_url, description')
    .not('isbn_13', 'is', null)
    .order('rating_count', { ascending: false, nullsFirst: false });

  if (COVER_ONLY) {
    query = query.is('cover_url', null);
  } else {
    query = query.or('cover_url.is.null,description.is.null');
  }

  const { data, error } = await query;
  if (error) throw new Error(`Supabase query failed: ${error.message}`);
  return data;
}

// ─── Call edge function ──────────────────────────────────────────

async function callBookImport(isbn) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/book_import`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isbn }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
  }

  return res.json();
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Enrichissement livres incomplets                ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode       : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Filtre     : ${COVER_ONLY ? 'cover manquante uniquement' : 'cover OU description manquante'}`);
  if (LIMIT) console.log(`  Limite     : ${LIMIT} livres`);
  console.log();

  console.log('  Chargement des candidats...');
  let candidates = await fetchCandidates();

  if (LIMIT) candidates = candidates.slice(0, LIMIT);

  console.log(`  ${C.bold}${candidates.length} livres à enrichir${C.reset}\n`);

  if (!APPLY) {
    console.log(`${C.bold}Liste des livres à enrichir :${C.reset}\n`);
    for (const b of candidates) {
      const cover = b.cover_url ? `${C.green}cover ✓${C.reset}` : `${C.red}cover ✗${C.reset}`;
      const desc  = b.description ? `${C.green}desc ✓${C.reset}` : `${C.red}desc ✗${C.reset}`;
      console.log(`  ${b.isbn_13}  ${cover}  ${desc}  "${b.title}"`);
    }
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env seeds/enrich-incomplete-books.js --apply${C.reset}\n`);
    return;
  }

  let enriched = 0, skipped = 0, errors = 0;

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    const prefix = `[${String(i + 1).padStart(4)}/${candidates.length}]`;

    process.stdout.write(`\r  ${prefix} ${b.title.slice(0, 50).padEnd(50)}`);

    try {
      const result = await callBookImport(b.isbn_13);

      // Check what the edge function returned
      const book = result?.book || result;
      const nowHasCover = !!(book?.cover_url);
      const nowHasDesc  = !!(book?.description);

      const coverStatus = nowHasCover ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
      const descStatus  = nowHasDesc  ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;

      // If both were already present before calling, count as skipped
      const wasComplete = !!b.cover_url && !!b.description;
      if (wasComplete) {
        skipped++;
        process.stdout.write(`\r  ${C.dim}[SKIP]${C.reset} "${b.title.slice(0, 60)}"\n`);
      } else {
        enriched++;
        process.stdout.write(`\r  ${C.green}[OK]${C.reset}   "${b.title.slice(0, 50)}" — cover: ${coverStatus}  desc: ${descStatus}\n`);
      }
    } catch (e) {
      errors++;
      process.stdout.write(`\r  ${C.red}[ERR]${C.reset}  "${b.title.slice(0, 50)}" — ${e.message}\n`);
    }

    await sleep(500);
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
  console.log(`  ${C.green}Enrichis${C.reset}       : ${enriched}`);
  console.log(`  ${C.dim}Déjà complets${C.reset}  : ${skipped}`);
  console.log(`  ${C.red}Erreurs${C.reset}        : ${errors}`);
  console.log(`  Total traités  : ${candidates.length}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
