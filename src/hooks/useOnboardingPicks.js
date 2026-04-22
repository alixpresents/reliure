import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { mapBook } from "./useBookBySlug";

export function useOnboardingPicks() {
  return useQuery({
    queryKey: ["onboardingPicks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_picks")
        .select("position, category, book:books(id, title, authors, cover_url, publication_date, page_count, avg_rating, rating_count, genres, description, slug)")
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || [])
        .filter(r => r.book)
        .map(r => ({ ...mapBook(r.book), _category: r.category }));
    },
    staleTime: 10 * 60 * 1000,
  });
}
