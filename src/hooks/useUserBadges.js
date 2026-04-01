import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

/** Set of all user IDs with the 'creator' badge — one lightweight query, cached globally */
export function useCreatorIds() {
  const { data: creatorIds = new Set() } = useQuery({
    queryKey: ["creatorIds"],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("user_id")
        .eq("badge_id", "creator")
        .limit(500);
      return new Set((data ?? []).map(r => r.user_id));
    },
    staleTime: 10 * 60 * 1000,
  });
  return creatorIds;
}

export function useUserBadges(userId) {
  const { data: badges = [], isLoading: loading } = useQuery({
    queryKey: ["userBadgesDetail", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("badge_id, awarded_at, badge_definitions(id, name, icon_key, color)")
        .eq("user_id", userId)
        .order("awarded_at", { ascending: false })
        .limit(50);
      return (data ?? []).map(b => ({
        id: b.badge_definitions?.id ?? b.badge_id,
        name: b.badge_definitions?.name ?? b.badge_id,
        iconKey: b.badge_definitions?.icon_key ?? "",
        color: b.badge_definitions?.color ?? "#C9A96E",
        awardedAt: b.awarded_at,
      }));
    },
    enabled: !!userId,
  });

  const hasCreator = badges.some(b => b.id === "creator");

  return { badges, hasCreator, loading };
}
