import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialised = false;
    let wasLoggedIn = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      wasLoggedIn = !!session;
      setUser(session?.user ?? null);
      setLoading(false);
      initialised = true;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const prevLoggedIn = wasLoggedIn;
      wasLoggedIn = !!session;
      setUser(session?.user ?? null);
      // Only redirect on a genuine login (transition from logged-out to logged-in).
      // Ignore SIGNED_IN fired by token refreshes (tab focus, silent re-auth).
      if (event === "SIGNED_IN" && session && initialised && !prevLoggedIn) {
        window.dispatchEvent(new Event("reliure:signed-in"));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
