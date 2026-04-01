-- Index GIN sur books.genres — accélère les filtres Explorer par genre/thème
CREATE INDEX IF NOT EXISTS idx_books_genres_gin ON books USING gin (genres);

-- RPC available_genres — retourne les genres distincts avec leur compteur
-- Évite de fetcher toutes les rows de books côté client pour extraire les genres
CREATE OR REPLACE FUNCTION available_genres()
RETURNS TABLE(genre text, book_count bigint) AS $$
  SELECT DISTINCT jsonb_array_elements_text(genres) AS genre,
         COUNT(*) AS book_count
  FROM books
  WHERE genres IS NOT NULL AND genres != '[]'::jsonb
  GROUP BY genre
  ORDER BY book_count DESC;
$$ LANGUAGE sql STABLE;
