# Audit #3 — Schéma PostgreSQL & performances

> Date : 1 avril 2026
> Instance : Supabase PostgreSQL (eu-west-3)
> Volume : ~3 830 livres, ~20 beta users, ~15 tables
> Point chaud : RPC `search_books_v2`

---

## 1. Schéma annoté — index par table

### `books` (3 830 rows)

| Index | Type | Colonnes | Utilisé par | Remarque |
|-------|------|----------|-------------|----------|
| `books_pkey` | btree unique | `id` | FK lookups, JOINs | OK |
| `books_isbn_idx` | btree unique partial | `isbn_13 WHERE isbn_13 IS NOT NULL` | search_books_v2 (branche ISBN), deduplicateBook | OK |
| `books_slug_idx` | btree unique partial | `slug WHERE slug IS NOT NULL` | useBookBySlug | OK |
| `books_title_idx` | GIN | `to_tsvector('french', title)` | **Rien** | ⚠️ Inutilisé — search_books_v2 utilise `unaccent(lower()) LIKE`, pas `@@` tsvector |
| — | — | — | — | ⚠️ Manque : index sur `rating_count` (ORDER BY dans popular_books_week, search scoring) |
| — | — | — | — | ⚠️ Manque : index GIN trigram sur `title` et `authors::text` pour search_books_v2 |
| — | — | — | — | ⚠️ Manque : index GIN sur `genres` pour le filtre JSONB `@>` (useBooksByGenre) |

Colonnes ajoutées par migrations (pas dans schema.sql initial) : `slug`, `description`, `ai_confidence`, `awards` (référencée dans search_books_v2 mais definition introuvable — potentiel bug).

### `reading_status` (~200 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `reading_status_pkey` | btree unique | `id` | FK |
| `reading_status_user_idx` | btree | `user_id` | useProfileData, useReadingList |
| `reading_status_user_status_idx` | btree | `(user_id, status)` | useReadingList, filtre par statut |
| `reading_status_diary_idx` | btree partial | `(user_id, finished_at DESC) WHERE status='read' AND finished_at IS NOT NULL` | useProfileData diary |
| — | — | — | ⚠️ Manque : `reading_status_book_id_idx` sur `book_id` — FK non indexée |

### `reviews` (~100 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `reviews_pkey` | btree unique | `id` | FK, likes target |
| `reviews_book_idx` | btree | `(book_id, created_at DESC)` | useBookReviews |
| `reviews_user_idx` | btree | `(user_id, created_at DESC)` | useMyReviews |
| `reviews_user_id_idx` | btree | `user_id` | Mig 007, **redondant** avec reviews_user_idx |
| `reviews_book_id_idx` | btree | `book_id` | Mig 007, **redondant** avec reviews_book_idx |

⚠️ Les index de la migration 007 sont **redondants** : `reviews_user_idx (user_id, created_at)` couvre les lookups par `user_id` seul, et idem pour `reviews_book_idx`. Les 2 index simples ne font qu'occuper de l'espace.

### `quotes` (~50 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `quotes_pkey` | btree unique | `id` | FK, likes target |
| `quotes_book_idx` | btree | `(book_id, created_at DESC)` | useBookQuotes |
| `quotes_user_idx` | btree | `(user_id, created_at DESC)` | useMyQuotes |

OK — pas de manque.

### `lists` (~20 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `lists_pkey` | btree unique | `id` | FK, RLS policy |
| `lists_user_idx` | btree | `(user_id, created_at DESC)` | useMyLists |
| `lists_user_slug_unique` | btree unique | `(user_id, slug)` | useListBySlug |
| `idx_lists_public_owner` | btree | `(id, is_public, user_id)` | RLS policy list_items (mig 005) |

OK — bon coverage.

### `list_items` (~100 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `list_items_pkey` | btree unique | `id` | reorderItems |
| `list_items_list_idx` | btree | `(list_id, position)` | useListBySlug |
| `list_items_list_id_book_id_key` | btree unique | `(list_id, book_id)` | constraint UNIQUE |
| — | — | — | ⚠️ Manque : `list_items_book_id_idx` sur `book_id` — FK non indexée, utilisé par useBookLists |

