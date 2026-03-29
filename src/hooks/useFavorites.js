import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]); // [{ position, book }]
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setFavorites([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_favorites")
      .select("position, book_id, books(*)")
      .eq("user_id", user.id)
      .order("position");
    setFavorites(
      (data ?? []).map(d => ({
        position: d.position,
        book: d.books ? {
          id: d.books.id,
          t: d.books.title,
          a: Array.isArray(d.books.authors) ? d.books.authors.join(", ") : (d.books.authors || ""),
          c: d.books.cover_url,
          y: d.books.publication_date ? parseInt(d.books.publication_date) : null,
          p: d.books.page_count || 0,
          r: d.books.avg_rating || 0,
          rt: d.books.rating_count || 0,
        } : null,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFavorite = async (position, bookId) => {
    if (!user) return;

    // Upsert favorite
    await supabase
      .from("user_favorites")
      .upsert(
        { user_id: user.id, book_id: bookId, position },
        { onConflict: "user_id,position" }
      );

    // Ensure reading_status exists (read, no date = library only)
    const { data: existing } = await supabase
      .from("reading_status")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("reading_status")
        .insert({ user_id: user.id, book_id: bookId, status: "read" });
    }

    await fetch();
  };

  const removeFavorite = async (position) => {
    if (!user) return;
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("position", position);
    await fetch();
  };

  return { favorites, loading, setFavorite, removeFavorite, refetch: fetch };
}
