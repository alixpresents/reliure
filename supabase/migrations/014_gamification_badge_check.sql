-- Attribution automatique des badges
-- Fonction check_and_award_badges + trigger sur point_events + backfill

-- ============================================================
-- 1. Fonction principale
-- ============================================================
create or replace function public.check_and_award_badges(
  p_user_id uuid,
  p_reason  text default null  -- si fourni, ne checker que les condition_types pertinents
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec           record;
  current_val   bigint;
  cond_met      boolean;
  -- Variables pour consecutive_months
  m_count       int;
  check_month   date;
  has_activity  boolean;
begin
  for rec in
    select id, condition_type, condition_threshold
    from public.badge_definitions
    where is_active = true
      and condition_type not in ('manual', 'monthly_top', 'max_tier_reached', 'count_challenges_completed')
      -- Optimisation : filtrer par reason si fourni
      and (
        p_reason is null  -- backfill : tout checker
        or (
          case p_reason
            when 'read' then condition_type in ('count_read','count_read_year','count_genres','page_count_min','read_speed_days','consecutive_months')
            when 'reading_status' then condition_type in ('count_read','count_read_year','count_genres','page_count_min','read_speed_days','consecutive_months')
            when 'finish_book' then condition_type in ('count_read','count_read_year','count_genres','page_count_min','read_speed_days','consecutive_months')
            when 'review' then condition_type in ('count_reviews','count_long_reviews','night_review','consecutive_months')
            when 'review_long' then condition_type in ('count_reviews','count_long_reviews','night_review','consecutive_months')
            when 'quote' then condition_type in ('count_quotes','consecutive_months')
            when 'list' then condition_type in ('count_public_lists','consecutive_months')
            when 'list_created' then condition_type in ('count_public_lists','consecutive_months')
            when 'follow' then condition_type in ('count_following','consecutive_months')
            when 'follow_received' then condition_type in ('count_followers','consecutive_months')
            when 'like_received' then condition_type in ('count_likes_received','consecutive_months')
            else true  -- reason inconnue → tout checker
          end
        )
      )
      -- Ne pas re-vérifier les badges déjà obtenus
      and not exists (
        select 1 from public.user_badges ub
        where ub.user_id = p_user_id and ub.badge_id = badge_definitions.id
      )
  loop
    cond_met := false;
    current_val := 0;

    case rec.condition_type
      -- ─── Compteurs de lecture ───
      when 'count_read' then
        select count(*) into current_val
        from public.reading_status
        where user_id = p_user_id and status = 'read';
        cond_met := current_val >= rec.condition_threshold;

      when 'count_read_year' then
        select count(*) into current_val
        from public.reading_status
        where user_id = p_user_id
          and status = 'read'
          and finished_at >= date_trunc('year', now());
        cond_met := current_val >= rec.condition_threshold;

      when 'count_genres' then
        select count(distinct genre) into current_val
        from public.reading_status rs
        join public.books b on rs.book_id = b.id,
        jsonb_array_elements_text(b.genres) as genre
        where rs.user_id = p_user_id and rs.status = 'read';
        cond_met := current_val >= rec.condition_threshold;

      when 'page_count_min' then
        select case when exists(
          select 1
          from public.reading_status rs
          join public.books b on rs.book_id = b.id
          where rs.user_id = p_user_id
            and rs.status = 'read'
            and b.page_count >= rec.condition_threshold
        ) then true else false end into cond_met;

      when 'read_speed_days' then
        -- finished_at et started_at sont de type date → date - date = integer (jours)
        select case when exists(
          select 1
          from public.reading_status
          where user_id = p_user_id
            and status = 'read'
            and started_at is not null
            and finished_at is not null
            and (finished_at - started_at) < rec.condition_threshold
        ) then true else false end into cond_met;

      -- ─── Compteurs de contribution ───
      when 'count_reviews' then
        select count(*) into current_val
        from public.reviews
        where user_id = p_user_id;
        cond_met := current_val >= rec.condition_threshold;

      when 'count_long_reviews' then
        select count(*) into current_val
        from public.reviews
        where user_id = p_user_id and char_length(body) >= 500;
        cond_met := current_val >= rec.condition_threshold;

      when 'count_quotes' then
        select count(*) into current_val
        from public.quotes
        where user_id = p_user_id;
        cond_met := current_val >= rec.condition_threshold;

      when 'count_public_lists' then
        select count(*) into current_val
        from public.lists
        where user_id = p_user_id and is_public = true;
        cond_met := current_val >= rec.condition_threshold;

      -- ─── Compteurs sociaux ───
      when 'count_following' then
        select count(*) into current_val
        from public.follows
        where follower_id = p_user_id;
        cond_met := current_val >= rec.condition_threshold;

      when 'count_followers' then
        select count(*) into current_val
        from public.follows
        where following_id = p_user_id;
        cond_met := current_val >= rec.condition_threshold;

      when 'count_likes_received' then
        select count(*) into current_val
        from public.point_events
        where user_id = p_user_id and reason = 'like_received';
        cond_met := current_val >= rec.condition_threshold;

      -- ─── Spéciaux ───
      when 'night_review' then
        select case when exists(
          select 1
          from public.reviews
          where user_id = p_user_id
            and extract(hour from created_at) >= 2
            and extract(hour from created_at) < 5
        ) then true else false end into cond_met;

      when 'consecutive_months' then
        m_count := 0;
        check_month := date_trunc('month', now())::date;
        loop
          select exists(
            select 1 from public.point_events
            where user_id = p_user_id
              and created_at >= check_month::timestamptz
              and created_at < (check_month + interval '1 month')::timestamptz
          ) into has_activity;

          if has_activity then
            m_count := m_count + 1;
            check_month := (check_month - interval '1 month')::date;
          else
            exit;
          end if;

          if m_count >= rec.condition_threshold then
            exit;
          end if;
        end loop;
        cond_met := m_count >= rec.condition_threshold;

      else
        -- condition_type non géré → ignorer
        continue;
    end case;

    -- Attribuer le badge si la condition est remplie
    if cond_met then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, rec.id)
      on conflict (user_id, badge_id) do nothing;
    end if;

  end loop;
end;
$$;

-- ============================================================
-- 2. Trigger sur point_events
-- ============================================================
create or replace function public.trg_check_badges_after_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_and_award_badges(NEW.user_id, NEW.reason);
  return NEW;
end;
$$;

drop trigger if exists trg_badge_check on public.point_events;
create trigger trg_badge_check
  after insert on public.point_events
  for each row
  execute function public.trg_check_badges_after_points();

-- ============================================================
-- 3. Backfill : attribuer les badges rétroactivement
-- ============================================================
do $$
declare
  uid uuid;
begin
  for uid in select user_id from public.user_points
  loop
    perform public.check_and_award_badges(uid, null);
  end loop;
end;
$$;