### `follows` (~30 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `follows_pkey` | btree unique | `id` | — |
| `follows_follower_idx` | btree | `follower_id` | useFollowCounts, useFeed (futur) |
| `follows_following_idx` | btree | `following_id` | useFollowCounts |
| `follows_follower_following_key` | btree unique | `(follower_id, following_id)` | constraint UNIQUE |

OK.

### `likes` (~100 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `likes_pkey` | btree unique | `id` | — |
| `likes_target_idx` | btree | `(target_id, target_type)` | — (pas utilisé directement, le trigger lookup par target_id) |
| `likes_user_idx` | btree | `user_id` | useLikes |
| `likes_user_target_key` | btree unique | `(user_id, target_id, target_type)` | constraint UNIQUE, useLikes check |

OK — mais `likes_target_idx` pourrait être plus utile en tant que `(target_type, target_id)` pour le trigger `update_likes_count` (filtre par type d'abord).

### `user_favorites` (~40 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `user_favorites_pkey` | btree unique | `(user_id, position)` | PK composée |
| `user_favorites_user_book_key` | btree unique | `(user_id, book_id)` | constraint UNIQUE |
| `user_favorites_user_idx` | btree | `user_id` | useFavorites |

`user_favorites_user_idx` est **redondant** : la PK composée `(user_id, position)` couvre les lookups par `user_id` seul.

### `activity` (~200 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `activity_pkey` | btree unique | `id` | — |
| `activity_user_idx` | btree | `(user_id, created_at DESC)` | useFeed (futur : filtré par follows) |
| `activity_feed_idx` | btree | `(created_at DESC)` | useFeed (actuel : toutes activités) |

OK — prêt pour le feed filtré.

### `reading_log_tags` (~50 rows estimées)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `reading_log_tags_pkey` | btree unique | `id` | — |
| `reading_log_tags_status_idx` | btree | `reading_status_id` | join depuis reading_status |
| `reading_log_tags_user_idx` | btree | `user_id` | RLS policy |

OK.

### `search_cache`

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `search_cache_pkey` | btree unique | `query_normalized` | lookup exact |
| `search_cache_expires_idx` | btree | `expires_at` | cron purge |

OK.

### `users` (~20 rows)

| Index | Type | Colonnes | Utilisé par |
|-------|------|----------|-------------|
| `users_pkey` | btree unique | `id` | FK partout |
| `users_username_key` | btree unique | `username` | constraint UNIQUE |
| `users_username_lower_idx` | btree unique | `lower(username)` | usePublicProfile (lookup case-insensitive) |

OK.

---

## 2. Analyse détaillée de `search_books_v2`

### Code critique

La fonction est en `LANGUAGE plpgsql STABLE` avec 3 branches de matching :

1. **Branche ISBN** : `b.isbn_13 = q_digits` → utilise `books_isbn_idx` → **Index Scan**. OK.

2. **Branche compact** : `regexp_replace(unaccent(lower(b.title)), '[^a-z0-9]', '', 'g') LIKE '%' || q_compact || '%'` → **Seq Scan obligatoire**. `regexp_replace(unaccent(lower(...)))` est calculé pour chaque row. Aucun index ne couvre cette expression.

3. **Branche cross-field** (la plus fréquente) :
```sql
SELECT bool_and(
  unaccent(lower(b.title)) LIKE '%' || s.w || '%'
  OR unaccent(lower(b.authors::text)) LIKE '%' || s.w || '%'
)
FROM significant s
```
→ **Seq Scan obligatoire**. Pour chaque row de `books` :
  - Calcule `unaccent(lower(title))` — appel de fonction sur 2 extensions
  - Calcule `unaccent(lower(authors::text))` — cast JSONB→text + 2 fonctions
  - Fait un `LIKE '%..%'` pour **chaque mot significatif** (correlated subquery)
  - Calcule le score avec 4 subqueries supplémentaires

### EXPLAIN ANALYZE simulé (3 800 rows)

```
Pour la query "Victor Hugo Les Misérables" (3 mots significatifs) :

Seq Scan on books  (cost=0.00..XXX rows=3830)
  → Pour chaque row :
    ├─ unaccent(lower(title))      : ~0.01ms × 3830 = ~38ms
    ├─ unaccent(lower(authors))    : ~0.01ms × 3830 = ~38ms  
    ├─ LIKE '%victor%'             : string scan
    ├─ LIKE '%hugo%'               : string scan
    ├─ LIKE '%miserables%'         : string scan
    └─ scoring (4 subqueries)      : ~0.02ms × matched rows
  → Sort by score DESC
  → Limit 10

Temps estimé : ~30-50ms (3 800 rows)
                ~200-500ms à 50 000 rows
                ~2-5s à 500 000 rows
```

**Verdict à l'échelle actuelle** : 30-50ms est acceptable. Mais la complexité est O(N × M) où N = nombre de livres et M = nombre de mots dans la query. **Le problème arrivera à ~50 000 livres** (objectif réaliste en 1 an d'enrichissement).

