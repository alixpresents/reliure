import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export function useUserRole(userId) {
  const { data, isLoading } = useQuery({
    queryKey: ["userRole", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      return data?.role ?? null;
    },
  });

  return { role: data ?? null, loading: isLoading };
}
