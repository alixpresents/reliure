import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export async function logActivity(userId, actionType, targetId, targetType, metadata = {}) {
  if (!userId) return;
  await supabase.from("activity").insert({
    user_id: userId,
    action_type: actionType,
    target_id: targetId,
    target_type: targetType,
    metadata,
  });
}

export function useFeed() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    // For now: all recent activity from all users
    // Later: filter by followed users
    const { data } = await supabase
      .from("activity")
      .select("*, users(username, display_name)")
      .order("created_at", { ascending: false })
      .limit(20);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { items, loading, refetch: fetch };
}
