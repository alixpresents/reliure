-- Ajout du champ ai_confidence pour l'enrichissement IA
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS ai_confidence numeric(3,2);
