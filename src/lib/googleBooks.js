import { supabase } from "./supabase";
import { searchOpenLibrary } from "./openLibrarySearch";

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function strip(s) {
  return (s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanTitle(raw) {
  if (!raw) return raw;
  return raw
    .replace(/\s*[-–]\s*(nouveau\s+roman|roman|thriller|policier|essai|récit|\d{4}).*$/i, "")
    .replace(/\s*:\s+(?:le |la |les |un |une )?(nouveau|nouv|roman|polar|thriller|essai|récit|série|saga|best.seller).*$/i, "")
    .replace(/\s*:\s+[^:]{21,}$/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
}

// ═══════════════════════════════════════════════
// Cache (in-memory, per session)
// ═══════════════════════════════════════════════

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 50;

function getCached(q) {
  const k = strip(q);
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; }
  return e.results;
}

function setCache(q, results) {
  const k = strip(q);
  if (cache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [key, entry] of cache) {
      if (entry.ts + CACHE_TTL < now) cache.delete(key);
    }
    if (cache.size >= CACHE_MAX) {
      const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) cache.delete(oldest[0]);
    }
  }
  cache.set(k, { results, ts: Date.now() });
}

// ═══════════════════════════════════════════════
// Circuit breaker — Google Books API
// ═══════════════════════════════════════════════

let googleBooksDisabledUntil = 0; // timestamp ms

export function isGoogleBooksAvailable() {
  return Date.now() > googleBooksDisabledUntil;
}

function disableGoogleBooks(durationMs = 15 * 60 * 1000) {
  googleBooksDisabledUntil = Date.now() + durationMs;
  console.warn('[google-books] Circuit breaker tripped, disabled for',
    Math.round(durationMs / 60000), 'min');
}

// ═══════════════════════════════════════════════
// TIER 1 : Recherche base locale
// ═══════════════════════════════════════════════
// Pas de RPC. Requêtes Supabase directes, simples, fiables.
// 3 stratégies séquentielles avec fallback.

