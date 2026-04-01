import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

function mapBook(data) {
  return {
    id: data.id,
    t: data.title,
    a: Array.isArray(data.authors) ? data.authors.join(", ") : (data.authors || ""),
    c: data.cover_url,
    y: data.publication_date ? parseInt(data.publication_date) : null,
    p: data.page_count || 0,
    r: data.avg_rating || 0,
    rt: data.rating_count || 0,
    tags: Array.isArray(data.genres) ? data.genres : [],
    desc: data.description,
    slug: data.slug,
    _supabase: data,
  };
}

export function useBookBySlug(slug) {
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchBook = useCallback(async () => {
    if (!slug) { setLoading(false); setNotFound(true); return; }
    // Try slug first, then fallback to ID
    let { data, error } = await supabase.from("books").select("*").eq("slug", slug).single();
    if (error || !data) {
      const res = await supabase.from("books").select("*").eq("id", slug).single();
      data = res.data;
    }
    if (data) {
      setBook(mapBook(data));
    } else {
      setNotFound(true);
    }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchBook(); }, [fetchBook]);

  return { book, loading, notFound, refetch: fetchBook };
}
