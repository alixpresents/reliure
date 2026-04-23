import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useCuratedSelections() {
  return useQuery({
    queryKey: ["curatedSelections"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("curated_selections");
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
    // Le SSG seede le cache au build ; sans refetchOnMount, une nouvelle
    // sélection n'apparaît qu'après redeploy. On refetch en background.
    refetchOnMount: "always",
  });
}

export function useCuratedSelection(slug) {
  return useQuery({
    queryKey: ["curatedSelection", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("curated_selection_by_slug", {
        p_slug: slug,
      });
      if (error) throw error;
      if (!data || data.length === 0) return null;
      return data[0];
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}