async function searchLocalBooks(query) {
  try {
    if (!query || query.trim().length < 2) return [];
    const t_rpc = performance.now();
    console.log("[rpc-timing] search_books_v2 start");
    const { data, error } = await supabase.rpc("search_books_v2", {
      query: query.trim(),
      n: 10,
    });
    console.log("[rpc-timing] search_books_v2 done", Math.round(performance.now() - t_rpc), "ms →", (data?.length ?? 0), "results");
    if (error) {
      console.error("[searchLocalBooks] RPC error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("[searchLocalBooks] error:", e);
    return [];
  }
}

function formatDbResult(b) {
  return {
    googleId: null,
    _source: "db",
    dbId: b.id,
    slug: b.slug,
    title: b.title,
    subtitle: null,
    authors: Array.isArray(b.authors) ? b.authors : [],
    publisher: b.publisher || null,
    publishedDate: b.publication_date || null,
    coverUrl: b.cover_url || null,
    pageCount: b.page_count || null,
    isbn13: b.isbn_13 || null,
    description: b.description || null,
    _ratingCount: b.rating_count || 0,
  };
}

// ═══════════════════════════════════════════════
// TIER 2 : Google Books (découverte)
// ═══════════════════════════════════════════════

const BAD_TITLE_WORDS = [
  "resume", "fiche de lecture", "analyse de", "commentaire",
  "sparknotes", "study guide", "dissertation", "questionnaire",
  "workbook", "teacher", "lesson plan", "bac ",
  "preparer", "revisions", "annales",
];

const BAD_PUBLISHERS = [
  "fichesdelecture", "leresumedumois", "primento", "ebookslib",
  "12minutesinbook", "editions du net", "bookelis", "librinova",
  "publishroom", "unepub", "lulu.com", "books on demand",
  "encyclopaedia universalis", "universalis",
];

async function fetchGoogleBooks(query) {
  try {
    // Appel via edge function proxy (rotation de clés + cache côté serveur)
    const { data, error } = await supabase.functions.invoke("google-books-proxy", {
      body: { query: query.trim() },
    });
    if (error) {
      // Si le proxy retourne 429 → toutes les clés épuisées → circuit breaker
      if (error.message?.includes("429") || error.status === 429) {
        disableGoogleBooks();
      }
      return [];
    }
    const items = data?.items || [];

    const filtered = items
      .filter(it => {
        const v = it.volumeInfo;
        if (!v?.title) return false;
        if (!v.imageLinks) return false;
        if (!v.industryIdentifiers?.length) return false;
        const norm = strip(`${v.title} ${v.subtitle || ""}`);
        if (BAD_TITLE_WORDS.some(kw => norm.includes(strip(kw)))) return false;
        const pub = strip(v.publisher || "");
        if (BAD_PUBLISHERS.some(bp => pub.includes(bp))) return false;
        return true;
      })
      .slice(0, 8)
      .map(it => {
        const v = it.volumeInfo;
        const isbn = v.industryIdentifiers?.find(i => i.type === "ISBN_13");
        const cover = (v.imageLinks?.thumbnail || "")
          .replace("http://", "https://")
          .replace("&zoom=1", "&zoom=2")
          .replace("&edge=curl", "") || null;
        return {
          googleId: it.id,
          _source: "google",
          dbId: null,
          slug: null,
          title: cleanTitle(v.title),
          subtitle: v.subtitle || null,
          authors: v.authors || [],
          publisher: v.publisher || null,
          publishedDate: v.publishedDate || null,
          coverUrl: cover,
          pageCount: v.pageCount || null,
          isbn13: isbn?.identifier || null,
          description: v.description || null,
        };
      });
    filtered._rawCount = items.length;
    return filtered;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════
// Déduplication
// ═══════════════════════════════════════════════

function deduplicateResults(dbResults, googleResults, olResults = []) {
  // Les résultats DB sont TOUJOURS en premier et jamais supprimés
  const dbIsbns = new Set(dbResults.map(r => r.isbn13).filter(Boolean));
  const dbTitles = new Set(dbResults.map(r => strip(r.title)));

  // Filtrer les résultats Google (dédup vs DB + dédup intra-Google)
  const seenGoogleTitles = new Set();
  const uniqueGoogle = googleResults.filter(g => {
    if (g.isbn13 && dbIsbns.has(g.isbn13)) return false;
    if (dbTitles.has(strip(g.title))) return false;
    const key = strip(g.title);
    if (seenGoogleTitles.has(key)) return false;
    seenGoogleTitles.add(key);
    return true;
  });

  // Construire les sets de ce qui existe déjà (DB + Google retenu)
  const knownIsbns = new Set([
    ...dbIsbns,
    ...uniqueGoogle.map(r => r.isbn13).filter(Boolean),
  ]);
  const knownTitles = new Set([
    ...dbTitles,
    ...uniqueGoogle.map(r => strip(r.title)),
  ]);

  // Filtrer les résultats OL (dédup vs DB+Google + dédup intra-OL)
  const seenOLTitles = new Set();
  const uniqueOL = olResults.filter(ol => {
    if (!ol.title) return false;
    if (ol.isbn13 && knownIsbns.has(ol.isbn13)) return false;
    if (knownTitles.has(strip(ol.title))) return false;
    const key = strip(ol.title);
    if (seenOLTitles.has(key)) return false;
    seenOLTitles.add(key);
    return true;
  });

  // Dédup finale — attrape les doublons intra-source (ex: 2 éditions DB même titre+auteur)
  const seen = new Set();
  return [...dbResults, ...uniqueGoogle, ...uniqueOL].filter(r => {
    const key = strip(r.title) + '|' + strip(r.authors?.[0] || '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ═══════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════

export async function searchBooks(query, { onDbResults } = {}) {
  if (!query || query.length < 2) return [];

  const cached = getCached(query);
  if (cached) return cached;

  const t0 = performance.now();

  // Étape 1 : RPC locale (rapide, ~50ms)
  const t_db_start = performance.now();
  const localBooks = await searchLocalBooks(query);
  const t_db = Math.round(performance.now() - t_db_start);
  const dbResults = localBooks.map(formatDbResult);

  // Skip logic : déterminer si Google est nécessaire
  const digits = query.replace(/[^0-9]/g, "");
  const isISBN = digits.length >= 10 && digits.length <= 13;
  const dbSufficient = dbResults.length >= 3;
  const isbnFound = isISBN && dbResults.length >= 1;
  const skipGoogle = dbSufficient || isbnFound || !isGoogleBooksAvailable();

  // Wave 1 callback — résultats DB disponibles avant les sources externes
  onDbResults?.(dbResults, { skipGoogle });

  let googleResults = [];
  let olResults = [];
  let googleRaw = 0;
  let skipReason = null;
  let olActuallyCalled = false;

  if (skipGoogle) {
    if (isbnFound) skipReason = "isbn_found";
    else if (dbSufficient) skipReason = "db_sufficient";
    else skipReason = "circuit_breaker";
  }

  const t_ext_start = performance.now();
  if (!skipGoogle) {
    // Étape 2 : Google Books seul (OL uniquement si circuit breaker actif)
    googleResults = await fetchGoogleBooks(query);
    googleRaw = googleResults._rawCount || 0;
  } else if (skipReason === "circuit_breaker") {
    // Google est down — Open Library comme découverte de secours
    olActuallyCalled = true;
    olResults = await searchOpenLibrary(query);
  }
  const t_google = skipGoogle ? 0 : Math.round(performance.now() - t_ext_start);
  const t_total = Math.round(performance.now() - t0);

  const final = deduplicateResults(dbResults, googleResults, olResults).slice(0, 10);

  // Métadonnées skip logic (attachées au tableau)
  final._skippedGoogle = skipGoogle;
  final._skipReason = skipReason;

  // Logging structuré
  const googleUseful = final.filter(r => r._source === "google").length;
  const olUseful = final.filter(r => r._source === "openlibrary").length;
  console.log("[search-analytics]", JSON.stringify({
    query,
    ts: new Date().toISOString(),
    db: dbResults.length,
    googleCalled: !skipGoogle,
    googleRaw,
    googleFiltered: googleResults.length,
    googleDeduped: googleResults.length - googleUseful,
    googleUseful,
    olCalled: olActuallyCalled,
    olResults: olResults.length,
    olUseful,
    skipped: skipGoogle,
    skipReason,
    circuitBreakerActive: !isGoogleBooksAvailable(),
    t_db,
    t_google,
    t_total,
  }));

  setCache(query, final);
  return final;
}
