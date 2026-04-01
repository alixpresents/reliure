#!/usr/bin/env node
/**
 * retry-failed.js
 * ─────────────────────────────────────────────────────────────────
 * Relit seeds/seed-failed.json et réessaie les imports échoués.
 * Utile après une panne réseau ou un rate-limit temporaire.
 *
 * Usage :
 *   node seeds/retry-failed.js
 * ─────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FAILED_FILE = join(__dirname, 'seed-failed.json')
const RETRY_RESULTS = join(__dirname, 'retry-results.json')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const DELAY = 1500

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function importBook(isbn) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/book_import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      apikey: SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({ isbn }),
    signal: AbortSignal.timeout(15000),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { success: false, isbn, error: body.error || `HTTP ${res.status}` }
  return { success: true, isbn, bookId: body.id || body.book?.id }
}

async function main() {
  console.log('\n🔄 Reliure — Retry des imports échoués\n')

  if (!existsSync(FAILED_FILE)) {
    console.log('✅ Aucun fichier seed-failed.json trouvé — rien à retry.')
    return
  }

  const failed = JSON.parse(readFileSync(FAILED_FILE, 'utf-8'))
  if (failed.length === 0) {
    console.log('✅ Aucun échec à retry.')
    return
  }

  console.log(`📖 ${failed.length} ISBN(s) à réessayer...\n`)

  const results = []
  const stillFailed = []
  let successCount = 0

  for (let i = 0; i < failed.length; i++) {
    const { isbn, title } = failed[i]
    process.stdout.write(`\r[${i + 1}/${failed.length}] ${isbn} `)

    try {
      const result = await importBook(isbn)
      if (result.success) {
        successCount++
        results.push({ ...result, title })
      } else {
        stillFailed.push({ isbn, title, error: result.error })
      }
    } catch (err) {
      stillFailed.push({ isbn, title, error: err.message })
    }

    if (i < failed.length - 1) await sleep(DELAY)
  }

  console.log(`\n\n✅ ${successCount} récupérés, ${stillFailed.length} encore en échec`)
  writeFileSync(RETRY_RESULTS, JSON.stringify(results, null, 2))
  writeFileSync(FAILED_FILE, JSON.stringify(stillFailed, null, 2))

  if (stillFailed.length > 0) {
    console.log('\nISBNs restants en échec :')
    stillFailed.slice(0, 10).forEach((f) => console.log(`  ${f.isbn} — ${f.error}`))
  }
  console.log('')
}

main().catch((err) => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})
