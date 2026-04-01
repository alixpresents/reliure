-- Gamification : points, niveaux, badges

-- Catégories de badges
do $$ begin
  create type badge_category as enum ('lecture', 'contribution', 'social', 'defis', 'special');
exception when duplicate_object then null;
end $$;

-- Ajouter les valeurs manquantes si l'enum existait déjà partiellement
do $$ begin alter type badge_category add value if not exists 'lecture';     exception when others then null; end $$;
do $$ begin alter type badge_category add value if not exists 'contribution'; exception when others then null; end $$;
do $$ begin alter type badge_category add value if not exists 'social';      exception when others then null; end $$;
do $$ begin alter type badge_category add value if not exists 'defis';       exception when others then null; end $$;
do $$ begin alter type badge_category add value if not exists 'special';     exception when others then null; end $$;

-- Définitions des badges (catalogue)
create table if not exists public.badge_definitions (
  id          text primary key,          -- ex: "first_book", "night_owl"
  name        text not null,             -- "Premier livre"
  description text not null,             -- "Tu as terminé ton premier livre"
  category    badge_category not null,
  icon        text not null default '📚', -- emoji ou nom d'icône
  points      int not null default 0,    -- points octroyés à l'obtention
  sort_order  int not null default 0
);

-- Points par événement (log immuable)
create table if not exists public.point_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  event_type  text not null,             -- "book_read", "review_written", "badge_earned", etc.
  points      int not null,              -- peut être négatif (correction)
  metadata    jsonb default '{}',
  created_at  timestamptz not null default now()
);

-- Totaux dénormalisés par utilisateur
create table if not exists public.user_points (
  user_id      uuid primary key references public.users(id) on delete cascade,
  total_points int not null default 0,
  level        int not null default 1,
  updated_at   timestamptz not null default now()
);

-- Badges débloqués par utilisateur
create table if not exists public.user_badges (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  badge_id            text not null references public.badge_definitions(id) on delete cascade,
  awarded_at          timestamptz not null default now(),
  expires_at          timestamptz,        -- null = permanent
  is_pinned           boolean not null default false,
  unique (user_id, badge_id)
);

-- Index
create index if not exists point_events_user_id_idx on public.point_events(user_id);
create index if not exists user_badges_user_id_idx on public.user_badges(user_id);
create index if not exists user_badges_pinned_idx on public.user_badges(user_id, is_pinned) where is_pinned = true;

-- RLS
alter table public.badge_definitions enable row level security;
alter table public.point_events enable row level security;
alter table public.user_points enable row level security;
alter table public.user_badges enable row level security;

-- Lecture publique
create policy "badge_definitions public read" on public.badge_definitions for select using (true);
create policy "user_points public read"       on public.user_points       for select using (true);
create policy "user_badges public read"       on public.user_badges       for select using (true);
-- point_events : owner only
create policy "point_events owner read" on public.point_events for select using (auth.uid() = user_id);

-- Colonnes manquantes (si table créée manuellement sans elles)
alter table public.badge_definitions add column if not exists icon       text not null default '📚';
alter table public.badge_definitions add column if not exists points     int  not null default 0;
alter table public.badge_definitions add column if not exists sort_order int  not null default 0;
-- icon_key : colonne existante dans certains envs, s'assurer qu'elle a une valeur par défaut
alter table public.badge_definitions alter column icon_key set default '';

-- Les badges de départ sont dans la migration suivante (013)
-- pour éviter l'erreur PostgreSQL "unsafe use of new enum value in same transaction"
