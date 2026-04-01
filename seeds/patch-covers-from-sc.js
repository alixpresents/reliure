// seeds/patch-covers-from-sc.js
// Usage: node --env-file=.env seeds/patch-covers-from-sc.js
//
// Mode dry-run par défaut. Ajoute --apply pour exécuter les updates.
// Exemple: node --env-file=.env seeds/patch-covers-from-sc.js --apply

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const DRY_RUN = !process.argv.includes('--apply');

if (DRY_RUN) {
  console.log('🔍 MODE DRY-RUN — rien ne sera modifié. Ajoute --apply pour exécuter.\n');
} else {
  console.log('⚡ MODE APPLY — les covers vont être patchées.\n');
}

// ─── Helpers ────────────────────────────────

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLastName(author) {
  if (!author) return '';
  const parts = author.trim().split(/\s+/);
  return normalize(parts[parts.length - 1]);
}

// ─── Load SC data ───────────────────────────

function loadSCData(path) {
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw);

  // Index by ISBN
  const byIsbn = {};
  const byTitleAuthor = {};

  for (const entry of data) {
    if (!entry.cover_url) continue;

    if (entry.isbn && entry.isbn.length >= 10) {
      byIsbn[entry.isbn] = entry.cover_url;
    }

    const normTitle = normalize(entry.title?.split(':')[0] || '');
    const normAuthor = extractLastName(entry.author);
    if (normTitle) {
      byTitleAuthor[`${normTitle}|${normAuthor}`] = entry.cover_url;
    }
  }

  console.log(`📄 SC JSON chargé: ${data.length} entrées`);
  console.log(`   ${Object.keys(byIsbn).length} indexées par ISBN`);
  console.log(`   ${Object.keys(byTitleAuthor).length} indexées par titre+auteur\n`);

  return { byIsbn, byTitleAuthor };
}

// ─── Fetch books without covers ─────────────

async function fetchBooksWithoutCover() {
  const allBooks = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('books')
      .select('id, isbn_13, title, authors, cover_url')
      .is('cover_url', null)
      .range(from, from + pageSize - 1);

    if (error) throw error;
    allBooks.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allBooks;
}

// ─── Match and patch ────────────────────────

async function main() {
  const scPath = process.argv[2] && !process.argv[2].startsWith('--')
    ? process.argv[2]
    : 'seeds/sc_listes_agregees.json';

  const sc = loadSCData(scPath);

  console.log('📚 Fetching books sans cover...');
  const booksNoCover = await fetchBooksWithoutCover();
  console.log(`   ${booksNoCover.length} livres sans cover_url.\n`);

  if (booksNoCover.length === 0) {
    console.log('✅ Tous les livres ont une cover !');
    return;
  }

  let matchedIsbn = 0;
  let matchedTitle = 0;
  let noMatch = 0;
  const updates = [];

  for (const book of booksNoCover) {
    let coverUrl = null;

    // Try ISBN match first
    if (book.isbn_13 && sc.byIsbn[book.isbn_13]) {
      coverUrl = sc.byIsbn[book.isbn_13];
      matchedIsbn++;
    }

    // Fallback: title + author match
    if (!coverUrl) {
      const normTitle = normalize(book.title?.split(':')[0] || '');
      const author = Array.isArray(book.authors) && book.authors.length > 0
        ? extractLastName(book.authors[0])
        : '';
      const key = `${normTitle}|${author}`;

      if (sc.byTitleAuthor[key]) {
        coverUrl = sc.byTitleAuthor[key];
        matchedTitle++;
      }
    }

    if (coverUrl) {
      updates.push({ id: book.id, title: book.title, cover_url: coverUrl });
    } else {
      noMatch++;
    }
  }

  console.log(`📊 Résultats du matching:`);
  console.log(`   ${matchedIsbn} matchés par ISBN`);
  console.log(`   ${matchedTitle} matchés par titre+auteur`);
  console.log(`   ${noMatch} sans correspondance SC`);
  console.log(`   ${updates.length} covers à patcher\n`);

  // Show first 10
  console.log('─── Aperçu (max 15) ───\n');
  for (const u of updates.slice(0, 15)) {
    console.log(`  "${u.title}" → ${u.cover_url.slice(0, 60)}...`);
  }
  if (updates.length > 15) console.log(`  ... et ${updates.length - 15} de plus.\n`);

  if (DRY_RUN) {
    console.log(`\n💡 Pour exécuter : node --env-file=.env seeds/patch-covers-from-sc.js --apply`);
    return;
  }

  // Execute updates in batches of 50
  console.log('\n🔧 Patching...');
  let done = 0;
  const batchSize = 50;

  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const promises = batch.map(u =>
      supabase.from('books').update({ cover_url: u.cover_url }).eq('id', u.id)
    );
    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    done += batch.length - errors.length;
    if (errors.length > 0) {
      console.log(`  ⚠ ${errors.length} erreurs dans le batch ${Math.floor(i/batchSize) + 1}`);
    }
    process.stdout.write(`  ${done}/${updates.length} patchés\r`);
  }

  console.log(`\n\n✅ Terminé. ${done} covers mises à jour.`);

  // Recount
  const { count } = await supabase
    .from('books')
    .select('id', { count: 'exact', head: true })
    .is('cover_url', null);
  console.log(`   ${count} livres restent sans cover.`);
}

main().catch(console.error);
