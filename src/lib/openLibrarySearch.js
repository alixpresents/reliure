// ═══════════════════════════════════════════════
// Open Library Search — browser-side module
// No API key required, CORS is open from browser
// ═══════════════════════════════════════════════

const OL_SEARCH = "https://openlibrary.org/search.json";
const OL_ISBN   = "https://openlibrary.org/isbn";

const OL_FIELDS = [
  "title",
  "author_name",
  "isbn",
  "cover_i",
  "first_publish_year",
  "publisher",
  "number_of_pages_median",
].join(",");

// ═══════════════════════════════════════════════
// Shared helpers (duplicated from googleBooks.js
// to keep this module self-contained)
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

function isBadTitle(title) {
  const norm = strip(title || "");
  return BAD_TITLE_WORDS.some(kw => norm.includes(strip(kw)));
}

function isBadPublisher(publisher) {
  const norm = strip(publisher || "");
  return BAD_PUBLISHERS.some(bp => norm.includes(bp));
}

// ═══════════════════════════════════════════════
// Converter : OL doc → Reliure unified format
// ═══════════════════════════════════════════════

function docToBook(doc) {
  return {
    googleId:      null,
    _source:       "openlibrary",
    dbId:          null,
    slug:          null,
    title:         doc.title,
    subtitle:      null,
    authors:       doc.author_name || [],
    publisher:     doc.publisher?.[0] || null,
    publishedDate: doc.first_publish_year?.toString() || null,
    coverUrl:      doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    pageCount:     doc.number_of_pages_median || null,
    isbn13:        doc.isbn?.find(i => i.length === 13) || null,
    description:   null,
  };
}

// ═══════════════════════════════════════════════
// searchOpenLibrary(query, maxResults?)
// ═══════════════════════════════════════════════

export async function searchOpenLibrary(query, maxResults = 8) {
  if (!query || query.trim().length < 2) return [];

  const enc = encodeURIComponent(query.trim());
  const url = `${OL_SEARCH}?q=${enc}&fields=${OL_FIELDS}&limit=${maxResults + 4}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];

    const data = await res.json();
    const docs = data.docs || [];

    return docs
      .filter(doc => {
        if (!doc.title) return false;
        if (isBadTitle(doc.title)) return false;
        if (isBadPublisher(doc.publisher?.[0])) return false;
        return true;
      })
      .slice(0, maxResults)
      .map(docToBook);
  } catch {
    // Timeout, network error, parse error — never block the search pipeline
    return [];
  }
}

// ═══════════════════════════════════════════════
// searchOpenLibraryByISBN(isbn)
// Returns a single book object or null
// ═══════════════════════════════════════════════

export async function searchOpenLibraryByISBN(isbn) {
  if (!isbn) return null;

  const clean = String(isbn).replace(/[^0-9X]/gi, "");
  if (!clean) return null;

  try {
    const res = await fetch(`${OL_ISBN}/${clean}.json`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.title) return null;

    // OL ISBN endpoint has a different shape — map it to the unified format
    return {
      googleId:      null,
      _source:       "openlibrary",
      dbId:          null,
      slug:          null,
      title:         data.title,
      subtitle:      data.subtitle || null,
      authors:       data.authors
        ? data.authors.map(a => a.name || a.key || "").filter(Boolean)
        : [],
      publisher:     Array.isArray(data.publishers)
        ? data.publishers[0] || null
        : null,
      publishedDate: data.publish_date || null,
      coverUrl:      data.covers?.[0]
        ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-M.jpg`
        : null,
      pageCount:     data.number_of_pages || null,
      isbn13:        Array.isArray(data.isbn_13) ? data.isbn_13[0] || null : null,
      description:   typeof data.description === "string"
        ? data.description
        : data.description?.value || null,
    };
  } catch {
    return null;
  }
}
