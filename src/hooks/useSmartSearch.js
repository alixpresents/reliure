import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

// Mots-clés qui signalent une requête en langage naturel
const NL_SIGNALS = [
  "roman", "livre", "histoire", "auteur", "qui parle",
  "sur le thème", "ambiance", "comme", "style", "similaire",
  "court", "long", "pages", "fantômes", "amour", "guerre",
  "policier", "thriller", "fantasy", "sf", "science-fiction",
  "français", "japonais", "américain", "africain",
  "recommand", "cherche", "quel",
];

export function looksLikeNaturalLanguage(query) {
  const q = query.toLowerCase();
  if (NL_SIGNALS.some(s => q.includes(s))) return true;
  if (q.split(/\s+/).length >= 4) return true;
  return false;
}

/**
 * Hook de recherche IA (smart-search edge function).
 * Complément du pipeline classique, pas un remplacement.
 *
 * @param {string} query
 * @param {{ enabled?: boolean, debounceMs?: number }} options
 */
export function useSmartSearch(query, { enabled = true, debounceMs = 300 } = {}) {
  const [books, setBooks] = useState([]);
  const [ghost, setGhost] = useState(null);
  const [interpretedAs, setInterpretedAs] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!enabled || !query || query.length < 2) {
      setBooks([]);
      setGhost(null);
      setInterpretedAs(null);
      setIsLoading(false);
      return;
    }

    // Pas d'appel IA pour les ISBN
    if (/^[\d\-]{5,}$/.test(query.trim())) {
      setBooks([]);
      setGhost(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const { data, error } = await supabase.functions.invoke(
          "smart-search",
          { body: { query } },
        );

        if (controller.signal.aborted) return;

        if (error || !data) {
          setBooks([]);
          setGhost(null);
          setInterpretedAs(null);
          setIsLoading(false);
          return;
        }

        setBooks(data.books || []);
        setGhost(data.ghost || null);
        setInterpretedAs(data.interpreted_as || null);
        setIsLoading(false);
      } catch (err) {
        if (err.name !== "AbortError") {
          setBooks([]);
          setGhost(null);
          setInterpretedAs(null);
          setIsLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, enabled, debounceMs]);

  return { books, ghost, interpretedAs, isLoading };
}
