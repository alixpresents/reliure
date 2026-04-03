-- 027_electre_integration.sql
-- Ajoute les colonnes Electre NG à la table books pour l'intégration
-- de la source de métadonnées de référence pour les livres francophones.

-- Identifiants Electre pour synchronisation et dédup
alter table public.books add column if not exists electre_notice_id text;
alter table public.books add column if not exists oeuvre_id text;

-- Métadonnées enrichies par Electre
alter table public.books add column if not exists collection_name text;
alter table public.books add column if not exists flag_fiction boolean;
alter table public.books add column if not exists quatrieme_de_couverture text;
alter table public.books add column if not exists disponibilite text;

-- Index pour la synchro Electre
create unique index if not exists books_electre_notice_id_idx
  on public.books (electre_notice_id) where electre_notice_id is not null;
create index if not exists books_oeuvre_id_idx
  on public.books (oeuvre_id) where oeuvre_id is not null;
