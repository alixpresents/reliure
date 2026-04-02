import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useReviewReplies(reviewId) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["reviewReplies", reviewId],
    queryFn: async () => {
      if (!reviewId) return [];
      const { data, error } = await supabase.rpc("get_review_replies", {
        p_review_id: reviewId,
      });
      if (error) {
        console.error("[useReviewReplies] get_review_replies error:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!reviewId,
  });

  const invalidateRelated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reviewReplies", reviewId] });
    queryClient.invalidateQueries({ queryKey: ["book"] });
    queryClient.invalidateQueries({ queryKey: ["feed"] });
    queryClient.invalidateQueries({ queryKey: ["popularReviews"] });
    queryClient.invalidateQueries({ queryKey: ["myReviews"] });
  }, [reviewId, queryClient]);

  const submitReply = useCallback(
    async (body) => {
      if (!user?.id || !body.trim()) return;

      const { error } = await supabase
        .from("review_replies")
        .insert({ review_id: reviewId, user_id: user.id, body: body.trim() })
        .select("id, review_id, user_id, body, likes_count, created_at")
        .single();

      if (error) {
        console.error("[useReviewReplies] submitReply error:", error);
        throw error;
      }

      invalidateRelated();
    },
    [user?.id, reviewId, invalidateRelated]
  );

  const deleteReply = useCallback(
    async (replyId) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("review_replies")
        .delete()
        .eq("id", replyId)
        .eq("user_id", user.id);

      if (error) {
        console.error("[useReviewReplies] deleteReply error:", error);
        throw error;
      }

      // Nettoyer l'activité correspondante
      await supabase
        .from("activity")
        .delete()
        .eq("target_id", replyId)
        .eq("action_type", "reply")
        .eq("user_id", user.id);

      invalidateRelated();
    },
    [user?.id, invalidateRelated]
  );

  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["reviewReplies", reviewId] });
  }, [reviewId, queryClient]);

  return {
    replies,
    isLoading,
    replyCount: replies.length,
    submitReply,
    deleteReply,
    refetch,
  };
}
