-- Backfill point_events depuis l'historique existant
-- Problème : le backfill Phase 1 a inséré dans user_points directement, sans créer
-- les lignes point_events correspondantes. Les triggers DELETE recalculent via
-- SUM(points) FROM point_events → l'historique est écrasé à chaque suppression.
-- Solution : créer les point_events manquants pour tous les reading_status, reviews
-- et quotes existants, puis recalculer user_points depuis point_events.

-- ============================================================
-- 0. Ajouter les colonnes manquantes sur point_events (idempotent)
-- ============================================================
alter table public.point_events
  add column if not exists reason      text,
  add column if not exists source_id   uuid,
  add column if not exists source_type text;

-- Index pour les lookups DELETE (source_id + source_type)
create index if not exists point_events_source_idx
  on public.point_events (source_id, source_type)
  where source_id is not null;

-- ============================================================
-- 1. reading_status status='read' → 2 points, reason='read'
-- ============================================================
insert into public.point_events (user_id, points, reason, source_id, source_type, created_at)
select
  rs.user_id,
  2,
  'read',
  rs.id,
  'reading_status',
  coalesce(rs.updated_at, rs.created_at, now())
from public.reading_status rs
where rs.status = 'read'
  and not exists (
    select 1
    from public.point_events pe
    where pe.source_id   = rs.id
      and pe.source_type = 'reading_status'
  );

-- ============================================================
-- 2. reviews → 10 pts (body court) ou 20 pts (body ≥ 500 chars)
--    reason = 'review' ou 'review_long'
-- ============================================================
insert into public.point_events (user_id, points, reason, source_id, source_type, created_at)
select
  r.user_id,
  case when char_length(coalesce(r.body, '')) >= 500 then 20 else 10 end,
  case when char_length(coalesce(r.body, '')) >= 500 then 'review_long' else 'review' end,
  r.id,
  'review',
  r.created_at
from public.reviews r
where not exists (
  select 1
  from public.point_events pe
  where pe.source_id   = r.id
    and pe.source_type = 'review'
);

-- ============================================================
-- 3. quotes → 5 points, reason='quote'
-- ============================================================
insert into public.point_events (user_id, points, reason, source_id, source_type, created_at)
select
  q.user_id,
  5,
  'quote',
  q.id,
  'quote',
  q.created_at
from public.quotes q
where not exists (
  select 1
  from public.point_events pe
  where pe.source_id   = q.id
    and pe.source_type = 'quote'
);

-- ============================================================
-- 4. Recalculer user_points pour tous les users concernés
-- ============================================================
-- On réutilise la fonction recalc_user_points définie dans 016.
-- Elle recalcule total_points, monthly_points et level depuis point_events.
do $$
declare
  uid uuid;
begin
  for uid in
    select distinct user_id
    from public.point_events
  loop
    perform public.recalc_user_points(uid);
  end loop;
end;
$$;
