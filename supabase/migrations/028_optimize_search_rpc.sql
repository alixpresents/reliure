-- 028_optimize_search_rpc.sql
-- Refactorer search_books_v2 pour utiliser les colonnes GENERATED ALWAYS STORED
-- norm_title et norm_authors (avec index trigram GIN) au lieu de recalculer
-- dans un CTE à chaque appel. Supprime le full scan de normalisation.
-- Ajoute les colonnes Electre + norm_* dans le SELECT final.

CREATE OR REPLACE FUNCTION public.search_books_v2(q text, n integer DEFAULT 10)
  RETURNS SETOF books
  LANGUAGE plpgsql
  STABLE
AS $function$
DECLARE
  q_clean text;
  q_compact text;
  q_digits text;
BEGIN
  -- Normalise la query : apostrophes → espace, unaccent, lowercase, non-alphanum → espaces
  q_clean := regexp_replace(lower(trim(q)), E'[\u2018\u2019\u201A\u2039\u203A''`]', ' ', 'g');
  q_clean := regexp_replace(unaccent(q_clean), '[^a-z0-9 ]', ' ', 'g');
  q_clean := regexp_replace(q_clean, '\s+', ' ', 'g');
  q_clean := trim(q_clean);

  -- Version compacte (sans espaces) pour le matching "LETRANGER" → "letranger"
  q_compact := regexp_replace(q_clean, ' ', '', 'g');

  -- Extraction des chiffres pour le matching ISBN
  q_digits := regexp_replace(q, '[^0-9]', '', 'g');

  RETURN QUERY
  WITH words AS (
    SELECT unnest(string_to_array(q_clean, ' ')) AS w
  ),
  significant AS (
    SELECT w FROM words WHERE length(w) > 2
  ),
  sig_count AS (
    SELECT count(*) AS cnt FROM significant
  ),
  matched AS (
    SELECT
      b.*,
      -- Scoring de pertinence
      (
        -- +100 : match exact du titre (query = titre normalisé complet)
        CASE WHEN b.norm_title = q_clean THEN 100 ELSE 0 END
        -- +50 : titre commence par la query
        + CASE WHEN b.norm_title LIKE q_clean || '%' THEN 50 ELSE 0 END
        -- +30 × couverture titre : proportion de mots significatifs trouvés dans le titre
        + COALESCE((
          SELECT (count(*) FILTER (WHERE b.norm_title LIKE '%' || s.w || '%'))::float
                 / NULLIF((SELECT cnt FROM sig_count), 0) * 30
          FROM significant s
        ), 0)::int
        -- +5 × couverture auteur : proportion de mots trouvés dans les auteurs
        + COALESCE((
          SELECT (count(*) FILTER (WHERE b.norm_authors LIKE '%' || s.w || '%'))::float
                 / NULLIF((SELECT cnt FROM sig_count), 0) * 5
          FROM significant s
        ), 0)::int
        -- rating_count comme tie-breaker (max quelques dizaines)
        + LEAST(COALESCE(b.rating_count, 0), 20)
      ) AS score
    FROM books b
    WHERE
      -- Branche ISBN : match exact si la query est un ISBN (10-13 chiffres)
      (
        length(q_digits) BETWEEN 10 AND 13
        AND regexp_replace(COALESCE(b.isbn_13, ''), '[^0-9]', '', 'g') = q_digits
      )
      -- Branche compact : matching sans espaces
      OR (
        q_compact != ''
        AND length(q_compact) >= 5
        AND (
          position(' ' in q_clean) = 0
          OR (
            array_length(string_to_array(q_clean, ' '), 1) <= 2
            AND length(q_compact) >= 5
          )
        )
        AND regexp_replace(b.norm_title, ' ', '', 'g')
            LIKE '%' || q_compact || '%'
      )
      -- Branche cross-field : mots significatifs (>2 chars)
      OR (
        (SELECT cnt FROM sig_count) > 0
        AND (
          SELECT bool_and(
            b.norm_title LIKE '%' || s.w || '%'
            OR b.norm_authors LIKE '%' || s.w || '%'
          )
          FROM significant s
        )
      )
      -- Branche fallback : si aucun mot significatif, utiliser tous les mots
      OR (
        (SELECT cnt FROM sig_count) = 0
        AND (SELECT count(*) FROM words WHERE length(w) > 0) > 0
        AND (
          SELECT bool_and(
            b.norm_title LIKE '%' || s.w || '%'
            OR b.norm_authors LIKE '%' || s.w || '%'
          )
          FROM words s WHERE length(s.w) > 0
        )
      )
  )
  SELECT m.id, m.isbn_13, m.title, m.subtitle, m.authors, m.publisher,
         m.publication_date, m.cover_url, m.language, m.genres, m.page_count,
         m.avg_rating, m.rating_count, m.source, m.created_at, m.awards,
         m.description, m.slug, m.ai_confidence,
         m.electre_notice_id, m.oeuvre_id, m.collection_name,
         m.flag_fiction, m.quatrieme_de_couverture, m.disponibilite,
         m.norm_title, m.norm_authors
  FROM matched m
  ORDER BY m.score DESC, m.rating_count DESC NULLS LAST
  LIMIT n;
END;
$function$;
