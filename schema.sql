-- ============================================
-- Reliure — Schema PostgreSQL pour Supabase
-- ============================================
-- Exécuter dans le SQL Editor de Supabase
-- RLS activé sur toutes les tables

-- ─── Extensions ──────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Types enum ──────────────────────────────
create type reading_status_type as enum ('want_to_read', 'reading', 'read', 'abandoned');
create type activity_type as enum ('review', 'quote', 'list', 'reading_status', 'follow');
create type likeable_type as enum ('review', 'quote', 'list');

-- ─── Users ───────────────────────────────────
-- Étend le profil auth.users de Supabase
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,

  constraint username_length check (char_length(username) >= 2 and char_length(username) <= 30),
  constraint username_format check (username ~ '^[a-z0-9_]+$'),
  constraint bio_length check (char_length(bio) <= 160)
);

create unique index users_username_lower_idx on public.users (lower(username));

-- ─── Books ───────────────────────────────────
create table public.books (
  id uuid default uuid_generate_v4() primary key,
  isbn_13 text,
  title text not null,
  subtitle text,
  authors jsonb default '[]'::jsonb,
  publisher text,
  publication_date text,
  cover_url text,
  language text default 'fr',
  genres jsonb default '[]'::jsonb,
  page_count int,
  avg_rating numeric(3,2) default 0,
  rating_count int default 0,
  source text,
  created_at timestamptz default now() not null
);

create unique index books_isbn_idx on public.books (isbn_13) where isbn_13 is not null;
create index books_title_idx on public.books using gin (to_tsvector('french', title));

