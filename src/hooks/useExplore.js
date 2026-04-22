import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

function normalizeBook(b) {
  return {
    id: b.id,
    t: b.title,
    a: Array.isArray(b.authors) ? b.authors.join(", ") : (b.authors || ""),
    c: b.cover_url,
    y: b.publication_date || null,
    p: b.page_count || 0,
    r: b.avg_rating || 0,
    rt: b.rating_count || 0,
    tags: Array.isArray(b.genres) ? b.genres : [],
    desc: b.description,
    slug: b.slug,
    _supabase: b,
  };
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

export function useBabelioPopular() {
  const { data: books = [], isLoading: loading } = useQuery({
    queryKey: ["babelioPopular"],
    queryFn: async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, authors, cover_url, slug, publication_date, avg_rating, rating_count, page_count, babelio_popular_year")
        .not("babelio_popular_year", "is", null)
        .order("avg_rating", { ascending: false })
        .limit(10);
      return (data ?? []).map(normalizeBook);
    },
    staleTime: 30 * 60 * 1000,
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
