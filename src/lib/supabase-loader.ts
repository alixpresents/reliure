import { createClient } from "@supabase/supabase-js";

// Supabase client for route loaders (build-time prerendering)
// Uses import.meta.env (available in Vite build context)
export function createLoaderClient() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  return createClient(url, key);
}
