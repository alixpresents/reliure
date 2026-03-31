-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 008: Amélioration de search_books_v2
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Contexte : audit recall sur 58 requêtes → 91.4% recall@3, 77.6% recall@1.
-- Quatre requêtes retournent 0 résultat, une retourne le bon livre au rang 6.
--
-- Bugs corrigés :
--
-- Bug 1 (CRITIQUE) : "Madame Bovary Flaubert" → 0 résultats
--   Cause : branche auteurs désactivée si >2 mots significatifs.
--   Fix : matching cross-field — chaque mot doit être dans titre OU auteurs.
--
-- Bug 2 : "Les Misérables" → rang 6 (résultats parasites devant)
--   Cause : tri par rating_count seul, pas de scoring de pertinence.
--   Fix : scoring hybride (match exact titre > titre begins > couverture titre > rating_count).
--
-- Bug 3 : "LETRANGER" → 0 résultats
--   Cause : "letranger" (1 token) ne matche pas "l etranger" (2 tokens avec espace).
--   Fix : branche compact — matching sans espaces pour les queries mono-token ≥ 5 chars.
--
-- Bug 4 : "9782070306022" → 0 résultats
--   Cause : la RPC ne cherche pas dans isbn_13.
--   Fix : branche ISBN — match exact si la query ressemble à un ISBN (10-13 chiffres).
--
-- Note : on passe de LANGUAGE sql à LANGUAGE plpgsql pour pouvoir calculer le scoring.
-- La performance reste excellente sur 3700 livres (<50ms).
-- ═══════════════════════════════════════════════════════════════════════════════

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
  -- Normalise la query : unaccent, lowercase, remplace non-alphanum par espaces
  q_clean := regexp_replace(unaccent(lower(trim(q))), '[^a-z0-9 ]', ' ', 'g');
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
        CASE WHEN unaccent(lower(b.title)) = q_clean THEN 100 ELSE 0 END
        -- +50 : titre commence par la query
        + CASE WHEN unaccent(lower(b.title)) LIKE q_clean || '%' THEN 50 ELSE 0 END
        -- +30 × couverture titre : proportion de mots significatifs trouvés dans le titre
        + COALESCE((
          SELECT (count(*) FILTER (WHERE unaccent(lower(b.title)) LIKE '%' || s.w || '%'))::float
                 / NULLIF((SELECT cnt FROM sig_count), 0) * 30
          FROM significant s
        ), 0)::int
        -- +5 × couverture auteur : proportion de mots trouvés dans les auteurs
        + COALESCE((
          SELECT (count(*) FILTER (WHERE unaccent(lower(b.authors::text)) LIKE '%' || s.w || '%'))::float
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
        AND b.isbn_13 = q_digits
      )
      -- Branche compact : query mono-token ≥ 5 chars, matching sans espaces
      OR (
        q_compact != ''
        AND length(q_compact) >= 5
        AND position(' ' in q_clean) = 0
        AND regexp_replace(unaccent(lower(b.title)), '[^a-z0-9]', '', 'g')
            LIKE '%' || q_compact || '%'
      )
      -- Branche principale : cross-field matching (titre OU auteurs)
      OR (
        (SELECT cnt FROM sig_count) > 0
        AND (
          SELECT bool_and(
            unaccent(lower(b.title)) LIKE '%' || s.w || '%'
            OR unaccent(lower(b.authors::text)) LIKE '%' || s.w || '%'
          )
          FROM significant s
        )
      )
  )
  SELECT m.id, m.isbn_13, m.title, m.subtitle, m.authors, m.publisher,
         m.publication_date, m.cover_url, m.language, m.genres, m.page_count,
         m.avg_rating, m.rating_count, m.source, m.created_at, m.awards,
         m.description, m.slug, m.ai_confidence
  FROM matched m
  ORDER BY m.score DESC, m.rating_count DESC NULLS LAST
  LIMIT n;
END;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Index optionnel pour accélérer le matching (à évaluer avant activation)
-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS idx_books_title_trgm ON books USING gin (title gin_trgm_ops);
-- CREATE INDEX IF NOT EXISTS idx_books_authors_trgm ON books USING gin ((authors::text) gin_trgm_ops);
