#!/usr/bin/env node
/**
 * recover-covers.js
 * ─────────────────────────────────────────────────────────────────
 * Récupère les couvertures manquantes en cherchant par titre+auteur
 * sur Google Books puis Open Library en fallback.
 *
 * Ne cherche PAS par ISBN (taux de succès ~0% car éditions obscures).
 * Cherche la meilleure couverture, quelle que soit l'édition.
 *
 * Prérequis :
 *   .env avec SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_GOOGLE_BOOKS_KEY
 *
 * Usage :
 *   node --env-file=.env seeds/recover-covers.js                    # dry-run
 *   node --env-file=.env seeds/recover-covers.js --apply            # exécute
 *   node --env-file=.env seeds/recover-covers.js --apply --limit 50
 *   node --env-file=.env seeds/recover-covers.js --apply --offset 200 --limit 100
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

// ─── Env ─────────────────────────────────────────────────────────

const SUPABASE_URL     = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;
const GOOGLE_BOOKS_KEY = process.env.VITE_GOOGLE_BOOKS_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ SUPABASE_URL et SUPABASE_SERVICE_KEY requis.');
  console.error('   Lance avec : node --env-file=.env seeds/recover-covers.js');
  process.exit(1);
}

if (!GOOGLE_BOOKS_KEY) {
  console.error('⚠ VITE_GOOGLE_BOOKS_KEY manquant — Google Books sera skip.');
}

// ─── CLI ─────────────────────────────────────────────────────────

const APPLY  = process.argv.includes('--apply');
const limIdx = process.argv.indexOf('--limit');
const offIdx = process.argv.indexOf('--offset');
const LIMIT  = limIdx !== -1 ? parseInt(process.argv[limIdx + 1], 10) : null;
const OFFSET = offIdx !== -1 ? parseInt(process.argv[offIdx + 1], 10) : 0;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Helpers ─────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Nettoie un titre pour la recherche :
 * - Supprime suffixes parasites : (French Edition), (Annotated), etc.
 * - Supprime sous-titres après ":" ou " - "
 * - Supprime séries entre parenthèses : (Naruto, #27)
 * - Supprime "by Author Name" en fin de titre
 * - Supprime le nom d'auteur s'il apparaît à la fin du titre
 */
function cleanTitle(rawTitle, authorLastName) {
  let t = rawTitle || '';

  // Remove edition/annotation suffixes in parentheses
  t = t.replace(/\s*\((?:French|English|Annotated|Original|Illustrated|Unabridged|Complete|Revised|New|Updated|Classic)[^)]*\)/gi, '');

  // Remove series in parentheses: (Naruto, #27), (Sharko & Hennebelle, #10)
  t = t.replace(/\s*\([^)]*#\d+[^)]*\)/g, '');

  // Remove subtitles after ":" or " - "
  t = t.replace(/\s*[:]\s.*$/, '');
  t = t.replace(/\s+[-–—]\s+.*$/, '');

  // Remove "by Author Name" at end
  t = t.replace(/\s+by\s+[\w\s.'-]+$/i, '');

  // If the author last name appears at the end of the title, remove it
  // e.g. "Crome Yellow Aldous Huxley" → "Crome Yellow"
  if (authorLastName && authorLastName.length > 2) {
    const re = new RegExp(`\\s+(?:\\S+\\s+)?${escapeRegex(authorLastName)}\\s*$`, 'i');
    t = t.replace(re, '');
  }

  // Trim and normalize spaces
  return t.replace(/\s+/g, ' ').trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extrait le nom de famille du premier auteur depuis le JSONB authors.
 * Gère les formats : ["Prénom Nom"], ["Nom, Prénom"], "Prénom Nom"
 */
function extractAuthorLastName(authors) {
  if (!authors) return '';

  let list = authors;
  if (typeof authors === 'string') {
    try { list = JSON.parse(authors); } catch { list = [authors]; }
  }
  if (!Array.isArray(list) || list.length === 0) return '';

  const first = list[0].trim();
  if (!first) return '';

  // "Nom, Prénom" format
  if (first.includes(',')) {
    return first.split(',')[0].trim();
  }

  // "Prénom Nom" or "Prénom Deuxième Nom" — take last word
  const parts = first.split(/\s+/);
  return parts[parts.length - 1];
}

// ─── Google Books search by title+author ─────────────────────────

async function searchGoogleCover(title, authorLastName) {
  if (!GOOGLE_BOOKS_KEY) return null;

  const q = `intitle:${title}${authorLastName ? `+inauthor:${authorLastName}` : ''}`;

  // Try FR first, then any language
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
        const thumb = item.volumeInfo?.imageLinks?.thumbnail;
        if (thumb) {
          // Upgrade: zoom=1 → zoom=2, remove &edge=curl
          let url = thumb
            .replace('zoom=1', 'zoom=2')
            .replace(/&edge=curl/g, '')
            .replace('http://', 'https://');
          return { url, source: 'google' };
        }
      }
    } catch (e) {
      if (e.name === 'TimeoutError') continue;
      // Swallow other fetch errors
    }
  }

  return null;
}

