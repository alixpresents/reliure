-- ============================================
-- 026 — Review replies (réponses aux critiques)
-- ============================================
-- Table review_replies, reply_count dénormalisé,
-- extension enums, triggers notif + activité, RPC

-- ─── Étendre les enums (doit être hors transaction) ─────
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'reply';
ALTER TYPE likeable_type ADD VALUE IF NOT EXISTS 'reply';

-- ─── Table review_replies ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.review_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id   uuid NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body        text NOT NULL,
  likes_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT reply_body_length CHECK (char_length(body) >= 1 AND char_length(body) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review_chrono
  ON public.review_replies (review_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_review_replies_user
  ON public.review_replies (user_id, created_at DESC);

-- ─── Colonne reply_count sur reviews ────────────────────
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reply_count int NOT NULL DEFAULT 0;

-- ─── RLS ────────────────────────────────────────────────
ALTER TABLE public.review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Réponses en lecture publique" ON public.review_replies
  FOR SELECT USING (true);

CREATE POLICY "Répondre à une critique" ON public.review_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Modifier sa réponse" ON public.review_replies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Supprimer sa réponse" ON public.review_replies
  FOR DELETE USING (auth.uid() = user_id);

-- ─── Trigger reply_count ────────────────────────────────
CREATE OR REPLACE FUNCTION update_reply_count()
RETURNS trigger AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    UPDATE public.reviews SET reply_count = reply_count + 1 WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF tg_op = 'DELETE' THEN
    UPDATE public.reviews SET reply_count = greatest(0, reply_count - 1) WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reply_count_trigger
  AFTER INSERT OR DELETE ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION update_reply_count();

-- ─── Étendre update_likes_count() pour les replies ─────
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS trigger AS $$
BEGIN
  IF tg_op = 'INSERT' THEN
    IF new.target_type = 'review' THEN
      UPDATE public.reviews SET likes_count = likes_count + 1 WHERE id = new.target_id;
    ELSIF new.target_type = 'quote' THEN
      UPDATE public.quotes SET likes_count = likes_count + 1 WHERE id = new.target_id;
    ELSIF new.target_type = 'list' THEN
      UPDATE public.lists SET likes_count = likes_count + 1 WHERE id = new.target_id;
    ELSIF new.target_type = 'reply' THEN
      UPDATE public.review_replies SET likes_count = likes_count + 1 WHERE id = new.target_id;
    END IF;
    RETURN new;
  ELSIF tg_op = 'DELETE' THEN
    IF old.target_type = 'review' THEN
      UPDATE public.reviews SET likes_count = greatest(0, likes_count - 1) WHERE id = old.target_id;
    ELSIF old.target_type = 'quote' THEN
      UPDATE public.quotes SET likes_count = greatest(0, likes_count - 1) WHERE id = old.target_id;
    ELSIF old.target_type = 'list' THEN
      UPDATE public.lists SET likes_count = greatest(0, likes_count - 1) WHERE id = old.target_id;
    ELSIF old.target_type = 'reply' THEN
      UPDATE public.review_replies SET likes_count = greatest(0, likes_count - 1) WHERE id = old.target_id;
    END IF;
    RETURN old;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ─── Trigger notification sur réponse ───────────────────
CREATE OR REPLACE FUNCTION notify_review_reply()
RETURNS trigger AS $$
DECLARE
  v_review_owner uuid;
  v_book_title text;
  v_book_slug text;
  v_book_id uuid;
BEGIN
  SELECT r.user_id, b.title, b.slug, b.id
  INTO v_review_owner, v_book_title, v_book_slug, v_book_id
  FROM public.reviews r
  JOIN public.books b ON b.id = r.book_id
  WHERE r.id = NEW.review_id;

  PERFORM create_notification(
    v_review_owner,
    NEW.user_id,
    'reply',
    NEW.review_id,
    'review',
    jsonb_build_object(
      'book_title', COALESCE(v_book_title, ''),
      'book_slug', COALESCE(v_book_slug, ''),
      'book_id', v_book_id,
      'reply_id', NEW.id,
      'reply_preview', left(NEW.body, 80)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_review_reply
  AFTER INSERT ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION notify_review_reply();

-- ─── Trigger activité (fil) ─────────────────────────────
CREATE OR REPLACE FUNCTION log_reply_activity()
RETURNS trigger AS $$
DECLARE
  v_book_title text;
  v_book_slug text;
  v_book_id uuid;
  v_book_cover text;
  v_review_user_id uuid;
  v_review_rating smallint;
BEGIN
  SELECT r.user_id, r.rating, b.title, b.slug, b.id, b.cover_url
  INTO v_review_user_id, v_review_rating, v_book_title, v_book_slug, v_book_id, v_book_cover
  FROM public.reviews r
  JOIN public.books b ON b.id = r.book_id
  WHERE r.id = NEW.review_id;

  INSERT INTO public.activity (user_id, action_type, target_id, target_type, metadata)
  VALUES (
    NEW.user_id,
    'reply',
    NEW.id,
    'reply',
    jsonb_build_object(
      'review_id', NEW.review_id,
      'book_id', v_book_id,
      'book_title', COALESCE(v_book_title, ''),
      'book_slug', COALESCE(v_book_slug, ''),
      'book_cover', COALESCE(v_book_cover, ''),
      'review_user_id', v_review_user_id,
      'review_rating', v_review_rating,
      'reply_preview', left(NEW.body, 120)
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_reply_activity
  AFTER INSERT ON public.review_replies
  FOR EACH ROW EXECUTE FUNCTION log_reply_activity();

-- ─── RPC get_review_replies ─────────────────────────────
CREATE OR REPLACE FUNCTION get_review_replies(p_review_id uuid, p_limit int DEFAULT 50)
RETURNS TABLE (
  id uuid,
  review_id uuid,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  body text,
  likes_count int,
  created_at timestamptz
)
LANGUAGE sql STABLE
AS $$
  SELECT
    rr.id,
    rr.review_id,
    rr.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    rr.body,
    rr.likes_count,
    rr.created_at
  FROM public.review_replies rr
  JOIN public.users u ON u.id = rr.user_id
  WHERE rr.review_id = p_review_id
  ORDER BY rr.created_at ASC
  LIMIT p_limit;
$$;
