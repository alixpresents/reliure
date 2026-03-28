import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(data ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  return { profile, loading, refetch: fetch };
}
