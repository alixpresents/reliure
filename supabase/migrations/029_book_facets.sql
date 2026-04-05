-- 029_book_facets.sql
-- Feature Boussole : découverte par humeur, personnage et intrigue

-- ═══════════════════════════════════════════════
-- Fonction de validation pour les arrays à valeurs contraintes
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.validate_facet_array(arr text[], allowed text[])
RETURNS boolean
LANGUAGE plpgsql IMMUTABLE
AS $$
BEGIN
  IF arr IS NULL THEN RETURN true; END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM unnest(arr) elem WHERE elem != ALL(allowed)
  );
END;
$$;

-- ═══════════════════════════════════════════════
-- Table book_facets
-- ═══════════════════════════════════════════════

CREATE TABLE public.book_facets (
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE PRIMARY KEY,
  moods text[] DEFAULT '{}',
  rythme text CHECK (rythme IN ('lent', 'rapide')),
  registre text CHECK (registre IN ('léger', 'grave', 'ironique')),
  protag_age text CHECK (protag_age IN ('enfant', 'ado', 'jeune_adulte', 'age_mur', 'senior')),
  protag_genre text CHECK (protag_genre IN ('femme', 'homme', 'non_binaire', 'collectif')),
  intrigues text[] DEFAULT '{}',
  source text DEFAULT 'ai' CHECK (source IN ('ai', 'community', 'editorial')),
  confidence numeric(3,2) DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  CONSTRAINT valid_moods CHECK (
    validate_facet_array(moods, ARRAY[
      'réconfortant', 'sombre', 'drôle', 'mélancolique', 'haletant',
      'contemplatif', 'dérangeant', 'lumineux', 'sensuel', 'poétique'
    ])
  ),
  CONSTRAINT max_moods CHECK (array_length(moods, 1) IS NULL OR array_length(moods, 1) <= 4),

  CONSTRAINT valid_intrigues CHECK (
    validate_facet_array(intrigues, ARRAY[
      'quête', 'famille', 'amour', 'deuil', 'identité',
      'voyage', 'guerre', 'société', 'survie', 'amitié'
    ])
  ),
  CONSTRAINT max_intrigues CHECK (array_length(intrigues, 1) IS NULL OR array_length(intrigues, 1) <= 4)
);

-- ═══════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════

CREATE INDEX book_facets_moods_idx ON public.book_facets USING gin (moods);
CREATE INDEX book_facets_intrigues_idx ON public.book_facets USING gin (intrigues);
CREATE INDEX book_facets_scalar_idx ON public.book_facets (rythme, registre, protag_age, protag_genre);

-- ═══════════════════════════════════════════════
-- RLS
-- ═══════════════════════════════════════════════

ALTER TABLE public.book_facets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "book_facets_public_read"
  ON public.book_facets FOR SELECT
  USING (true);

-- Pas de policy INSERT/UPDATE/DELETE : écriture via service key uniquement

-- ═══════════════════════════════════════════════
-- RPC search_boussole
-- ═══════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.search_boussole(
  p_moods text[] DEFAULT NULL,
  p_rythme text DEFAULT NULL,
  p_registre text DEFAULT NULL,
  p_protag_age text DEFAULT NULL,
  p_protag_genre text DEFAULT NULL,
  p_intrigues text[] DEFAULT NULL,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  book_id uuid,
  title text,
  authors jsonb,
  cover_url text,
  slug text,
  avg_rating numeric,
  rating_count int,
  moods text[],
  intrigues text[],
  rythme text,
  registre text,
  protag_age text,
  protag_genre text,
  confidence numeric,
  relevance_score int
)
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS book_id,
    b.title,
    b.authors,
    b.cover_url,
    b.slug,
    b.avg_rating,
    b.rating_count,
    f.moods,
    f.intrigues,
    f.rythme,
    f.registre,
    f.protag_age,
    f.protag_genre,
    f.confidence,
    (
      CASE WHEN p_moods IS NOT NULL THEN (SELECT count(*)::int FROM unnest(p_moods) m WHERE m = ANY(f.moods)) ELSE 0 END
      + CASE WHEN p_intrigues IS NOT NULL THEN (SELECT count(*)::int FROM unnest(p_intrigues) i WHERE i = ANY(f.intrigues)) ELSE 0 END
      + CASE WHEN p_rythme IS NOT NULL AND f.rythme = p_rythme THEN 1 ELSE 0 END
      + CASE WHEN p_registre IS NOT NULL AND f.registre = p_registre THEN 1 ELSE 0 END
      + CASE WHEN p_protag_age IS NOT NULL AND f.protag_age = p_protag_age THEN 1 ELSE 0 END
      + CASE WHEN p_protag_genre IS NOT NULL AND f.protag_genre = p_protag_genre THEN 1 ELSE 0 END
    ) AS relevance_score
  FROM public.book_facets f
  JOIN public.books b ON b.id = f.book_id
  WHERE
    f.confidence >= 0.5
    AND (p_moods IS NULL OR f.moods && p_moods)
    AND (p_rythme IS NULL OR f.rythme = p_rythme)
    AND (p_registre IS NULL OR f.registre = p_registre)
    AND (p_protag_age IS NULL OR f.protag_age = p_protag_age)
    AND (p_protag_genre IS NULL OR f.protag_genre = p_protag_genre)
    AND (p_intrigues IS NULL OR f.intrigues && p_intrigues)
  ORDER BY relevance_score DESC, b.rating_count DESC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
