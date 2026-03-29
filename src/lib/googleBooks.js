import { supabase } from "./supabase";

const API_URL = "https://www.googleapis.com/books/v1/volumes";

const BAD_TITLE_KEYWORDS = [
  "résumé", "fiche de lecture", "analyse", "commentaire",
  "sparknotes", "study guide", "dissertation", "bac",
  "questionnaire", "livres des thèmes",
];

const KNOWN_PUBLISHERS = [
  "gallimard", "folio", "flammarion", "seuil",
  "minuit", "actes sud", "albin michel", "fayard",
  "grasset", "stock", "plon", "calmann-lévy",
  "pocket", "points", "babel", "rivages", "bourgois",
  "p.o.l", "verdier", "zulma", "sabine wespieser",
];

function scoreBook(item) {
  let score = 0;
  const info = item.volumeInfo;

  if (info.industryIdentifiers?.length) score += 3;
  if (info.imageLinks?.thumbnail) score += 3;
  if (info.pageCount > 100) score += 2;
  if (info.pageCount > 200) score += 1;

  const publisher = (info.publisher || "").toLowerCase();
  if (KNOWN_PUBLISHERS.some(p => publisher.includes(p))) score += 2;

  if (info.language === "fr") score += 2;

  if (info.ratingsCount > 100) score += 1;
  if (info.ratingsCount > 1000) score += 1;

  const title = (info.title || "").toLowerCase();
  const badKeywords = ["résumé", "fiche", "analyse", "commentaire", "étude", "guide", "dissertation", "questionnaire"];
  if (badKeywords.some(k => title.includes(k))) score -= 5;

  return score;
}

export async function searchBooks(query) {
  if (!query || query.length < 2) return [];

  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY;
  const url = `${API_URL}?q=${encodeURIComponent(query)}&maxResults=20&orderBy=relevance&printType=books&langRestrict=fr${key ? `&key=${key}` : ""}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items) return [];

    // Step 2: filter out results without cover, ISBN, or bad title keywords
    const filtered = data.items.filter(item => {
      const v = item.volumeInfo;
      if (!v?.title) return false;
      if (!v.imageLinks) return false;
      if (!v.industryIdentifiers?.length) return false;
      const titleLower = v.title.toLowerCase();
      if (BAD_TITLE_KEYWORDS.some(kw => titleLower.includes(kw.toLowerCase()))) return false;
      return true;
    });

    // Step 3: score and sort
    const scored = filtered.map(item => ({ item, score: scoreBook(item) }));
    scored.sort((a, b) => b.score - a.score);

    // Step 4: boost books already in our DB
    const isbns = scored
      .map(({ item }) => item.volumeInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier)
      .filter(Boolean);

    let inDbIsbns = new Set();
    if (isbns.length) {
      const { data: dbBooks } = await supabase.from("books").select("isbn_13").in("isbn_13", isbns);
      if (dbBooks) inDbIsbns = new Set(dbBooks.map(b => b.isbn_13));
    }

    const boosted = scored.map(({ item, score }) => {
      const isbn = item.volumeInfo.industryIdentifiers?.find(i => i.type === "ISBN_13")?.identifier;
      return { item, score: isbn && inDbIsbns.has(isbn) ? score + 3 : score };
    });
    boosted.sort((a, b) => b.score - a.score);

    // Map to output format, max 10 results
    return boosted.slice(0, 10).map(({ item }) => {
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
  } catch (err) {
    console.error("[GoogleBooks] fetch error:", err);
    return [];
  }
}
