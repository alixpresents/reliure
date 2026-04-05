-- 030_book_recommendations.sql
-- Feature "Tu pourrais aimer" : recommandations personnalisées IA sur le profil

CREATE TABLE public.book_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  recommendations jsonb NOT NULL,
  model_used text NOT NULL DEFAULT 'claude-sonnet',
  tokens_used int,
  context_hash text NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz NOT NULL,
  UNIQUE (user_id)
);

ALTER TABLE public.book_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voir ses propres recommandations"
  ON public.book_recommendations FOR SELECT
  USING (auth.uid() = user_id);
