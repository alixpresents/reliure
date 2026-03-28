const API_URL = "https://www.googleapis.com/books/v1/volumes";

export async function searchBooks(query) {
  if (!query || query.length < 2) return [];

  const key = import.meta.env.VITE_GOOGLE_BOOKS_KEY;
  const url = `${API_URL}?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=fr${key ? `&key=${key}` : ""}`;
  console.log("[GoogleBooks] fetch:", url);

  try {
    const res = await fetch(url);
    console.log("[GoogleBooks] status:", res.status);

    if (!res.ok) {
      console.error("[GoogleBooks] HTTP error:", res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    console.log("[GoogleBooks] totalItems:", data.totalItems, "items:", data.items?.length);

    if (!data.items) return [];

    return data.items
      .map(item => {
        const v = item.volumeInfo;
        if (!v?.title) return null;

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
      })
      .filter(Boolean);
  } catch (err) {
    console.error("[GoogleBooks] fetch error:", err);
    return [];
  }
}
