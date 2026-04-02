#!/usr/bin/env node
/**
 * seed-gb-ratings.mjs
 * Remplit gb_ratings_count + gb_avg_rating depuis Google Books API
 * pour tous les livres avec un ISBN.
 *
 * Usage :
 *   node seed-gb-ratings.mjs            → dry-run (affiche sans écrire)
 *   node seed-gb-ratings.mjs --apply    → écrit dans Supabase
 *   node seed-gb-ratings.mjs --apply --limit=100  → teste sur 100 livres
 */

import { createClient } from '@supabase/supabase-js'

const APPLY    = process.argv.includes('--apply')
const LIMIT    = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0')
const BATCH    = 10   // livres traités en parallèle
const DELAY_MS = 300  // pause entre batches (évite 429)

const SUPABASE_URL     = process.env.SUPABASE_URL
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY
const GOOGLE_BOOKS_KEY = process.env.VITE_GOOGLE_BOOKS_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !GOOGLE_BOOKS_KEY) {
  console.error('❌ Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_KEY, VITE_GOOGLE_BOOKS_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Fetch Google Books par ISBN ──────────────────────────────────────────────

async function fetchGBRatings(isbn13) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&key=${GOOGLE_BOOKS_KEY}&fields=items(volumeInfo(ratingsCount,averageRating))`
  const res = await fetch(url)
  if (!res.ok) {
    if (res.status === 429) throw new Error('RATE_LIMIT')
    return null
  }
  const data = await res.json()
  const info = data?.items?.[0]?.volumeInfo
  if (!info?.ratingsCount) return null
  return {
    gb_ratings_count: info.ratingsCount,
    gb_avg_rating:    info.averageRating ?? null,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📚 seed-gb-ratings — mode : ${APPLY ? '✅ APPLY' : '🔍 DRY-RUN'}`)
  if (LIMIT) console.log(`   Limité à ${LIMIT} livres`)

  // 1. Récupérer les livres avec ISBN mais sans gb_ratings_count
  let query = supabase
    .from('books')
    .select('id, isbn_13, title')
    .not('isbn_13', 'is', null)
    .is('gb_ratings_count', null)
    .order('id')

  if (LIMIT) query = query.limit(LIMIT)

  const { data: books, error } = await query
  if (error) { console.error('❌ Supabase:', error.message); process.exit(1) }

  console.log(`\n→ ${books.length} livres à traiter\n`)

  let found = 0, notFound = 0, errors = 0, updated = 0

  // 2. Traitement par batches
  for (let i = 0; i < books.length; i += BATCH) {
    const batch = books.slice(i, i + BATCH)

    await Promise.all(batch.map(async (book) => {
      try {
        const ratings = await fetchGBRatings(book.isbn_13)

        if (!ratings) {
          notFound++
          return
        }

        found++
        console.log(`  ✓ ${book.title.slice(0, 50).padEnd(50)} → ${ratings.gb_ratings_count} notes, ${ratings.gb_avg_rating ?? '?'}/5`)

        if (APPLY) {
          const { error: upErr } = await supabase
            .from('books')
            .update(ratings)
            .eq('id', book.id)
          if (upErr) { console.error(`    ⚠️ Update error: ${upErr.message}`); errors++ }
          else updated++
        }
      } catch (e) {
        if (e.message === 'RATE_LIMIT') {
          console.warn('  ⚠️ Rate limit Google Books — pause 60s')
          await sleep(60_000)
        } else {
          console.error(`  ✗ ${book.title}: ${e.message}`)
          errors++
        }
      }
    }))

    // Progress
    const done = Math.min(i + BATCH, books.length)
    process.stdout.write(`\r  Progression : ${done}/${books.length} (${Math.round(done/books.length*100)}%)  `)

    if (i + BATCH < books.length) await sleep(DELAY_MS)
  }

  // 3. Résumé
  console.log(`\n\n── Résumé ──────────────────────────────`)
  console.log(`  Traités    : ${books.length}`)
  console.log(`  Avec notes : ${found}`)
  console.log(`  Sans notes : ${notFound}`)
  console.log(`  Erreurs    : ${errors}`)
  if (APPLY) console.log(`  Mis à jour : ${updated}`)
  else console.log(`  (dry-run — rien n'a été écrit)`)
  console.log(`────────────────────────────────────────\n`)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
main().catch(e => { console.error(e); process.exit(1) })
