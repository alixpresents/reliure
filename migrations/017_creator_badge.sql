-- 017: Badge Créateur + réservation de usernames pour la bêta
-- Tables : reserved_usernames, RPC check_username_availability
-- Seed : badge 'creator' dans badge_definitions
-- Colonnes ajoutées : badge_definitions.color, user_badges.awarded_by

-- ═══════════════════════════════════════════════════════════════════
-- 1. Table reserved_usernames
-- ═══════════════════════════════════════════════════════════════════
-- RLS désactivée — gestion manuelle via service_role uniquement.
-- À sécuriser avec des policies quand un système admin existera.

create table if not exists public.reserved_usernames (
  username    text primary key,
  email       text not null,
  reserved_by uuid references public.users(id),
  reserved_at timestamptz default now() not null,
  claimed_at  timestamptz,
  notes       text
);

-- RLS off — accès via service_role ou SECURITY DEFINER RPCs
alter table public.reserved_usernames enable row level security;

-- Lecture publique pour vérifier la dispo à l'onboarding
create policy "reserved_usernames public read"
  on public.reserved_usernames for select using (true);

-- ═══════════════════════════════════════════════════════════════════
-- 2. Colonnes supplémentaires
-- ═══════════════════════════════════════════════════════════════════

-- Couleur affichée pour le badge (hex)
alter table public.badge_definitions
  add column if not exists color text not null default '#C9A96E';

-- Qui a attribué le badge (null = automatique)
alter table public.user_badges
  add column if not exists awarded_by uuid references public.users(id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Seed badge Créateur
-- ═══════════════════════════════════════════════════════════════════

insert into public.badge_definitions (id, name, description, category, icon, icon_key, condition_type, points, sort_order, color)
values ('creator', 'Créateur', 'Membre fondateur de la communauté Reliure', 'special', '✦', 'creator', 'manual', 0, 100, '#C9A96E')
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  color = excluded.color;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RPC check_username_availability
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.check_username_availability(p_username text, p_email text)
returns text
language plpgsql security definer
as $$
declare
  v_reserved reserved_usernames%rowtype;
  v_taken boolean;
begin
  -- Check reserved
  select * into v_reserved
  from public.reserved_usernames
  where lower(username) = lower(p_username);

  if found then
    if v_reserved.claimed_at is not null then
      return 'taken';
    elsif lower(v_reserved.email) = lower(p_email) then
      return 'reserved_for_you';
    else
      return 'reserved';
    end if;
  end if;

  -- Check taken in users
  select exists(
    select 1 from public.users where lower(username) = lower(p_username)
  ) into v_taken;

  if v_taken then return 'taken'; end if;

  return 'available';
end;
$$;

grant execute on function public.check_username_availability(text, text)
  to anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 5. RPC claim_reserved_username (SECURITY DEFINER — bypasse RLS)
-- ═══════════════════════════════════════════════════════════════════

create or replace function public.claim_reserved_username(p_username text)
returns void
language plpgsql security definer
as $$
begin
  update public.reserved_usernames
  set claimed_at = now()
  where lower(username) = lower(p_username)
    and claimed_at is null;
end;
$$;

grant execute on function public.claim_reserved_username(text)
  to authenticated;
