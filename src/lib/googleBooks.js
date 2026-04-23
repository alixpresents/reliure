import { supabase } from "./supabase";
import { searchOpenLibrary, searchOpenLibraryByISBN } from "./openLibrarySearch";

// ═══════════════════════════════════════════════
// Dilicom FEL Search (catalogue FR, ~1.8M refs)
// ═══════════════════════════════════════════════

async function fetchDilicom(query, { isbn } = {}) {
  try {
    const digits = (query || "").replace(/[^0-9]/g, "");
    const isISBN = !isbn && digits.length >= 10 && digits.length <= 13;
    const body = isbn
      ? { isbn }
      : isISBN
        ? { isbn: digits }
        : { query: query.trim(), limit: 10 };
    const { data, error } = await supabase.functions.invoke("dilicom-search", {
      body,
    });
    if (error) return [];
    return (data?.results || []).map(r => ({
      googleId: null,
      _source: "dilicom",
      dbId: null,
      slug: null,
      title: r.title,
      subtitle: r.subtitle || null,
      authors: r.authors || [],
      publisher: r.publisher || null,
      publishedDate: r.publicationDate || null,
      coverUrl: r.coverLarge || r.coverMedium || null,
      pageCount: r.pages || null,
      isbn13: r.isbn || null,
      description: r.description || null,
      _clilCode: r.clilCode || null,
      _clilLabel: r.clilLabel || null,
      _availability: r.availability || null,
    }));
  } catch {
    return [];
  }
}

export { fetchDilicom };

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function stripGoogleDescription(str) {
  if (!str) return null;
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&eacute;/g, "é").replace(/&egrave;/g, "è")
    .replace(/&ecirc;/g, "ê").replace(/&ocirc;/g, "ô")
    .replace(/&agrave;/g, "à").replace(/&ccedil;/g, "ç")
    .replace(/&rsquo;/g, "\u2019").replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»").replace(/&hellip;/g, "…")
    .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n").trim() || null;
}

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
// TIER 1a : Recherche base locale (RPC)
// ═══════════════════════════════════════════════

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
    const { data, error } = await supabase.functions.invoke("google-books-proxy", {
      body: { query: query.trim() },
    });
    if (error) {
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
          description: stripGoogleDescription(v.description),
        };
      });
    filtered._rawCount = items.length;
    return filtered;
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════

