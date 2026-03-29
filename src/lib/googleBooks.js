import { supabase } from "./supabase";
import { getSuggestion } from "./searchSuggestions";

const API = "https://www.googleapis.com/books/v1/volumes";

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// ═══════════════════════════════════════════════
// Cache (in-memory, per session)
// ═══════════════════════════════════════════════

const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 50;

function cacheKey(q) {
  return stripAccents(q).toLowerCase().trim();
}

function getCached(q) {
  const k = cacheKey(q);
  const e = cache.get(k);
  if (!e) return null;
  if (Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; }
  return e.results;
}

function setCache(q, results) {
  const k = cacheKey(q);
  if (cache.size >= CACHE_MAX) {
    let oldK = null, oldTs = Infinity;
    for (const [key, val] of cache) {
      if (val.ts < oldTs) { oldK = key; oldTs = val.ts; }
    }
    if (oldK) cache.delete(oldK);
  }
  cache.set(k, { results, ts: Date.now() });
}

// ═══════════════════════════════════════════════
// Query analysis & adaptive strategy
// ═══════════════════════════════════════════════

function analyzeQuery(q) {
  const t = q.trim();
  const words = t.split(/\s+/);
  return {
    isShort: t.length < 4,
    isSingleWord: words.length === 1,
    hasAuthorSignal: /\s+(de|par|by)\s+/i.test(t),
    looksLikeISBN: /^[\d-]{9,}$/.test(t.replace(/\s/g, "")),
    wordCount: words.length,
    words,
  };
}

