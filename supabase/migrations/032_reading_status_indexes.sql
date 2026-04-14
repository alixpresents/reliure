-- 032_reading_status_indexes
-- Ajoute l'index manquant sur reading_status pour les requêtes triées par date.
-- Les deux autres index (user_status, diary) existent déjà.

CREATE INDEX IF NOT EXISTS idx_reading_status_user_created
  ON public.reading_status(user_id, created_at DESC);
