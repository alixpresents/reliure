import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useUserRole(userId) {
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setRole(null); setLoading(false); return; }

    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setRole(data?.role ?? null);
        setLoading(false);
      });
  }, [userId]);

  return { role, loading };
}
