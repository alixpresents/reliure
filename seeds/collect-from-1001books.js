#!/usr/bin/env node
/**
 * collect-from-1001books.js
 * ─────────────────────────────────────────────────────────────────
 * Source : repo GitHub open data "temporal-communities/1001-books"
 * (liste complète des 1318 livres du livre "1001 Books You Must
 *  Read Before You Die" de Peter Boxall — toutes éditions 2006-2018)
 *
 * Stratégie :
 *   1. Télécharge le TSV depuis GitHub (open data, licence CC)
 *   2. Filtre sur la "core list" (706 livres présents dans toutes
 *      les éditions) → les plus universellement reconnus
 *   3. Pour chaque livre, cherche l'ISBN via Google Books API
 *      (recherche intitle + inauthor)
 *   4. Enrichit avec la liste curatée de best-sellers FR
 *   5. Écrit seeds/isbns.json
 *
 * Usage :
 *   node seeds/collect-from-1001books.js
 *   node seeds/collect-from-1001books.js --all       (toutes les 1318 entrées, pas juste core)
 *   node seeds/collect-from-1001books.js --no-google (skip Google Books, juste titre+auteur)
 *
 * Variables d'environnement optionnelles :
 *   VITE_GOOGLE_BOOKS_KEY=... (ta clé perso — sinon utilise l'API sans clé, quota réduit)
 * ─────────────────────────────────────────────────────────────────
 */

import { writeFileSync, existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_FILE = join(__dirname, 'isbns.json')
const CACHE_FILE = join(__dirname, '.isbn-cache.json') // cache des recherches Google Books

// ─── Config ──────────────────────────────────────────────────────
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_BOOKS_KEY || ''
const DELAY_MS = GOOGLE_API_KEY ? 200 : 600 // sans clé : plus prudent
const USE_ALL = process.argv.includes('--all')
const SKIP_GOOGLE = process.argv.includes('--no-google')

const TSV_URL =
  'https://raw.githubusercontent.com/temporal-communities/1001-books/main/1001-books-plus-wikidata.tsv'

// ─── Utilitaires ─────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseTSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split('\t')
  return lines.slice(1).map((line) => {
    const values = line.split('\t')
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (values[i] || '').trim()]))
  })
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

// Normalise le nom d'auteur depuis le format "Nom, Prénom" → "Prénom Nom"
function normalizeAuthor(author) {
  if (!author) return ''
  if (author.includes(',')) {
    const [last, first] = author.split(',').map((s) => s.trim())
    return first ? `${first} ${last}` : last
  }
  return author
}

// ─── Recherche ISBN via Google Books ─────────────────────────────

async function searchISBN(title, author, cache) {
  const cacheKey = `${title}|||${author}`
  if (cache[cacheKey]) return cache[cacheKey]

  // Construction de la query
  const authorNorm = normalizeAuthor(author)
  // Prend les 4 premiers mots du titre pour éviter les titres trop longs
  const titleShort = title.split(' ').slice(0, 4).join(' ')
  const query = `intitle:"${titleShort}" inauthor:"${authorNorm.split(' ').slice(-1)[0]}"`
  const keyParam = GOOGLE_API_KEY ? `&key=${GOOGLE_API_KEY}` : ''
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&langRestrict=fr${keyParam}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) {
      if (res.status === 429) {
        // Rate limit — pause longue et retry
        console.log('\n  ⏸ Rate limit Google Books — pause 30s...')
        await sleep(30000)
        return searchISBN(title, author, cache)
      }
      return null
    }
    const data = await res.json()
    const items = data.items || []

    // Cherche d'abord une édition FR avec ISBN-13
    for (const item of items) {
      const ids = item.volumeInfo?.industryIdentifiers || []
      const isbn13 = ids.find((id) => id.type === 'ISBN_13')?.identifier
      if (isbn13) {
        const normalized = normalizeISBN13(isbn13)
        if (normalized) {
          cache[cacheKey] = { isbn: normalized, foundTitle: item.volumeInfo.title }
          return cache[cacheKey]
        }
      }
    }

    // Fallback : ISBN-10 → ISBN-13
    for (const item of items) {
      const ids = item.volumeInfo?.industryIdentifiers || []
      const isbn10 = ids.find((id) => id.type === 'ISBN_10')?.identifier
      if (isbn10) {
        const normalized = normalizeISBN13(isbn10)
        if (normalized) {
          cache[cacheKey] = { isbn: normalized, foundTitle: item.volumeInfo.title }
          return cache[cacheKey]
        }
      }
    }

    cache[cacheKey] = null
    return null
  } catch (err) {
    return null
  }
}

