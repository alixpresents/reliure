import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const LS_KEY = "reliure_last_badge_seen";

export function useNewBadges() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const lastSeen = useMemo(
    () => typeof window !== "undefined" ? localStorage.getItem(LS_KEY) || "1970-01-01T00:00:00.000Z" : "1970-01-01T00:00:00.000Z",
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { data: unseen = [] } = useQuery({
    queryKey: ["newBadges", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_badges")
        .select("id, badge_id, awarded_at, badge_definitions(id, name, description, category, icon)")
        .eq("user_id", user.id)
        .gt("awarded_at", lastSeen)
        .is("expires_at", null)
        .order("awarded_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user && !dismissed,
    staleTime: Infinity,
  });

  const badge = dismissed ? null : (unseen[0] ?? null);

  const dismiss = useCallback(() => {
    localStorage.setItem(LS_KEY, new Date().toISOString());
    setDismissed(true);
  }, []);

  return { badge, dismiss };
}
