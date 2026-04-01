# Audit #2 — Requêtes Supabase côté client

> Date : 1 avril 2026
> Stack : React 19 + Supabase JS v2 + React Router v7
> Base : ~3830 livres, ~10 utilisateurs beta

---

## 1. Inventaire des requêtes

### Hooks — requêtes principales

| Fichier | Table(s) | select('*') ? | limit ? | Deps risquées ? | Notes |
|---------|----------|:-------------:|:-------:|:---------------:|-------|
| `useProfileData.js` | reading_status, books | Non (join explicite) | 500/500/500/200 | Non | **4 requêtes séquentielles** (await en série) |
| `useFavorites.js` | user_favorites, books | Non | Non (max 4 rows) | Non | setFavorite : 3 appels séquentiels (upsert+check+insert) |
| `useExplore.js` — usePopularBooks | books (RPC popular_books_week) | Non | 15 | Non | OK |
| `useExplore.js` — usePopularReviews | reviews, users, books | Non | 6 | Non | OK |
| `useExplore.js` — usePopularQuotes | quotes, users, books | Non | 6 | Non | OK |
| `useExplore.js` — usePopularLists | lists, list_items, books | Non | 6 | Non | **3 requêtes séquentielles** |
| `useExplore.js` — useAvailableGenres | books (genres column) | Non | **2000** | Non | **Fetch 2000 rows pour comptage client-side** |
| `useExplore.js` — useBooksByGenre | books | Non | 20 | Non | Filtre JSONB `.filter("genres","cs",...)` |
| `useActivity.js` — useFeed | activity, users | **OUI** (`*`) | 50 | Non | + 3 requêtes parallèles de vérification |
| `useBookBySlug.js` | books | **OUI** (2×) | 1 | Non | 2 appels : slug puis fallback ID |
| `useReadingStatus.js` — useReadingStatus | reading_status | **OUI** | 1 | Non | |
| `useReadingStatus.js` — useUserRating | reviews | Non (rating seul) | 1 | Non | |
| `useReadingStatus.js` — useReadingList | reading_status, books | Non | Non | Non | Manque `.limit()` |
| `useLikes.js` | likes | Non | Non | **OUI** : `targetIds.join(",")` | Risque re-render si ref array change |
| `useFollow.js` — useFollowCounts | follows | `*` (mais `head:true`) | — | Non | OK : head=true, pas de rows |
| `useFollow.js` — useFollow | follows | Non | 1 | Non | |
| `useLists.js` — useMyLists | lists | Non | Non | Non | Manque `.limit()` |
| `useLists.js` — useListBySlug | lists, list_items, books | **OUI** | 1 | Non | |
| `useLists.js` — createList | lists | **OUI** (retour insert) | — | Non | |
| `useLists.js` — reorderItems | list_items | Non | — | Non | **N updates séquentiels en boucle for** |
| `useReviews.js` — useBookReviews | reviews, users | Non | 50 | Non | OK |
| `useReviews.js` — useMyReviews | reviews, books | Non | Non | Non | Manque `.limit()` |
| `useQuotes.js` — useBookQuotes | quotes, users | Non | 50 | Non | OK |
| `useQuotes.js` — useCommunityQuotes | quotes, users, books | **OUI** (`*, ...`) | 20 | Non | |
| `useQuotes.js` — useMyQuotes | quotes, books | Non | Non | Non | Manque `.limit()` |
| `useProfile.js` | users | **OUI** | 1 | Non | |
| `usePublicProfile.js` | users | **OUI** | 1 | Non | |
| `useBookLists.js` | list_items, lists | Non | 20 | Non | **2 requêtes séquentielles** |
| `useUserRole.js` | user_roles | Non | 1 | Non | OK |

### Pages — requêtes inline (hors hooks)

| Fichier | Table(s) | select('*') ? | Notes |
|---------|----------|:-------------:|-------|
| `BookPage.jsx` — liveBook | books | **OUI** | Requête inline dans useEffect, rafraîchit après mutation |
| `BookPage.jsx` — similarBooks | books | Non | Requête inline dans useEffect, filtre JSONB genres |
| `FeedPage.jsx` — bookSlugs | books | Non (slug, id) | Requête inline pour résoudre les slugs |
| `Search.jsx` — fetchUsers | users, reading_status | Non | **2 requêtes séquentielles** (users → count par user) |

