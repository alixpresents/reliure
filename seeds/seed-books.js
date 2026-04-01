#!/usr/bin/env node
/**
 * seed-books.js
 * ─────────────────────────────────────────────────────────────────
 * Importe les livres listés dans seeds/isbns.json dans Supabase
 * en appelant l'edge function book_import pour chaque ISBN.
 *
 * Prérequis :
 *   SUPABASE_URL=https://xxxx.supabase.co          (dans .env ou export)
 *   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiI...    (clé service_role)
 *
 * Usage :
 *   node seeds/seed-books.js
 *   node seeds/seed-books.js --start=100   (reprendre depuis l'index 100)
 *   node seeds/seed-books.js --dry-run     (simulate sans appeler Supabase)
 *
 * Sortie :
 *   seeds/seed-results.json   (résultats complets)
 *   seeds/seed-failed.json    (ISBNs en échec pour retry)
 * ─────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Configuration ────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY

// Délai entre chaque import (ms) — évite de rate-limiter Google Books
// Google Books : 1000 req/jour gratuit, ~1 req/sec recommandé
const DELAY_BETWEEN_IMPORTS = 1200 // 1.2 secondes

// Délai supplémentaire toutes les N requêtes (pause de politesse)
const BATCH_SIZE = 50
const BATCH_PAUSE = 5000 // 5 secondes tous les 50 imports

// Timeout par import
const IMPORT_TIMEOUT = 15000

const INPUT_FILE = join(__dirname, 'isbns.json')
const RESULTS_FILE = join(__dirname, 'seed-results.json')
const FAILED_FILE = join(__dirname, 'seed-failed.json')

// ─── Arguments CLI ────────────────────────────────────────────────
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const startArg = args.find((a) => a.startsWith('--start='))
const startIndex = startArg ? parseInt(startArg.split('=')[1], 10) : 0

// ─── Utilitaires ─────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  return `${m}m${s}s`
}

function estimateRemaining(done, total, elapsed) {
  if (done === 0) return '?'
  const rate = done / elapsed
  const remaining = (total - done) / rate
  return formatTime(remaining)
}

// ─── Import d'un livre ────────────────────────────────────────────

async function importBook(isbn, title, isDry) {
  if (isDry) {
    await sleep(50)
    return { success: true, dry: true, isbn, title }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis')
  }

  const url = `${SUPABASE_URL}/functions/v1/book_import`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ isbn }),
    signal: AbortSignal.timeout(IMPORT_TIMEOUT),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    return {
      success: false,
      isbn,
      title,
      status: res.status,
      error: body.error || body.message || `HTTP ${res.status}`,
    }
  }

  return {
    success: true,
    isbn,
    title,
    bookId: body.id || body.book?.id,
    slug: body.slug || body.book?.slug,
    source: body.source || body.book?.source,
  }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n📚 Reliure — Seed des livres\n')

  // Validation
  if (!existsSync(INPUT_FILE)) {
    console.error(`❌ Fichier introuvable : ${INPUT_FILE}`)
    console.error('   Lance d\'abord : node seeds/collect-isbns.js')
    process.exit(1)
  }

  if (!isDryRun && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
    console.error('❌ Variables d\'environnement manquantes :')
    console.error('   export SUPABASE_URL=https://xxxx.supabase.co')
    console.error('   export SUPABASE_SERVICE_KEY=eyJ...')
    console.error('\n   Ou utilise --dry-run pour tester sans Supabase')
    process.exit(1)
  }

  const books = JSON.parse(readFileSync(INPUT_FILE, 'utf-8'))
  const toProcess = books.slice(startIndex)

  console.log(`📖 ${books.length} ISBNs au total`)
  console.log(`▶  Démarrage depuis l'index ${startIndex} → ${toProcess.length} à importer`)
  if (isDryRun) console.log('🔵 Mode dry-run (aucun appel Supabase)')
  if (!isDryRun) {
    console.log(`⏱  Délai entre imports : ${DELAY_BETWEEN_IMPORTS}ms`)
    const estimatedTotal = toProcess.length * (DELAY_BETWEEN_IMPORTS + 500)
    console.log(`⏳ Durée estimée : ~${formatTime(estimatedTotal)}`)
  }
  console.log('')

  const results = []
  const failed = []
  let successCount = 0
  let errorCount = 0
  const startTime = Date.now()

  for (let i = 0; i < toProcess.length; i++) {
    const { isbn, title } = toProcess[i]
    const globalIndex = startIndex + i
    const elapsed = Date.now() - startTime
    const remaining = estimateRemaining(i, toProcess.length, elapsed)

    process.stdout.write(
      `\r[${globalIndex + 1}/${books.length}] ✓${successCount} ✗${errorCount} | ${remaining} restant | ${isbn} `
    )

    try {
      const result = await importBook(isbn, title, isDryRun)

      if (result.success) {
        successCount++
        results.push(result)
      } else {
        errorCount++
        failed.push(result)
        results.push(result)
        // Log détaillé des erreurs
        if (process.env.VERBOSE) {
          console.log(`\n  ⚠ ${isbn} — ${result.error}`)
        }
      }
    } catch (err) {
      errorCount++
      const failEntry = { success: false, isbn, title, error: err.message }
      failed.push(failEntry)
      results.push(failEntry)
    }

    // Pause entre les imports
    if (i < toProcess.length - 1) {
      await sleep(DELAY_BETWEEN_IMPORTS)
    }

    // Pause de batch tous les BATCH_SIZE imports
    if ((i + 1) % BATCH_SIZE === 0 && i < toProcess.length - 1) {
      console.log(`\n  ☕ Pause batch (${BATCH_SIZE} imports) — ${formatTime(BATCH_PAUSE)}...`)
      await sleep(BATCH_PAUSE)
    }

    // Sauvegarde intermédiaire toutes les 100 entrées
    if ((i + 1) % 100 === 0) {
      writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8')
      writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2), 'utf-8')
    }
  }

  // ─── Résultats finaux ─────────────────────────────────────────
  console.log('\n\n─────────────────────────────────────────────')
  const totalTime = Date.now() - startTime
  console.log(`✅ Terminé en ${formatTime(totalTime)}`)
  console.log(`   Importés avec succès : ${successCount}`)
  console.log(`   Échecs               : ${errorCount}`)
  console.log(`   Taux de succès       : ${((successCount / toProcess.length) * 100).toFixed(1)}%`)

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf-8')
  writeFileSync(FAILED_FILE, JSON.stringify(failed, null, 2), 'utf-8')

  console.log(`\n📄 Résultats : ${RESULTS_FILE}`)
  if (failed.length > 0) {
    console.log(`⚠  Échecs    : ${FAILED_FILE}`)
    console.log('\nPour réessayer les échecs :')
    console.log('  node seeds/retry-failed.js')
  }
  console.log('\nPour vérifier l\'import :')
  console.log('  node seeds/check-results.js\n')
}

main().catch((err) => {
  console.error('\n❌ Erreur fatale :', err)
  process.exit(1)
})