async function fetchGB(params) {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY;
  const url = `${API}?${params}&orderBy=relevance&printType=books${key ? `&key=${key}` : ""}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

function buildQueries(q, a) {
  const enc = encodeURIComponent(q.trim());

  if (a.looksLikeISBN) {
    return [`q=isbn:${q.trim().replace(/[-\s]/g, "")}&maxResults=5`];
  }

  if (a.isShort) {
    return [
      `q=intitle:"${enc}"&maxResults=10`,
      `q=${enc}&maxResults=10`,
    ];
  }

  // Single word — try as title, as author, and broad
  if (a.isSingleWord) {
    return [
      `q=intitle:${enc}&maxResults=15`,
      `q=inauthor:${enc}&maxResults=15`,
      `q=${enc}&maxResults=15`,
    ];
  }

  // "titre de auteur" pattern
  if (a.hasAuthorSignal) {
    const m = q.trim().match(/^(.+?)\s+(?:de|par|by)\s+(.+)$/i);
    if (m) {
      return [
        `q=intitle:${encodeURIComponent(m[1])}+inauthor:${encodeURIComponent(m[2])}&maxResults=10`,
        `q=${enc}&maxResults=15`,
      ];
    }
  }

  // 2 words — try both author/title permutations + exact title + broad
  if (a.wordCount === 2) {
    const [w1, w2] = a.words;
    return [
      `q=intitle:${encodeURIComponent(w2)}+inauthor:${encodeURIComponent(w1)}&maxResults=10`,
      `q=intitle:${encodeURIComponent(w1)}+inauthor:${encodeURIComponent(w2)}&maxResults=10`,
      `q=intitle:"${enc}"&maxResults=10`,
      `q=${enc}&maxResults=15`,
    ];
  }

  // 3+ words — exact title, prefix-friendly intitle (no quotes), and broad
  return [
    `q=intitle:"${enc}"&maxResults=10`,
    `q=intitle:${enc}&maxResults=15`,
    `q=${enc}&maxResults=15`,
  ];
}

// ═══════════════════════════════════════════════
// Dedup & filter
// ═══════════════════════════════════════════════

function dedup(items) {
  const seen = new Set();
  return items.filter(it => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

const BAD_TITLE_WORDS = [
  "résumé", "resume", "fiche de lecture", "analyse de", "commentaire",
  "sparknotes", "study guide", "dissertation", "questionnaire",
  "livret", "workbook", "teacher", "lesson plan", "bac ",
  "préparer", "preparer", "révisions", "revisions", "annales",
];

const BAD_PUBLISHERS = [
  "fichesdelecture", "leresumedumois", "primento", "ebookslib",
  "12minutesinbook", "editions du net", "bookelis", "librinova",
  "publishroom", "unepub", "lulu.com", "books on demand",
  "encyclopaedia universalis", "universalis",
];

function filterItems(items) {
  return items.filter(it => {
    const v = it.volumeInfo;
    if (!v?.title) return false;
    if (!v.imageLinks) return false;
    if (!v.industryIdentifiers?.length) return false;
    if (v.pageCount && v.pageCount < 30) return false;
    const norm = stripAccents(`${v.title} ${v.subtitle || ""}`).toLowerCase();
    if (BAD_TITLE_WORDS.some(kw => norm.includes(stripAccents(kw)))) return false;
    const pub = stripAccents((v.publisher || "").toLowerCase());
    if (BAD_PUBLISHERS.some(bp => pub.includes(bp))) return false;
    return true;
  });
}

// ═══════════════════════════════════════════════
// Scoring
// ═══════════════════════════════════════════════

const FR_PUBLISHERS = [
  "gallimard", "folio", "flammarion", "seuil", "minuit",
  "actes sud", "albin michel", "fayard", "grasset", "stock",
  "plon", "calmann-lévy", "pocket", "points", "babel",
  "rivages", "bourgois", "p.o.l", "verdier", "zulma",
  "sabine wespieser", "christian bourgois", "denoël",
  "robert laffont", "lattès", "magnard", "hachette",
  "nathan", "belin", "larousse", "pottermore",
];

const EN_PUBLISHERS = [
  "penguin", "vintage", "bloomsbury", "harper", "simon",
  "random house", "macmillan", "picador", "faber", "norton",
  "oxford", "cambridge", "knopf", "farrar", "grove", "scholastic",
];

function scoreBook(item, originalQuery) {
  let score = 0;
  const info = item.volumeInfo;
  const title = stripAccents((info.title || "").toLowerCase());
  const query = stripAccents(originalQuery.toLowerCase().trim());
  const queryWords = query.split(/\s+/).filter(w => w.length > 2);
  const allQueryWords = query.split(/\s+/);
  const authorsList = info.authors || [];
  const authors = authorsList.map(a => stripAccents(a.toLowerCase())).join(" ");
  const pub = (info.publisher || "").toLowerCase();
  const fullText = `${title} ${stripAccents((info.subtitle || "").toLowerCase())}`;

  // ── Metadata completeness ──
  if (info.industryIdentifiers?.length) score += 3;
  if (info.imageLinks?.thumbnail) score += 3;
  if (!authorsList.length) score -= 3;
  if (info.pageCount > 80) score += 1;
  if (info.pageCount > 150) score += 1;
  if (info.pageCount > 300) score += 1;
  if (info.description?.length > 100) score += 1;

  // ── Publishers ──
  if (FR_PUBLISHERS.some(p => pub.includes(p))) score += 3;
  else if (EN_PUBLISHERS.some(p => pub.includes(p))) score += 2;

  // ── Language ──
  if (info.language === "fr") score += 2;
  else if (info.language === "en") score += 1;

  // ── Popularity ──
  if (info.ratingsCount > 0) score += 1;
  if (info.ratingsCount > 50) score += 1;
  if (info.ratingsCount > 500) score += 2;
  if (info.ratingsCount > 5000) score += 3;
  if (info.averageRating >= 4.0) score += 1;

  // ── Title relevance ──
  if (title === query) score += 5;
  else if (title.startsWith(query)) score += 3;
  else if (title.includes(query)) score += 1;
  if (queryWords.length > 0 && queryWords.every(w => title.includes(w))) score += 2;

  // ── Prefix matching: "harry p" → "harry potter" ──
  const titleWords = title.split(/\s+/);
  if (allQueryWords.length >= 2) {
    const prefixMatch = allQueryWords.every((qw, i) => {
      const tw = titleWords[i];
      return tw && stripAccents(tw).startsWith(stripAccents(qw));
    });
    if (prefixMatch) score += 6;
  }

  // ── Author relevance (last-name matching for strong bonuses) ──
  const lastNames = authorsList.map(a => {
    const parts = stripAccents(a.toLowerCase()).split(/\s+/);
    return parts[parts.length - 1];
  });
  const authorMatch = query.length > 2 && authors.includes(query);
  const lastNameMatch = query.length > 2 && lastNames.includes(query);
  const titleMatch = title.includes(query);
  if (authorMatch) score += 3;
  if (queryWords.length > 0 && queryWords.some(w => w.length > 2 && authors.includes(w))) score += 1;

  // Author's OWN work — only for last-name matches (avoids middle-name false positives)
  if (lastNameMatch && !titleMatch) score += 4;
  // Biography/anthology (query in both title AND author) → penalty
  if (authorMatch && titleMatch) score -= 4;

  // ── Combined: all query words appear in title+author ──
  if (queryWords.length > 1) {
    const combined = `${title} ${authors}`;
    if (queryWords.every(w => combined.includes(w))) score += 3;
  }

  // ── Tome/volume preference ──
  const tomeMatch = title.match(/(?:tome|vol(?:ume)?\.?|book|t\.) *(\d+)/i);
  const queryHasNumber = /\d/.test(query);
  if (tomeMatch) {
    const n = parseInt(tomeMatch[1]);
    if (n === 1) score += 2;
    else if (!queryHasNumber) {
      if (n >= 2) score -= 2;
      if (n >= 5) score -= 1;
    }
  }

  // ── Meta-work detection ──
  const metaKw = [
    "journey", "making of", "behind the scenes", "companion to",
    "encyclopedia of", "guide to", "collected short stories",
    "astrologie", "philosophie de", "psychologie de",
    "secrets de", "monde de", "univers de",
  ];
  if (metaKw.some(kw => fullText.includes(kw))) score -= 3;

  // ── Parasitic content ──
  const badKw = [
    "resume", "fiche", "analyse", "commentaire", "etude",
    "guide", "dissertation", "questionnaire", "workbook",
    "teacher", "lesson", "revision", "annales", "preparer",
  ];
  score -= badKw.filter(k => fullText.includes(k)).length * 4;

  return score;
}

// ═══════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════

export async function searchBooks(query) {
  if (!query || query.length < 2) return [];

  const cached = getCached(query);
  if (cached) return cached;

  // Try suggestion-based expansion for better API results
  const suggestion = getSuggestion(query);
  const effectiveQuery = suggestion || query;

  const analysis = analyzeQuery(effectiveQuery);
  const queries = buildQueries(effectiveQuery, analysis);

  // Parallel fetch → merge → dedup → filter
  const batches = await Promise.all(queries.map(fetchGB));
  const merged = dedup(batches.flat());
  const filtered = filterItems(merged);

  // Score (against the original query for relevance)
  let scored = filtered.map(item => ({ item, score: scoreBook(item, effectiveQuery) }));
  scored.sort((a, b) => b.score - a.score);

  // Minimum score threshold
  let aboveThreshold = scored.filter(s => s.score > 5);
  if (aboveThreshold.length < 3) aboveThreshold = scored.filter(s => s.score > 2);
  if (aboveThreshold.length > 0) scored = aboveThreshold;

  // Supabase boost: +4 for books already in our DB
  const isbns = scored
    .map(({ item }) => item.volumeInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier)
    .filter(Boolean);

  let inDb = new Set();
  if (isbns.length) {
    const { data } = await supabase.from("books").select("isbn_13").in("isbn_13", isbns);
    if (data) inDb = new Set(data.map(b => b.isbn_13));
  }

  const boosted = scored.map(({ item, score }) => {
    const isbn = item.volumeInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier;
    return { item, score: isbn && inDb.has(isbn) ? score + 4 : score };
  });
  boosted.sort((a, b) => b.score - a.score);

  // Map to output format, max 10 results
  const results = boosted.slice(0, 10).map(({ item }) => {
    const v = item.volumeInfo;
    const isbn = v.industryIdentifiers?.find(i => i.type === "ISBN_13");
    const cover = v.imageLinks?.thumbnail?.replace("http://", "https://") || null;
    return {
      googleId: item.id,
      title: v.title,
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

  setCache(query, results);
  return results;
}
