import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useFollow(targetUserId) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !targetUserId || user.id === targetUserId) { setLoading(false); return; }
    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", targetUserId)
      .single()
      .then(({ data }) => {
        setFollowing(!!data);
        setLoading(false);
      });
  }, [user, targetUserId]);

  const follow = async () => {
    if (!user || !targetUserId) return;
    setFollowing(true);
    await supabase.from("follows").insert({ follower_id: user.id, following_id: targetUserId });
  };

  const unfollow = async () => {
    if (!user || !targetUserId) return;
    setFollowing(false);
    await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetUserId);
  };

  return { following, loading, follow, unfollow };
}

export function useFollowCounts(userId) {
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const [{ count: followers }, { count: following }] = await Promise.all([
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
      supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    setCounts({ followers: followers || 0, following: following || 0 });
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { ...counts, loading, refetch: fetch };
}
