-- RPC popular_lists_with_covers
-- Remplace les 3 requêtes séparées de usePopularLists (lists + list_items + count)
-- par une seule requête SQL avec sous-requête correlated pour les couvertures.
CREATE OR REPLACE FUNCTION popular_lists_with_covers(
  result_limit int DEFAULT 6
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  slug text,
  user_id uuid,
  username text,
  display_name text,
  likes_count int,
  book_count bigint,
  covers text[]
) AS $$
  SELECT
    l.id,
    l.title,
    l.description,
    l.slug,
    l.user_id,
    u.username,
    u.display_name,
    l.likes_count,
    COUNT(li.id) AS book_count,
    ARRAY(
      SELECT b.cover_url
      FROM list_items li2
      JOIN books b ON b.id = li2.book_id
      WHERE li2.list_id = l.id AND b.cover_url IS NOT NULL
      ORDER BY li2.position ASC
      LIMIT 4
    ) AS covers
  FROM lists l
  JOIN users u ON u.id = l.user_id
  LEFT JOIN list_items li ON li.list_id = l.id
  WHERE l.is_public = true
  GROUP BY l.id, u.username, u.display_name
  ORDER BY l.likes_count DESC
  LIMIT result_limit;
$$ LANGUAGE sql STABLE;
