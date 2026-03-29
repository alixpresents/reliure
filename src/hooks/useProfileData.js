import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useProfileData() {
  const { user } = useAuth();
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
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // All statuses with books (for library view — all statuses)
    const { data: allStatuses } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Diary: read books WITH date only (for journal/diary calendar)
    const { data: diaryBooks } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .eq("status", "read")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });

    // All read books: with OR without date (for stats, bilan, topRated)
    const { data: allReadBooks } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .eq("status", "read")
      .order("created_at", { ascending: false });

    // All user reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user.id);

    const statuses = allStatuses || [];
    const diary = diaryBooks || [];
    const allRead = allReadBooks || [];
    const revs = reviews || [];

    // Stats: count ALL read books, not just those with dates
    const total = statuses.length;
    const allReadThisYear = allRead.filter(r => {
      // Use finished_at if available, otherwise created_at
      const date = r.finished_at || r.created_at;
      return date >= yearStart && date <= yearEnd + "T23:59:59";
    });
    const thisYear = allReadThisYear.length;
    const pagesThisYear = allReadThisYear.reduce((sum, r) => sum + (r.books?.page_count || 0), 0);

    const revsThisYear = revs.filter(r => r.created_at >= yearStart);
    const avgRating = revsThisYear.length > 0
      ? Math.round((revsThisYear.reduce((sum, r) => sum + (r.rating || 0), 0) / revsThisYear.length) * 10) / 10
      : 0;

    // Chronology: books read per month this year (diary entries only — need date)
    const chronology = Array(12).fill(0);
    diary.filter(r => r.finished_at >= yearStart && r.finished_at <= yearEnd + "T23:59:59").forEach(r => {
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
    setLoading(false);
  }, [user, yearStart, yearEnd]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...data, loading, refetch: fetch };
}
