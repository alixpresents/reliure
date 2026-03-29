-- Migration: Add slug column to books and backfill existing books
-- Run in Supabase SQL Editor

-- 1. Add column (nullable first for backfill)
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS books_slug_idx ON public.books (slug) WHERE slug IS NOT NULL;

-- 2. Backfill slugs for existing books
-- This generates slugs from titles, handling collisions with author name
DO $$
DECLARE
  book_row RECORD;
  base_slug TEXT;
  candidate TEXT;
  author_last TEXT;
  counter INT;
BEGIN
  FOR book_row IN SELECT id, title, authors, publication_date FROM public.books WHERE slug IS NULL ORDER BY created_at ASC LOOP
    -- Generate base slug from title
    base_slug := lower(
      regexp_replace(
        regexp_replace(
          translate(
            normalize(book_row.title, NFD),
            'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸÑÇ',
            'aaaaaaeeeeiiiioooooouuuuyynccAAAAAATEEEEIIIIOOOOOUUUUYYNC'
          ),
          '[^a-zA-Z0-9]+', '-', 'g'
        ),
        '^-|-$', '', 'g'
      )
    );

    IF base_slug = '' THEN base_slug := 'livre'; END IF;

    -- Try base slug
    candidate := base_slug;
    IF NOT EXISTS (SELECT 1 FROM public.books WHERE slug = candidate AND id != book_row.id) THEN
      UPDATE public.books SET slug = candidate WHERE id = book_row.id;
      CONTINUE;
    END IF;

    -- Try with author last name
    author_last := NULL;
    IF book_row.authors IS NOT NULL AND jsonb_array_length(book_row.authors) > 0 THEN
      author_last := lower(regexp_replace(
        translate(
          normalize(split_part(book_row.authors->>0, ' ', -1), NFD),
          'àáâãäåèéêëìíîïòóôõöùúûüýÿñç',
          'aaaaaaeeeeiiiioooooouuuuyync'
        ),
        '[^a-z0-9]+', '-', 'g'
      ));
    END IF;

    IF author_last IS NOT NULL AND author_last != '' THEN
      candidate := base_slug || '-' || author_last;
      IF NOT EXISTS (SELECT 1 FROM public.books WHERE slug = candidate AND id != book_row.id) THEN
        UPDATE public.books SET slug = candidate WHERE id = book_row.id;
        CONTINUE;
      END IF;

      -- Try with year
      IF book_row.publication_date IS NOT NULL THEN
        candidate := base_slug || '-' || author_last || '-' || left(book_row.publication_date, 4);
        IF NOT EXISTS (SELECT 1 FROM public.books WHERE slug = candidate AND id != book_row.id) THEN
          UPDATE public.books SET slug = candidate WHERE id = book_row.id;
          CONTINUE;
        END IF;
      END IF;
    END IF;

    -- Counter fallback
    counter := 2;
    LOOP
      candidate := base_slug || '-' || counter;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.books WHERE slug = candidate AND id != book_row.id);
      counter := counter + 1;
    END LOOP;
    UPDATE public.books SET slug = candidate WHERE id = book_row.id;
  END LOOP;
END $$;

-- 3. Verify all books have slugs
SELECT count(*) as books_without_slug FROM public.books WHERE slug IS NULL;
