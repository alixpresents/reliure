-- Migration 006 : Supabase Storage bucket pour les couvertures de livres
-- + colonne description sur books

-- Bucket public pour les couvertures
INSERT INTO storage.buckets (id, name, public)
VALUES ('book-covers', 'book-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Lecture publique
CREATE POLICY "Public read book covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

-- Upload pour les utilisateurs connectés
CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'book-covers');

-- Colonne description sur books (si absente)
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS description text;
