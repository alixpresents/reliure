import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useBookLists(bookId) {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) { setLists([]); setLoading(false); return; }

    async function fetch() {
      // Find list_ids of public lists containing this book
      const { data: refs } = await supabase
        .from("list_items")
        .select("list_id")
        .eq("book_id", bookId)
        .limit(12);

      if (!refs?.length) { setLists([]); setLoading(false); return; }

      const listIds = refs.map(r => r.list_id);

      const { data } = await supabase
        .from("lists")
        .select("id, title, description, slug, user_id, likes_count, users(username, display_name), list_items(book_id, position, books(id, cover_url))")
        .in("id", listIds)
        .eq("is_public", true)
        .order("likes_count", { ascending: false })
        .limit(4);

      if (!data) { setLists([]); setLoading(false); return; }

      const processed = data.filter(l => l.slug).map(l => {
        const sorted = [...(l.list_items || [])].sort((a, b) => a.position - b.position);
        const previewCovers = sorted
          .filter(i => i.books?.cover_url)
          .slice(0, 3)
          .map(i => i.books.cover_url);
        return { ...l, bookCount: sorted.length, previewCovers };
      });

      setLists(processed);
      setLoading(false);
    }

    fetch();
  }, [bookId]);

  return { lists, loading };
}
