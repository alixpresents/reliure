import { supabase } from "./supabase";

function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Cache en mémoire pour éviter les requêtes répétées
const cache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Autocomplete depuis la base locale.
 * Retourne le titre canonique du meilleur match, ou null.
 * Utilisé par searchBooks() pour améliorer la query Google Books.
 */
export async function getSuggestion(query) {
  if (!query || query.length < 3) return null;

  const key = stripAccents(query).toLowerCase().trim();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;

  try {
    // Normaliser apostrophes pour le matching
    const words = query
      .replace(/[\u2018\u2019\u201A\u2039\u203A'']/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1);

    if (words.length === 0) return null;

    // Prefix match sur le titre : "harry p" → "Harry Potter..."
    const ilikePattern = words.map(w => "%" + w + "%").join("");
    const { data } = await supabase
      .from("books")
      .select("title, rating_count")
      .ilike("title", ilikePattern)
      .order("rating_count", { ascending: false, nullsFirst: false })
      .limit(1);

    const result = data?.[0]?.title || null;
    cache.set(key, { value: result, ts: Date.now() });
    return result;
  } catch {
    return null;
  }
}
