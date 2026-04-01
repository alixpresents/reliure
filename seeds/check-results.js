#!/usr/bin/env node
/**
 * check-results.js
 * ─────────────────────────────────────────────────────────────────
 * Interroge Supabase pour vérifier ce qui a été importé.
 * Affiche des statistiques détaillées sur la qualité des données.
 *
 * Prérequis :
 *   SUPABASE_URL=https://xxxx.supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...
 *
 * Usage :
 *   node seeds/check-results.js
 *   node seeds/check-results.js --export   (exporte un rapport CSV)
 * ─────────────────────────────────────────────────────────────────
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const shouldExport = process.argv.includes('--export')

// ─── Requête Supabase REST ────────────────────────────────────────

async function supabaseQuery(path, params = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis')
  }

  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'count=exact',
    },
  })

  const data = await res.json()
  const count = parseInt(res.headers.get('content-range')?.split('/')[1] || '0', 10)
  return { data, count }
}

// ─── Analyse de la qualité ────────────────────────────────────────

function analyzeQuality(books) {
  const total = books.length
  if (total === 0) return null

  const stats = {
    total,
    withCover: books.filter((b) => b.cover_url).length,
    withISBN: books.filter((b) => b.isbn_13).length,
    withDescription: books.filter((b) => b.description).length,
    withPageCount: books.filter((b) => b.page_count && b.page_count > 0).length,
    withPublisher: books.filter((b) => b.publisher).length,
    withDate: books.filter((b) => b.publication_date).length,
    withAuthors: books.filter((b) => {
      if (!b.authors) return false
      try { return JSON.parse(b.authors).length > 0 } catch { return b.authors.length > 0 }
    }).length,
    bySource: {},
    byLanguage: {},
    missingCover: [],
  }

  // Répartition par source
  for (const book of books) {
    const src = book.source || 'unknown'
    stats.bySource[src] = (stats.bySource[src] || 0) + 1
    const lang = book.language || 'unknown'
    stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1
  }

  // Livres sans couverture (les 20 premiers)
  stats.missingCover = books
    .filter((b) => !b.cover_url)
    .slice(0, 20)
    .map((b) => ({ isbn: b.isbn_13, title: b.title, source: b.source }))

  return stats
}

function pct(n, total) {
  return `${((n / total) * 100).toFixed(1)}%`
}

function bar(n, total, width = 20) {
  const filled = Math.round((n / total) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n📊 Reliure — Vérification de l\'import\n')

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Variables d\'environnement manquantes :')
    console.error('   export SUPABASE_URL=https://xxxx.supabase.co')
    console.error('   export SUPABASE_SERVICE_KEY=eyJ...')
    process.exit(1)
  }

  // ─── Comptage total ───────────────────────────────────────────
  console.log('Connexion à Supabase...')
  const { count: totalBooks } = await supabaseQuery('books', {
    select: 'id',
    limit: 1,
  })
  console.log(`📚 Total livres dans la base : ${totalBooks}\n`)

  // ─── Récupération d'un échantillon pour analyse qualité ──────
  console.log('Analyse de la qualité des données...')
  const { data: sample } = await supabaseQuery('books', {
    select: 'id,title,isbn_13,cover_url,source,language,publisher,publication_date,page_count,authors',
    order: 'created_at.desc',
    limit: 1000,
  })

  const quality = analyzeQuality(sample)

  // ─── Affichage ────────────────────────────────────────────────
  console.log('─────────────────────────────────────────────')
  console.log('QUALITÉ DES MÉTADONNÉES (sur les 1000 derniers imports)')
  console.log('─────────────────────────────────────────────\n')

  const metrics = [
    ['Couverture', quality.withCover],
    ['ISBN-13', quality.withISBN],
    ['Auteurs', quality.withAuthors],
    ['Éditeur', quality.withPublisher],
    ['Date de publication', quality.withDate],
    ['Nombre de pages', quality.withPageCount],
  ]

  for (const [label, count] of metrics) {
    const p = pct(count, quality.total)
    const b = bar(count, quality.total)
    console.log(`  ${label.padEnd(22)} ${b} ${p.padStart(6)} (${count}/${quality.total})`)
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('RÉPARTITION PAR SOURCE')
  console.log('─────────────────────────────────────────────\n')

  const sortedSources = Object.entries(quality.bySource).sort((a, b) => b[1] - a[1])
  for (const [src, count] of sortedSources) {
    console.log(`  ${src.padEnd(20)} ${count} livres (${pct(count, quality.total)})`)
  }

  console.log('\n─────────────────────────────────────────────')
  console.log('RÉPARTITION PAR LANGUE')
  console.log('─────────────────────────────────────────────\n')

  const sortedLangs = Object.entries(quality.byLanguage).sort((a, b) => b[1] - a[1])
  for (const [lang, count] of sortedLangs) {
    console.log(`  ${lang.padEnd(10)} ${count} livres (${pct(count, quality.total)})`)
  }

  // ─── Livres sans couverture ───────────────────────────────────
  if (quality.missingCover.length > 0) {
    console.log('\n─────────────────────────────────────────────')
    console.log(`LIVRES SANS COUVERTURE (${quality.missingCover.length} sur 1000)`)
    console.log('─────────────────────────────────────────────\n')
    for (const { isbn, title, source } of quality.missingCover.slice(0, 10)) {
      console.log(`  ${isbn || 'no-isbn'} — ${title?.slice(0, 45)} [${source}]`)
    }
    if (quality.missingCover.length > 10) {
      console.log(`  ... et ${quality.missingCover.length - 10} autres`)
    }
  }

  // ─── Score de santé global ────────────────────────────────────
  const healthScore = Math.round(
    ((quality.withCover / quality.total) * 40 +
      (quality.withISBN / quality.total) * 20 +
      (quality.withAuthors / quality.total) * 20 +
      (quality.withPublisher / quality.total) * 10 +
      (quality.withDate / quality.total) * 10) *
      100
  ) / 100

  console.log('\n─────────────────────────────────────────────')
  const scoreBar = bar(healthScore, 100, 30)
  const emoji = healthScore >= 80 ? '🟢' : healthScore >= 60 ? '🟡' : '🔴'
  console.log(`${emoji} SCORE DE SANTÉ  ${scoreBar}  ${healthScore}%`)
  console.log('─────────────────────────────────────────────\n')

  if (healthScore < 70) {
    console.log('⚠  Score en dessous de 70%. Recommandations :')
    if (quality.withCover / quality.total < 0.75) {
      console.log('   → Lancer le backfill IA pour les couvertures manquantes (BackfillPage)')
    }
    if (quality.withAuthors / quality.total < 0.90) {
      console.log('   → Vérifier le pipeline de fusion des auteurs dans book_import')
    }
    console.log('')
  }

  // ─── Export CSV ───────────────────────────────────────────────
  if (shouldExport) {
    const { data: allBooks } = await supabaseQuery('books', {
      select: 'id,title,isbn_13,cover_url,source,language,publisher,publication_date,slug,created_at',
      order: 'created_at.desc',
      limit: 2000,
    })

    const csv = [
      'id,isbn_13,title,publisher,language,source,cover,slug,created_at',
      ...allBooks.map((b) =>
        [
          b.id,
          b.isbn_13 || '',
          `"${(b.title || '').replace(/"/g, '""')}"`,
          `"${(b.publisher || '').replace(/"/g, '""')}"`,
          b.language || '',
          b.source || '',
          b.cover_url ? 'oui' : 'non',
          b.slug || '',
          b.created_at?.slice(0, 10) || '',
        ].join(',')
      ),
    ].join('\n')

    const csvFile = join(__dirname, 'books-export.csv')
    writeFileSync(csvFile, csv, 'utf-8')
    console.log(`📄 Export CSV : ${csvFile}`)
  }
}

main().catch((err) => {
  console.error('❌ Erreur :', err)
  process.exit(1)
})
