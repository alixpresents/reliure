import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useBookQuotes(bookId) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!bookId) { setQuotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("quotes")
      .select("id, text, likes_count, created_at, user_id, users!quotes_user_id_fkey(username, display_name)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(50);
    setQuotes(data ?? []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading, refetch: fetch };
}

export function useMyQuotes(profileUserId, { enabled: hookEnabled = true } = {}) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: quotes = [], isLoading: loading } = useQuery({
    queryKey: ["myQuotes", targetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, text, likes_count, created_at, book_id, books!quotes_book_id_fkey(id, title, authors, cover_url, slug)")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!targetId && hookEnabled,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["myQuotes", targetId] }),
    [queryClient, targetId]
  );

  return { quotes, loading, refetch };
}

export function useCommunityQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*, users!quotes_user_id_fkey(username, display_name), books!quotes_book_id_fkey(title, authors, cover_url, slug)")
      .order("likes_count", { ascending: false })
      .limit(20);
    setQuotes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading, refetch: fetch };
}
