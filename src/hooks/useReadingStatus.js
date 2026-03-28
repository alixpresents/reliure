import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { logActivity } from "./useActivity";

export function useReadingStatus(bookId) {
  const { user } = useAuth();
  const [status, setStatusState] = useState(null); // full row or null
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !bookId) { setStatusState(null); setLoading(false); return; }
    const { data } = await supabase
      .from("reading_status")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .eq("is_reread", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    setStatusState(data ?? null);
    setLoading(false);
  }, [user, bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  const setStatus = async (newStatus, extras = {}) => {
    if (!user || !bookId) return;

    const payload = { status: newStatus, ...extras };

    if (status?.id) {
      await supabase.from("reading_status").update(payload).eq("id", status.id);
      setStatusState(prev => ({ ...prev, ...payload }));
      logActivity(user.id, "reading_status", status.id, "reading_status", { status: newStatus, book_id: bookId, ...extras });
    } else {
      const { data } = await supabase
        .from("reading_status")
        .insert({ user_id: user.id, book_id: bookId, ...payload })
        .select("*")
        .single();
      if (data) {
        setStatusState(data);
        logActivity(user.id, "reading_status", data.id, "reading_status", { status: newStatus, book_id: bookId, ...extras });
      }
    }
  };

  const removeStatus = async () => {
    if (!user || !status?.id) return;
    await supabase.from("reading_status").delete().eq("id", status.id);
    setStatusState(null);
  };

  const updatePage = async (page) => {
    if (!status?.id) return;
    await supabase.from("reading_status").update({ current_page: page }).eq("id", status.id);
    setStatusState(prev => ({ ...prev, current_page: page }));
  };

  return { status, loading, setStatus, removeStatus, updatePage, refetch: fetch };
}

export function useUserRating(bookId) {
  const { user } = useAuth();
  const [rating, setRatingState] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookId) { setLoading(false); return; }
    supabase
      .from("reviews")
      .select("rating")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single()
      .then(({ data }) => {
        setRatingState(data?.rating ?? 0);
        setLoading(false);
      });
  }, [user, bookId]);

  const setRating = async (newRating) => {
    if (!user || !bookId) return;
    setRatingState(newRating); // optimistic
    await supabase.from("reviews").upsert(
      { user_id: user.id, book_id: bookId, rating: newRating },
      { onConflict: "user_id,book_id" }
    );
  };

  return { rating, loading: loading, setRating };
}

export function useReadingList(statusFilter) {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setBooks([]); setLoading(false); return; }
    const { data } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .eq("status", statusFilter)
      .order("created_at", { ascending: false });
    setBooks(data ?? []);
    setLoading(false);
  }, [user, statusFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  return { books, loading, refetch: fetch };
}