// ─── Liste curatée de bestsellers francophones ───────────────────
// Ces livres sont moins bien couverts par la liste Boxall (trop FR-centrique)

const FR_CURATED = [
  // Prix récents
  { title: "Veiller sur elle", author: "Jean-Baptiste Andrea", isbn: "9782073047311" },
  { title: "Vivre vite", author: "Brigitte Giraud", isbn: "9782072940330" },
  { title: "La Plus Secrète Mémoire des hommes", author: "Mohamed Mbougar Sarr", isbn: "9782072900648" },
  { title: "L'Anomalie", author: "Hervé Le Tellier", isbn: "9782072897382" },
  { title: "Leurs enfants après eux", author: "Nicolas Mathieu", isbn: "9782072834911" },
  { title: "Chanson douce", author: "Leïla Slimani", isbn: "9782072869990" },
  { title: "Au revoir là-haut", author: "Pierre Lemaitre", isbn: "9782072769429" },
  { title: "Boussole", author: "Mathias Énard", isbn: "9782072764219" },
  { title: "La Carte et le Territoire", author: "Michel Houellebecq", isbn: "9782070456239" },
  { title: "Les Bienveillantes", author: "Jonathan Littell", isbn: "9782070781409" },
  { title: "L'Art de perdre", author: "Alice Zeniter", isbn: "9782072870675" },
  { title: "La Panthère des neiges", author: "Sylvain Tesson", isbn: "9782330127855" },
  { title: "Petit Pays", author: "Gaël Faye", isbn: "9782350871073" },
  // Contemporains populaires
  { title: "La Vérité sur l'Affaire Harry Quebert", author: "Joël Dicker", isbn: "9782877069755" },
  { title: "L'Élégance du hérisson", author: "Muriel Barbery", isbn: "9782742792146" },
  { title: "Rien ne s'oppose à la nuit", author: "Delphine de Vigan", isbn: "9782213711232" },
  { title: "Charlotte", author: "David Foenkinos", isbn: "9782226257185" },
  { title: "La Délicatesse", author: "David Foenkinos", isbn: "9782226249678" },
  { title: "En finir avec Eddy Bellegueule", author: "Édouard Louis", isbn: "9782072625350" },
  { title: "Réparer les vivants", author: "Maylis de Kerangal", isbn: "9782070139071" },
  { title: "Un avion sans elle", author: "Michel Bussi", isbn: "9782226256843" },
  { title: "La Tresse", author: "Laetitia Colombani", isbn: "9782072959288" },
  { title: "Yoga", author: "Emmanuel Carrère", isbn: "9782072827648" },
  { title: "Limonov", author: "Emmanuel Carrère", isbn: "9782818006023" },
  { title: "L'Adversaire", author: "Emmanuel Carrère", isbn: "9782818018835" },
  // Classiques FR non couverts par Boxall
  { title: "Les Particules élémentaires", author: "Michel Houellebecq", isbn: "9782290379974" },
  { title: "Soumission", author: "Michel Houellebecq", isbn: "9782290015032" },
  { title: "Extension du domaine de la lutte", author: "Michel Houellebecq", isbn: "9782207118511" },
  { title: "Trois femmes puissantes", author: "Marie NDiaye", isbn: "9782072728396" },
  { title: "L'Ordre du jour", author: "Éric Vuillard", isbn: "9782072731440" },
  { title: "Zone", author: "Mathias Énard", isbn: "9782072739606" },
  // Fantasy/SF traduit populaire FR
  { title: "Harry Potter à l'école des sorciers", author: "J.K. Rowling", isbn: "9782070612758" },
  { title: "Dune", author: "Frank Herbert", isbn: "9782253004226" },
  { title: "Fondation", author: "Isaac Asimov", isbn: "9782290349458" },
  { title: "1984", author: "George Orwell", isbn: "9782290185827" },
  { title: "Le Meilleur des mondes", author: "Aldous Huxley", isbn: "9782070368167" },
  // BD / Romans graphiques
  { title: "Persepolis", author: "Marjane Satrapi", isbn: "9782205074611" },
  { title: "Maus", author: "Art Spiegelman", isbn: "9782800150956" },
  // Essais populaires
  { title: "Sapiens", author: "Yuval Noah Harari", isbn: "9782290349403" },
  { title: "Le Lambeau", author: "Philippe Lançon", isbn: "9782207131824" },
]

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log('\n📚 Reliure — Collecte depuis la liste 1001 Books (Boxall)\n')
  console.log(`Source : ${TSV_URL}`)

  // ─── Chargement du cache ──────────────────────────────────────
  let cache = {}
  if (existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
      console.log(`  ↪ Cache chargé (${Object.keys(cache).length} entrées)`)
    } catch {
      cache = {}
    }
  }

  // ─── 1. Téléchargement du TSV ─────────────────────────────────
  console.log('\n[1/3] Téléchargement du dataset 1001-books...')
  const res = await fetch(TSV_URL)
  if (!res.ok) throw new Error(`Impossible de télécharger le TSV : HTTP ${res.status}`)
  const tsvText = await res.text()
  const allBooks = parseTSV(tsvText)

  // ─── 2. Filtrage ──────────────────────────────────────────────
  const filtered = USE_ALL
    ? allBooks
    : allBooks.filter((b) => b['List'] === '1) core list')

  console.log(`  ✓ ${allBooks.length} entrées au total`)
  console.log(`  ✓ ${filtered.length} entrées retenues (${USE_ALL ? 'toutes' : 'core list uniquement'})`)

  // ─── 3. Recherche ISBN ────────────────────────────────────────
  const allEntries = new Map() // isbn → {title, author, source}
  let found = 0
  let notFound = 0
  let cacheHits = 0

  if (SKIP_GOOGLE) {
    console.log('\n[2/3] Mode --no-google : skip de la recherche ISBN')
    for (const book of filtered) {
      allEntries.set(`no-isbn-${book.ID}`, {
        isbn: null,
        title: book['Book Title'],
        author: normalizeAuthor(book['Author']),
        source: '1001books',
      })
    }
  } else {
    console.log(`\n[2/3] Recherche ISBN via Google Books (${filtered.length} livres)...`)
    if (!GOOGLE_API_KEY) {
      console.log('  ⚠  Pas de clé API Google Books — quota réduit (délai augmenté)')
    }

    for (let i = 0; i < filtered.length; i++) {
      const book = filtered[i]
      const title = book['Book Title']
      const author = book['Author']

      const wasCached = !!(cache[`${title}|||${author}`])
      const result = await searchISBN(title, author, cache)

      if (wasCached) cacheHits++

      if (result?.isbn && !allEntries.has(result.isbn)) {
        allEntries.set(result.isbn, {
          isbn: result.isbn,
          title: result.foundTitle || title,
          author: normalizeAuthor(author),
          source: '1001books',
        })
        found++
      } else if (!result) {
        notFound++
        // Ajoute quand même avec isbn null pour référence
        // (le script seed-books.js sautera les entrées sans ISBN)
        allEntries.set(`no-isbn-${book.ID}`, {
          isbn: null,
          title,
          author: normalizeAuthor(author),
          source: '1001books_no_isbn',
        })
      }

      // Affichage progression
      if ((i + 1) % 20 === 0 || i === 0) {
        process.stdout.write(
          `\r  → ${i + 1}/${filtered.length} | trouvés: ${found} | manquants: ${notFound} | cache: ${cacheHits}`
        )
      }

      // Sauvegarde du cache toutes les 50 requêtes
      if ((i + 1) % 50 === 0) {
        writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
      }

      if (!wasCached) await sleep(DELAY_MS)
    }

    // Sauvegarde finale du cache
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
    console.log(`\n  ✓ ISBN trouvés    : ${found}`)
    console.log(`  ✗ Non trouvés     : ${notFound}`)
    console.log(`  ↪ Depuis cache   : ${cacheHits}`)
  }

  // ─── 4. Ajout des bestsellers FR ─────────────────────────────
  console.log('\n[3/3] Ajout des bestsellers francophones...')
  let frAdded = 0
  for (const { title, author, isbn } of FR_CURATED) {
    if (isbn && !allEntries.has(isbn)) {
      allEntries.set(isbn, { isbn, title, author, source: 'fr_curated' })
      frAdded++
    }
  }
  console.log(`  ✓ +${frAdded} bestsellers FR ajoutés`)

  // ─── 5. Écriture du fichier final ─────────────────────────────
  // Ne garde que les entrées avec un ISBN valide
  const final = Array.from(allEntries.values())
    .filter((e) => e.isbn && !e.isbn.startsWith('no-isbn'))
    .map(({ isbn, title, author, source }) => ({ isbn, title, author, source }))

  writeFileSync(OUT_FILE, JSON.stringify(final, null, 2), 'utf-8')

  console.log('\n─────────────────────────────────────────────')
  console.log(`✅ ${final.length} livres avec ISBN`)
  const bySource = final.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1
    return acc
  }, {})
  Object.entries(bySource).forEach(([s, n]) => console.log(`   ${s.padEnd(20)} ${n}`))
  console.log(`\n📄 Fichier écrit : ${OUT_FILE}`)
  console.log('\nProchaine étape :')
  console.log('  node seeds/seed-books.js\n')
}

main().catch((err) => {
  console.error('❌ Erreur fatale :', err)
  process.exit(1)
})
