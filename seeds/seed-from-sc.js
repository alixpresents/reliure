#!/usr/bin/env node
/**
 * seed-from-sc.js
 * ─────────────────────────────────────────────────────────────────
 * Importe les livres depuis sc_listes_agregees.json dans Supabase.
 *
 * Stratégie par livre :
 *   1. Si ISBN présent → appelle book_import (Google Books + BnF + OL)
 *      La cover SensCritique est utilisée en fallback si Google Books
 *      ne trouve pas de couverture.
 *   2. Si pas d'ISBN → recherche Google Books par titre + auteur
 *      pour trouver l'ISBN, puis book_import.
 *   3. Si toujours rien → insert direct dans `books` avec les données
 *      du JSON (titre, auteur, cover SC).
 *
 * Prérequis :
 *   SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env
 *   Fichier sc_listes_agregees.json dans seeds/
 *
 * Usage :
 *   node --env-file=.env seeds/seed-from-sc.js
 *   node --env-file=.env seeds/seed-from-sc.js --start=200
 *   node --env-file=.env seeds/seed-from-sc.js --dry-run
 * ─────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const GOOGLE_KEY = process.env.VITE_GOOGLE_BOOKS_KEY || ''

const INPUT_FILE = join(__dirname, 'sc_listes_agregees.json')
const RESULTS_FILE = join(__dirname, 'sc-seed-results.json')
const FAILED_FILE = join(__dirname, 'sc-seed-failed.json')

const DELAY = 1200        // délai entre imports (ms)
const BATCH_SIZE = 50     // pause toutes les N requêtes
const BATCH_PAUSE = 5000  // durée de la pause batch (ms)
const TIMEOUT = 15000     // timeout par requête

const isDryRun = process.argv.includes('--dry-run')
const startArg = process.argv.find((a) => a.startsWith('--start='))
const startIndex = startArg ? parseInt(startArg.split('=')[1], 10) : 0

// ─── Utilitaires ─────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function formatTime(ms) {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`
}

function slugify(title, author) {
  const base = `${title} ${author}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return base
}

function normalizeISBN13(isbn) {
  if (!isbn) return null
  const clean = isbn.replace(/[\s-]/g, '')
  if (clean.length === 13 && /^\d{13}$/.test(clean)) return clean
  if (clean.length === 10 && /^\d{9}[\dX]$/.test(clean)) {
    const digits = '978' + clean.slice(0, 9)
    let sum = 0
    for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3)
    const check = (10 - (sum % 10)) % 10
    return digits + check
  }
  return null
}

// ─── Recherche ISBN via Google Books ─────────────────────────────

async function findISBN(title, author) {
  const keyParam = GOOGLE_KEY ? `&key=${GOOGLE_KEY}` : ''
  const query = `intitle:"${title.slice(0, 30)}" inauthor:"${author.split(' ').slice(-1)[0]}"`
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&langRestrict=fr${keyParam}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    const data = await res.json()
    for (const item of data.items || []) {
      const ids = item.volumeInfo?.industryIdentifiers || []
      const isbn13 = ids.find((id) => id.type === 'ISBN_13')?.identifier
      if (isbn13) return normalizeISBN13(isbn13)
      const isbn10 = ids.find((id) => id.type === 'ISBN_10')?.identifier
      if (isbn10) return normalizeISBN13(isbn10)
    }
  } catch {}
  return null
}

// ─── Import via edge function book_import ────────────────────────

async function importViaEdgeFunction(isbn, scCoverUrl) {
  if (isDryRun) return { success: true, dry: true, method: 'edge_function' }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/book_import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
    // On passe la cover SC en fallback — l'edge function l'utilisera
    // si Google Books ne trouve pas de couverture
    body: JSON.stringify({ isbn, fallback_cover_url: scCoverUrl }),
    signal: AbortSignal.timeout(TIMEOUT),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, error: body.error || `HTTP ${res.status}`, method: 'edge_function' }
  return { success: true, bookId: body.id || body.book?.id, slug: body.slug || body.book?.slug, method: 'edge_function' }
}

// ─── Insert direct (fallback si pas d'ISBN trouvable) ────────────

async function insertDirect(book) {
  if (isDryRun) return { success: true, dry: true, method: 'direct_insert' }

  const slug = slugify(book.title, book.author)
  const payload = {
    title: book.title,
    authors: JSON.stringify([book.author]),
    cover_url: book.cover_url || null,
    language: 'fr',
    source: 'senscritique',
    slug: `${slug}-${createHash('md5').update(book.title + book.author).digest('hex').slice(0, 6)}`,
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/books`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
      Prefer: 'return=representation,resolution=ignore-duplicates',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    return { success: false, error: err.message || `HTTP ${res.status}`, method: 'direct_insert' }
  }
  return { success: true, method: 'direct_insert' }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n📚 Reliure — Import depuis SensCritique JSON\n')

  if (!existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`)
    console.error('   Place sc_listes_agregees.json dans le dossier seeds/')
    process.exit(1)
  }

  if (!isDryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
    console.error('❌ Variables manquantes : SUPABASE_URL et SUPABASE_SERVICE_KEY')
    process.exit(1)
  }

  const books = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'))
  const toProcess = books.slice(startIndex)

  console.log(`📖 ${books.length} livres dans le JSON`)
  console.log(`▶  Démarrage depuis l'index ${startIndex} → ${toProcess.length} à importer`)
  if (isDryRun) console.log('🔵 Mode dry-run activé')

  const estimatedMs = toProcess.length * (DELAY + 600)
  console.log(`⏳ Durée estimée : ~${formatTime(estimatedMs)}\n`)

  const results = []
  const failed = []
  let byMethod = { edge_function: 0, direct_insert: 0, skipped_no_isbn: 0 }
  let successCount = 0
  let errorCount = 0
  const startTime = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const book = toProcess[i]
    const globalIndex = startIndex + i
    const elapsed = Date.now() - startTime
    const rate = i > 0 ? i / elapsed : 0
    const remaining = rate > 0 ? formatTime((toProcess.length - i) / rate) : '?'

    process.stdout.write(
      `\r[${globalIndex + 1}/${books.length}] ✓${successCount} ✗${errorCount} | ${remaining} restant | "${book.title.slice(0, 30)}"`
    )

    try {
      let result
      let isbn = normalizeISBN13(book.isbn)

      // Cas 1 : ISBN présent → edge function directement
      if (isbn) {
        result = await importViaEdgeFunction(isbn, book.cover_url)
        result.method = 'edge_function'
      }
      // Cas 2 : pas d'ISBN → cherche via Google Books
      else {
        await sleep(300) // petit délai pour la recherche
        const foundISBN = await findISBN(book.title, book.author)
        if (foundISBN) {
          isbn = foundISBN
          result = await importViaEdgeFunction(foundISBN, book.cover_url)
          result.method = 'edge_function'
        }
        // Cas 3 : toujours pas d'ISBN → insert direct
        else {
          result = await insertDirect(book)
          result.method = 'direct_insert'
        }
      }

      if (result.success) {
        successCount++
        byMethod[result.method] = (byMethod[result.method] || 0) + 1
        results.push({ ...result, isbn, title: book.title, author: book.author })
      } else {
        errorCount++
        failed.push({ isbn, title: book.title, author: book.author, error: result.error })
        results.push({ success: false, isbn, title: book.title, error: result.error })
      }
    } catch (err) {
      errorCount++
      failed.push({ title: book.title, author: book.author, error: err.message })
    }

    if (i < toProcess.length - 1) await sleep(DELAY)

    if ((i + 1) % BATCH_SIZE === 0 && i < toProcess.length - 1) {
      console.log(`\n  ☕ Pause batch — ${formatTime(BATCH_PAUSE)}...`)
      await sleep(BATCH_PAUSE)
    }

    if ((i + 1) % 100 === 0) {
      writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
      writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2))
    }
  }

  // ─── Résumé final ────────────────────────────────────────────
  const totalTime = Date.now() - startTime
  console.log('\n\n─────────────────────────────────────────────')
  console.log(`✅ Terminé en ${formatTime(totalTime)}`)
  console.log(`   Succès    : ${successCount} / ${toProcess.length}`)
  console.log(`   Échecs    : ${errorCount}`)
  console.log(`\n   Via edge function (ISBN) : ${byMethod.edge_function || 0}`)
  console.log(`   Insert direct (sans ISBN) : ${byMethod.direct_insert || 0}`)

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
  writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2))

  console.log(`\n📄 Résultats : ${RESULTS_FILE}`)
  if (failed.length > 0) {
    console.log(`⚠  Échecs   : ${FAILED_FILE}`)
  }
  console.log('\nPour vérifier :')
  console.log('  node --env-file=.env seeds/check-results.js\n')
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err)
  process.exit(1)
})
