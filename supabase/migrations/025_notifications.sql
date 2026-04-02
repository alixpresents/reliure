-- ═══════════════════════════════════════════════════════════
-- 025_notifications.sql
-- Système de notifications in-app pour Reliure
-- ═══════════════════════════════════════════════════════════

-- ─── 1. Enum type ───────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'follow',
    'like_review',
    'like_quote',
    'like_list',
    'badge',
    'reply'          -- réservé pour quand review_replies existera
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Table notifications ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id    uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  target_id   uuid,
  target_type text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT no_self_notification CHECK (user_id != actor_id)
);

-- Index principal : panneau notifs (non lues en premier, puis chronologie)
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- Index : listing complet + compteur
CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

-- Index : déduplication (éviter 2 notifs identiques)
CREATE INDEX IF NOT EXISTS notifications_dedup_idx
  ON public.notifications (actor_id, type, target_id);

-- ─── 3. RLS ─────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Lecture : owner only (les notifs sont privées)
CREATE POLICY "Lire ses notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Mise à jour : owner only (marquer is_read)
CREATE POLICY "Mettre à jour ses notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Suppression : owner only
CREATE POLICY "Supprimer ses notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Pas de policy INSERT pour authenticated :
-- les INSERT passent par create_notification() qui est SECURITY DEFINER

-- ─── 4. Fonction helper ─────────────────────────────────

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id     uuid,
  p_actor_id    uuid,
  p_type        notification_type,
  p_target_id   uuid DEFAULT NULL,
  p_target_type text DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Pas d'auto-notification
  IF p_user_id IS NULL OR p_user_id = p_actor_id THEN
    RETURN NULL;
  END IF;

  -- Anti-spam : pas de doublon identique dans les 5 dernières minutes
  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE actor_id = p_actor_id
      AND type = p_type
      AND target_id IS NOT DISTINCT FROM p_target_id
      AND created_at > now() - interval '5 minutes'
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.notifications (user_id, actor_id, type, target_id, target_type, metadata)
  VALUES (p_user_id, p_actor_id, p_type, p_target_id, p_target_type, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ─── 5. Trigger : follows ───────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  SELECT username INTO v_username
  FROM public.users WHERE id = NEW.follower_id;

  PERFORM create_notification(
    NEW.following_id,                    -- destinataire
    NEW.follower_id,                     -- acteur
    'follow'::notification_type,
    NEW.follower_id,                     -- target_id = le follower
    'user',
    jsonb_build_object('username', COALESCE(v_username, ''))
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_follow();

-- ─── 6. Trigger : likes ─────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id    uuid;
  v_notif_type  notification_type;
  v_metadata    jsonb;
  v_book_title  text;
  v_book_slug   text;
  v_list_title  text;
BEGIN
  IF NEW.target_type = 'review' THEN
    -- Trouver le propriétaire + titre/slug du livre
    SELECT r.user_id, b.title, b.slug
    INTO v_owner_id, v_book_title, v_book_slug
    FROM public.reviews r
    LEFT JOIN public.books b ON b.id = r.book_id
    WHERE r.id = NEW.target_id;

    v_notif_type := 'like_review';
    v_metadata := jsonb_build_object(
      'book_title', COALESCE(v_book_title, ''),
      'book_slug', COALESCE(v_book_slug, '')
    );

  ELSIF NEW.target_type = 'quote' THEN
    -- Trouver le propriétaire + titre/slug du livre
    SELECT q.user_id, b.title, b.slug
    INTO v_owner_id, v_book_title, v_book_slug
    FROM public.quotes q
    LEFT JOIN public.books b ON b.id = q.book_id
    WHERE q.id = NEW.target_id;

    v_notif_type := 'like_quote';
    v_metadata := jsonb_build_object(
      'book_title', COALESCE(v_book_title, ''),
      'book_slug', COALESCE(v_book_slug, '')
    );

  ELSIF NEW.target_type = 'list' THEN
    -- Trouver le propriétaire + titre de la liste
    SELECT l.user_id, l.title
    INTO v_owner_id, v_list_title
    FROM public.lists l
    WHERE l.id = NEW.target_id;

    v_notif_type := 'like_list';
    v_metadata := jsonb_build_object(
      'list_title', COALESCE(v_list_title, '')
    );

  ELSE
    RETURN NEW;
  END IF;

  -- Si on n'a pas trouvé le propriétaire, on ne notifie pas
  IF v_owner_id IS NOT NULL THEN
    PERFORM create_notification(
      v_owner_id,
      NEW.user_id,
      v_notif_type,
      NEW.target_id,
      NEW.target_type::text,
      v_metadata
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_like
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_like();

-- ─── 7. Trigger : badges ────────────────────────────────

CREATE OR REPLACE FUNCTION notify_on_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge_name text;
BEGIN
  SELECT name INTO v_badge_name
  FROM public.badge_definitions WHERE id = NEW.badge_id;

  PERFORM create_notification(
    NEW.user_id,                         -- destinataire = le user qui reçoit le badge
    NULL,                                -- pas d'acteur (système)
    'badge'::notification_type,
    NULL,                                -- pas de target_id uuid (badge_id est text)
    'badge',
    jsonb_build_object(
      'badge_id', NEW.badge_id,
      'badge_name', COALESCE(v_badge_name, '')
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_badge
  AFTER INSERT ON public.user_badges
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_badge();

-- ─── 8. RPC get_notifications ───────────────────────────

CREATE OR REPLACE FUNCTION get_notifications(
  p_limit  int DEFAULT 30,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id                 uuid,
  type               notification_type,
  actor_id           uuid,
  actor_username     text,
  actor_display_name text,
  actor_avatar_url   text,
  target_id          uuid,
  target_type        text,
  metadata           jsonb,
  is_read            boolean,
  created_at         timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    n.id,
    n.type,
    n.actor_id,
    u.username        AS actor_username,
    u.display_name    AS actor_display_name,
    u.avatar_url      AS actor_avatar_url,
    n.target_id,
    n.target_type,
    n.metadata,
    n.is_read,
    n.created_at
  FROM public.notifications n
  LEFT JOIN public.users u ON u.id = n.actor_id
  WHERE n.user_id = auth.uid()
  ORDER BY n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

-- ─── 9. RPC get_unread_notification_count ────────────────

CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int
  FROM public.notifications
  WHERE user_id = auth.uid() AND is_read = false;
$$;

-- ─── 10. RPC mark_notifications_read ─────────────────────

CREATE OR REPLACE FUNCTION mark_notifications_read(p_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_ids IS NULL THEN
    -- Tout marquer comme lu
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid() AND is_read = false;
  ELSE
    -- Marquer les IDs spécifiés
    UPDATE public.notifications
    SET is_read = true
    WHERE user_id = auth.uid() AND id = ANY(p_ids) AND is_read = false;
  END IF;
END;
$$;

-- ─── 11. Nettoyage automatique (pg_cron) ─────────────────

-- Supprimer les notifications de plus de 90 jours, chaque dimanche à 3h
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * 0',
  $$DELETE FROM public.notifications WHERE created_at < now() - interval '90 days';$$
);

-- ─── 12. Activation Realtime ─────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