export async function searchBooks(query, { onDbResults } = {}) {
  if (!query || query.length < 2) return [];

  const cached = getCached(query);
  if (cached) return cached;

  const t0 = performance.now();

  const digits = query.replace(/[^0-9]/g, "");
  const isISBN = digits.length >= 10 && digits.length <= 13;

  // ── CAS ISBN : lookup exact, court-circuit total ──────────────────
  if (isISBN) {
    const t_db_start = performance.now();
    const localBooks = await searchLocalBooks(query);
    const t_db = Math.round(performance.now() - t_db_start);
    const dbResults = localBooks.map(formatDbResult);

    onDbResults?.(dbResults, { skipGoogle: true });

    if (dbResults.length >= 1) {
      const final = dbResults.slice(0, 10);
      setCache(query, final);
      console.log("[search-analytics]", JSON.stringify({
        query, ts: new Date().toISOString(),
        db: dbResults.length, dilicomCalled: false,
        googleCalled: false, skipped: true, skipReason: "isbn_db_exact",
        t_db, t_google: 0, t_total: Math.round(performance.now() - t0),
      }));
      return final;
    }

    // ISBN pas en DB → lookup Dilicom ISBN
    const t_dil_start = performance.now();
    const dilicomResults = await fetchDilicom(query, { isbn: digits });
    const t_dilicom = Math.round(performance.now() - t_dil_start);

    if (dilicomResults.length >= 1) {
      const final = dilicomResults.slice(0, 10);
      setCache(query, final);
      console.log("[search-analytics]", JSON.stringify({
        query, ts: new Date().toISOString(),
        db: 0, dilicomCalled: true, dilicomResults: dilicomResults.length,
        googleCalled: false, skipped: false, skipReason: null,
        t_db, t_dilicom, t_total: Math.round(performance.now() - t0),
      }));
      return final;
    }

    // ISBN absent de Dilicom → fallback Open Library (livres anciens / épuisés)
    const t_ol_start = performance.now();
    const olBook = await searchOpenLibraryByISBN(digits);
    const t_ol = Math.round(performance.now() - t_ol_start);

    if (olBook) {
      const final = [olBook];
      setCache(query, final);
      console.log("[search-analytics]", JSON.stringify({
        query, ts: new Date().toISOString(),
        db: 0, dilicomCalled: true, dilicomResults: 0,
        olCalled: true, olResults: 1,
        googleCalled: false, skipped: false, skipReason: null,
        t_db, t_dilicom, t_ol, t_total: Math.round(performance.now() - t0),
      }));
      return final;
    }

    console.log("[search-analytics]", JSON.stringify({
      query, ts: new Date().toISOString(),
      db: 0, dilicomCalled: true, dilicomResults: 0,
      olCalled: true, olResults: 0,
      googleCalled: false, skipped: false, skipReason: "isbn_not_found",
      t_db, t_dilicom, t_ol, t_total: Math.round(performance.now() - t0),
    }));
    return [];
  }

  // ── CAS TEXTE : DB + Dilicom en parallèle (TIER 1) ───────────────
  const t_tier1_start = performance.now();

  const [localBooks, dilicomResults] = await Promise.all([
    searchLocalBooks(query),
    fetchDilicom(query),
  ]);

  const t_tier1 = Math.round(performance.now() - t_tier1_start);
  const dbResults = localBooks.map(formatDbResult);

  // Wave 1 callback — résultats DB immédiats pour l'UI
  onDbResults?.(dbResults, { skipGoogle: false });

  // Scoring pour le tri fusé
  const q = strip(query);
  function scoreResult(r) {
    const t = strip(r.title || "");
    const a = strip(r.authors?.[0] || "");
    let s = 0;
    if (t === q) s += 200;
    else if (t.startsWith(q)) s += 100;
    else if (t.includes(q)) s += 50;
    if (a === q || a.startsWith(q)) s += 40;
    if (r._source === "db") s += 15; // bonus DB : données enrichies + slugs
    s += Math.min(r._ratingCount || 0, 20);
    return s;
  }

  // Dédup Dilicom vs DB (par ISBN puis titre normalisé)
  const dbIsbns = new Set(dbResults.map(r => r.isbn13).filter(Boolean));
  const dbTitlesNorm = new Set(dbResults.map(r => strip(r.title)));

  const uniqueDilicom = dilicomResults.filter(d => {
    if (d.isbn13 && dbIsbns.has(d.isbn13)) return false;
    if (dbTitlesNorm.has(strip(d.title))) return false;
    return true;
  });

  // Pool fusé Tier 1, trié par score
  const fusedPool = [...dbResults, ...uniqueDilicom]
    .map(r => ({ ...r, _score: scoreResult(r) }))
    .sort((a, b) => b._score - a._score);

  // ── TIER 2 : Google si pool fusé < 3 ──────────────────────────────
  let googleResults = [];
  let olResults = [];
  let googleCalled = false;
  let olCalled = false;
  const hasExactTitleMatch = fusedPool.length >= 1 && fusedPool[0]._score >= 200;
  const fusedSufficient = fusedPool.length >= 3 || hasExactTitleMatch;
  const t_ext_start = performance.now();

  if (!fusedSufficient) {
    if (isGoogleBooksAvailable()) {
      googleCalled = true;
      googleResults = await fetchGoogleBooks(query);
    } else {
      olCalled = true;
      olResults = await searchOpenLibrary(query);
    }
  }

  const t_ext = Math.round(performance.now() - t_ext_start);
  const t_total = Math.round(performance.now() - t0);

  // Dédup Google/OL vs pool fusé
  const fusedIsbns = new Set(fusedPool.map(r => r.isbn13).filter(Boolean));
  const fusedTitles = new Set(fusedPool.map(r => strip(r.title)));

  const uniqueGoogle = googleResults.filter(g => {
    if (g.isbn13 && fusedIsbns.has(g.isbn13)) return false;
    if (fusedTitles.has(strip(g.title))) return false;
    return true;
  });

  const uniqueOL = olResults.filter(ol => {
    if (!ol.title) return false;
    if (ol.isbn13 && fusedIsbns.has(ol.isbn13)) return false;
    if (fusedTitles.has(strip(ol.title))) return false;
    return true;
  });

  // Résultat final : fusedPool (DB+Dilicom triés) + Google + OL, dédup titre+auteur
  const seen = new Set();
  const final = [...fusedPool, ...uniqueGoogle, ...uniqueOL]
    .filter(r => {
      const key = strip(r.title) + '|' + strip(r.authors?.[0] || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);

  // Analytics
  const dilicomUseful = final.filter(r => r._source === "dilicom").length;
  const googleUseful = final.filter(r => r._source === "google").length;
  const googleRaw = googleResults._rawCount || 0;

  console.log("[search-analytics]", JSON.stringify({
    query,
    ts: new Date().toISOString(),
    db: dbResults.length,
    dilicomCalled: true,
    dilicomResults: dilicomResults.length,
    dilicomUseful,
    googleCalled,
    googleRaw,
    googleFiltered: googleResults.length,
    googleUseful,
    olCalled,
    olResults: olResults.length,
    olUseful: final.filter(r => r._source === "openlibrary").length,
    skipped: false,
    skipReason: fusedSufficient ? "fused_sufficient" : null,
    t_tier1,
    t_ext,
    t_total,
  }));

  setCache(query, final);
  return final;
}
