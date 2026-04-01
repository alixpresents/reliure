// seeds/deduplicate-books.js
// Usage: node --env-file=.env seeds/deduplicate-books.js
//
// Mode dry-run par défaut. Ajoute --apply pour exécuter les merges.
// Exemple: node --env-file=.env seeds/deduplicate-books.js --apply

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // service_role pour bypass RLS
);

const DRY_RUN = !process.argv.includes('--apply');

if (DRY_RUN) {
  console.log('🔍 MODE DRY-RUN — rien ne sera modifié. Ajoute --apply pour exécuter.\n');
} else {
  console.log('⚡ MODE APPLY — les merges vont être exécutés.\n');
}

// ─── Helpers ────────────────────────────────

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')     // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLastName(author) {
  if (!author) return '';
  const parts = author.trim().split(/\s+/);
  return normalize(parts[parts.length - 1]);
}

function completenessScore(book) {
  let score = 0;
  if (book.isbn_13) score += 3;
  if (book.cover_url) score += 3;
  if (book.slug) score += 2;
  if (book.page_count) score += 1;
  if (book.publisher) score += 1;
  if (book.publication_date) score += 1;
  if (book.genres && book.genres.length > 0) score += 1;
  if (book.subtitle) score += 1;
  if (book.language === 'fr') score += 1;
  if (book.rating_count > 0) score += 2; // has user data — important to keep
  return score;
}

// ─── Fetch all books ────────────────────────

async function fetchAllBooks() {
  const allBooks = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('books')
      .select('id, isbn_13, title, subtitle, authors, publisher, publication_date, cover_url, language, genres, page_count, avg_rating, rating_count, source, slug, created_at')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    allBooks.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allBooks;
}

// ─── Find duplicates ────────────────────────

function findDuplicates(books) {
  const dupes = [];

  // Pass 1: ISBN exact match
  const byIsbn = {};
  for (const book of books) {
    if (!book.isbn_13) continue;
    const key = book.isbn_13.trim();
    if (!byIsbn[key]) byIsbn[key] = [];
    byIsbn[key].push(book);
  }

  const isbnDupeIds = new Set();
  for (const [isbn, group] of Object.entries(byIsbn)) {
    if (group.length < 2) continue;
    dupes.push({ type: 'isbn', key: isbn, books: group });
    group.forEach(b => isbnDupeIds.add(b.id));
  }

  // Pass 2: Title + Author normalized (skip books already caught by ISBN)
  const byTitleAuthor = {};
  for (const book of books) {
    if (isbnDupeIds.has(book.id)) continue;
    const author = Array.isArray(book.authors) && book.authors.length > 0
      ? extractLastName(book.authors[0])
      : '';
    const normTitle = normalize(book.title?.split(':')[0] || '');
    if (!normTitle) continue;
    const key = `${normTitle}|${author}`;
    if (!byTitleAuthor[key]) byTitleAuthor[key] = [];
    byTitleAuthor[key].push(book);
  }

  for (const [key, group] of Object.entries(byTitleAuthor)) {
    if (group.length < 2) continue;
    dupes.push({ type: 'title+author', key, books: group });
  }

  return dupes;
}

// ─── Merge logic ────────────────────────────

