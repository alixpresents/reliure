#!/usr/bin/env node
/**
 * seed-babelio-popular.mjs
 * Scrape les 6 articles "livres les plus populaires" de Babelio (2020->2025)
 * et les matche contre la base Reliure.
 *
 * Usage :
 *   node seed-babelio-popular.mjs            -> rapport JSON uniquement
 *   node seed-babelio-popular.mjs --apply    -> ecrit babelio_popular_year dans books
 *   node seed-babelio-popular.mjs --import   -> importe les livres manquants via Google Books
 *   node seed-babelio-popular.mjs --apply --import -> tout faire
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'

const APPLY  = process.argv.includes('--apply')
const IMPORT = process.argv.includes('--import')
const DELAY  = 1500

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const GB_KEY       = process.env.VITE_GOOGLE_BOOKS_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Variables manquantes : SUPABASE_URL, SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const ARTICLES = [
  { year: 2020, url: 'https://www.babelio.com/article/1480/Les-20-livres-les-plus-populaires-de-2020' },
  { year: 2021, url: 'https://www.babelio.com/article/1815/Les-21-livres-les-plus-populaires-de-2021' },
  { year: 2022, url: 'https://www.babelio.com/article/2225/Les-22-livres-les-plus-populaires-de-2022' },
  { year: 2023, url: 'https://www.babelio.com/article/2543/Les-23-livres-les-plus-populaires-de-2023' },
  { year: 2024, url: 'https://www.babelio.com/article/2917/Les-24-livres-les-plus-populaires-de-2024' },
  { year: 2025, url: 'https://www.babelio.com/article/3313/Les-25-livres-les-plus-populaires-de-2025' },
]

const GB_BLACKLIST = [
  'analyse', 'etude', 'resume', 'fiche de lecture', 'bibliographie',
  'chroniques', 'nouveaute', 'commentaire', 'presentation',
  'guide de lecture', 'journal des debats', 'fantasy art',
  'lecture suspendue', 'plutot qu', 'coffret',
]

// Parser HTML Babelio
function parseArticle(html, year) {
  const books = []
  const blockRegex = /<span class="titre_global"[^>]*>([\d]+)\.\s*(.*?)<\/span>/gis
  let match

  while ((match = blockRegex.exec(html)) !== null) {
    const rank    = parseInt(match[1])
    const content = match[2]

    const linkMatch = content.match(/<a href="(\/livres\/[^"]+)"[^>]*class="titre1"[^>]*>(.*?)<\/a>/i)
      || content.match(/<a[^>]*class="titre1"[^>]*href="(\/livres\/[^"]+)"[^>]*>(.*?)<\/a>/i)

    if (!linkMatch) continue

    const babelioPath = linkMatch[1]
    const title       = stripHtml(linkMatch[2]).trim()

    const authorRaw = content
      .replace(/<a[^>]*>.*?<\/a>/gis, 'LINK')
      .replace(/<[^>]+>/g, '')
      .replace(/LINK/g, '')
      .replace(/\d+\.\s*/, '')
      .replace(/^[\s,de d']+/i, '')
      .replace(/[\s,]+$/, '')
      .trim()

    const author = authorRaw || 'Inconnu'
    books.push({ rank, title, author, babelioPath, year })
  }

  return books.sort((a, b) => a.rank - b.rank)
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').trim()
}

