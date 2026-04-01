import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

function mapFavorite(d) {
  return {
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
  };
}

export function useFavorites(profileUserId) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading: loading } = useQuery({
    queryKey: ["favorites", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("position, book_id, note, books(id, title, authors, cover_url, slug, publication_date, page_count, avg_rating, rating_count)")
        .eq("user_id", targetId)
        .order("position");
      if (error) throw error;
      return (data ?? []).map(mapFavorite);
    },
    enabled: !!targetId,
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["favorites", targetId] }),
    [queryClient, targetId]
  );

  const setFavorite = async (position, bookId) => {
    if (!user) return;
    await supabase
      .from("user_favorites")
      .upsert(
        { user_id: user.id, book_id: bookId, position },
        { onConflict: "user_id,position" }
      );
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
    await invalidate();
    window.dispatchEvent(new Event("reliure:favorite-added"));
  };

  const removeFavorite = async (position) => {
    if (!user) return;
    await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("position", position);
    await invalidate();
  };

  const swapPositions = async (fromPos, toPos) => {
    if (!user || fromPos === toPos) return;
    const fromFav = favorites.find(f => f.position === fromPos);
    const toFav = favorites.find(f => f.position === toPos);
    console.log("[fav-swap] start", { fromPos, toPos, fromFav: fromFav?.bookId, toFav: toFav?.bookId, userId: user.id });
    if (!fromFav) { console.warn("[fav-swap] fromFav not found, aborting"); return; }

    // Optimistic update
    queryClient.setQueryData(["favorites", targetId], prev =>
      (prev ?? []).map(f => {
        if (f.position === fromPos) return { ...f, position: toPos };
        if (f.position === toPos) return { ...f, position: fromPos };
        return f;
      })
    );

    if (toFav) {
      const { error: delErr } = await supabase.from("user_favorites").delete().eq("user_id", user.id).in("position", [fromPos, toPos]);
      if (delErr) console.error("[fav-swap] delete error", delErr);
      const { error: insErr } = await supabase.from("user_favorites").insert([
        { user_id: user.id, book_id: fromFav.bookId, position: toPos, note: fromFav.note || null },
        { user_id: user.id, book_id: toFav.bookId, position: fromPos, note: toFav.note || null },
      ]);
      if (insErr) console.error("[fav-swap] insert error", insErr);
    } else {
      const { error: updErr } = await supabase.from("user_favorites").update({ position: toPos }).eq("user_id", user.id).eq("book_id", fromFav.bookId);
      if (updErr) console.error("[fav-swap] update error", updErr);
    }
    console.log("[fav-swap] done, invalidating");
    await invalidate();
  };

  const updateNote = async (position, note) => {
    if (!user) return;
    const trimmed = note.slice(0, 24) || null;
    await supabase
      .from("user_favorites")
      .update({ note: trimmed })
      .eq("user_id", user.id)
      .eq("position", position);
    // Optimistic local update
    queryClient.setQueryData(["favorites", targetId], prev =>
      (prev ?? []).map(f => f.position === position ? { ...f, note: trimmed || "" } : f)
    );
  };

  return { favorites, loading, setFavorite, removeFavorite, swapPositions, updateNote, refetch: invalidate };
}
