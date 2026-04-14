import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { slugify, generateUniqueSlug } from "../utils/slugify";
import { logActivity } from "./useActivity";

export function useMyLists(profileUserId, { enabled: hookEnabled = true } = {}) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const isOwner = !!user && user.id === targetId;
  const queryClient = useQueryClient();

  const { data: lists = [], isLoading: loading } = useQuery({
    queryKey: ["myLists", targetId],
    queryFn: async () => {
      let query = supabase
        .from("lists")
        .select("id, title, description, is_public, is_ranked, slug, likes_count, created_at, list_items(id, book_id, position, note, books(id, title, authors, cover_url, slug))")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false });
      if (!isOwner) query = query.eq("is_public", true);
      const { data } = await query.limit(30);
      return data ?? [];
    },
    enabled: !!targetId && hookEnabled,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["myLists", targetId] }),
    [queryClient, targetId]
  );

  return { lists, loading, refetch };
}

export function useListBySlug(slugOrId) {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!slugOrId) { setList(null); setLoading(false); return; }
    // Try by slug first
    let { data } = await supabase
      .from("lists")
      .select("*, users(username, display_name), list_items(id, book_id, position, note, books(id, title, authors, cover_url, slug, page_count, avg_rating))")
      .eq("slug", slugOrId)
      .maybeSingle();
    // Fallback by id (UUID format)
    if (!data && slugOrId.includes("-") && slugOrId.length > 30) {
      ({ data } = await supabase
        .from("lists")
        .select("*, users(username, display_name), list_items(id, book_id, position, note, books(id, title, authors, cover_url, slug, page_count, avg_rating))")
        .eq("id", slugOrId)
        .maybeSingle());
    }
    setList(data ?? null);
    setLoading(false);
  }, [slugOrId]);

  useEffect(() => { fetch(); }, [fetch]);

  const addBook = async (bookId) => {
    if (!user || !list) return;
    const maxPos = (list.list_items || []).reduce((m, i) => Math.max(m, i.position), 0);
    const { data, error } = await supabase
      .from("list_items")
      .insert({ list_id: list.id, book_id: bookId, position: maxPos + 1 })
      .select("id, book_id, position, note, books(id, title, authors, cover_url, slug, page_count)")
      .single();
    if (error) return { error };
    if (data) setList(prev => ({ ...prev, list_items: [...(prev.list_items || []), data] }));
    return data;
  };

  const removeBook = async (itemId) => {
    await supabase.from("list_items").delete().eq("id", itemId);
    setList(prev => ({ ...prev, list_items: (prev.list_items || []).filter(i => i.id !== itemId) }));
  };

  const reorderItems = async (fromPos, toPos) => {
    if (!list) return;
    const items = [...(list.list_items || [])].sort((a, b) => a.position - b.position);
    const fromIdx = items.findIndex(i => i.position === fromPos);
    const toIdx = items.findIndex(i => i.position === toPos);
    if (fromIdx < 0 || toIdx < 0) return;

    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);

    const updates = items.map((item, idx) => ({ ...item, position: idx + 1 }));
    setList(prev => ({ ...prev, list_items: updates }));

    for (const item of updates) {
      await supabase.from("list_items").update({ position: item.position }).eq("id", item.id);
    }
  };

  const updateList = async (fields) => {
    if (!list) return;
    await supabase.from("lists").update(fields).eq("id", list.id);
    if (fields.is_public === true && !list.is_public) {
      logActivity(list.user_id, "list", list.id, "list", { list_title: list.title, list_slug: list.slug });
    }
    setList(prev => ({ ...prev, ...fields }));
  };

  const updateItemNote = async (itemId, note) => {
    await supabase.from("list_items").update({ note }).eq("id", itemId);
    setList(prev => ({
      ...prev,
      list_items: (prev.list_items || []).map(i => i.id === itemId ? { ...i, note } : i),
    }));
  };

  return { list, loading, addBook, removeBook, reorderItems, updateList, updateItemNote, refetch: fetch };
}

export async function createList(userId, { title, description = null, isPublic = true, isRanked = false }) {
  const base = slugify(title);
  const slug = await generateUniqueSlug(base, async (candidate) => {
    const { data } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("slug", candidate)
      .maybeSingle();
    return !!data;
  });

  const { data, error } = await supabase
    .from("lists")
    .insert({ user_id: userId, title, description, is_public: isPublic, is_ranked: isRanked, slug })
    .select("*")
    .single();
  if (error) console.error("createList error:", error);
  if (data && isPublic) {
    logActivity(userId, "list", data.id, "list", { list_title: title, list_slug: data.slug });
  }
  return data;
}

export async function deleteList(listId) {
  await supabase.from("activity").delete().eq("target_id", listId).eq("target_type", "list");
  const { error } = await supabase.from("lists").delete().eq("id", listId);
  if (error) console.error("deleteList error:", error);
}
