import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

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

async function fetchFeed() {
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
  const replyIds  = deduped.filter(i => i.target_type === "reply").map(i => i.target_id);
  const [{ data: existingReviews }, { data: existingQuotes }, { data: existingLists }, { data: existingReplies }] = await Promise.all([
    reviewIds.length ? supabase.from("reviews").select("id, reply_count").in("id", reviewIds).limit(50) : Promise.resolve({ data: [] }),
    quoteIds.length  ? supabase.from("quotes").select("id").in("id", quoteIds).limit(50)                : Promise.resolve({ data: [] }),
    listIds.length   ? supabase.from("lists").select("id").in("id", listIds).limit(50)                  : Promise.resolve({ data: [] }),
    replyIds.length  ? supabase.from("review_replies").select("id").in("id", replyIds).limit(50)        : Promise.resolve({ data: [] }),
  ]);
  const reviewSet = new Set((existingReviews ?? []).map(r => r.id));
  const reviewReplyCountMap = Object.fromEntries((existingReviews ?? []).map(r => [r.id, r.reply_count || 0]));
  const quoteSet  = new Set((existingQuotes  ?? []).map(q => q.id));
  const listSet   = new Set((existingLists   ?? []).map(l => l.id));
  const replySet  = new Set((existingReplies ?? []).map(r => r.id));
  return deduped.filter(it => {
    if (it.target_type === "review") return reviewSet.has(it.target_id);
    if (it.target_type === "quote")  return quoteSet.has(it.target_id);
    if (it.target_type === "list")   return listSet.has(it.target_id);
    if (it.target_type === "reply")  return replySet.has(it.target_id);
    return true; // reading_status — pas de contenu séparé à vérifier
  }).map(it => {
    // Enrichir les reviews avec reply_count frais de la DB
    if (it.target_type === "review" && reviewReplyCountMap[it.target_id] !== undefined) {
      return { ...it, metadata: { ...it.metadata, reply_count: reviewReplyCountMap[it.target_id] } };
    }
    return it;
  });
}

export function useFeed() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: ["feed"],
    queryFn: fetchFeed,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
    [queryClient]
  );

  return { items, loading, refetch };
}