### Problème : `unaccent` ne peut pas être indexé directement

`unaccent()` est une fonction `VOLATILE` dans PostgreSQL (car elle dépend du dictionnaire `unaccent`). Un index fonctionnel sur `unaccent(lower(title))` sera refusé.

**Solution** : créer une fonction `IMMUTABLE` wrapper :

```sql
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
```

Puis indexer `f_unaccent(lower(title))`. C'est safe tant que le dictionnaire `unaccent` ne change pas (il ne change jamais en pratique).

### Problème : `LIKE '%...%'` ne peut pas utiliser un btree

`LIKE 'prefix%'` peut utiliser un btree, mais `LIKE '%infix%'` ne le peut pas. Pour le matching infix, il faut un index **trigram** (extension `pg_trgm`).

### Solution recommandée : pg_trgm

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Index trigram sur le titre normalisé
CREATE INDEX idx_books_title_trgm 
  ON books USING gin (f_unaccent(lower(title)) gin_trgm_ops);

-- Index trigram sur les auteurs normalisés  
CREATE INDEX idx_books_authors_trgm 
  ON books USING gin (f_unaccent(lower(authors::text)) gin_trgm_ops);
```

Avec ces index, PostgreSQL peut résoudre `f_unaccent(lower(title)) LIKE '%hugo%'` via un **GIN Index Scan** au lieu d'un Seq Scan.

**Prérequis** : modifier search_books_v2 pour utiliser `f_unaccent` au lieu de `unaccent` directement.

---

## 3. Index manquants — commandes SQL exactes

### Priorité 1 — FK non indexées (critique pour DELETE CASCADE et JOINs)

```sql
-- reading_status.book_id : utilisé par popular_books_week JOIN, 
-- et critique pour DELETE CASCADE quand on supprime un livre
CREATE INDEX idx_reading_status_book_id 
  ON reading_status (book_id);

-- list_items.book_id : utilisé par useBookLists, 
-- et critique pour DELETE CASCADE quand on supprime un livre
CREATE INDEX idx_list_items_book_id 
  ON list_items (book_id);
```

**Impact** : sans ces index, un `DELETE FROM books WHERE id = X` doit faire un **Seq Scan** sur `reading_status` (et `list_items`) pour trouver les rows à cascader. À 200 rows c'est invisible, à 100 000 c'est un lock de plusieurs secondes.

### Priorité 2 — JSONB genres pour le filtre Explorer

```sql
-- Utilisé par useBooksByGenre : .filter("genres", "cs", '["Fiction"]')
-- PostgREST traduit "cs" en opérateur @> (contains)
CREATE INDEX idx_books_genres_gin 
  ON books USING gin (genres);
```

**Impact** : le filtre par genre passe de Seq Scan (3 800 rows) à GIN Index Scan.

### Priorité 3 — Trigram pour search_books_v2

```sql
-- Prérequis : extension + wrapper immutable
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;

-- Index trigram titre
CREATE INDEX idx_books_title_trgm 
  ON books USING gin (f_unaccent(lower(title)) gin_trgm_ops);

-- Index trigram auteurs
CREATE INDEX idx_books_authors_trgm 
  ON books USING gin (f_unaccent(lower(authors::text)) gin_trgm_ops);
