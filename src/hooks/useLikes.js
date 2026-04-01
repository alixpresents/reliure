import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { safeMutation, unwrapSupabase } from "../lib/safeMutation";

export function useLikes(targetIds, targetType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [likedSet, setLikedSet] = useState(new Set());
  const initialSet = useRef(new Set());
  // Ref mirrors likedSet so that stable `toggle` can read current state without closing over it
  const likedSetRef = useRef(new Set());
  const idsKey = targetIds.join(",");

  const fetch = useCallback(async () => {
    if (!user || !targetIds.length) {
      const empty = new Set();
      likedSetRef.current = empty;
      setLikedSet(empty);
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
    likedSetRef.current = s;
    setLikedSet(s);
  }, [user, idsKey, targetType]);

  useEffect(() => { fetch(); }, [fetch]);

  // Stable toggle — reads current state from ref, doesn't close over likedSet
  const toggle = useCallback((targetId, onError) => {
    if (!user) return;
    const wasLiked = likedSetRef.current.has(targetId);

    const applyToggle = (liked) => {
      setLikedSet(prev => {
        const next = new Set(prev);
        if (liked) next.add(targetId);
        else next.delete(targetId);
        likedSetRef.current = next;
        return next;
      });
    };

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
      onSuccess: () => {
        // Invalidate caches that display like counts
        queryClient.invalidateQueries({ queryKey: ["popularReviews"] });
        queryClient.invalidateQueries({ queryKey: ["popularQuotes"] });
        queryClient.invalidateQueries({ queryKey: ["myReviews"] });
        queryClient.invalidateQueries({ queryKey: ["myQuotes"] });
      },
      onError,
      errorMessage: "toggleLike error",
    });
  }, [user, targetType, queryClient]);

  return { likedSet, initialSet: initialSet.current, toggle };
}
