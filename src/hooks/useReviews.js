import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useBookReviews(bookId) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!bookId) { setReviews([]); setLoading(false); return; }
    const { data } = await supabase
      .from("reviews")
      .select("*, users(username, display_name)")
      .eq("book_id", bookId)
      .not("body", "is", null)
      .order("created_at", { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  }, [bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { reviews, loading, refetch: fetch };
}

export function useMyReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setReviews([]); setLoading(false); return; }
    const { data } = await supabase
      .from("reviews")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .not("body", "is", null)
      .order("created_at", { ascending: false });
    setReviews(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { reviews, loading, refetch: fetch };
}