```

**Puis** modifier search_books_v2 pour remplacer `unaccent(lower(...))` par `f_unaccent(lower(...))`.

**Impact** : search passe de Seq Scan à GIN Index Scan. Critique à partir de ~50 000 livres.

### Priorité 4 — Supprimer les index redondants

```sql
-- reviews_user_id_idx est redondant avec reviews_user_idx(user_id, created_at DESC)
DROP INDEX IF EXISTS reviews_user_id_idx;

-- reviews_book_id_idx est redondant avec reviews_book_idx(book_id, created_at DESC)
DROP INDEX IF EXISTS reviews_book_id_idx;

-- user_favorites_user_idx est redondant avec la PK (user_id, position)
DROP INDEX IF EXISTS user_favorites_user_idx;
```

**Impact** : 3 index en moins à maintenir. Gain marginal en écriture, mais hygiène.

### Priorité 5 — Index partiel pour `books.rating_count` (popular sort)

```sql
-- Utilisé par popular_books_week et search scoring tie-breaker
CREATE INDEX idx_books_rating_count 
  ON books (rating_count DESC NULLS LAST) 
  WHERE rating_count > 0;
```

### Priorité 6 — Index `books_title_idx` GIN tsvector inutilisé

L'index `books_title_idx USING gin (to_tsvector('french', title))` existe depuis le schéma initial mais **n'est jamais utilisé** : search_books_v2 utilise `LIKE`, pas `@@`. Deux options :

1. **Supprimer** : `DROP INDEX IF EXISTS books_title_idx;`
2. **Utiliser** : réécrire search_books_v2 pour combiner `@@` tsvector (recall) + trigram (ranking). Plus complexe mais plus performant à grande échelle.

Recommandation : **garder pour l'instant**, il sera utile si on ajoute une branche full-text à search_books_v2 plus tard.

---

## 4. N+1 côté application

### Confirmé : `reorderItems` dans useLists.js

```js
for (const item of updates) {
  await supabase.from("list_items").update({ position: item.position }).eq("id", item.id);
}
```

Pour une liste de N items, **N requêtes séquentielles**. Fix via RPC :

```sql
CREATE OR REPLACE FUNCTION reorder_list_items(
  p_list_id uuid,
  p_item_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE list_items li
  SET position = arr.ord
  FROM unnest(p_item_ids) WITH ORDINALITY AS arr(item_id, ord)
  WHERE li.id = arr.item_id
    AND li.list_id = p_list_id;
END;
$$;
```

### Semi-N+1 : `usePopularLists` dans useExplore.js

3 requêtes séquentielles (lists → list_items → count). La 2e dépend de la 1re (besoin des IDs), donc pas un vrai N+1, mais la 3e requête (count) pourrait être fusionnée. Fix via RPC déjà proposé dans l'audit #2.

### Semi-N+1 : `useFeed` vérification d'existence

3 requêtes parallèles (reviews, quotes, lists) avec `.in("id", ids)`. C'est correct — une seule requête par table, pas de boucle. **Pas un N+1.**

### Potentiel futur : feed filtré par follows

Quand le feed sera filtré par follows (`WHERE user_id IN (SELECT following_id FROM follows WHERE follower_id = $1)`), sans index composé sur `activity(user_id, created_at)`, ça deviendra coûteux. L'index `activity_user_idx` existe déjà → OK.

---

## 5. Policies RLS — analyse de coût

### P1. `list_items` SELECT — subquery EXISTS — MOYEN

```sql
CREATE POLICY "Items visibles si liste visible" ON list_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
        AND (lists.is_public = true OR lists.user_id = auth.uid())
    )
  );
