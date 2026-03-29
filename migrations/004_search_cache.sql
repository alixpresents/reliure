-- Table de cache pour les résultats de recherche IA (smart-search)
-- Accès uniquement via service_role dans l'edge function

create table if not exists public.search_cache (
  query_normalized text primary key,
  response jsonb not null,
  hit_count int default 1,
  created_at timestamptz default now(),
  expires_at timestamptz default now() + interval '7 days'
);

create index if not exists search_cache_expires_idx
  on public.search_cache (expires_at);

-- Pas de RLS publique, accès uniquement via service_role
alter table public.search_cache enable row level security;

-- Purge automatique quotidienne (décommenter si pg_cron est activé)
-- select cron.schedule(
--   'purge-search-cache',
--   '0 4 * * *',
--   $$delete from public.search_cache where expires_at < now()$$
-- );
