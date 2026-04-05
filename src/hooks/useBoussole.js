import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useBoussole(filters) {
  const hasAnyFilter =
    (filters.moods?.length > 0) ||
    filters.rythme ||
    filters.registre ||
    filters.protag_age ||
    filters.protag_genre ||
    (filters.intrigues?.length > 0);

  const { data: books = [], isLoading } = useQuery({
    queryKey: [
      "boussole",
      filters.moods,
      filters.rythme,
      filters.registre,
      filters.protag_age,
      filters.protag_genre,
      filters.intrigues,
    ],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("search_boussole", {
        p_moods: filters.moods?.length ? filters.moods : null,
        p_rythme: filters.rythme || null,
        p_registre: filters.registre || null,
        p_protag_age: filters.protag_age || null,
        p_protag_genre: filters.protag_genre || null,
        p_intrigues: filters.intrigues?.length ? filters.intrigues : null,
        p_limit: 30,
        p_offset: 0,
      });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!hasAnyFilter,
    staleTime: 5 * 60 * 1000,
  });

  return { books, isLoading, hasAnyFilter };
}
