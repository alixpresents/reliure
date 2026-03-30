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

-- Service role peut tout faire sur le cache
CREATE POLICY "service_full_access" ON search_cache FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Les utilisateurs authentifiés peuvent lire le cache
CREATE POLICY "authenticated_read" ON search_cache FOR SELECT TO authenticated USING (true);

-- Purge automatique toutes les heures
SELECT cron.schedule(
  'clean-expired-search-cache',
  '0 * * * *',
  $$DELETE FROM search_cache WHERE expires_at < now()$$
);
