import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

async function fetchMonthlyRanking() {
  const { data } = await supabase.rpc("get_monthly_ranking");
  return data ?? [];
}

async function fetchAlltimeRanking() {
  const { data } = await supabase.rpc("get_alltime_ranking");
  return data ?? [];
}

export function useClassement(mode = "monthly", userId) {
  const { data: allRankings = [], isLoading: loading } = useQuery({
    queryKey: ["classement", mode],
    queryFn: mode === "monthly" ? fetchMonthlyRanking : fetchAlltimeRanking,
    staleTime: 5 * 60 * 1000,
  });

  const top20 = allRankings.slice(0, 20);
  const userIndex = userId ? allRankings.findIndex(r => r.user_id === userId) : -1;
  const userRank = userIndex >= 0 ? userIndex + 1 : null;
  const userEntry = userIndex >= 0 ? allRankings[userIndex] : null;

  return { rankings: top20, userRank, userEntry, loading };
}
