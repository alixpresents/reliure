#!/usr/bin/env node
/**
 * recover-descriptions.js
 * ─────────────────────────────────────────────────────────────────
 * Récupère les descriptions manquantes en cherchant par titre+auteur
 * sur Google Books puis Open Library en fallback.
 *
 * Prérequis :
 *   .env avec SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_GOOGLE_BOOKS_KEY
 *
 * Usage :
 *   node --env-file=.env seeds/recover-descriptions.js                    # dry-run
 *   node --env-file=.env seeds/recover-descriptions.js --apply            # exécute
 *   node --env-file=.env seeds/recover-descriptions.js --apply --limit 50
 *   node --env-file=.env seeds/recover-descriptions.js --apply --offset 200 --limit 100
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const GOOGLE_BOOKS_KEY = process.env.VITE_GOOGLE_BOOKS_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY requis.');
  console.error('   Lance avec : node --env-file=.env seeds/recover-descriptions.js');
  process.exit(1);
}

if (!GOOGLE_BOOKS_KEY) {
  console.error('VITE_GOOGLE_BOOKS_KEY manquant — Google Books sera skip.');
}

// ─── CLI ─────────────────────────────────────────────────────────

const APPLY  = process.argv.includes('--apply');
const limIdx = process.argv.indexOf('--limit');
const offIdx = process.argv.indexOf('--offset');
const LIMIT  = limIdx !== -1 ? parseInt(process.argv[limIdx + 1], 10) : null;
const OFFSET = offIdx !== -1 ? parseInt(process.argv[offIdx + 1], 10) : 0;

const MIN_DESC_LENGTH = 50;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function cleanTitle(rawTitle, authorLastName) {
  let t = rawTitle || '';
  t = t.replace(/\s*\((?:French|English|Annotated|Original|Illustrated|Unabridged|Complete|Revised|New|Updated|Classic)[^)]*\)/gi, '');
  t = t.replace(/\s*\([^)]*#\d+[^)]*\)/g, '');
  t = t.replace(/\s*[:]\s.*$/, '');
  t = t.replace(/\s+[-–—]\s+.*$/, '');
  t = t.replace(/\s+by\s+[\w\s.'-]+$/i, '');
  if (authorLastName && authorLastName.length > 2) {
    const re = new RegExp(`\\s+(?:\\S+\\s+)?${escapeRegex(authorLastName)}\\s*$`, 'i');
    t = t.replace(re, '');
  }
  return t.replace(/\s+/g, ' ').trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractAuthorLastName(authors) {
  if (!authors) return '';
  let list = authors;
  if (typeof authors === 'string') {
    try { list = JSON.parse(authors); } catch { list = [authors]; }
  }
  if (!Array.isArray(list) || list.length === 0) return '';
  const first = list[0].trim();
  if (!first) return '';
  if (first.includes(',')) return first.split(',')[0].trim();
  const parts = first.split(/\s+/);
  return parts[parts.length - 1];
}

// ─── Google Books search by title+author ─────────────────────────

async function searchGoogleDescription(title, authorLastName) {
  if (!GOOGLE_BOOKS_KEY) return null;

  const q = `intitle:${title}${authorLastName ? `+inauthor:${authorLastName}` : ''}`;

  for (const lang of ['fr', null]) {
    const params = new URLSearchParams({
      q,
      maxResults: '5',
      key: GOOGLE_BOOKS_KEY,
    });
    if (lang) params.set('langRestrict', lang);

    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        if (res.status === 429) return { error: 'quota_exceeded' };
        continue;
      }

      const data = await res.json();
      if (!data.items || data.items.length === 0) continue;

      for (const item of data.items) {
        const desc = item.volumeInfo?.description;
        if (desc && desc.length >= MIN_DESC_LENGTH) {
          return { description: desc, source: 'google', length: desc.length };
        }
        if (desc) {
          return { short: true, length: desc.length };
        }
      }
    } catch (e) {
      if (e.name === 'TimeoutError') continue;
    }
  }

  return null;
}

// ─── Open Library search by title+author ─────────────────────────

async function searchOLDescription(title, authorLastName) {
  const params = new URLSearchParams({ title, limit: '3' });
  if (authorLastName) params.set('author', authorLastName);
  params.set('fields', 'key');

  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    for (const doc of data.docs) {
      if (!doc.key) continue;

      // Fetch work detail to get description
      const workRes = await fetch(`https://openlibrary.org${doc.key}.json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!workRes.ok) continue;

      const work = await workRes.json();
      let desc = work.description;

      // description can be a string or { type: '/type/text', value: '...' }
      if (desc && typeof desc === 'object') desc = desc.value;
      if (typeof desc !== 'string') continue;

      if (desc.length >= MIN_DESC_LENGTH) {
        return { description: desc, source: 'openlibrary', length: desc.length };
      }
      if (desc.length > 0) {
        return { short: true, length: desc.length };
      }
    }
  } catch {
    // Swallow
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}══════════════════════════════════════════════════${C.reset}`);
  console.log(`${C.bold}${C.cyan}  Recuperation descriptions manquantes             ${C.reset}`);
  console.log(`${C.bold}${C.cyan}══════════════════════════════════════════════════${C.reset}\n`);
  console.log(`  Mode      : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Google    : ${GOOGLE_BOOKS_KEY ? `${C.green}oui${C.reset}` : `${C.red}non (cle manquante)${C.reset}`}`);
  console.log(`  Min chars : ${MIN_DESC_LENGTH}`);
  if (LIMIT) console.log(`  Limite    : ${LIMIT}`);
  if (OFFSET) console.log(`  Offset    : ${OFFSET}`);
  console.log();

  // Fetch candidates
  console.log('  Chargement des livres sans description...');
  const { data: candidates, error } = await supabase
    .from('books')
    .select('id, title, authors')
    .is('description', null)
    .order('rating_count', { ascending: false, nullsFirst: false });

  if (error) { console.error('Supabase:', error.message); process.exit(1); }

  let list = candidates;
  if (OFFSET) list = list.slice(OFFSET);
  if (LIMIT) list = list.slice(0, LIMIT);

  console.log(`  ${C.bold}${candidates.length}${C.reset} livres sans description au total`);
  console.log(`  ${C.bold}${list.length}${C.reset} a traiter dans cette execution\n`);

  if (!APPLY) {
    console.log(`${C.bold}Apercu (dry-run) — titres nettoyes :${C.reset}\n`);
    for (const b of list.slice(0, 20)) {
      const lastName = extractAuthorLastName(b.authors);
      const cleaned = cleanTitle(b.title, lastName);
      const authorDisplay = lastName || `${C.red}(pas d'auteur)${C.reset}`;
      const diff = cleaned !== b.title ? ` ${C.dim}<- "${b.title}"${C.reset}` : '';
      console.log(`  "${cleaned}" + ${authorDisplay}${diff}`);
    }
    if (list.length > 20) console.log(`  ${C.dim}... et ${list.length - 20} autres${C.reset}`);
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env seeds/recover-descriptions.js --apply${C.reset}\n`);
    return;
  }

  let fromGoogle = 0, fromOL = 0, missed = 0, skipped = 0, tooShort = 0, googleCalls = 0;
  let quotaExceeded = false;

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    const lastName = extractAuthorLastName(b.authors);
    const cleaned = cleanTitle(b.title, lastName);
    const prefix = `[${String(i + 1).padStart(5)}/${list.length}]`;

    process.stdout.write(`\r  ${prefix} ${cleaned.slice(0, 50).padEnd(50)}`);

    if (!lastName && !cleaned) {
      skipped++;
      process.stdout.write(`\r  ${C.dim}[SKIP]${C.reset}  "${b.title.slice(0, 55)}" — pas d'auteur ni titre\n`);
      continue;
    }

    // Quota warning
    if (googleCalls === 900 && !quotaExceeded) {
      console.log(`\n  ${C.yellow}!! 900 appels Google Books — quota bientot epuise${C.reset}\n`);
    }

    // Tentative 1: Google Books
    let result = null;
    if (!quotaExceeded) {
      result = await searchGoogleDescription(cleaned, lastName);
      googleCalls++;

      if (result?.error === 'quota_exceeded') {
        quotaExceeded = true;
        console.log(`\n  ${C.yellow}!! Quota Google Books epuise — basculement sur Open Library uniquement${C.reset}\n`);
        result = null;
      }

      if (result?.short) {
        tooShort++;
        process.stdout.write(`\r  ${C.yellow}[SHORT]${C.reset} "${cleaned.slice(0, 50)}" ${C.dim}— description trop courte (${result.length} chars)${C.reset}\n`);
        result = null; // Try OL fallback
      }
    }

    // Tentative 2: Open Library
    if (!result?.description) {
      const olResult = await searchOLDescription(cleaned, lastName);
      if (olResult?.short) {
        if (!result) { // Only count if Google didn't already find a short one
          tooShort++;
          process.stdout.write(`\r  ${C.yellow}[SHORT]${C.reset} "${cleaned.slice(0, 50)}" ${C.dim}— description trop courte (${olResult.length} chars)${C.reset}\n`);
        }
      } else if (olResult?.description) {
        result = olResult;
      }
    }

    if (result?.description) {
      if (result.source === 'google') fromGoogle++;
      else fromOL++;

      const { error: updateErr } = await supabase
        .from('books')
        .update({ description: result.description })
        .eq('id', b.id);

      if (updateErr) {
        process.stdout.write(`\r  ${C.red}[ERR]${C.reset}   "${cleaned.slice(0, 50)}" — update failed: ${updateErr.message}\n`);
      } else {
        process.stdout.write(`\r  ${C.green}[DESC]${C.reset}  "${cleaned.slice(0, 40)}" ${C.dim}<- ${result.source} (${result.length} chars)${C.reset}\n`);
      }
    } else if (!result?.short) {
      missed++;
      process.stdout.write(`\r  ${C.red}[MISS]${C.reset}  "${cleaned.slice(0, 55)}" ${C.dim}— aucune description${C.reset}\n`);
    }

    await sleep(500);
  }

  // Summary
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  const total = fromGoogle + fromOL;
  const pctG = total > 0 ? Math.round(fromGoogle / total * 100) : 0;
  const pctOL = total > 0 ? Math.round(fromOL / total * 100) : 0;

  console.log(`\n${C.bold}=== Resume ===${C.reset}\n`);
  console.log(`  ${C.green}Descriptions recuperees${C.reset}  : ${total} (${pctG}% Google, ${pctOL}% Open Library)`);
  console.log(`  ${C.red}Toujours manquantes${C.reset}      : ${missed}`);
  console.log(`  ${C.yellow}Trop courtes (< ${MIN_DESC_LENGTH} chars)${C.reset} : ${tooShort}`);
  console.log(`  ${C.dim}Skippees${C.reset}                 : ${skipped}`);
  console.log(`  Appels Google Books      : ${googleCalls}${quotaExceeded ? ` ${C.yellow}(quota epuise)${C.reset}` : ''}`);
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
