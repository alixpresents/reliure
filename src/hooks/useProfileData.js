import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const EMPTY = {
  allStatuses: [],
  diaryBooks: [],
  reviews: [],
  reviewMap: new Map(),
  stats: { total: 0, thisYear: 0, pagesThisYear: 0, avgRating: 0, reviewsCount: 0, readNoDate: 0 },
  chronology: Array(12).fill(0),
  topRated: [],
};

async function fetchProfileData(targetId) {
  const currentYear = new Date().getFullYear();
  const _t0 = performance.now();
  const yearStart = new Date(currentYear, 0, 1);
  const yearEnd = new Date(currentYear + 1, 0, 1);

  const [statusesRes, reviewsRes] = await Promise.allSettled([
    supabase
      .from("reading_status")
      .select("id, book_id, status, created_at, finished_at, is_reread, current_page, books(id, title, authors, cover_url, slug, page_count, avg_rating)")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("reviews")
      .select("id, book_id, rating, created_at")
      .eq("user_id", targetId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  if (statusesRes.status === "rejected") console.error("[useProfileData] allStatuses:", statusesRes.reason);
  if (reviewsRes.status === "rejected") console.error("[useProfileData] reviews:", reviewsRes.reason);

  const statuses = statusesRes.status === "fulfilled" ? (statusesRes.value.data || []) : [];
  const revs = reviewsRes.status === "fulfilled" ? (reviewsRes.value.data || []) : [];

  // Derive diaryBooks and allReadBooks from statuses (previously 2 separate queries)
  const diary = statuses.filter(s => s.status === "read" && s.finished_at).sort((a, b) => new Date(b.finished_at) - new Date(a.finished_at));
  const allRead = statuses.filter(s => s.status === "read");

  const total = statuses.length;
  const allReadThisYear = allRead.filter(r => {
    const date = new Date(r.finished_at || r.created_at);
    return date >= yearStart && date < yearEnd;
  });
  const thisYear = allReadThisYear.length;
  const pagesThisYear = allReadThisYear.reduce((sum, r) => sum + (r.books?.page_count || 0), 0);

  const revsThisYear = revs.filter(r => new Date(r.created_at) >= yearStart && new Date(r.created_at) < yearEnd);
  const avgRating = revsThisYear.length > 0
    ? Math.round((revsThisYear.reduce((sum, r) => sum + (r.rating || 0), 0) / revsThisYear.length) * 10) / 10
    : 0;

  const chronology = Array(12).fill(0);
  diary.filter(r => { const d = new Date(r.finished_at); return d >= yearStart && d < yearEnd; }).forEach(r => {
    const month = new Date(r.finished_at).getMonth();
    chronology[month]++;
  });

  const bookRatingMap = new Map();
  revsThisYear.forEach(r => bookRatingMap.set(r.book_id, r.rating));
  const topRated = allReadThisYear
    .filter(r => bookRatingMap.has(r.book_id))
    .sort((a, b) => (bookRatingMap.get(b.book_id) || 0) - (bookRatingMap.get(a.book_id) || 0))
    .slice(0, 5)
    .map(r => ({
      id: r.books?.id,
      t: r.books?.title || "?",
      a: Array.isArray(r.books?.authors) ? r.books.authors.join(", ") : "",
      c: r.books?.cover_url,
      r: bookRatingMap.get(r.book_id) || 0,
      slug: r.books?.slug,
      _supabase: r.books,
    }));

  const reviewMap = new Map();
  revs.forEach(r => reviewMap.set(r.book_id, r.rating));

  console.log('[perf] useProfileData:', Math.round(performance.now() - _t0), 'ms');

  return {
    allStatuses: statuses,
    diaryBooks: diary,
    reviews: revs,
    reviewMap,
    stats: { total, thisYear, pagesThisYear, avgRating, reviewsCount: revsThisYear.length, readNoDate: statuses.filter(s => s.status === "read" && !s.finished_at).length },
    chronology,
    topRated,
  };
}

export function useProfileData(profileUserId) {
  const { user } = useAuth();
  const targetId = profileUserId || user?.id;
  const queryClient = useQueryClient();

  const { data = EMPTY, isLoading: loading } = useQuery({
    queryKey: ["profileData", targetId],
    queryFn: () => fetchProfileData(targetId),
    enabled: !!targetId,
  });

  const refetch = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ["profileData", targetId] }),
    [queryClient, targetId]
  );

  return { ...data, loading, refetch };
}
