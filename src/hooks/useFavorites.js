import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setFavorites([]); setLoading(false); return; }
    const { data } = await supabase
      .from("user_favorites")
      .select("position, book_id, note, books(*)")
      .eq("user_id", user.id)
      .order("position");
    setFavorites(
      (data ?? []).map(d => ({
        position: d.position,
        bookId: d.book_id,
        note: d.note || "",
        book: d.books ? {
          id: d.books.id,
          t: d.books.title,
          a: Array.isArray(d.books.authors) ? d.books.authors.join(", ") : (d.books.authors || ""),
          c: d.books.cover_url,
          y: d.books.publication_date ? parseInt(d.books.publication_date) : null,
          p: d.books.page_count || 0,
          r: d.books.avg_rating || 0,
          rt: d.books.rating_count || 0,
          slug: d.books.slug,
          _supabase: d.books,
        } : null,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const setFavorite = async (position, bookId) => {
    if (!user) return;
    await supabase
      .from("user_favorites")
      .upsert(
        { user_id: user.id, book_id: bookId, position },
        { onConflict: "user_id,position" }
      );
    // Ensure reading_status exists
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

  const swapPositions = async (fromPos, toPos) => {
    if (!user || fromPos === toPos) return;
    const fromFav = favorites.find(f => f.position === fromPos);
    const toFav = favorites.find(f => f.position === toPos);
    if (!fromFav) return;

    // Optimistic update
    setFavorites(prev => prev.map(f => {
      if (f.position === fromPos) return { ...f, position: toPos };
      if (f.position === toPos) return { ...f, position: fromPos };
      return f;
    }));

    if (toFav) {
      // Delete both, then re-insert with swapped positions (avoids unique constraint)
      await supabase.from("user_favorites").delete().eq("user_id", user.id).in("position", [fromPos, toPos]);
      await supabase.from("user_favorites").insert([
        { user_id: user.id, book_id: fromFav.bookId, position: toPos, note: fromFav.note || null },
        { user_id: user.id, book_id: toFav.bookId, position: fromPos, note: toFav.note || null },
      ]);
    } else {
      // Move to empty slot
      await supabase.from("user_favorites").update({ position: toPos }).eq("user_id", user.id).eq("book_id", fromFav.bookId);
    }
    await fetch();
  };

  const updateNote = async (position, note) => {
    if (!user) return;
    const trimmed = note.slice(0, 24) || null;
    await supabase
      .from("user_favorites")
      .update({ note: trimmed })
      .eq("user_id", user.id)
      .eq("position", position);
    setFavorites(prev => prev.map(f => f.position === position ? { ...f, note: trimmed || "" } : f));
  };

  return { favorites, loading, setFavorite, removeFavorite, swapPositions, updateNote, refetch: fetch };
}
