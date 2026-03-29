import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useBookQuotes(bookId) {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!bookId) { setQuotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("quotes")
      .select("*, users(username, display_name)")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });
    setQuotes(data ?? []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading, refetch: fetch };
}

export function useMyQuotes(profileUserId) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;

  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!targetId) { setQuotes([]); setLoading(false); return; }
    const { data } = await supabase
      .from("quotes")
      .select("*, books(title, authors, cover_url, slug)")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false });
    setQuotes(data ?? []);
    setLoading(false);
  }, [targetId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading, refetch: fetch };
}

export function useCommunityQuotes() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("quotes")
      .select("*, users(username, display_name), books(title, authors, cover_url)")
      .order("likes_count", { ascending: false })
      .limit(20);
    setQuotes(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { quotes, loading };
}
