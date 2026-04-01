import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  const { isbn13, title, author } = await req.json()

  async function isValidImageUrl(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
        redirect: 'follow'
      })
      const contentType = res.headers.get('content-type') || ''
      return res.ok && contentType.startsWith('image')
    } catch {
      return false
    }
  }

  const candidates: string[] = []

  // 1. Open Library par ISBN
  if (isbn13) candidates.push(`https://covers.openlibrary.org/b/isbn/${isbn13}-L.jpg`)
  // 2. BnF par ISBN
  if (isbn13) candidates.push(`https://couverture.bnf.fr/ark/isbn/${isbn13}`)

  // 3. Open Library Search par titre+auteur
  try {
    const olRes = await fetch(
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}&limit=1`,
      { signal: AbortSignal.timeout(3000) }
    )
    const olData = await olRes.json()
    const coverId = olData.docs?.[0]?.cover_i
    if (coverId) candidates.push(`https://covers.openlibrary.org/b/id/${coverId}-L.jpg`)
  } catch {}

  // 4. Google Books par ISBN
  if (isbn13) {
    try {
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}&key=${Deno.env.get('GOOGLE_BOOKS_KEY')}`,
        { signal: AbortSignal.timeout(3000) }
      )
      const gbData = await gbRes.json()
      if (!gbData.error) {
        const imageLinks = gbData.items?.[0]?.volumeInfo?.imageLinks
        const url = imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail
        if (url) candidates.push(url.replace('http://', 'https://'))
      }
    } catch {}
  }

  // 5. Google Books Search par titre+auteur (toutes éditions)
  if (title) {
    try {
      const query = encodeURIComponent(`${title} ${author || ''}`.trim())
      const gbRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${query}&key=${Deno.env.get('GOOGLE_BOOKS_KEY')}&maxResults=5`,
        { signal: AbortSignal.timeout(3000) }
      )
      const gbData = await gbRes.json()
      if (!gbData.error && gbData.items) {
        for (const item of gbData.items) {
          const imageLinks = item.volumeInfo?.imageLinks
          const url = imageLinks?.extraLarge || imageLinks?.large || imageLinks?.medium || imageLinks?.thumbnail
          if (url) {
            candidates.push(url.replace('http://', 'https://'))
            break
          }
        }
      }
    } catch {}
  }

  for (const url of candidates) {
    if (await isValidImageUrl(url)) {
      return new Response(JSON.stringify({ cover_url: url }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      })
    }
  }

  return new Response(JSON.stringify({ cover_url: null }), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
  })
})
