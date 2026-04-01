import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useProfileData(profileUserId) {
  const { user } = useAuth();
  // Use the provided profileUserId for reading; fall back to logged-in user
  const targetId = profileUserId || user?.id;

  const [data, setData] = useState({
    allStatuses: [],
    diaryBooks: [],
    allReadBooks: [],
    reviews: [],
    reviewMap: new Map(),
    stats: { total: 0, thisYear: 0, pagesThisYear: 0, avgRating: 0, reviewsCount: 0, readNoDate: 0 },
    chronology: Array(12).fill(0),
    topRated: [],
  });
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();

  const fetch = useCallback(async () => {
    if (!targetId) { setLoading(false); return; }
    const _t0 = performance.now();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear + 1, 0, 1);

    const [statusesRes, diaryRes, readRes, reviewsRes] = await Promise.allSettled([
      // All statuses with books (for library view — all statuses)
      supabase
        .from("reading_status")
        .select("*, books(id, title, authors, cover_url, slug, publication_date, page_count, avg_rating)")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false })
        .limit(500),
      // Diary: read books WITH date only (for journal/diary calendar)
      supabase
        .from("reading_status")
        .select("*, books(id, title, authors, cover_url, slug, publication_date, page_count, avg_rating)")
        .eq("user_id", targetId)
        .eq("status", "read")
        .not("finished_at", "is", null)
        .order("finished_at", { ascending: false })
        .limit(500),
      // All read books: with OR without date (for stats, bilan, topRated)
      supabase
        .from("reading_status")
        .select("*, books(id, title, authors, cover_url, slug, publication_date, page_count, avg_rating)")
        .eq("user_id", targetId)
        .eq("status", "read")
        .order("created_at", { ascending: false })
        .limit(500),
      // All user reviews
      supabase
        .from("reviews")
        .select("id, book_id, rating, created_at")
        .eq("user_id", targetId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (statusesRes.status === "rejected") console.error("[useProfileData] allStatuses:", statusesRes.reason);
    if (diaryRes.status === "rejected") console.error("[useProfileData] diaryBooks:", diaryRes.reason);
    if (readRes.status === "rejected") console.error("[useProfileData] allReadBooks:", readRes.reason);
    if (reviewsRes.status === "rejected") console.error("[useProfileData] reviews:", reviewsRes.reason);

    const statuses = statusesRes.status === "fulfilled" ? (statusesRes.value.data || []) : [];
    const diary = diaryRes.status === "fulfilled" ? (diaryRes.value.data || []) : [];
    const allRead = readRes.status === "fulfilled" ? (readRes.value.data || []) : [];
    const revs = reviewsRes.status === "fulfilled" ? (reviewsRes.value.data || []) : [];

    // Stats: count ALL read books, not just those with dates
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

    // Chronology: books read per month this year (diary entries only — need date)
    const chronology = Array(12).fill(0);
    diary.filter(r => { const d = new Date(r.finished_at); return d >= yearStart && d < yearEnd; }).forEach(r => {
      const month = new Date(r.finished_at).getMonth();
      chronology[month]++;
    });

    // Top rated this year: all read books (with or without date)
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

    // Review ratings keyed by book_id for library view
    const reviewMap = new Map();
    revs.forEach(r => reviewMap.set(r.book_id, r.rating));

    setData({
      allStatuses: statuses,
      diaryBooks: diary,
      allReadBooks: allRead,
      reviews: revs,
      reviewMap,
      stats: { total, thisYear, pagesThisYear, avgRating, reviewsCount: revsThisYear.length, readNoDate: statuses.filter(s => s.status === "read" && !s.finished_at).length },
      chronology,
      topRated,
    });
    console.log('[perf] useProfileData:', Math.round(performance.now() - _t0), 'ms');
    setLoading(false);
  }, [targetId, currentYear]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, refetch: fetch };
}