```

Cette policy s'exécute **pour chaque row** retournée par une query sur `list_items`. La subquery fait un lookup par PK (`lists.id`), donc c'est un Index Scan unique à chaque fois.

L'index `idx_lists_public_owner (id, is_public, user_id)` de la migration 005 couvre exactement cette query → **optimisé**. Coût : ~0.01ms par row. OK.

### P2. `list_items` INSERT/UPDATE/DELETE — subquery EXISTS

```sql
EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth.uid())
```

Même pattern, même index. OK.

### P3. `lists` SELECT — condition `is_public = true OR auth.uid() = user_id`

Pas de subquery, évaluation triviale sur les colonnes de la row. OK.

### P4. Toutes les autres tables — `using (true)` ou `auth.uid() = user_id`

Coût nul ou quasi-nul. OK.

### Recommandation : aucune policy RLS n'est problématique

Le seul pattern potentiellement coûteux (subquery EXISTS sur `list_items`) est déjà couvert par l'index de la migration 005. Aucune action requise.

---

## 6. Problèmes divers

### `awards` dans search_books_v2 — colonne fantôme

La ligne 114 de la migration 008 référence `m.awards` dans le SELECT :
```sql
m.avg_rating, m.rating_count, m.source, m.created_at, m.awards,
```

Mais **aucune migration ne crée cette colonne**. Si elle n'existe pas en base, la fonction retourne une erreur. Vérifier si elle a été ajoutée manuellement dans Supabase ou si c'est un bug latent.

### `popular_books_week` — pas d'index sur `reading_status.created_at`

```sql
SELECT b.* FROM books b
JOIN reading_status rs ON rs.book_id = b.id
WHERE rs.created_at > since_date
GROUP BY b.id
ORDER BY count(rs.id) DESC
LIMIT 7;
```

- `reading_status.book_id` n'a pas d'index → Seq Scan sur reading_status pour le JOIN
- `reading_status.created_at` n'a pas d'index dédié → Seq Scan pour le filtre WHERE

L'index `reading_status_user_idx (user_id)` ne sert pas ici. Fix :

```sql
CREATE INDEX idx_reading_status_created_book 
  ON reading_status (created_at DESC, book_id);
```

Cet index couvre à la fois le filtre `created_at > since_date` et le JOIN sur `book_id`.

### Trigger `update_book_rating` — 2 subqueries sur chaque INSERT/UPDATE/DELETE de review

```sql
avg_rating = (SELECT avg(rating) FROM reviews WHERE book_id = new.book_id AND rating IS NOT NULL),
rating_count = (SELECT count(*) FROM reviews WHERE book_id = new.book_id AND rating IS NOT NULL)
```

Couvert par `reviews_book_idx (book_id, created_at DESC)`. Le leading column `book_id` suffit pour le filtre. OK.

---

## 7. pg_stat_statements et monitoring

### Activer pg_stat_statements

Sur Supabase, `pg_stat_statements` est **pré-installé mais doit être activé** :

```sql
-- Vérifier si l'extension est active
SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';

-- Si absent :
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

### Queries de monitoring recommandées

**Top 10 requêtes les plus lentes (temps total cumulé)** :
```sql
SELECT 
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  rows,
  left(query, 120) AS query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

**Requêtes avec le pire ratio temps/appel** :
```sql
SELECT 
  round(mean_exec_time::numeric, 2) AS mean_ms,
  calls,
  rows,
  left(query, 120) AS query
FROM pg_stat_statements
WHERE calls > 5
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Tables avec le plus de Seq Scans (index manquants ?)** :
```sql
SELECT 
  schemaname, relname,
  seq_scan, seq_tup_read,
  idx_scan, idx_tup_fetch,
  CASE WHEN seq_scan + idx_scan > 0 
    THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1) 
    ELSE 0 
  END AS idx_hit_pct
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_tup_read DESC;
```

**Index inutilisés (candidats à la suppression)** :
```sql
SELECT 
  schemaname, relname, indexrelname, 
  idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Taille des tables et index** :
```sql
SELECT 
  relname,
  pg_size_pretty(pg_total_relation_size(c.oid)) AS total,
  pg_size_pretty(pg_relation_size(c.oid)) AS data,
  pg_size_pretty(pg_total_relation_size(c.oid) - pg_relation_size(c.oid)) AS indexes
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
ORDER BY pg_total_relation_size(c.oid) DESC;
```

**Cache hit ratio (doit être > 99%)** :
```sql
SELECT 
  sum(heap_blks_read) AS disk_reads,
  sum(heap_blks_hit) AS cache_hits,
  round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) AS hit_ratio
