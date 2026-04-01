import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export async function logActivity(userId, actionType, targetId, targetType, metadata = {}) {
  if (!userId) return;
  await supabase.from("activity").insert({
    user_id: userId,
    action_type: actionType,
    target_id: targetId,
    target_type: targetType,
    metadata,
  });
}

export function useFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // For now: all recent activity from all users
    // Later: filter by followed users
    const { data } = await supabase
      .from("activity")
      .select("*, users(username, display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(20);
    // Deduplicate: keep only the most recent activity per user + book
    const seen = new Set();
    const deduped = (data ?? []).filter(it => {
      const key = `${it.user_id}:${it.metadata?.book_id || it.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Filet de sécurité : vérifier que le contenu référencé existe encore
    const reviewIds = deduped.filter(i => i.target_type === "review").map(i => i.target_id);
    const quoteIds  = deduped.filter(i => i.target_type === "quote").map(i => i.target_id);
    const listIds   = deduped.filter(i => i.target_type === "list").map(i => i.target_id);
    const [{ data: existingReviews }, { data: existingQuotes }, { data: existingLists }] = await Promise.all([
      reviewIds.length ? supabase.from("reviews").select("id").in("id", reviewIds).limit(50) : Promise.resolve({ data: [] }),
      quoteIds.length  ? supabase.from("quotes").select("id").in("id", quoteIds).limit(50)   : Promise.resolve({ data: [] }),
      listIds.length   ? supabase.from("lists").select("id").in("id", listIds).limit(50)     : Promise.resolve({ data: [] }),
    ]);
    const reviewSet = new Set((existingReviews ?? []).map(r => r.id));
    const quoteSet  = new Set((existingQuotes  ?? []).map(q => q.id));
    const listSet   = new Set((existingLists   ?? []).map(l => l.id));
    const filtered = deduped.filter(it => {
      if (it.target_type === "review") return reviewSet.has(it.target_id);
      if (it.target_type === "quote")  return quoteSet.has(it.target_id);
      if (it.target_type === "list")   return listSet.has(it.target_id);
      return true; // reading_status — pas de contenu séparé à vérifier
    });

    setItems(filtered);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
}
