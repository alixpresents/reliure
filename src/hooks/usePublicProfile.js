import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function usePublicProfile(username) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username) { setLoading(false); setNotFound(true); return; }
    (async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();
      if (error || !data) {
        setNotFound(true);
      } else {
        setProfile(data);
      }
      setLoading(false);
    })();
  }, [username]);

  return { profile, loading, notFound };
}
