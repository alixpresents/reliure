// scripts/tag-book-facets.mjs
// Enrichit la table book_facets via Claude Haiku (analyse humeur, intrigue, personnage).
//
// Usage:
//   node --env-file=.env scripts/tag-book-facets.mjs              # dry-run
//   node --env-file=.env scripts/tag-book-facets.mjs --apply       # exécute
//   node --env-file=.env scripts/tag-book-facets.mjs --apply --limit 50
//   node --env-file=.env scripts/tag-book-facets.mjs --apply --force  # re-tag même si déjà taggé

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis.');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY est requis.');
  process.exit(1);
}

const APPLY    = process.argv.includes('--apply');
const FORCE    = process.argv.includes('--force');
const limitIdx = process.argv.indexOf('--limit');
const LIMIT    = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const C = {
  reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m',
  yellow: '\x1b[33m', dim: '\x1b[2m', bold: '\x1b[1m', cyan: '\x1b[36m',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Allowed values ─────────────────────────────────────────────

const VALID_MOODS = new Set([
  'réconfortant', 'sombre', 'drôle', 'mélancolique', 'haletant',
  'contemplatif', 'dérangeant', 'lumineux', 'sensuel', 'poétique',
]);
const VALID_INTRIGUES = new Set([
  'quête', 'famille', 'amour', 'deuil', 'identité',
  'voyage', 'guerre', 'société', 'survie', 'amitié',
]);
const VALID_RYTHME = new Set(['lent', 'rapide']);
const VALID_REGISTRE = new Set(['léger', 'grave', 'ironique']);
const VALID_PROTAG_AGE = new Set(['enfant', 'ado', 'jeune_adulte', 'age_mur', 'senior']);
const VALID_PROTAG_GENRE = new Set(['femme', 'homme', 'non_binaire', 'collectif']);

// ─── Fetch candidates ───────────────────────────────────────────

async function fetchCandidates() {
  // Paginer pour récupérer tous les livres fiction avec description
  let allBooks = [];
  const PAGE_SIZE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from('books')
      .select('id, title, authors, description, genres, publication_date, page_count, flag_fiction')
      .eq('flag_fiction', true)
      .not('description', 'is', null)
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    if (!data || data.length === 0) break;

    allBooks.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  console.log(`  ${C.dim}${allBooks.length} livres fiction récupérés (${Math.ceil(allBooks.length / PAGE_SIZE)} pages)${C.reset}`);

  // Filtrer côté JS : description >= 50 chars
  let candidates = allBooks.filter(b => (b.description || '').length >= 50);

  // Exclure les livres déjà taggés (sauf --force)
  if (!FORCE) {
    // Paginer aussi book_facets
    const existingIds = new Set();
    let facetOffset = 0;
    while (true) {
      const { data: existing, error: exErr } = await supabase
        .from('book_facets')
        .select('book_id')
        .range(facetOffset, facetOffset + PAGE_SIZE - 1);
      if (exErr) throw new Error(`book_facets query failed: ${exErr.message}`);
      if (!existing || existing.length === 0) break;
      for (const r of existing) existingIds.add(r.book_id);
      if (existing.length < PAGE_SIZE) break;
      facetOffset += PAGE_SIZE;
    }
    candidates = candidates.filter(b => !existingIds.has(b.id));
  }

  return candidates;
}

// ─── Call Haiku ─────────────────────────────────────────────────

async function callHaiku(book) {
  const title = book.title || '';
  const authors = Array.isArray(book.authors) ? book.authors.join(', ') : (book.authors || '');
  const description = (book.description || '').slice(0, 1500);
  const genres = book.genres || [];
  const year = book.publication_date ? book.publication_date.slice(0, 4) : null;
  const pages = book.page_count;

  const prompt = `Tu es un bibliothécaire expert. Analyse ce livre et retourne UNIQUEMENT un JSON valide, sans markdown.

Titre : "${title}"
Auteur(s) : "${authors}"
Description : "${description}"
Genres : ${JSON.stringify(genres)}
Année : ${year || "inconnue"}
Pages : ${pages || "inconnu"}

Retourne :
{
  "moods": ["mot1", "mot2"],
  "rythme": "lent" ou "rapide",
  "registre": "léger", "grave" ou "ironique",
  "protag_age": "enfant", "ado", "jeune_adulte", "age_mur" ou "senior",
  "protag_genre": "femme", "homme", "non_binaire" ou "collectif",
  "intrigues": ["mot1", "mot2"],
  "confidence": 0.85
}

Règles :
- moods : 1 à 3 valeurs parmi UNIQUEMENT : réconfortant, sombre, drôle, mélancolique, haletant, contemplatif, dérangeant, lumineux, sensuel, poétique
- intrigues : 1 à 3 valeurs parmi UNIQUEMENT : quête, famille, amour, deuil, identité, voyage, guerre, société, survie, amitié
- rythme : "lent" si roman d'ambiance/introspectif, "rapide" si thriller/page-turner/aventure
- registre : "léger" si ton détendu/humoristique, "grave" si ton sérieux/dramatique, "ironique" si satire/distance/cynisme
- protag_age : âge du protagoniste principal. "collectif" pour protag_genre si pas de protagoniste unique
- confidence : 0.9+ si tu connais bien le livre, 0.7-0.9 si tu déduis de la description, <0.7 si tu devines
- Si la description est trop courte ou vague pour un champ, mets null pour ce champ`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Haiku HTTP ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`);
  }

  const data = await res.json();
  const raw = data?.content?.[0]?.text || '';

  // Clean markdown fences
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── Validate facets ────────────────────────────────────────────

function validateFacets(raw) {
  const moods = Array.isArray(raw.moods)
    ? raw.moods.filter(m => VALID_MOODS.has(m)).slice(0, 4)
    : [];
  const intrigues = Array.isArray(raw.intrigues)
    ? raw.intrigues.filter(i => VALID_INTRIGUES.has(i)).slice(0, 4)
    : [];
  const rythme = VALID_RYTHME.has(raw.rythme) ? raw.rythme : null;
  const registre = VALID_REGISTRE.has(raw.registre) ? raw.registre : null;
  const protag_age = VALID_PROTAG_AGE.has(raw.protag_age) ? raw.protag_age : null;
  const protag_genre = VALID_PROTAG_GENRE.has(raw.protag_genre) ? raw.protag_genre : null;
  const confidence = typeof raw.confidence === 'number'
    ? Math.min(1, Math.max(0, raw.confidence))
    : 0.5;

  return { moods, intrigues, rythme, registre, protag_age, protag_genre, confidence };
}

// ─── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n${C.bold}${C.cyan}╔══════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║  Tag Book Facets (Boussole)                      ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚══════════════════════════════════════════════════╝${C.reset}\n`);
  console.log(`  Mode       : ${APPLY ? `${C.red}APPLY${C.reset}` : `${C.yellow}DRY-RUN${C.reset}`}`);
  console.log(`  Force      : ${FORCE ? 'oui (re-tag tout)' : 'non (skip déjà taggés)'}`);
  if (LIMIT) console.log(`  Limite     : ${LIMIT} livres`);
  console.log();

  console.log('  Chargement des candidats...');
  let candidates = await fetchCandidates();

  if (LIMIT) candidates = candidates.slice(0, LIMIT);

  console.log(`  ${C.bold}${candidates.length} livres à tagger${C.reset}\n`);

  if (!APPLY) {
    console.log(`${C.bold}Liste des livres à tagger :${C.reset}\n`);
    for (const b of candidates.slice(0, 30)) {
      const authors = Array.isArray(b.authors) ? b.authors.join(', ') : (b.authors || '?');
      const descLen = (b.description || '').length;
      console.log(`  ${C.dim}${b.id.slice(0, 8)}${C.reset}  "${b.title.slice(0, 50)}" — ${authors.slice(0, 30)} ${C.dim}(${descLen} chars)${C.reset}`);
    }
    if (candidates.length > 30) {
      console.log(`  ${C.dim}... et ${candidates.length - 30} de plus${C.reset}`);
    }
    console.log(`\n  ${C.dim}Pour lancer : node --env-file=.env scripts/tag-book-facets.mjs --apply${C.reset}\n`);
    return;
  }

  let tagged = 0, skipped = 0, errors = 0;
  const recentlyTagged = [];

  for (let i = 0; i < candidates.length; i++) {
    const b = candidates[i];
    const prefix = `[${String(i + 1).padStart(4)}/${candidates.length}]`;

    process.stdout.write(`\r  ${prefix} ${b.title.slice(0, 50).padEnd(50)}`);

    try {
      const raw = await callHaiku(b);
      const facets = validateFacets(raw);

      const { error: upsertErr } = await supabase.from('book_facets').upsert({
        book_id: b.id,
        moods: facets.moods,
        rythme: facets.rythme,
        registre: facets.registre,
        protag_age: facets.protag_age,
        protag_genre: facets.protag_genre,
        intrigues: facets.intrigues,
        source: 'ai',
        confidence: facets.confidence,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'book_id' });

      if (upsertErr) throw new Error(`Upsert: ${upsertErr.message}`);

      tagged++;
      recentlyTagged.push({ title: b.title, ...facets });
      process.stdout.write(`\r  ${C.green}[OK]${C.reset}   "${b.title.slice(0, 45)}" — ${facets.moods.join(', ')} | ${facets.intrigues.join(', ')} ${C.dim}(${facets.confidence})${C.reset}\n`);
    } catch (e) {
      errors++;
      process.stdout.write(`\r  ${C.red}[ERR]${C.reset}  "${b.title.slice(0, 50)}" — ${e.message.slice(0, 80)}\n`);
    }

    await sleep(800);
  }

  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  console.log(`\n${C.bold}═══ Résumé ═══${C.reset}\n`);
  console.log(`  ${C.green}Taggés${C.reset}         : ${tagged}`);
  console.log(`  ${C.dim}Skipped${C.reset}        : ${skipped}`);
  console.log(`  ${C.red}Erreurs${C.reset}        : ${errors}`);
  console.log(`  Total traité   : ${candidates.length}\n`);

  // Rapport JSON
  const report = {
    timestamp: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    force: FORCE,
    stats: { tagged, skipped, errors, total: candidates.length },
    lastTagged: recentlyTagged.slice(-5),
  };

  const { writeFileSync } = await import('fs');
  writeFileSync('book-facets-report.json', JSON.stringify(report, null, 2));
  console.log(`  ${C.dim}Rapport : book-facets-report.json${C.reset}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