-- ─── Reading Status ──────────────────────────
-- Le coeur de l'app : tracker ses lectures
-- finished_at nullable : si renseigné → diary, sinon → bibliothèque seulement
-- is_reread : distingue les relectures (chaque relecture = une nouvelle entrée)
create table public.reading_status (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  status reading_status_type not null,
  started_at date,
  finished_at date,
  current_page int default 0,
  is_reread boolean default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index reading_status_user_idx on public.reading_status (user_id);
create index reading_status_user_status_idx on public.reading_status (user_id, status);
create index reading_status_diary_idx on public.reading_status (user_id, finished_at desc)
  where status = 'read' and finished_at is not null;

-- ─── Reading Log Tags ────────────────────────
-- Tags personnels libres au moment du log
-- "en vacances", "recommandé par Margaux", "avion CDG-JFK"
-- Privés par défaut
create table public.reading_log_tags (
  id uuid default uuid_generate_v4() primary key,
  reading_status_id uuid references public.reading_status(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  tag_text text not null,
  created_at timestamptz default now() not null,

  constraint tag_length check (char_length(tag_text) >= 1 and char_length(tag_text) <= 100)
);

create index reading_log_tags_status_idx on public.reading_log_tags (reading_status_id);
create index reading_log_tags_user_idx on public.reading_log_tags (user_id);

-- ─── Reviews ─────────────────────────────────
create table public.reviews (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  rating smallint check (rating >= 1 and rating <= 5),
  body text,
  contains_spoilers boolean default false,
  likes_count int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index reviews_book_idx on public.reviews (book_id, created_at desc);
create index reviews_user_idx on public.reviews (user_id, created_at desc);

-- ─── Quotes ──────────────────────────────────
create table public.quotes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  body text not null,
  likes_count int default 0,
  created_at timestamptz default now() not null,

  constraint quote_length check (char_length(body) >= 1 and char_length(body) <= 1000)
);

create index quotes_book_idx on public.quotes (book_id, created_at desc);
create index quotes_user_idx on public.quotes (user_id, created_at desc);

-- ─── Lists ───────────────────────────────────
create table public.lists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null,
  description text,
  is_public boolean default true,
  is_ranked boolean default false,
  likes_count int default 0,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index lists_user_idx on public.lists (user_id, created_at desc);

create table public.list_items (
  id uuid default uuid_generate_v4() primary key,
  list_id uuid references public.lists(id) on delete cascade not null,
  book_id uuid references public.books(id) on delete cascade not null,
  position int not null default 0,
  note text,

  unique (list_id, book_id)
);

create index list_items_list_idx on public.list_items (list_id, position);

-- ─── Follows ─────────────────────────────────
create table public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.users(id) on delete cascade not null,
  following_id uuid references public.users(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  unique (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

create index follows_follower_idx on public.follows (follower_id);
create index follows_following_idx on public.follows (following_id);

-- ─── Likes ───────────────────────────────────
-- Table polymorphe pour les likes sur reviews, quotes, lists
create table public.likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  target_id uuid not null,
  target_type likeable_type not null,
  created_at timestamptz default now() not null,

  unique (user_id, target_id, target_type)
);

create index likes_target_idx on public.likes (target_id, target_type);
create index likes_user_idx on public.likes (user_id);

-- ─── Activity ────────────────────────────────
-- Event log polymorphe pour le fil d'activité
create table public.activity (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  action_type activity_type not null,
  target_id uuid not null,
  target_type text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index activity_user_idx on public.activity (user_id, created_at desc);
create index activity_feed_idx on public.activity (created_at desc);

-- ─── Fonctions utilitaires ───────────────────

-- Mise à jour automatique de updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger reading_status_updated_at
  before update on public.reading_status
  for each row execute function update_updated_at();

create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function update_updated_at();

create trigger lists_updated_at
  before update on public.lists
  for each row execute function update_updated_at();

-- Trigger pour maintenir likes_count sur reviews
create or replace function update_likes_count()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    if new.target_type = 'review' then
      update public.reviews set likes_count = likes_count + 1 where id = new.target_id;
    elsif new.target_type = 'quote' then
      update public.quotes set likes_count = likes_count + 1 where id = new.target_id;
    elsif new.target_type = 'list' then
      update public.lists set likes_count = likes_count + 1 where id = new.target_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.target_type = 'review' then
      update public.reviews set likes_count = greatest(0, likes_count - 1) where id = old.target_id;
    elsif old.target_type = 'quote' then
      update public.quotes set likes_count = greatest(0, likes_count - 1) where id = old.target_id;
    elsif old.target_type = 'list' then
      update public.lists set likes_count = greatest(0, likes_count - 1) where id = old.target_id;
    end if;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger likes_count_trigger
  after insert or delete on public.likes
  for each row execute function update_likes_count();

-- Trigger pour maintenir avg_rating et rating_count sur books
create or replace function update_book_rating()
returns trigger as $$
begin
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    update public.books set
      avg_rating = coalesce((select avg(rating)::numeric(3,2) from public.reviews where book_id = new.book_id and rating is not null), 0),
      rating_count = (select count(*) from public.reviews where book_id = new.book_id and rating is not null)
    where id = new.book_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.books set
      avg_rating = coalesce((select avg(rating)::numeric(3,2) from public.reviews where book_id = old.book_id and rating is not null), 0),
      rating_count = (select count(*) from public.reviews where book_id = old.book_id and rating is not null)
    where id = old.book_id;
    return old;
  end if;
end;
$$ language plpgsql;

create trigger book_rating_trigger
  after insert or update or delete on public.reviews
  for each row execute function update_book_rating();

-- ─── Row Level Security ──────────────────────

-- Users
alter table public.users enable row level security;
create policy "Profils publics en lecture" on public.users for select using (true);
create policy "Modifier son propre profil" on public.users for update using (auth.uid() = id);
create policy "Créer son profil à l'inscription" on public.users for insert with check (auth.uid() = id);

-- Books
alter table public.books enable row level security;
create policy "Livres en lecture publique" on public.books for select using (true);
create policy "Tout utilisateur peut ajouter un livre" on public.books for insert with check (auth.role() = 'authenticated');

-- Reading Status
alter table public.reading_status enable row level security;
create policy "Statuts de lecture publics" on public.reading_status for select using (true);
create policy "Gérer ses propres statuts" on public.reading_status for insert with check (auth.uid() = user_id);
create policy "Modifier ses propres statuts" on public.reading_status for update using (auth.uid() = user_id);
create policy "Supprimer ses propres statuts" on public.reading_status for delete using (auth.uid() = user_id);

-- Reading Log Tags (privés par défaut)
alter table public.reading_log_tags enable row level security;
create policy "Voir ses propres tags" on public.reading_log_tags for select using (auth.uid() = user_id);
create policy "Créer ses propres tags" on public.reading_log_tags for insert with check (auth.uid() = user_id);
create policy "Supprimer ses propres tags" on public.reading_log_tags for delete using (auth.uid() = user_id);

-- Reviews
alter table public.reviews enable row level security;
create policy "Critiques en lecture publique" on public.reviews for select using (true);
create policy "Écrire ses propres critiques" on public.reviews for insert with check (auth.uid() = user_id);
create policy "Modifier ses propres critiques" on public.reviews for update using (auth.uid() = user_id);
create policy "Supprimer ses propres critiques" on public.reviews for delete using (auth.uid() = user_id);

-- Quotes
alter table public.quotes enable row level security;
create policy "Citations en lecture publique" on public.quotes for select using (true);
create policy "Ajouter ses propres citations" on public.quotes for insert with check (auth.uid() = user_id);
create policy "Supprimer ses propres citations" on public.quotes for delete using (auth.uid() = user_id);

-- Lists
alter table public.lists enable row level security;
create policy "Listes publiques en lecture" on public.lists for select using (is_public = true or auth.uid() = user_id);
create policy "Créer ses propres listes" on public.lists for insert with check (auth.uid() = user_id);
create policy "Modifier ses propres listes" on public.lists for update using (auth.uid() = user_id);
create policy "Supprimer ses propres listes" on public.lists for delete using (auth.uid() = user_id);

-- List Items
alter table public.list_items enable row level security;
create policy "Items visibles si liste visible" on public.list_items for select using (
  exists (select 1 from public.lists where id = list_id and (is_public = true or user_id = auth.uid()))
);
create policy "Gérer les items de ses listes" on public.list_items for insert with check (
  exists (select 1 from public.lists where id = list_id and user_id = auth.uid())
);
create policy "Modifier les items de ses listes" on public.list_items for update using (
  exists (select 1 from public.lists where id = list_id and user_id = auth.uid())
);
create policy "Supprimer les items de ses listes" on public.list_items for delete using (
  exists (select 1 from public.lists where id = list_id and user_id = auth.uid())
);

-- Follows
alter table public.follows enable row level security;
create policy "Follows en lecture publique" on public.follows for select using (true);
create policy "Suivre quelqu'un" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Se désabonner" on public.follows for delete using (auth.uid() = follower_id);

-- Likes
alter table public.likes enable row level security;
create policy "Likes en lecture publique" on public.likes for select using (true);
create policy "Liker" on public.likes for insert with check (auth.uid() = user_id);
create policy "Retirer son like" on public.likes for delete using (auth.uid() = user_id);

-- Activity
alter table public.activity enable row level security;
create policy "Activité en lecture publique" on public.activity for select using (true);
create policy "Créer sa propre activité" on public.activity for insert with check (auth.uid() = user_id);