// ─── Open Library search by title+author ─────────────────────────

async function searchOLCover(title, authorLastName) {
  const params = new URLSearchParams({ title, limit: '3' });
  if (authorLastName) params.set('author', authorLastName);

  try {
    const res = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.docs || data.docs.length === 0) return null;

    for (const doc of data.docs) {
      if (doc.cover_i) {
        return {
          url: `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`,
          source: 'openlibrary',
        };
      }
    }
  } catch {
    // Swallow
  }

  return null;
}

// ─── Main ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Récupération covers manquantes (titre+auteur)   ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode      : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Google    : ${GOOGLE_BOOKS_KEY ? `${C.green}oui${C.reset}` : `${C.red}non (clé manquante)${C.reset}`}`);
  if (LIMIT) console.log(`  Limite    : ${LIMIT}`);
  if (OFFSET) console.log(`  Offset    : ${OFFSET}`);
  console.log();

  // Fetch candidates
  console.log('  Chargement des livres sans couverture...');
  const { data: candidates, error } = await supabase
    .from('books')
    .select('id, title, authors, isbn_13')
    .is('cover_url', null)
    .order('rating_count', { ascending: false, nullsFirst: false });

  if (error) { console.error('❌ Supabase:', error.message); process.exit(1); }

  let list = candidates;
  if (OFFSET) list = list.slice(OFFSET);
  if (LIMIT) list = list.slice(0, LIMIT);

  console.log(`  ${C.bold}${candidates.length}${C.reset} livres sans cover au total`);
  console.log(`  ${C.bold}${list.length}${C.reset} à traiter dans cette exécution\n`);

  if (!APPLY) {
    console.log(`${C.bold}Aperçu (dry-run) — titres nettoyés :${C.reset}\n`);
    for (const b of list.slice(0, 30)) {
      const lastName = extractAuthorLastName(b.authors);
      const cleaned = cleanTitle(b.title, lastName);
      const authorDisplay = lastName || `${C.red}∅${C.reset}`;
      const diff = cleaned !== b.title ? ` ${C.dim}← "${b.title}"${C.reset}` : '';
      console.log(`  "${cleaned}" + ${authorDisplay}${diff}`);
    }
    if (list.length > 30) console.log(`  ${C.dim}... et ${list.length - 30} autres${C.reset}`);
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env seeds/recover-covers.js --apply${C.reset}\n`);
    return;
  }

  let fromGoogle = 0, fromOL = 0, missed = 0, skipped = 0, googleCalls = 0;
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

    // Tentative 1: Google Books
    let result = null;
    if (!quotaExceeded) {
      result = await searchGoogleCover(cleaned, lastName);
      googleCalls++;

      if (result?.error === 'quota_exceeded') {
        quotaExceeded = true;
        console.log(`\n  ${C.yellow}⚠ Quota Google Books épuisé — basculement sur Open Library uniquement${C.reset}\n`);
        result = null;
      }
    }

    // Tentative 2: Open Library
    if (!result) {
      result = await searchOLCover(cleaned, lastName);
    }

    if (result?.url) {
      if (result.source === 'google') fromGoogle++;
      else fromOL++;

      // UPDATE cover_url
      const { error: updateErr } = await supabase
        .from('books')
        .update({ cover_url: result.url })
        .eq('id', b.id);

      if (updateErr) {
        process.stdout.write(`\r  ${C.red}[ERR]${C.reset}   "${cleaned.slice(0, 50)}" — update failed: ${updateErr.message}\n`);
      } else {
        const shortUrl = result.url.length > 60 ? result.url.slice(0, 57) + '...' : result.url;
        process.stdout.write(`\r  ${C.green}[COVER]${C.reset} "${cleaned.slice(0, 40)}" ${C.dim}← ${result.source} — ${shortUrl}${C.reset}\n`);
      }
    } else {
      missed++;
      process.stdout.write(`\r  ${C.red}[MISS]${C.reset}  "${cleaned.slice(0, 55)}" ${C.dim}— aucune cover${C.reset}\n`);
    }

    await sleep(500);
  }

  // Summary
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  const total = fromGoogle + fromOL;
  const pctG = total > 0 ? Math.round(fromGoogle / total * 100) : 0;
  const pctOL = total > 0 ? Math.round(fromOL / total * 100) : 0;

  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
  console.log(`  ${C.green}Covers récupérées${C.reset}    : ${total} (${pctG}% Google, ${pctOL}% Open Library)`);
  console.log(`  ${C.red}Toujours manquantes${C.reset}  : ${missed}`);
  console.log(`  ${C.dim}Skippées${C.reset}             : ${skipped}`);
  console.log(`  Appels Google Books  : ${googleCalls}${quotaExceeded ? ` ${C.yellow}(quota épuisé)${C.reset}` : ''}`);
  console.log();
}

main().catch(e => { console.error(e); process.exit(1); });
