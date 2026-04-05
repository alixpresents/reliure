import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

function getDismissedKey(uid) { return `reliure_dismissed_recos_${uid}`; }

function readDismissed(uid) {
  if (!uid) return [];
  try { return JSON.parse(localStorage.getItem(getDismissedKey(uid)) || "[]"); } catch { return []; }
}

export function useRecommendations(userId) {
  const queryClient = useQueryClient();
  const [dismissed, setDismissed] = useState(() => readDismissed(userId));

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ["recommendations", userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "book-recommendations",
        { method: "POST" },
      );
      // 204 = not enough books
      if (!data && !error) return { recommendations: [], notEnough: true };
      if (error) throw error;
      // data may come back as a string from the invoke wrapper
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      return parsed;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const generateRecommendations = useCallback(() => {
    if (userId) localStorage.removeItem(getDismissedKey(userId));
    setDismissed([]);
    queryClient.invalidateQueries({ queryKey: ["recommendations", userId] });
  }, [queryClient, userId]);

  const dismissRecommendation = useCallback((bookId) => {
    setDismissed(prev => {
      const next = [...prev, bookId];
      if (userId) localStorage.setItem(getDismissedKey(userId), JSON.stringify(next));
      return next;
    });
  }, [userId]);

  const recommendations = (data?.recommendations ?? []).filter(
    r => !dismissed.includes(r.book_id),
  );

  return {
    recommendations,
    notEnough: data?.notEnough ?? false,
    rateLimited: data?.rate_limited ?? false,
    isLoading,
    isFetching,
    isError,
    generateRecommendations,
    dismissRecommendation,
  };
}