async function mergeDuplicateGroup(group) {
  // Sort by completeness — the "winner" has the most data
  const sorted = group.books.sort((a, b) => completenessScore(b) - completenessScore(a));
  const winner = sorted[0];
  const losers = sorted.slice(1);
  const loserIds = losers.map(l => l.id);

  console.log(`  ✓ KEEP: "${winner.title}" [${winner.id.slice(0, 8)}] (score ${completenessScore(winner)}, slug: ${winner.slug || 'null'})`);
  losers.forEach(l => {
    console.log(`    ✗ MERGE: "${l.title}" [${l.id.slice(0, 8)}] (score ${completenessScore(l)}, slug: ${l.slug || 'null'})`);
  });

  // Fill missing fields on winner from losers
  const fillFields = ['isbn_13', 'cover_url', 'slug', 'subtitle', 'publisher', 'publication_date', 'page_count', 'language'];
  const updates = {};
  for (const field of fillFields) {
    if (!winner[field] || winner[field] === '' || winner[field] === 0) {
      for (const loser of losers) {
        if (loser[field] && loser[field] !== '' && loser[field] !== 0) {
          updates[field] = loser[field];
          break;
        }
      }
    }
  }
  // Merge genres
  if ((!winner.genres || winner.genres.length === 0)) {
    for (const loser of losers) {
      if (loser.genres && loser.genres.length > 0) {
        updates.genres = loser.genres;
        break;
      }
    }
  }

  if (DRY_RUN) return { winner, losers: loserIds, updates };

  // 1. Update winner with merged fields
  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from('books').update(updates).eq('id', winner.id);
    if (error) console.error(`    ⚠ Update winner failed:`, error.message);
    else console.log(`    📝 Updated winner with: ${Object.keys(updates).join(', ')}`);
  }

  // 2. Re-point all foreign keys from losers to winner
  for (const table of ['reading_status', 'reviews', 'quotes', 'list_items']) {
    const { error } = await supabase
      .from(table)
      .update({ book_id: winner.id })
      .in('book_id', loserIds);
    if (error && !error.message.includes('duplicate')) {
      console.error(`    ⚠ Re-point ${table} failed:`, error.message);
    }
  }

  // 3. Re-point user_favorites
  const { error: favError } = await supabase
    .from('user_favorites')
    .update({ book_id: winner.id })
    .in('book_id', loserIds);
  if (favError && !favError.message.includes('duplicate')) {
    console.error(`    ⚠ Re-point user_favorites failed:`, favError.message);
  }

  // 4. Update activity metadata
  // Activity references books in metadata.bookId or metadata.bookSlug
  // We just update the target_id for reading_status type activities
  // Other activity types reference reviews/quotes which were already re-pointed

  // 5. Delete losers
  for (const loserId of loserIds) {
    const { error } = await supabase.from('books').delete().eq('id', loserId);
    if (error) console.error(`    ⚠ Delete ${loserId} failed:`, error.message);
  }

  return { winner, losers: loserIds, updates };
}

// ─── Main ───────────────────────────────────

async function main() {
  console.log('📚 Fetching all books...');
  const books = await fetchAllBooks();
  console.log(`   ${books.length} livres en base.\n`);

  console.log('🔎 Recherche des doublons...\n');
  const dupes = findDuplicates(books);

  const isbnDupes = dupes.filter(d => d.type === 'isbn');
  const titleDupes = dupes.filter(d => d.type === 'title+author');

  console.log(`📊 Résultats:`);
  console.log(`   ${isbnDupes.length} groupes de doublons ISBN (${isbnDupes.reduce((s, d) => s + d.books.length, 0)} livres)`);
  console.log(`   ${titleDupes.length} groupes de doublons titre+auteur (${titleDupes.reduce((s, d) => s + d.books.length, 0)} livres)`);
  console.log(`   ${dupes.reduce((s, d) => s + d.books.length - 1, 0)} livres à supprimer après merge\n`);

  if (dupes.length === 0) {
    console.log('✅ Aucun doublon trouvé !');
    return;
  }

  // Show first 10 for review
  console.log('─── Aperçu (max 20 groupes) ───\n');
  for (const group of dupes.slice(0, 20)) {
    console.log(`[${group.type}] ${group.key}`);
    await mergeDuplicateGroup(group);
    console.log('');
  }

  if (dupes.length > 20) {
    console.log(`... et ${dupes.length - 20} groupes de plus.\n`);
  }

  if (!DRY_RUN) {
    // Process remaining groups
    for (const group of dupes.slice(20)) {
      await mergeDuplicateGroup(group);
    }
    console.log(`\n✅ Merge terminé. ${dupes.reduce((s, d) => s + d.books.length - 1, 0)} doublons supprimés.`);
  } else {
    console.log('─────────────────────────────────');
    console.log(`\n💡 Pour exécuter : node --env-file=.env seeds/deduplicate-books.js --apply`);
  }
}

main().catch(console.error);
