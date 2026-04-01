-- Gamification : triggers DELETE (récupération de points) + cron mensuel

-- ============================================================
-- 1. Récupération de points à la suppression
-- ============================================================

-- Fonction helper : recalcule total_points, monthly_points et level depuis point_events
create or replace function public.recalc_user_points(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total   int;
  v_monthly int;
  v_level   int;
begin
  select
    coalesce(sum(points), 0),
    coalesce(sum(points) filter (
      where created_at >= date_trunc('month', now())
    ), 0)
  into v_total, v_monthly
  from public.point_events
  where user_id = p_user_id;

  v_level :=
    case
      when v_total >= 25000 then 10
      when v_total >= 12000 then 9
      when v_total >= 6000  then 8
      when v_total >= 3000  then 7
      when v_total >= 1500  then 6
      when v_total >= 800   then 5
      when v_total >= 400   then 4
      when v_total >= 150   then 3
      when v_total >= 50    then 2
      else 1
    end;

  update public.user_points
  set total_points   = v_total,
      monthly_points = v_monthly,
      level          = v_level,
      updated_at     = now()
  where user_id = p_user_id;

  -- Upsert si la ligne n'existe pas encore
  if not found then
    insert into public.user_points (user_id, total_points, monthly_points, level)
    values (p_user_id, v_total, v_monthly, v_level)
    on conflict (user_id) do update
      set total_points   = excluded.total_points,
          monthly_points = excluded.monthly_points,
          level          = excluded.level,
          updated_at     = now();
  end if;
end;
$$;

-- Trigger DELETE sur reviews
create or replace function public.trg_review_points_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.point_events
  where source_id   = old.id
    and source_type = 'review';

  perform public.recalc_user_points(old.user_id);
  return old;
end;
$$;

drop trigger if exists trg_review_points_delete on public.reviews;
create trigger trg_review_points_delete
  after delete on public.reviews
  for each row execute function public.trg_review_points_delete();

-- Trigger DELETE sur quotes
create or replace function public.trg_quote_points_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.point_events
  where source_id   = old.id
    and source_type = 'quote';

  perform public.recalc_user_points(old.user_id);
  return old;
end;
$$;

drop trigger if exists trg_quote_points_delete on public.quotes;
create trigger trg_quote_points_delete
  after delete on public.quotes
  for each row execute function public.trg_quote_points_delete();

-- ============================================================
-- 2. pg_cron : job mensuel (1er du mois à 00:05 UTC)
-- ============================================================
select cron.schedule(
  'monthly-gamification',
  '5 0 1 * *',
  $$
    -- Calcul classement du mois écoulé
    with monthly as (
      select
        pe.user_id,
        sum(pe.points)                                                     as pts,
        count(*) filter (where pe.reason in ('review','review_long'))      as rev_count,
        count(*) filter (where pe.reason = 'quote')                        as quote_count,
        count(*) filter (where pe.reason in ('correction','cover_fix'))    as corr_count
      from public.point_events pe
      where pe.created_at >= date_trunc('month', now() - interval '1 month')
        and pe.created_at <  date_trunc('month', now())
        and pe.reason not in ('like_received','follow_received')
      group by pe.user_id
      having sum(pe.points) > 0
    ),
    ranked as (
      select *,
        row_number() over (order by pts desc)    as rk,
        percent_rank() over (order by pts desc)  as pct
      from monthly
    )
    insert into public.monthly_leaderboard
      (user_id, year_month, points_earned, rank, reviews_count, quotes_count, corrections_count, is_top_contributor)
    select
      user_id,
      to_char(now() - interval '1 month', 'YYYY-MM'),
      pts, rk, rev_count, quote_count, corr_count,
      pct <= 0.03
    from ranked
    on conflict (user_id, year_month) do update
      set points_earned    = excluded.points_earned,
          rank             = excluded.rank,
          reviews_count    = excluded.reviews_count,
          quotes_count     = excluded.quotes_count,
          corrections_count = excluded.corrections_count,
          is_top_contributor = excluded.is_top_contributor,
          computed_at      = now();

    -- Expirer les anciens badges top_contributor
    update public.user_badges
    set expires_at = now()
    where badge_id = 'top_contributor'
      and (expires_at is null or expires_at > now());

    -- Attribuer les nouveaux badges top_contributor
    insert into public.user_badges (user_id, badge_id, expires_at)
    select
      user_id,
      'top_contributor',
      date_trunc('month', now()) + interval '1 month'
    from public.monthly_leaderboard
    where year_month = to_char(now() - interval '1 month', 'YYYY-MM')
      and is_top_contributor = true
    on conflict (user_id, badge_id) do update
      set expires_at = excluded.expires_at,
          awarded_at = now();

    -- Reset monthly_points
    update public.user_points
    set monthly_points = 0,
        updated_at     = now();
  $$
);
