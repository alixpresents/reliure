import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useBookReviews(bookId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!bookId) { setReviews([]); setLoading(false); return; }
    const { data } = await supabase
      .from("reviews")
      .select("id, user_id, rating, body, contains_spoilers, likes_count, reply_count, created_at, users:user_id(username, display_name, avatar_url)")
      .eq("book_id", bookId)
      .not("body", "is", null)
      .order("created_at", { ascending: false })
      .limit(50);
    setReviews(data ?? []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { reviews, loading, refetch: fetch };
}

export function useMyReviews(profileUserId, { enabled: hookEnabled = true } = {}) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading: loading } = useQuery({
    queryKey: ["myReviews", targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, body, contains_spoilers, likes_count, created_at, book_id, books:book_id(id, title, authors, cover_url, slug)")
        .eq("user_id", targetId)
        .not("body", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
    enabled: !!targetId && hookEnabled,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["myReviews", targetId] }),
    [queryClient, targetId]
  );

  return { reviews, loading, refetch };
}