async function fetchArticle({ year, url }) {
  console.log('\nFetching ' + year + '...')
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' pour ' + url)

  // Forcer le decodage ISO-8859-1 (encodage Babelio)
  const buffer = await res.arrayBuffer()
  const html = new TextDecoder('iso-8859-1').decode(buffer)

  const books = parseArticle(html, year)
  console.log('  -> ' + books.length + ' livres extraits')
  return books
}

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019\u2018`]/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function matchBook(book) {
  const normTitle = normalize(book.title)
  const words = normTitle.split(' ').filter(w => w.length > 3)
  if (!words.length) return null

  const { data } = await supabase
    .from('books')
    .select('id, slug, title, authors, isbn_13, babelio_popular_year')
    .ilike('title', '%' + book.title.slice(0, 30) + '%')
    .limit(5)

  if (!data?.length) return null

  const scored = data.map(b => {
    const nt = normalize(b.title)
    const overlap = words.filter(w => nt.includes(w)).length
    return { ...b, score: overlap / words.length }
  }).sort((a, b) => b.score - a.score)

  const best = scored[0]
  return best.score >= 0.6 ? best : null
}

async function importFromGoogleBooks(book) {
  if (!GB_KEY) return null

  // Nettoyage titre : virer "tome N : sous-titre"
  const titleClean = book.title
    .replace(/,?\s*tome\s*\d+\s*:.*/i, '')
    .replace(/\s*:\s*.+$/, '')
    .trim()

  // Nettoyage auteur : virer caracteres parasites et info editeur
  const authorClean = book.author
    .replace(/^[^a-zA-Z\u00C0-\u024F]+/, '')
    .replace(/\(.*\)/, '')
    .trim()

  const q = encodeURIComponent('intitle:"' + titleClean + '" inauthor:"' + authorClean + '"')
  const url = 'https://www.googleapis.com/books/v1/volumes?q=' + q + '&langRestrict=fr&maxResults=5&key=' + GB_KEY

  const res = await fetch(url)
  if (!res.ok) return null

  const data = await res.json()
  if (!data.items?.length) return null

  const normQueried = normalize(titleClean)
  const queryWords  = normQueried.split(' ').filter(w => w.length > 2)

  for (const item of data.items) {
    const vi = item.volumeInfo

    // 1. Blacklist
    const titleNorm = normalize(vi.title || '')
    if (GB_BLACKLIST.some(b => titleNorm.includes(b))) continue

    // 2. Validation titre (score >= 50%)
    const overlap = queryWords.filter(w => titleNorm.includes(w)).length
    const score   = queryWords.length > 0 ? overlap / queryWords.length : 0
    if (score < 0.5) continue

    // 3. ISBN obligatoire
    const isbn = vi.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier
    if (!isbn) continue

    return {
      title: vi.title,
      authors: vi.authors || [authorClean],
      isbn_13: isbn,
      cover_url: vi.imageLinks?.thumbnail?.replace('http:', 'https:').replace('zoom=1', 'zoom=2') || null,
      publisher: vi.publisher || null,
      publication_date: vi.publishedDate || null,
      description: vi.description || null,
      page_count: vi.pageCount || null,
      language: vi.language || 'fr',
      genres: vi.categories || null,
      source: 'google_books',
      babelio_popular_year: book.years || [book.year],
      _matchScore: score,
    }
  }

  return null
}

async function main() {
  const mode = (APPLY ? 'APPLY' : 'DRY-RUN') + (IMPORT ? ' + IMPORT' : '')
  console.log('\nseed-babelio-popular -- mode : ' + mode)

  const allBooks = []

  for (const article of ARTICLES) {
    try {
      const books = await fetchArticle(article)
      allBooks.push(...books)
    } catch (e) {
      console.error('  Erreur ' + article.year + ': ' + e.message)
    }
    await sleep(DELAY)
  }

  console.log('\nTotal extrait : ' + allBooks.length + ' livres (' + ARTICLES.length + ' annees)')

  // Dedoublonner par titre normalise
  const seen = new Map()
  const deduped = []
  for (const book of allBooks) {
    const key = normalize(book.title)
    if (!seen.has(key)) {
      seen.set(key, { ...book, years: [book.year] })
      deduped.push(seen.get(key))
    } else {
      seen.get(key).years.push(book.year)
    }
  }

  console.log('  -> ' + deduped.length + ' livres uniques apres deduplication')

  const results = { matched: [], notFound: [], errors: [] }

  console.log('\nMatching contre la base Reliure...')

  for (const book of deduped) {
    try {
      const dbBook = await matchBook(book)

      if (dbBook) {
        results.matched.push({ ...book, dbId: dbBook.id, dbTitle: dbBook.title, dbSlug: dbBook.slug })

        if (APPLY) {
          const existingYears = dbBook.babelio_popular_year || []
          const newYears = [...new Set([...existingYears, ...book.years])].sort()
          await supabase.from('books').update({ babelio_popular_year: newYears }).eq('id', dbBook.id)
        }

        process.stdout.write('v')
      } else {
        results.notFound.push(book)
        process.stdout.write('.')
      }
    } catch (e) {
      results.errors.push({ book, error: e.message })
      process.stdout.write('x')
    }

    await sleep(50)
  }

  console.log('\n')

  // Import des livres manquants
  if (IMPORT && results.notFound.length > 0) {
    console.log('\nImport de ' + results.notFound.length + ' livres manquants via Google Books...')

    for (const book of results.notFound) {
      try {
        const gbData = await importFromGoogleBooks(book)
        if (!gbData) {
          console.log('  x ' + book.title + ' -- introuvable ou rejete')
          continue
        }

        const score = Math.round((gbData._matchScore || 0) * 100) + '%'

        if (APPLY) {
          const { _matchScore, ...insertData } = gbData
          const { error } = await supabase.from('books').insert(insertData)
          if (error) {
            console.log('  ! ' + book.title + ' -- ' + error.message)
          } else {
            console.log('  ok ' + book.title + ' importe [' + score + ']')
            results.matched.push({ ...book, imported: true })
          }
        } else {
          console.log('  [DRY] ' + book.title + ' -> "' + gbData.title + '" (ISBN: ' + gbData.isbn_13 + ') [' + score + ']')
        }
      } catch (e) {
        console.log('  x ' + book.title + ' -- ' + e.message)
      }
      await sleep(500)
    }
  }

  // Resume
  console.log('\n-- Resume --')
  console.log('  Total unique Babelio : ' + deduped.length)
  console.log('  Deja dans la base    : ' + results.matched.length)
  console.log('  Introuvables         : ' + results.notFound.length)
  console.log('  Erreurs              : ' + results.errors.length)
  if (!APPLY) console.log('\n  (dry-run -- rien ecrit)')

  // Rapport JSON
  const report = {
    generatedAt: new Date().toISOString(),
    stats: { total: deduped.length, matched: results.matched.length, notFound: results.notFound.length },
    matched: results.matched,
    notFound: results.notFound.map(b => ({ title: b.title, author: b.author, years: b.years, babelioPath: b.babelioPath })),
  }

  writeFileSync('babelio-popular-report.json', JSON.stringify(report, null, 2))
  console.log('\nRapport ecrit dans babelio-popular-report.json\n')
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
main().catch(e => { console.error(e); process.exit(1) })
