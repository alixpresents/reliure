import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

function normalizeBook(b) {
  return {
    id: b.id,
    t: b.title,
    a: Array.isArray(b.authors) ? b.authors.join(", ") : (b.authors || ""),
    c: b.cover_url,
    y: b.publication_date ? parseInt(b.publication_date) : null,
    p: b.page_count || 0,
    r: b.avg_rating || 0,
    rt: b.rating_count || 0,
    tags: Array.isArray(b.genres) ? b.genres : [],
    desc: b.description,
    slug: b.slug,
    _supabase: b,
  };
}

export function usePopularBooks() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Try: books with most reading_status activity in last 7 days
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: trending } = await supabase.rpc("popular_books_week", { since_date: since }).limit(7);

      if (trending && trending.length >= 3) {
        setBooks(trending.map(normalizeBook));
      } else {
        // Fallback: most rated books
        const { data: fallback } = await supabase
          .from("books")
          .select("id, title, authors, cover_url, slug, publication_date, avg_rating, rating_count, page_count")
          .gt("rating_count", 0)
          .order("rating_count", { ascending: false })
          .limit(7);
        setBooks((fallback ?? []).map(normalizeBook));
      }
      setLoading(false);
    })();
  }, []);

  return { books, loading };
}

export function usePopularReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id, body, rating, likes_count, contains_spoilers, created_at, books:book_id(id, title, cover_url, authors, publication_date, slug), users:user_id(username, display_name, avatar_url)")
      .not("body", "is", null)
      .neq("body", "")
      .order("likes_count", { ascending: false })
      .limit(3);
    setReviews(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { reviews, loading, refetch: fetch };
}

export function usePopularQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("quotes")
      .select("id, text, likes_count, created_at, books!quotes_book_id_fkey(id, title, cover_url, authors, slug), users!quotes_user_id_fkey(username, display_name)")
      .order("likes_count", { ascending: false })
      .limit(3);
    setQuotes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading, refetch: fetch };
}

export function usePopularLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lists")
        .select("id, title, description, slug, user_id, likes_count, users(username, display_name)")
        .eq("is_public", true)
        .order("likes_count", { ascending: false })
        .limit(4);

      if (!data || data.length === 0) { setLists([]); setLoading(false); return; }

      // Fetch preview books for each list
      const listIds = data.map(l => l.id);
      const { data: items } = await supabase
        .from("list_items")
        .select("list_id, position, books(id, title, cover_url, authors)")
        .in("list_id", listIds)
        .order("position", { ascending: true });

      const itemsByList = {};
      for (const item of (items ?? [])) {
        if (!itemsByList[item.list_id]) itemsByList[item.list_id] = [];
        if (itemsByList[item.list_id].length < 4 && item.books) {
          itemsByList[item.list_id].push(normalizeBook(item.books));
        }
      }

      // Count items per list
      const { data: counts } = await supabase
        .from("list_items")
        .select("list_id", { count: "exact", head: false })
        .in("list_id", listIds);

      const countMap = {};
      for (const c of (counts ?? [])) {
        countMap[c.list_id] = (countMap[c.list_id] || 0) + 1;
      }

      setLists(data.map(l => ({
        ...l,
        userName: l.users?.display_name || l.users?.username || "?",
        previewBooks: itemsByList[l.id] || [],
        bookCount: countMap[l.id] || 0,
      })));
      setLoading(false);
    })();
  }, []);

  return { lists, loading };
}

export function useAvailableGenres() {
  const [genres, setGenres] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Fetch all genres arrays from books, then count occurrences client-side.
      // We only need the genres column, so the payload stays small.
      const { data } = await supabase
        .from("books")
        .select("genres")
        .not("genres", "eq", "[]")
        .limit(2000);

      if (!data) { setGenres([]); setLoading(false); return; }

      const counts = {};
      for (const row of data) {
        if (!Array.isArray(row.genres)) continue;
        for (const g of row.genres) {
          if (typeof g === "string" && g.trim()) {
            counts[g] = (counts[g] || 0) + 1;
          }
        }
      }

      // Only genres with at least 1 book, sorted by count desc
      const sorted = Object.entries(counts)
        .filter(([, n]) => n >= 1)
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g);

      setGenres(sorted);
      setLoading(false);
    })();
  }, []);

  return { genres, loading };
}

export function useBooksByGenre(genre) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genre) { setBooks([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, authors, cover_url, slug")
        .filter("genres", "cs", `["${genre}"]`)
        .order("rating_count", { ascending: false })
        .limit(20);
      setBooks((data ?? []).map(normalizeBook));
      setLoading(false);
    })();
  }, [genre]);

  return { books, loading };
}
