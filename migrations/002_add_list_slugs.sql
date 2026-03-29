-- Add slug column to lists table
ALTER TABLE lists ADD COLUMN IF NOT EXISTS slug text;

-- Backfill existing lists with slugs generated from titles
DO $$
DECLARE
  r RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR r IN SELECT id, user_id, title FROM lists WHERE slug IS NULL LOOP
    base_slug := regexp_replace(
      lower(translate(r.title,
        'àáâãäéèêëïîìíôöòóùûüúñçÀÁÂÃÄÉÈÊËÏÎÌÍÔÖÒÓÙÛÜÚÑÇ',
        'aaaaaeeeeiiiioooouuuuncAAAAAEEEEIIIIOOOOUUUUNC')),
      '[^a-z0-9]+', '-', 'g');
    base_slug := trim(both '-' from base_slug);

    candidate := base_slug;
    counter := 2;

    WHILE EXISTS (SELECT 1 FROM lists WHERE user_id = r.user_id AND slug = candidate AND id != r.id) LOOP
      candidate := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;

    UPDATE lists SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- Add unique constraint per user
CREATE UNIQUE INDEX IF NOT EXISTS lists_user_slug_unique ON lists(user_id, slug);
