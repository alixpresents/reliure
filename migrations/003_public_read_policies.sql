-- Migration 003 : policies RLS pour la lecture publique des profils
-- Les données de lecture/bibliothèque/favoris/critiques/citations/listes
-- sont lisibles par tout le monde (y compris les visiteurs non connectés).
-- Les listes privées restent visibles uniquement par leur propriétaire.
-- Les tags personnels (reading_log_tags) restent privés.

-- ────────────────────────────────────────────────────────────────
-- users
-- ────────────────────────────────────────────────────────────────
alter table users enable row level security;

drop policy if exists "Profils publics en lecture" on users;
create policy "Profils publics en lecture" on users
  for select using (true);

-- ────────────────────────────────────────────────────────────────
-- books
-- ────────────────────────────────────────────────────────────────
alter table books enable row level security;

drop policy if exists "Livres en lecture publique" on books;
create policy "Livres en lecture publique" on books
  for select using (true);

-- ────────────────────────────────────────────────────────────────
-- reading_status
-- ────────────────────────────────────────────────────────────────
alter table reading_status enable row level security;

drop policy if exists "Statuts de lecture publics" on reading_status;
drop policy if exists "Statuts de lecture — insertion" on reading_status;
drop policy if exists "Statuts de lecture — modification" on reading_status;
drop policy if exists "Statuts de lecture — suppression" on reading_status;

create policy "Statuts de lecture publics" on reading_status
  for select using (true);
create policy "Statuts de lecture — insertion" on reading_status
  for insert with check (auth.uid() = user_id);
create policy "Statuts de lecture — modification" on reading_status
  for update using (auth.uid() = user_id);
create policy "Statuts de lecture — suppression" on reading_status
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- user_favorites
-- ────────────────────────────────────────────────────────────────
alter table user_favorites enable row level security;

drop policy if exists "Favoris en lecture publique" on user_favorites;
drop policy if exists "Favoris — insertion" on user_favorites;
drop policy if exists "Favoris — modification" on user_favorites;
drop policy if exists "Favoris — suppression" on user_favorites;

create policy "Favoris en lecture publique" on user_favorites
  for select using (true);
create policy "Favoris — insertion" on user_favorites
  for insert with check (auth.uid() = user_id);
create policy "Favoris — modification" on user_favorites
  for update using (auth.uid() = user_id);
create policy "Favoris — suppression" on user_favorites
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- reviews
-- ────────────────────────────────────────────────────────────────
alter table reviews enable row level security;

drop policy if exists "Critiques en lecture publique" on reviews;
drop policy if exists "Critiques — insertion" on reviews;
drop policy if exists "Critiques — modification" on reviews;
drop policy if exists "Critiques — suppression" on reviews;

create policy "Critiques en lecture publique" on reviews
  for select using (true);
create policy "Critiques — insertion" on reviews
  for insert with check (auth.uid() = user_id);
create policy "Critiques — modification" on reviews
  for update using (auth.uid() = user_id);
create policy "Critiques — suppression" on reviews
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- quotes
-- ────────────────────────────────────────────────────────────────
alter table quotes enable row level security;

drop policy if exists "Citations en lecture publique" on quotes;
drop policy if exists "Citations — insertion" on quotes;
drop policy if exists "Citations — modification" on quotes;
drop policy if exists "Citations — suppression" on quotes;

create policy "Citations en lecture publique" on quotes
  for select using (true);
create policy "Citations — insertion" on quotes
  for insert with check (auth.uid() = user_id);
create policy "Citations — modification" on quotes
  for update using (auth.uid() = user_id);
create policy "Citations — suppression" on quotes
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- lists : listes publiques lisibles par tous, privées par owner seulement
-- ────────────────────────────────────────────────────────────────
alter table lists enable row level security;

drop policy if exists "Listes publiques en lecture" on lists;
drop policy if exists "Listes — insertion" on lists;
drop policy if exists "Listes — modification" on lists;
drop policy if exists "Listes — suppression" on lists;

create policy "Listes publiques en lecture" on lists
  for select using (is_public = true or auth.uid() = user_id);
create policy "Listes — insertion" on lists
  for insert with check (auth.uid() = user_id);
create policy "Listes — modification" on lists
  for update using (auth.uid() = user_id);
create policy "Listes — suppression" on lists
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- list_items : visibles si la liste parente est visible
-- ────────────────────────────────────────────────────────────────
alter table list_items enable row level security;

drop policy if exists "Items visibles si liste visible" on list_items;
drop policy if exists "Items — insertion" on list_items;
drop policy if exists "Items — modification" on list_items;
drop policy if exists "Items — suppression" on list_items;

create policy "Items visibles si liste visible" on list_items
  for select using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and (lists.is_public = true or lists.user_id = auth.uid())
    )
  );
create policy "Items — insertion" on list_items
  for insert with check (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy "Items — modification" on list_items
  for update using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );
create policy "Items — suppression" on list_items
  for delete using (
    exists (
      select 1 from lists
      where lists.id = list_items.list_id
        and lists.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────
-- follows : compteurs abonnés/abonnements lisibles publiquement
-- ────────────────────────────────────────────────────────────────
alter table follows enable row level security;

drop policy if exists "Follows en lecture publique" on follows;
drop policy if exists "Follows — insertion" on follows;
drop policy if exists "Follows — suppression" on follows;

create policy "Follows en lecture publique" on follows
  for select using (true);
create policy "Follows — insertion" on follows
  for insert with check (auth.uid() = follower_id);
create policy "Follows — suppression" on follows
  for delete using (auth.uid() = follower_id);

-- ────────────────────────────────────────────────────────────────
-- reading_log_tags : privés (propriétaire seulement)
-- ────────────────────────────────────────────────────────────────
alter table reading_log_tags enable row level security;

drop policy if exists "Tags personnels — lecture" on reading_log_tags;
drop policy if exists "Tags personnels — insertion" on reading_log_tags;
drop policy if exists "Tags personnels — modification" on reading_log_tags;
drop policy if exists "Tags personnels — suppression" on reading_log_tags;

create policy "Tags personnels — lecture" on reading_log_tags
  for select using (auth.uid() = user_id);
create policy "Tags personnels — insertion" on reading_log_tags
  for insert with check (auth.uid() = user_id);
create policy "Tags personnels — modification" on reading_log_tags
  for update using (auth.uid() = user_id);
create policy "Tags personnels — suppression" on reading_log_tags
  for delete using (auth.uid() = user_id);
