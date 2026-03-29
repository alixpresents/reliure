import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useProfileData() {
  const { user } = useAuth();
  const [data, setData] = useState({
    allStatuses: [],
    readBooks: [],
    reviews: [],
    stats: { total: 0, thisYear: 0, pagesThisYear: 0, avgRating: 0, reviewsCount: 0 },
    chronology: Array(12).fill(0),
    topRated: [],
  });
  const [loading, setLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;
  const yearEnd = `${currentYear}-12-31`;

  const fetch = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // All statuses with books
    const { data: allStatuses } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Read books with finished_at (for diary)
    const { data: readBooks } = await supabase
      .from("reading_status")
      .select("*, books(*)")
      .eq("user_id", user.id)
      .eq("status", "read")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false });

    // All user reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user.id);

    const statuses = allStatuses || [];
    const reads = readBooks || [];
    const revs = reviews || [];

    // Stats
    const total = statuses.length;
    const readsThisYear = reads.filter(r => r.finished_at >= yearStart && r.finished_at <= yearEnd + "T23:59:59");
    const thisYear = readsThisYear.length;
    const pagesThisYear = readsThisYear.reduce((sum, r) => sum + (r.books?.page_count || 0), 0);

    const revsThisYear = revs.filter(r => r.created_at >= yearStart);
    const avgRating = revsThisYear.length > 0
      ? Math.round((revsThisYear.reduce((sum, r) => sum + r.rating, 0) / revsThisYear.length) * 10) / 10
      : 0;

    // Chronology: books read per month this year
    const chronology = Array(12).fill(0);
    readsThisYear.forEach(r => {
      const month = new Date(r.finished_at).getMonth();
      chronology[month]++;
    });

    // Top rated this year
    const bookRatingMap = new Map();
    revsThisYear.forEach(r => bookRatingMap.set(r.book_id, r.rating));
    const topRated = readsThisYear
      .filter(r => bookRatingMap.has(r.book_id))
      .sort((a, b) => (bookRatingMap.get(b.book_id) || 0) - (bookRatingMap.get(a.book_id) || 0))
      .slice(0, 5)
      .map(r => ({
        id: r.books?.id,
        t: r.books?.title || "?",
        a: Array.isArray(r.books?.authors) ? r.books.authors.join(", ") : "",
        c: r.books?.cover_url,
        r: bookRatingMap.get(r.book_id) || 0,
      }));

    // Review ratings keyed by book_id for library view
    const reviewMap = new Map();
    revs.forEach(r => reviewMap.set(r.book_id, r.rating));

    setData({
      allStatuses: statuses,
      readBooks: reads,
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
