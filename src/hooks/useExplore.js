import { useState, useEffect } from "react";
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
          .select("*")
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

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*, books(id, title, cover_url, authors, publication_date), users(username, display_name)")
        .not("body", "is", null)
        .neq("body", "")
        .order("likes_count", { ascending: false })
        .limit(3);
      setReviews(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { reviews, loading };
}

export function usePopularQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quotes")
        .select("*, books(id, title, cover_url, authors), users(username, display_name)")
        .order("likes_count", { ascending: false })
        .limit(3);
      setQuotes(data ?? []);
      setLoading(false);
    })();
  }, []);

  return { quotes, loading };
}

export function usePopularLists() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lists")
        .select("*, users(username, display_name)")
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

export function useBooksByGenre(genre) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!genre) { setBooks([]); setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("*")
        .contains("genres", [genre])
        .order("rating_count", { ascending: false })
        .limit(20);
      setBooks((data ?? []).map(normalizeBook));
      setLoading(false);
    })();
  }, [genre]);

  return { books, loading };
}
