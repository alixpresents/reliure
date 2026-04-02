-- ============================================
-- 018 — Sélections éditoriales curées
-- ============================================

-- Nouvelles colonnes sur lists
alter table public.lists
  add column if not exists is_curated boolean default false,
  add column if not exists curator_name text,
  add column if not exists curator_role text,
  add column if not exists curator_avatar_url text,
  add column if not exists curator_intro text,
  add column if not exists curator_pull_quote text,
  add column if not exists published_at timestamptz;

-- Index pour les requêtes sur les sélections curées
create index if not exists lists_curated_idx on public.lists (is_curated, published_at desc) where is_curated = true;

-- RPC : liste des sélections curées (pour l'index /selections et Explorer)
create or replace function curated_selections()
returns table (
  id uuid,
  title text,
  description text,
  slug text,
  curator_name text,
  curator_role text,
  curator_avatar_url text,
  curator_intro text,
  curator_pull_quote text,
  published_at timestamptz,
  likes_count int,
  book_count bigint,
  covers jsonb
)
language sql stable
as $$
  select
    l.id,
    l.title,
    l.description,
    l.slug,
    l.curator_name,
    l.curator_role,
    l.curator_avatar_url,
    l.curator_intro,
    l.curator_pull_quote,
    l.published_at,
    l.likes_count,
    (select count(*) from public.list_items li2 where li2.list_id = l.id) as book_count,
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'cover_url', b.cover_url,
          'title', b.title,
          'slug', b.slug
        ) order by li.position
      ), '[]'::jsonb)
      from public.list_items li
      join public.books b on b.id = li.book_id
      where li.list_id = l.id
    ) as covers
  from public.lists l
  where l.is_curated = true
    and l.is_public = true
    and l.published_at is not null
  order by l.published_at desc;
$$;

-- RPC : détail d'une sélection par slug (pour la page /selections/:slug)
create or replace function curated_selection_by_slug(p_slug text)
returns table (
  id uuid,
  title text,
  description text,
  slug text,
  curator_name text,
  curator_role text,
  curator_avatar_url text,
  curator_intro text,
  curator_pull_quote text,
  published_at timestamptz,
  likes_count int,
  items jsonb
)
language sql stable
as $$
  select
    l.id,
    l.title,
    l.description,
    l.slug,
    l.curator_name,
    l.curator_role,
    l.curator_avatar_url,
    l.curator_intro,
    l.curator_pull_quote,
    l.published_at,
    l.likes_count,
    (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'position', li.position,
          'note', li.note,
          'book_id', b.id,
          'title', b.title,
          'authors', b.authors,
          'cover_url', b.cover_url,
          'slug', b.slug,
          'publication_date', b.publication_date,
          'page_count', b.page_count
        ) order by li.position
      ), '[]'::jsonb)
      from public.list_items li
      join public.books b on b.id = li.book_id
      where li.list_id = l.id
    ) as items
  from public.lists l
  where l.slug = p_slug
    and l.is_curated = true
    and l.is_public = true
  limit 1;
$$;
