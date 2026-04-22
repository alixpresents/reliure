-- Fix correctness : useAvailableGenres récupère les genres de façon partielle
-- via un scan limité à 2000 livres. Avec 54k+ livres en base, la liste est
-- non-déterministe. Cette RPC agrège côté DB sur l'ensemble du catalogue.
-- Colonne books.genres = jsonb (vérifié schema.sql:43).

CREATE OR REPLACE FUNCTION get_available_genres()
RETURNS TABLE(genre text, count bigint)
LANGUAGE sql STABLE AS $$
  SELECT g.genre, COUNT(*)::bigint as count
  FROM books, jsonb_array_elements_text(books.genres) g(genre)
  WHERE jsonb_typeof(books.genres) = 'array' AND books.genres != '[]'::jsonb
  GROUP BY g.genre
  ORDER BY count DESC;
$$;