### Utilitaires — requêtes hors composants

| Fichier | Table(s) | select('*') ? | Notes |
|---------|----------|:-------------:|-------|
| `importBook.js` | books | Non | Upsert avec colonnes explicites |
| `deduplicateBook.js` | books | **OUI** (2×) | findExistingBook : 2 requêtes (ISBN exact, titre+auteur) |

---

## 2. Problèmes identifiés

### P1. Waterfall critique — `useProfileData` (4 requêtes séquentielles) — CRITIQUE

```
Actuel (séquentiel) :                    Optimisé (parallèle) :

 ──▶ allStatuses ──▶                      ──▶ allStatuses    ──▶
                     diaryBooks ──▶       ──▶ diaryBooks     ──▶  Promise.all
                                 allRead  ──▶ allReadBooks   ──▶
                                     ──▶  ──▶ reviews        ──▶
                                 reviews
                                     ──▶

 ~800ms (4 × ~200ms)                      ~200ms (1 round-trip parallèle)
```

Les 4 requêtes sont **indépendantes** (aucune ne dépend du résultat d'une autre). Le `await` séquentiel multiplie le temps par 4.

**Impact** : ~600ms gaspillés à chaque chargement de profil. C'est la page la plus visitée.

**Fix** :
```js
const [allStatuses, diaryBooks, allReadBooks, reviews] = await Promise.all([
  supabase.from('reading_status').select('...').eq('user_id', uid),
  supabase.from('reading_status').select('...').eq('user_id', uid).not('finished_at', 'is', null),
  supabase.from('reading_status').select('...').eq('user_id', uid).eq('status', 'read'),
  supabase.from('reviews').select('...').eq('user_id', uid),
]);
```

### P2. Waterfall — `usePopularLists` (3 requêtes séquentielles) — MOYEN

```
Actuel :  lists ──▶ list_items (pour chaque liste) ──▶ counts
```

3 étapes séquentielles pour charger les listes populaires de l'Explorer. La 2e requête (`list_items`) dépend du résultat de la 1re (`lists`), donc pas entièrement parallélisable. Mais la 3e (`counts`) pourrait être intégrée.

**Fix recommandé** : créer une RPC PostgreSQL `popular_lists_with_covers` qui fait le JOIN + count en une seule requête côté serveur.

### P3. Waterfall — `useBookLists` (2 requêtes séquentielles) — MOYEN

```
Actuel :  list_items (par book_id) ──▶ lists (par IDs)
```

**Fix recommandé** : une RPC PostgreSQL `book_lists(book_id)` avec JOIN.

### P4. Waterfall — `Search.jsx` fetchUsers (2 requêtes séquentielles) — FAIBLE

```
Actuel :  users (ilike query) ──▶ reading_status (count par user_id, en série)
```

Séquentiel mais impact faible (recherche utilisateurs rare, résultats limités à 5).

### P5. `select('*')` — 12 occurrences — MOYEN

Requêtes qui sélectionnent toutes les colonnes alors que seules quelques-unes sont utilisées :

| Fichier | Table | Colonnes réellement utilisées |
|---------|-------|-------------------------------|
| `useBookBySlug` (2×) | books | Toutes les colonnes de `books` sont affichées sur BookPage, **acceptable** |
| `useProfile` | users | id, username, display_name, avatar_url, bio — **5 sur ~6** |
| `usePublicProfile` | users | idem — **5 sur ~6** |
| `useReadingStatus` | reading_status | status, started_at, finished_at, current_page, is_reread — **~6 sur ~8** |
| `useFeed` | activity | Toutes colonnes + join users, **acceptable pour un event log** |
| `useListBySlug` | lists | Toutes colonnes affichées sur ListPage, **acceptable** |
| `useCommunityQuotes` | quotes | text, created_at, users(...), books(...) — devrait lister |
| `BookPage liveBook` | books | Même que useBookBySlug — **acceptable** |
| `deduplicateBook` (2×) | books | Seulement `id` utilisé — **gaspillage** |
| `createList` (retour) | lists | Seulement `id, slug` utilisés — **gaspillage** |

**Priorité** : `deduplicateBook` (appelé à chaque import, retourne toute la row pour ne lire que `id`) et `createList`.

### P6. Requêtes sans `.limit()` — 4 hooks — MOYEN

| Hook | Table | Risque |
|------|-------|--------|
| `useReadingList` | reading_status + books | Croît avec la bibliothèque. 500 livres "en cours" improbable mais pas impossible |
| `useMyLists` | lists | Croît avec le nombre de listes. Peu risqué à court terme |
| `useMyReviews` | reviews + books | Croît avec l'activité. Risque à 1000+ critiques |
| `useMyQuotes` | quotes + books | Croît avec l'activité. Risque à 1000+ citations |

**Fix** : ajouter `.limit(200)` partout avec pagination frontend si nécessaire.

### P7. `useAvailableGenres` — fetch 2000 rows pour comptage client — MOYEN

```js
const { data } = await supabase
  .from('books')
  .select('genres')
  .not('genres', 'is', null)
  .limit(2000);
// Puis : comptage client-side des genres les plus fréquents
```

Télécharge 2000 objets JSONB pour extraire et compter les genres côté client.

**Fix recommandé** : RPC PostgreSQL :
```sql
CREATE OR REPLACE FUNCTION available_genres(min_count int DEFAULT 5)
RETURNS TABLE(genre text, count bigint) AS $$
  SELECT g, count(*)
  FROM books, jsonb_array_elements_text(genres) AS g
  WHERE genres IS NOT NULL
  GROUP BY g
  HAVING count(*) >= min_count
  ORDER BY count(*) DESC;
$$ LANGUAGE sql STABLE;
```

### P8. `useLikes` — risque de re-render — MOYEN

```js
const idsKey = targetIds.join(",");
const fetchLikes = useCallback(async () => { ... }, [user?.id, targetType, idsKey]);
```

`targetIds` est un tableau passé en prop. Si le composant parent recrée le tableau à chaque render (ex: `ids={reviews.map(r => r.id)}`), `idsKey` change → `useCallback` invalide → re-fetch.

**Impact actuel** : probablement OK car les arrays sont stables (proviennent de `useState`). Mais fragile — un refactoring du parent pourrait déclencher une cascade.

**Fix** : mémoiser `targetIds` dans le composant parent, ou comparer l'ancienne valeur de `idsKey` avant de fetch.

### P9. `reorderItems` — N updates séquentiels — FAIBLE

```js
for (const item of items) {
  await supabase.from('list_items').update({ position: item.position }).eq('id', item.id);
}
```

Pour une liste de 20 livres, ça fait 20 requêtes HTTP séquentielles.

**Fix recommandé** : RPC PostgreSQL `reorder_list_items(list_id, item_ids)` qui fait un seul UPDATE avec `unnest`.

### P10. Aucun cache client — IMPACT GLOBAL

Chaque navigation de page déclenche un re-fetch complet de toutes les données. Naviguer `/explorer` → `/livre/x` → retour `/explorer` → 6 requêtes Supabase refaites.

React Router ne fournit pas de cache par défaut (contrairement à Next.js ou TanStack Query).

**Options** :
1. **TanStack Query** (recommandé) : cache, stale-while-revalidate, dedup automatique, devtools. ~13 KB gzip. Résout aussi les re-renders parasites.
2. **Cache maison** : `Map<string, { data, timestamp }>` dans un Context, TTL de 60s. Plus léger, moins robuste.
3. **SWR** : alternative plus légère (~4 KB gzip), même pattern stale-while-revalidate.

**Impact** : réduit les requêtes Supabase de ~60% pour les navigations retour. Critique pour l'UX perçue.

---

## 3. Waterfall par page

### BookPage — 8+ hooks + 2 requêtes inline

```
Chargement BookPage (toutes indépendantes, lancées en parallèle par React) :

  useBookBySlug     ──▶ books (slug)         ~100ms
  useReadingStatus  ──▶ reading_status       ~80ms
  useUserRating     ──▶ reviews (rating)     ~80ms
  useBookReviews    ──▶ reviews + users      ~120ms
  useBookQuotes     ──▶ quotes + users       ~100ms
  useLikes (2×)     ──▶ likes (reviews)      ~80ms
                    ──▶ likes (quotes)       ~80ms
  useBookLists      ──▶ list_items ──▶ lists ~200ms (waterfall P3)
  liveBook effect   ──▶ books (id)           ~100ms  ← doublon de useBookBySlug
  similarBooks      ──▶ books (genres)       ~120ms

  Total estimé : ~200ms (parallèle) + ~200ms (waterfall useBookLists)
  Requêtes Supabase : 11 par chargement de page
```

**Problèmes** :
- `liveBook` et `useBookBySlug` font la même requête sur `books` → **doublon**
- `useBookLists` : waterfall 2 requêtes (P3)

**Fix rapide** : supprimer `liveBook` et utiliser le résultat de `useBookBySlug` avec un refetch callback.

### ProfilePage — 10+ hooks

```
Chargement ProfilePage :

  useProfileData      ──▶ 4 requêtes SÉQUENTIELLES  ~800ms (waterfall P1)
  useFavorites        ──▶ user_favorites + books     ~120ms
  useMyReviews        ──▶ reviews + books            ~120ms
  useMyQuotes         ──▶ quotes + books             ~120ms
  useFollowCounts     ──▶ follows (2× head)          ~100ms
  useFollow           ──▶ follows                    ~80ms
  useMyLists          ──▶ lists                      ~80ms
  useReadingList      ──▶ reading_status + books     ~120ms
  useLikes            ──▶ likes                      ~80ms
  useUserRole         ──▶ user_roles                 ~80ms

  Total estimé : ~800ms (goulot = useProfileData séquentiel)
  Requêtes Supabase : 15+ par chargement de page
```

**Le fix P1 seul réduit le temps de ~800ms à ~200ms.**

### ExplorePage — 6 hooks

```
  usePopularBooks     ──▶ RPC popular_books_week     ~100ms
  usePopularReviews   ──▶ reviews + users + books    ~120ms
  usePopularQuotes    ──▶ quotes + users + books     ~120ms
  usePopularLists     ──▶ 3 requêtes SÉQUENTIELLES   ~400ms (waterfall P2)
  useAvailableGenres  ──▶ books (2000 rows)          ~150ms
  useBooksByGenre     ──▶ books (conditionnel)       ~100ms

  Total estimé : ~400ms (goulot = usePopularLists)
  Requêtes Supabase : 9+ par chargement
```

---

## 4. Risques de boucles de re-render

### Rappel : l'incident 92K requêtes

Un `useEffect` avec une dépendance objet (nouvelle référence à chaque render) a provoqué 92 000 appels Supabase en quelques heures. Les hooks actuels ont été corrigés, mais des risques subsistent.

### Risques actuels

| Hook | Dépendance | Risque | Sévérité |
|------|-----------|--------|----------|
| `useLikes` | `targetIds.join(",")` | Si le parent recrée le tableau → boucle de refetch | **Moyen** |
| `useProfileData` | `profileUserId` | Stable (string). OK | Faible |
| `useBookBySlug` | `slug` | Stable (string de l'URL). OK | Faible |
| `useExplore` hooks | Aucune dep dynamique | OK | Aucun |
| `useFavorites` | `profileUserId` | Stable. OK | Aucun |

**Le seul risque réel est `useLikes`**, et il est conditionnel (dépend de l'implémentation du parent). Les autres hooks suivent la règle "primitifs uniquement dans les deps".

---

## 5. Requêtes candidates pour du caching

| Requête | Fréquence de changement | TTL recommandé | Impact cache |
|---------|------------------------|----------------|-------------|
| `popular_books_week` (RPC) | ~1 semaine | 5 min | **Fort** — appelé à chaque visite Explorer |
| `usePopularReviews` | ~1 jour | 2 min | **Fort** — idem |
| `usePopularQuotes` | ~1 jour | 2 min | **Fort** — idem |
| `usePopularLists` | ~1 jour | 2 min | **Fort** — idem |
| `useAvailableGenres` | ~1 semaine | 10 min | **Fort** — 2000 rows, rarement change |
| `useBookBySlug` | Rarement | 30s (stale-while-revalidate) | **Moyen** — navigation livre fréquente |
| `useProfileData` | À chaque action utilisateur | 15s (stale-while-revalidate) | **Moyen** — navigation profil fréquente |
| `useFollowCounts` | Rarement | 60s | **Faible** — petit payload |

Avec TanStack Query et ces TTLs, on estime une **réduction de ~60% des requêtes Supabase** pour un usage normal (navigation aller-retour).

---

## 6. Ce qui est déjà bien

- **Guards `if (!userId) return`** présents dans tous les hooks qui en ont besoin
- **Colonnes explicites** dans la majorité des hooks (useProfileData, useFavorites, useReviews, useQuotes)
- **`.limit()` sur les requêtes communautaires** (reviews 50, quotes 50, popular 6-15)
- **Pas de `.subscribe()` ni de realtime** — pas de connexions WebSocket ouvertes inutilement
- **Primitifs dans les deps** dans la majorité des hooks (user?.id, slug, bookId)
- **`Promise.all` dans useFeed** pour les 3 requêtes de vérification (books, reviews, quotes)
- **Debounce sur la recherche** (300ms dans Search.jsx, 600ms pour smart-search)

---

## 7. Optimisations recommandées (par priorité)

### Priorité 1 — Paralléliser `useProfileData` (~600ms gagnés)

Remplacer les 4 `await` séquentiels par `Promise.all`. Aucune dépendance entre les requêtes.

**Impact** : temps de chargement ProfilePage divisé par ~4. C'est la page la plus visitée.
**Effort** : 10 min.

### Priorité 2 — Ajouter TanStack Query (~60% requêtes évitées)

Installer `@tanstack/react-query` (~13 KB gzip). Wrapper chaque hook Supabase dans `useQuery` avec des `queryKey` appropriés et des `staleTime` par type de donnée.

**Impact** : élimine les re-fetches sur navigation retour, dedup automatique des requêtes identiques, meilleure UX perçue.
**Effort** : 2-3h (migration progressive, hook par hook).

### Priorité 3 — RPC `popular_lists_with_covers` (~300ms gagnés sur Explorer)

Créer une fonction PostgreSQL qui retourne les listes populaires avec leurs couvertures en un seul appel au lieu de 3 séquentiels.

**Impact** : Explorer charge ~300ms plus vite.
**Effort** : 30 min (migration SQL + modification usePopularLists).

### Priorité 4 — RPC `available_genres` (~150ms + bande passante)

Remplacer le fetch de 2000 rows par une RPC qui fait le comptage côté PostgreSQL.

**Impact** : ~150ms + ~200 KB de données réseau évités.
**Effort** : 15 min.

### Priorité 5 — Supprimer le doublon `liveBook` dans BookPage

`liveBook` et `useBookBySlug` font la même requête. Utiliser le résultat du hook avec un callback de refetch.

**Impact** : -1 requête par chargement de BookPage.
**Effort** : 10 min.

### Priorité 6 — Expliciter les colonnes dans `deduplicateBook`

```js
// Avant
.select('*').eq('isbn_13', isbn).limit(1)
// Après
.select('id').eq('isbn_13', isbn).limit(1)
```

**Impact** : réduction du payload à chaque import.
**Effort** : 2 min.

### Priorité 7 — Ajouter `.limit()` aux hooks sans limite

`useReadingList`, `useMyLists`, `useMyReviews`, `useMyQuotes` — ajouter `.limit(200)`.

**Impact** : prévention — pas de problème aujourd'hui (beta, peu de données), mais critique quand les utilisateurs auront 500+ livres.
**Effort** : 5 min.

### Priorité 8 — RPC `reorder_list_items` (remplacer N updates)

Créer une fonction PostgreSQL qui reçoit un tableau `{id, position}` et fait un seul UPDATE.

**Impact** : réordonnement 20 items passe de ~20 requêtes à 1.
**Effort** : 20 min.

---

## Résumé

| Action | Impact estimé | Effort |
|--------|--------------|--------|
| Paralléliser useProfileData | **-600ms** ProfilePage | 10 min |
| TanStack Query | **-60% requêtes** globales | 2-3h |
| RPC popular_lists_with_covers | **-300ms** Explorer | 30 min |
| RPC available_genres | **-150ms** + bande passante | 15 min |
| Supprimer doublon liveBook | -1 requête BookPage | 10 min |
| Expliciter select dans deduplicateBook | Payload réduit | 2 min |
| Ajouter .limit() partout | Prévention scaling | 5 min |
| RPC reorder_list_items | -19 requêtes/réordonnement | 20 min |

**Quick win immédiat** : Priorité 1 (paralléliser useProfileData) se fait en 10 minutes et divise le temps de chargement de la page la plus visitée par 4.

**Investissement structurant** : Priorité 2 (TanStack Query) transforme l'UX globale et prévient les problèmes de scaling.