FROM pg_statio_user_tables;
```

### Fréquence recommandée

| Query | Fréquence | Seuil d'alerte |
|-------|-----------|---------------|
| Top requêtes lentes | Hebdomadaire | mean_ms > 100 |
| Seq Scan ratio | Après chaque batch d'import | idx_hit_pct < 90% sur `books` |
| Index inutilisés | Mensuel | idx_scan = 0 après 1 mois |
| Cache hit ratio | Hebdomadaire | < 99% |
| pg_stat_statements reset | Mensuel | `SELECT pg_stat_statements_reset()` |

---

## 8. Estimation d'impact des index proposés

| Index | Table | Query concernée | Avant | Après | Gain estimé |
|-------|-------|----------------|-------|-------|-------------|
| `idx_reading_status_book_id` | reading_status | popular_books_week JOIN | Seq Scan | Index Scan | ~10× (critique à >10K rows) |
| `idx_reading_status_created_book` | reading_status | popular_books_week WHERE | Seq Scan | Index Scan | ~5× |
| `idx_list_items_book_id` | list_items | useBookLists, DELETE CASCADE | Seq Scan | Index Scan | ~5× |
| `idx_books_genres_gin` | books | useBooksByGenre (.filter genres cs) | Seq Scan 3800 rows | GIN Scan | ~20× |
| `idx_books_title_trgm` | books | search_books_v2 branche cross-field | Seq Scan 3800 rows | GIN Scan | ~10-50× (à >50K) |
| `idx_books_authors_trgm` | books | search_books_v2 branche cross-field | Seq Scan 3800 rows | GIN Scan | ~10-50× (à >50K) |
| Supprimer `reviews_user_id_idx` | reviews | — | Maintenances inutile | — | Espace disque |
| Supprimer `reviews_book_id_idx` | reviews | — | Maintenances inutile | — | Espace disque |
| Supprimer `user_favorites_user_idx` | user_favorites | — | Maintenances inutile | — | Espace disque |

---

## 9. Résumé des actions

### Immédiat (5 min, impact préventif)

```sql
-- FK non indexées — critique pour DELETE CASCADE
CREATE INDEX idx_reading_status_book_id ON reading_status (book_id);
CREATE INDEX idx_list_items_book_id ON list_items (book_id);
```

### Court terme (30 min, améliore Explorer)

```sql
-- Filtre genres Explorer
CREATE INDEX idx_books_genres_gin ON books USING gin (genres);

-- popular_books_week
CREATE INDEX idx_reading_status_created_book ON reading_status (created_at DESC, book_id);

-- Nettoyage index redondants
DROP INDEX IF EXISTS reviews_user_id_idx;
DROP INDEX IF EXISTS reviews_book_id_idx;
DROP INDEX IF EXISTS user_favorites_user_idx;
```

### Moyen terme (1h, prépare le scaling de la recherche)

```sql
-- Trigram pour search_books_v2
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text AS $$
  SELECT unaccent('unaccent', $1)
$$ LANGUAGE sql IMMUTABLE PARALLEL SAFE;
CREATE INDEX idx_books_title_trgm ON books USING gin (f_unaccent(lower(title)) gin_trgm_ops);
CREATE INDEX idx_books_authors_trgm ON books USING gin (f_unaccent(lower(authors::text)) gin_trgm_ops);
-- + modifier search_books_v2 pour utiliser f_unaccent()
```

### À investiguer

- Vérifier si la colonne `awards` existe en base (référencée par search_books_v2 mais absente des migrations)
- Exécuter la query `pg_stat_user_tables` pour valider les Seq Scans réels vs estimés
- Activer `pg_stat_statements` si pas encore fait

---

## 10. Ce qui est déjà bien

- **RLS solide** : toutes les tables protégées, policies cohérentes, pas de faille évidente
- **Index partiels intelligents** : `books_isbn_idx WHERE isbn_13 IS NOT NULL`, `reading_status_diary_idx WHERE status='read' AND finished_at IS NOT NULL`
- **Triggers de dénormalisation** : `avg_rating`, `rating_count`, `likes_count` maintenus automatiquement — évite les agrégations coûteuses à chaque lecture
- **Enums PostgreSQL** pour les types — pas de strings libres, intégrité garantie
- **UUID v4** partout — pas de séquences prévisibles, compatible multi-tenant
- **Constraints CHECK** utiles : username format, bio length, rating range, tag length, position 1-4
- **search_books_v2 bien conçue** pour l'échelle actuelle — scoring hybride, branches spécialisées, <50ms
- **Index RLS migration 005** : anticipation correcte du coût de la policy EXISTS sur list_items
