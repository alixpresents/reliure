import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { safeMutation, unwrapSupabase } from "../lib/safeMutation";

export function useLikes(targetIds, targetType) {
  const { user } = useAuth();
  const [likedSet, setLikedSet] = useState(new Set());
  const initialSet = useRef(new Set());
  const idsKey = targetIds.join(",");

  const fetch = useCallback(async () => {
    if (!user || !targetIds.length) {
      setLikedSet(new Set());
      initialSet.current = new Set();
      return;
    }
    const { data } = await supabase
      .from("likes")
      .select("target_id")
      .eq("user_id", user.id)
      .eq("target_type", targetType)
      .in("target_id", targetIds);
    const s = new Set((data ?? []).map(d => d.target_id));
    initialSet.current = new Set(s);
    setLikedSet(s);
  }, [user, idsKey, targetType]);

  useEffect(() => { fetch(); }, [fetch]);

  const toggle = (targetId, onError) => {
    if (!user) return;
    const wasLiked = likedSet.has(targetId);

    const applyToggle = (liked) => setLikedSet(prev => {
      const next = new Set(prev);
      if (liked) next.add(targetId);
      else next.delete(targetId);
      return next;
    });

    return safeMutation({
      onOptimistic: () => applyToggle(!wasLiked),
      mutate: () => {
        if (wasLiked) {
          return unwrapSupabase(
            supabase.from("likes").delete()
              .eq("user_id", user.id).eq("target_id", targetId).eq("target_type", targetType),
            "unlike"
          );
        }
        return unwrapSupabase(
          supabase.from("likes").insert({ user_id: user.id, target_id: targetId, target_type: targetType }),
          "like"
        );
      },
      onRevert: () => applyToggle(wasLiked),
      onError,
      errorMessage: "toggleLike error",
    });
  };

  return { likedSet, initialSet: initialSet.current, toggle };
}
