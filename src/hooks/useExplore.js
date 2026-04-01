import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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

async function fetchPopularBooks() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: trending } = await supabase.rpc("popular_books_week", { since_date: since }).limit(7);

  if (trending && trending.length >= 3) {
    return trending.map(normalizeBook);
  }
  // Fallback: most rated books
  const { data: fallback } = await supabase
    .from("books")
    .select("id, title, authors, cover_url, slug, publication_date, avg_rating, rating_count, page_count")
    .gt("rating_count", 0)
    .order("rating_count", { ascending: false })
    .limit(7);
  return (fallback ?? []).map(normalizeBook);
}

async function fetchPopularReviews() {
  const { data } = await supabase
    .from("reviews")
    .select("id, body, rating, likes_count, contains_spoilers, created_at, books:book_id(id, title, cover_url, authors, publication_date, slug), users:user_id(username, display_name, avatar_url)")
    .not("body", "is", null)
    .neq("body", "")
    .order("likes_count", { ascending: false })
    .limit(3);
  return data ?? [];
}

async function fetchPopularQuotes() {
  const { data } = await supabase
    .from("quotes")
    .select("id, text, likes_count, created_at, books!quotes_book_id_fkey(id, title, cover_url, authors, slug), users!quotes_user_id_fkey(username, display_name)")
    .order("likes_count", { ascending: false })
    .limit(3);
  return data ?? [];
}

async function fetchPopularLists() {
  const { data } = await supabase.rpc("popular_lists_with_covers", { result_limit: 6 });
  return data ?? [];
}

export function usePopularBooks() {
  const { data: books = [], isLoading: loading } = useQuery({
    queryKey: ["popularBooks"],
    queryFn: fetchPopularBooks,
  });
  return { books, loading };
}

export function usePopularReviews() {
  const queryClient = useQueryClient();
  const { data: reviews = [], isLoading: loading } = useQuery({
    queryKey: ["popularReviews"],
    queryFn: fetchPopularReviews,
  });
  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["popularReviews"] }),
    [queryClient]
  );
  return { reviews, loading, refetch };
}

export function usePopularQuotes() {
  const queryClient = useQueryClient();
  const { data: quotes = [], isLoading: loading } = useQuery({
    queryKey: ["popularQuotes"],
    queryFn: fetchPopularQuotes,
  });
  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["popularQuotes"] }),
    [queryClient]
  );
  return { quotes, loading, refetch };
}

export function usePopularLists() {
  const { data: lists = [], isLoading: loading } = useQuery({
    queryKey: ["popularLists"],
    queryFn: fetchPopularLists,
  });
  return { lists, loading };
}

export function useAvailableGenres() {
  const { data: genres = [], isLoading: loading } = useQuery({
    queryKey: ["availableGenres"],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("genres")
        .not("genres", "eq", "[]")
        .limit(2000);

      if (!data) return [];

      const counts = {};
      for (const row of data) {
        if (!Array.isArray(row.genres)) continue;
        for (const g of row.genres) {
          if (typeof g === "string" && g.trim()) {
            counts[g] = (counts[g] || 0) + 1;
          }
        }
      }

      return Object.entries(counts)
        .filter(([, n]) => n >= 1)
        .sort((a, b) => b[1] - a[1])
        .map(([g]) => g);
    },
  });
  return { genres, loading };
}

export function useBooksByGenre(genre) {
  const { data: books = [], isLoading: loading } = useQuery({
    queryKey: ["booksByGenre", genre],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, authors, cover_url, slug")
        .filter("genres", "cs", `["${genre}"]`)
        .order("rating_count", { ascending: false })
        .limit(20);
      return (data ?? []).map(normalizeBook);
    },
    enabled: !!genre,
  });
  return { books, loading };
}
