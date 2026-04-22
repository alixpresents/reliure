-- Onboarding picks : liste curatée de ~50 livres proposés lors de l'import initial
-- (BackfillPage "Les plus lus"). Remplace le hardcode `B` de src/data/index.js.

create table if not exists public.onboarding_picks (
  id bigserial primary key,
  position int not null,
  book_id uuid not null references public.books(id) on delete cascade,
  category text not null check (category in ('classique', 'best_seller', 'incontournable', 'goncourt')),
  created_at timestamptz not null default now(),
  unique (book_id)
);

create index if not exists idx_onboarding_picks_position on public.onboarding_picks (position);

alter table public.onboarding_picks enable row level security;

-- Lecture publique (liste visible par tous pour l'onboarding)
create policy "onboarding_picks_select" on public.onboarding_picks
  for select using (true);

-- Pas d'écriture publique — seed via service_role
