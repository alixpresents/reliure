import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "../lib/supabase";

export const CATEGORY_COLORS = {
  reading:      "#4A7C6F",
  contribution: "#8B6914",
  social:       "#5B6ABF",
  challenge:    "#B8860B",
  special:      "#9B5DE5",
};

export const TIER_COLORS = {
  bronze:   "#CD7F32",
  argent:   "#A8A9AD",
  or:       "#D4A843",
  emeraude: "#50C878",
  saphir:   "#5B6ABF",
  diamant:  "#B9C4D4",
};

/**
 * Batch fetch pinned badges for a list of user IDs.
 * Returns a Map<userId, [{icon, name, category, color}]> — max 3 per user.
 * Avoids N+1: one query for all user IDs.
 */
export function usePinnedBadges(userIds) {
  const key = useMemo(() => [...new Set(userIds)].sort().join(","), [userIds]);
  const { data: pinnedMap = new Map() } = useQuery({
    queryKey: ["pinnedBadges", key],
    queryFn: async () => {
      const ids = [...new Set(userIds)];
      if (!ids.length) return new Map();
      const { data } = await supabase
        .from("user_badges")
        .select("user_id, badge_id, badge_definitions(id, icon, icon_key, name, description, category, tier)")
        .eq("is_pinned", true)
        .in("user_id", ids)
        .limit(ids.length * 3);
      const map = new Map();
      for (const row of data ?? []) {
        const bd = row.badge_definitions;
        if (!bd) continue;
        const list = map.get(row.user_id) || [];
        if (list.length < 3) {
          list.push({
            badgeId: bd.id,
            icon: bd.icon,
            iconKey: bd.icon_key,
            name: bd.name,
            description: bd.description,
            category: bd.category,
            tier: bd.tier,
            color: (bd.tier && TIER_COLORS[bd.tier]) || CATEGORY_COLORS[bd.category] || "var(--text-tertiary)",
          });
          map.set(row.user_id, list);
        }
      }
      return map;
    },
    enabled: userIds.length > 0,
    staleTime: 2 * 60 * 1000,
  });
  return pinnedMap;
}

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
