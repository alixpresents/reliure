import { useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const channelRef = useRef(null);

  // ─── Notifications list (30 most recent) ──────────────
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_notifications", {
        p_limit: 30,
        p_offset: 0,
      });
      if (error) {
        console.error("[useNotifications] get_notifications error:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 1 * 60 * 1000,
    enabled: !!userId,
  });

  // ─── Unread count ─────────────────────────────────────
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadCount"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (error) {
        console.error("[useNotifications] get_unread_notification_count error:", error);
        return 0;
      }
      return data ?? 0;
    },
    staleTime: 30 * 1000,
    enabled: !!userId,
  });

  // ─── Realtime subscription ────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, queryClient]);

  // ─── Mark as read (all or specific IDs) ───────────────
  const markAsRead = useCallback(
    async (ids) => {
      if (!userId) return;
      const p_ids = ids || null;

      // Optimistic update
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => {
          if (p_ids === null || p_ids.includes(n.id)) {
            return { ...n, is_read: true };
          }
          return n;
        });
      });
      queryClient.setQueryData(["unreadCount"], (old) => {
        if (p_ids === null) return 0;
        return Math.max(0, (old ?? 0) - p_ids.length);
      });

      const { error } = await supabase.rpc("mark_notifications_read", { p_ids });
      if (error) {
        console.error("[useNotifications] mark_notifications_read error:", error);
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
    [userId, queryClient]
  );

  // ─── Mark one as read (click handler) ─────────────────
  const markOneAsRead = useCallback(
    async (id) => {
      if (!userId || !id) return;

      // Optimistic: update the single notification
      queryClient.setQueryData(["notifications"], (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === id ? { ...n, is_read: true } : n));
      });
      queryClient.setQueryData(["unreadCount"], (old) => Math.max(0, (old ?? 0) - 1));

      const { error } = await supabase.rpc("mark_notifications_read", { p_ids: [id] });
      if (error) {
        console.error("[useNotifications] markOneAsRead error:", error);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }
      queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
    },
    [userId, queryClient]
  );

  // ─── Manual refetch ───────────────────────────────────
  const refetch = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
  }, [queryClient]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markOneAsRead,
    refetch,
  };
}
