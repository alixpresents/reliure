-- RPCs classement mensuel et tout temps

-- ─── Classement mensuel ─────────────────────────────────────────────────────
create or replace function public.get_monthly_ranking()
returns table (
  user_id      uuid,
  username     text,
  display_name text,
  avatar_url   text,
  month_points bigint,
  reviews_count bigint,
  quotes_count  bigint
)
language sql
security definer
stable
set search_path = public
as $$
  select
    pe.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    sum(pe.points)::bigint                                                        as month_points,
    count(*) filter (where pe.reason in ('review', 'review_long'))::bigint        as reviews_count,
    count(*) filter (where pe.reason = 'quote')::bigint                           as quotes_count
  from public.point_events pe
  join public.users u on pe.user_id = u.id
  where pe.created_at >= date_trunc('month', now())
    and pe.reason not in ('like_received', 'follow_received')
  group by pe.user_id, u.username, u.display_name, u.avatar_url
  having sum(pe.points) > 0
  order by month_points desc
  limit 100;
$$;

-- ─── Classement tout temps ──────────────────────────────────────────────────
create or replace function public.get_alltime_ranking()
returns table (
  user_id      uuid,
  username     text,
  display_name text,
  avatar_url   text,
  total_points int,
  level        int
)
language sql
security definer
stable
set search_path = public
as $$
  select
    up.user_id,
    u.username,
    u.display_name,
    u.avatar_url,
    up.total_points,
    up.level
  from public.user_points up
  join public.users u on up.user_id = u.id
  where up.total_points > 0
  order by up.total_points desc
  limit 100;
$$;

-- Droits d'accès publics (anon + authenticated)
grant execute on function public.get_monthly_ranking() to anon, authenticated;
grant execute on function public.get_alltime_ranking() to anon, authenticated;
