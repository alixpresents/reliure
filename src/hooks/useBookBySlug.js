import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function mapBook(data) {
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchBook(slug) {
  const _t0 = performance.now();
  let data;
  if (UUID_RE.test(slug)) {
    const res = await supabase.from("books").select("*").eq("id", slug).single();
    data = res.data;
  } else {
    const res = await supabase.from("books").select("*").eq("slug", slug).single();
    data = res.data;
    if (!data) {
      const res2 = await supabase.from("books").select("*").eq("id", slug).single();
      data = res2.data;
    }
  }
  console.log('[perf] useBookBySlug:', Math.round(performance.now() - _t0), 'ms');
  if (!data) throw new Error("not_found");
  return mapBook(data);
}

export function useBookBySlug(slug) {
  const { data: book = null, isLoading: loading, isError: notFound } = useQuery({
    queryKey: ["book", slug],
    queryFn: () => fetchBook(slug),
    enabled: !!slug,
  });

  return { book, loading, notFound };
}
