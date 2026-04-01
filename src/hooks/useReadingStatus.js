import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { logActivity } from "./useActivity";

export function useReadingStatus(bookId) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatusState] = useState(null); // full row or null
  const [loading, setLoading] = useState(true);
  const [alreadyRead, setAlreadyRead] = useState(false);
  const latestRequestRef = useRef(0);

  const fetch = useCallback(async () => {
    if (!user || !bookId) { setStatusState(null); setAlreadyRead(false); setLoading(false); return; }
    const { data } = await supabase
      .from("reading_status")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setStatusState(data ?? null);
    setAlreadyRead(data?.status === "read");
    setLoading(false);
  }, [user, bookId]);

  useEffect(() => { fetch(); }, [fetch]);

  const invalidateCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["profileData"] });
    queryClient.invalidateQueries({ queryKey: ["popularBooks"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
  }, [queryClient]);

  const setStatus = async (newStatus, extras = {}, meta = {}) => {
    if (!user || !bookId) return;

    const requestId = ++latestRequestRef.current;
    const payload = { status: newStatus, ...extras };
    const activityMeta = { status: newStatus, book_id: bookId, ...meta };
    const prevStatus = status;

    try {
      if (status?.id) {
        const unchanged = status.status === newStatus;
        await supabase.from("reading_status").update(payload).eq("id", status.id);
        if (requestId !== latestRequestRef.current) return;
        setStatusState(prev => ({ ...prev, ...payload }));
        if (!unchanged) logActivity(user.id, "reading_status", status.id, "reading_status", activityMeta);
      } else {
        const { data } = await supabase
          .from("reading_status")
          .insert({ user_id: user.id, book_id: bookId, ...payload })
          .select("*")
          .single();
        if (requestId !== latestRequestRef.current) return;
        if (data) {
          setStatusState(data);
          logActivity(user.id, "reading_status", data.id, "reading_status", activityMeta);
        }
      }
      invalidateCaches();
    } catch (err) {
      if (requestId === latestRequestRef.current) {
        setStatusState(prevStatus);
      }
    }
  };

  const removeStatus = async () => {
    if (!user || !status?.id) return;
    await supabase.from("reading_status").delete().eq("id", status.id);
    setStatusState(null);
    invalidateCaches();
  };

  const updatePage = async (page) => {
    if (!status?.id) return;
    await supabase.from("reading_status").update({ current_page: page }).eq("id", status.id);
    setStatusState(prev => ({ ...prev, current_page: page }));
  };

  const updateFields = async (fields) => {
    if (!status?.id) return;
    await supabase.from("reading_status").update(fields).eq("id", status.id);
    setStatusState(prev => ({ ...prev, ...fields }));
    invalidateCaches();
  };

  return { status, loading, alreadyRead, setStatus, removeStatus, updatePage, updateFields, refetch: fetch };
}

export function useUserRating(bookId) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRatingState] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !bookId) { setLoading(false); return; }
    supabase
      .from("reviews")
      .select("rating")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .maybeSingle()
      .then(({ data }) => {
        setRatingState(data?.rating ?? 0);
        setLoading(false);
      });
  }, [user, bookId]);

  const invalidateCaches = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["profileData"] });
    queryClient.invalidateQueries({ queryKey: ["myReviews"] });
  }, [queryClient]);

  const setRating = async (newRating) => {
    if (!user || !bookId) return;
    setRatingState(newRating); // optimistic
    if (newRating === 0) {
      // Remove rating — delete review if no body either
      const { data, error } = await supabase
        .from("reviews")
        .update({ rating: null })
        .eq("user_id", user.id)
        .eq("book_id", bookId)
        .select("id, body")
        .maybeSingle();
      if (data && !data.body) {
        await supabase.from("reviews").delete().eq("id", data.id);
        await supabase.from("activity").delete().eq("target_id", data.id).eq("target_type", "review");
      }
      // Ensure state is 0 even if DB had no row
      setRatingState(0);
    } else {
      await supabase.from("reviews").upsert(
        { user_id: user.id, book_id: bookId, rating: newRating },
        { onConflict: "user_id,book_id" }
      );
    }
    invalidateCaches();
  };

  return { rating, loading, setRating };
}

export function useReadingList(statusFilter, profileUserId) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const queryClient = useQueryClient();

  const { data: books = [], isLoading: loading } = useQuery({
    queryKey: ["readingList", statusFilter, targetId],
    queryFn: async () => {
      const { data } = await supabase
        .from("reading_status")
        .select("*, books(id, title, authors, cover_url, slug, publication_date, page_count, avg_rating)")
        .eq("user_id", targetId)
        .eq("status", statusFilter)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!targetId,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["readingList", statusFilter, targetId] }),
    [queryClient, statusFilter, targetId]
  );

  return { books, loading, refetch };
}
