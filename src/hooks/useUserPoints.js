import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export const LEVEL_NAMES = {
  1: "Curieux",
  2: "Lecteur",
  3: "Bibliophile",
  4: "Passeur",
  5: "Plume",
  6: "Critique",
  7: "Érudit",
  8: "Lettré",
  9: "Encyclopédiste",
  10: "Immortel",
};

async function fetchUserPoints(userId) {
  const { data } = await supabase
    .from("user_points")
    .select("total_points, monthly_points, level")
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? { total_points: 0, monthly_points: 0, level: 1 };
}

async function fetchUserBadges(userId) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("user_badges")
    .select("id, badge_id, awarded_at, expires_at, is_pinned, badge_definitions(id, name, description, category, icon, points, sort_order)")
    .eq("user_id", userId)
    .order("awarded_at", { ascending: false })
    .limit(100);
  return (data ?? []).map(b => ({
    ...b,
    expired: b.expires_at ? b.expires_at < now : false,
  }));
}

export function useUserPoints(userId) {
  const { data: points = { total_points: 0, level: 1 }, isLoading: loadingPoints } = useQuery({
    queryKey: ["userPoints", userId],
    queryFn: () => fetchUserPoints(userId),
    enabled: !!userId,
  });

  const { data: badges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ["userBadges", userId],
    queryFn: () => fetchUserBadges(userId),
    enabled: !!userId,
  });

  const levelName = LEVEL_NAMES[points.level] ?? LEVEL_NAMES[1];
  const pinnedBadges = badges.filter(b => b.is_pinned && !b.expired).slice(0, 5);

  return {
    totalPoints: points.total_points,
    monthlyPoints: points.monthly_points,
    level: points.level,
    levelName,
    badges,
    pinnedBadges,
    loading: loadingPoints || loadingBadges,
  };
}

export function useTopContributors() {
  const { data: ids = new Set() } = useQuery({
    queryKey: ["topContributors"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("user_badges")
        .select("user_id")
        .eq("badge_id", "top_contributor")
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(200);
      return new Set((data ?? []).map(r => r.user_id));
    },
    staleTime: 10 * 60 * 1000,
  });
  return ids;
}

export function useAllBadgeDefinitions() {
  const { data: definitions = [], isLoading: loading } = useQuery({
    queryKey: ["badgeDefinitions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("badge_definitions")
        .select("id, name, description, category, icon, points, sort_order, tier, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(200);
      return data ?? [];
    },
  });
  return { definitions, loading };
}
