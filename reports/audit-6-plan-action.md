# Audit #6 — Plan d'action priorisé

> Date : 1 avril 2026
> Synthèse des audits #1 (bundle), #2 (Supabase queries), #3 (PostgreSQL), #4 (React renders), #5 (edge functions)
> Contexte : closed beta ~20 users, 1 dev solo + Claude Code

---

## Score performance global : 52/100

| Domaine | Score | Poids | Détail |
|---------|:-----:|:-----:|--------|
| Bundle & chargement initial | 4/10 | 25% | 725 KB monolithique, LCP ~2.5s, pas de code splitting |
| Requêtes réseau & data | 5/10 | 25% | Waterfalls, 0 cache client, 11-15 req/page |
| Schéma DB & queries | 7/10 | 20% | Solide à l'échelle actuelle, 2 FK critiques manquent |
| Réactivité UI (renders) | 4/10 | 15% | 0 memo, 27 states BookPage, cascade re-renders |
| Edge functions & APIs | 6/10 | 15% | book_import bien fait, 2 fonctions sans timeout IA |
| **Score pondéré** | **52/100** | | |

**Justification** : l'app est fonctionnelle et agréable pour 20 users. Le score reflète les risques latents (pas les bugs visibles) : un afflux de 200 users simultanés à la beta publique révélerait les waterfalls, le bundle monolithique, et l'absence de cache.

---

## Classification des recommandations

### P0 — Avant la beta publique (bloquants ou risques de crash)

| # | Source | Problème | Impact | Effort | Dépendances |
|---|--------|----------|--------|--------|-------------|
| **P0-1** | Audit 5 | Timeout Anthropic absent (smart-search + book_ai_enrich) | Élimine risque blocage 150s, gaspillage compute | **S** (5 min) | Aucune |
| **P0-2** | Audit 2 | Paralléliser useProfileData (4 await séquentiels) | **-600ms** page profil | **S** (10 min) | Aucune |
| **P0-3** | Audit 1 | Code splitting React.lazy (14 pages) | **-50 KB gzip** initial, LCP -0.5s | **S** (30 min) | Aucune |
| **P0-4** | Audit 5 | Normaliser GOOGLE_BOOKS_KEY / GOOGLE_BOOKS_API_KEY | Corrige bug silencieux find_cover | **S** (2 min) | Aucune |
| **P0-5** | Audit 3 | Index FK manquants (reading_status.book_id, list_items.book_id) | Prévient lock 5s+ sur DELETE CASCADE | **S** (5 min SQL) | Aucune |
| **P0-6** | Audit 4 | `loading="lazy"` sur Img.jsx | Bande passante mobile, LCP inchangé | **S** (5 min) | Aucune |
| **P0-7** | Audit 2 | Supprimer doublon liveBook dans BookPage | -1 requête Supabase/page | **S** (10 min) | Aucune |
| **P0-8** | Audit 5 | CORS dynamique multi-origin (4 edge functions) | Prépare domaine custom | **S** (10 min) | Aucune |

**Total P0 : ~1h15 d'effort. Aucune dépendance croisée — tout peut être fait en parallèle ou dans n'importe quel ordre.**

### P1 — Pendant la beta publique (impact UX visible)

| # | Source | Problème | Impact | Effort | Dépendances |
|---|--------|----------|--------|--------|-------------|
| **P1-1** | Audit 2+4 | TanStack Query (cache client) | **-60% requêtes**, navigation retour instantanée | **L** (3h) | Aucune, mais plus facile après P0-2 et P0-7 |
| **P1-2** | Audit 4 | React.memo sur composants listes (Img, LikeButton, FeedItem, ReviewCard) | **-50% re-renders** dans les listes | **M** (1h) | Plus efficace après P1-4 |
| **P1-3** | Audit 2 | RPC popular_lists_with_covers | **-300ms** Explorer | **M** (30 min) | Migration SQL |
| **P1-4** | Audit 4 | Extraire styles constants (module-level) dans BookPage, FeedPage | Prérequis pour memo efficace | **S** (15 min) | Aucune, mais faire avant P1-2 |
| **P1-5** | Audit 4 | useMemo IDs passés à useLikes (4 pages) | -1 recalcul/render | **S** (10 min) | Aucune |
| **P1-6** | Audit 4 | useCallback goToBook + useMemo AuthContext | Préventif re-renders arbre | **S** (5 min) | Aucune |
| **P1-7** | Audit 2 | RPC available_genres (remplace fetch 2000 rows) | **-200 KB** réseau Explorer | **S** (15 min) | Migration SQL |
| **P1-8** | Audit 3 | Index GIN genres pour filtre Explorer | Seq Scan → GIN Scan | **S** (2 min SQL) | Aucune |
| **P1-9** | Audit 5 | Circuit breaker Google Books (429) | Économise ~960 appels post-quota | **M** (30 min) | Aucune |
| **P1-10** | Audit 1 | Preconnect fonts.gstatic.com | **-100-200ms** FCP | **S** (1 min) | Aucune |
| **P1-11** | Audit 5 | find_cover GET → HEAD | -1 MB/appel bande passante | **S** (5 min) | Aucune |
| **P1-12** | Audit 2 | Ajouter .limit() aux 4 hooks sans limite | Prévention scaling | **S** (5 min) | Aucune |
| **P1-13** | Audit 5 | Paralléliser Haiku + OL dans book_ai_enrich | **-500ms** enrichissement IA | **S** (15 min) | Aucune |
| **P1-14** | Audit 1 | Déplacer FONT_URL + supprimer exports morts data/index.js | -2 KB gzip | **S** (5 min) | Aucune |

### P2 — Post-beta (polish, scaling, monitoring)

| # | Source | Problème | Effort |
|---|--------|----------|--------|
| P2-1 | Audit 4 | Découper BookPage en sous-composants (27 states → 5 composants) | **L** (2h) |
| P2-2 | Audit 3 | pg_trgm + f_unaccent pour search_books_v2 (scaling >50K livres) | **L** (1h) |
| P2-3 | Audit 2 | RPC reorder_list_items (N updates → 1) | **M** (20 min) |
| P2-4 | Audit 2 | RPC book_lists(book_id) avec JOIN | **M** (20 min) |
| P2-5 | Audit 3 | Supprimer 3 index redondants | **S** (2 min SQL) |
| P2-6 | Audit 3 | Activer pg_stat_statements + monitoring queries | **S** (15 min) |
| P2-7 | Audit 3 | Investiguer colonne fantôme `awards` dans search_books_v2 | **S** (10 min) |
| P2-8 | Audit 1 | Self-host fonts subsetées (woff2) | **M** (1h) |
| P2-9 | Audit 1 | Réduire poids Geist (4 → 3 si 500 inutilisé) | **S** (5 min) |
| P2-10 | Audit 5 | Migrer find_cover vers Deno.serve() | **S** (5 min) |
| P2-11 | Audit 5 | Expliciter verify_jwt dans config.toml | **S** (2 min) |
| P2-12 | Audit 4 | Transition de page (fade) entre routes | **M** (30 min) |

---

## Plan d'exécution P0 — Prompts Claude Code prêts

L'ordre est optimisé pour minimiser les conflits de fichiers et maximiser l'impact cumulé.

### Prompt 1 — Timeouts Anthropic + env var Google Books (7 min)

```
Dans les edge functions Supabase, ajoute AbortSignal.timeout(8000) sur tous les
appels fetch vers api.anthropic.com (2 fichiers : smart-search/index.ts ligne 112,
book_ai_enrich/index.ts ligne 43).

Ajoute aussi AbortSignal.timeout(5000) sur le fetch Open Library dans
book_ai_enrich/index.ts ligne 94, et AbortSignal.timeout(3000) sur les
HEAD requests dans book_ai_enrich findCover (ligne 173).

Corrige aussi le nom de variable d'environnement dans find_cover/index.ts :
remplace GOOGLE_BOOKS_API_KEY par GOOGLE_BOOKS_KEY (lignes 51 et 68) pour
être cohérent avec book_import/index.ts.

Ne touche à rien d'autre.
```

### Prompt 2 — Paralléliser useProfileData (10 min)

```
Dans src/hooks/useProfileData.js, remplace les 4 await séquentiels par
un Promise.all. Les 4 requêtes sont indépendantes : allStatuses, diaryBooks,
allReadBooks, reviews. Utilise la destructuration :

const [allStatuses, diaryBooks, allReadBooks, reviews] = await Promise.all([
  supabase.from('reading_status')...,
  supabase.from('reading_status')...,
  supabase.from('reading_status')...,
  supabase.from('reviews')...,
]);

Garde les mêmes select(), eq(), order(), limit() pour chaque requête.
Ne change rien au traitement post-fetch.
```

### Prompt 3 — Code splitting React.lazy (30 min)

```
Dans src/App.jsx, transforme les imports statiques des 14 pages (toutes sauf
ExplorePage qui est la route par défaut) en imports dynamiques avec React.lazy.
Ajoute un <Suspense fallback={null}> autour du <Routes>.

Pages à lazy-loader : BookPageRoute, ProfilePageRoute, FeedPage, CitationsPage,
ListPage, TagPage, BackfillPage, SettingsPage, ChallengesPage, JournalPage,
ArticlePage, LoginPage, OnboardingPage, NotFoundPage.

Garde ExplorePage en import statique (c'est la landing page).
Garde Header, Search, et les composants layout en import statique.
```

### Prompt 4 — Index FK + loading lazy + doublon liveBook (20 min)

```
3 changements indépendants :

1. Crée migrations/009_fk_indexes.sql avec :
   CREATE INDEX IF NOT EXISTS idx_reading_status_book_id ON reading_status (book_id);
   CREATE INDEX IF NOT EXISTS idx_list_items_book_id ON list_items (book_id);

2. Dans src/components/Img.jsx, ajoute loading="lazy" sur la balise <img>.
   Ajoute aussi une prop "eager" au composant : si eager est true,
   mettre loading="eager" au lieu de "lazy".

3. Dans src/pages/BookPage.jsx, supprime la requête liveBook inline
   (le useEffect qui fait supabase.from("books").select("*").eq("id", ...))
   et utilise le résultat de useBookBySlug à la place. Si BookPage a besoin
   de rafraîchir les données du livre après une mutation, ajoute un callback
   refetch au hook useBookBySlug plutôt qu'une requête inline dupliquée.
```

### Prompt 5 — CORS dynamique edge functions (10 min)

```
Dans les 4 edge functions Supabase (book_import, smart-search, book_ai_enrich,
find_cover), remplace le corsHeaders hardcodé par une fonction getCorsHeaders(req)
qui vérifie l'origin de la requête contre une liste :
["https://reliure.vercel.app", "https://reliure.app", "http://localhost:5173"]

Pattern :
const ALLOWED_ORIGINS = ["https://reliure.vercel.app", "https://reliure.app", "http://localhost:5173"];
function getCorsHeaders(req) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Remplace tous les usages de corsHeaders par getCorsHeaders(req).
Supprime les TODO "ajouter reliure.app".
```

---

## Plan d'exécution P1 — Estimation effort/impact

### Ordre recommandé (respecte les dépendances)

```
Semaine 1 :
  P1-10  preconnect fonts.gstatic.com              1 min   — trivial
  P1-14  déplacer FONT_URL + supprimer exports      5 min   — trivial
  P1-6   useCallback goToBook + useMemo AuthContext  5 min   — trivial
  P1-12  ajouter .limit() aux 4 hooks               5 min   — trivial
  P1-5   useMemo IDs passés à useLikes              10 min  — 4 fichiers
  P1-4   extraire styles constants                  15 min  — BookPage, FeedPage
  P1-8   index GIN genres                            2 min  — SQL
  P1-7   RPC available_genres                       15 min  — SQL + hook
  P1-11  find_cover GET → HEAD                       5 min  — edge function
  P1-13  paralléliser Haiku + OL book_ai_enrich     15 min  — edge function

Semaine 2 :
  P1-2   React.memo composants listes               1h     — dépend de P1-4
  P1-3   RPC popular_lists_with_covers              30 min  — SQL + hook
  P1-9   circuit breaker Google Books               30 min  — googleBooks.js

Semaine 3 :
  P1-1   TanStack Query                              3h     — migration progressive
```

### Estimation d'impact cumulé P0 + P1

| Métrique | Avant | Après P0 | Après P0+P1 |
|----------|------:|:--------:|:-----------:|
| Bundle initial (gzip) | 197 KB | ~145 KB | ~145 KB |
| LCP estimé | ~2.5s | ~1.8s | ~1.5s |
| Profil load time | ~800ms | ~200ms | ~200ms (+ cache) |
| Explorer load time | ~400ms | ~400ms | ~200ms |
| Requêtes/page (profil) | 15+ | 14 | ~6 (cache) |
| Requêtes/navigation retour | 100% refetch | 100% refetch | ~0 (cache) |
| Score perf estimé | 52/100 | 68/100 | 82/100 |

---

## Budget Claude Code estimé

### Effort légende
- **S** = prompt Sonnet / prompt Opus ciblé (< 15 min, 1-3 fichiers)
- **M** = prompt Opus ciblé (15-60 min, 3-8 fichiers)
- **L** = refactor multi-fichiers Opus (1h+, 8+ fichiers ou changement d'architecture)

### P0 (avant beta publique)

| Prompt | Fichiers touchés | Effort | Modèle recommandé |
|--------|:----------------:|:------:|:------------------:|
| Timeouts Anthropic + env var | 3 edge functions | S | Sonnet |
| Paralléliser useProfileData | 1 hook | S | Sonnet |
| Code splitting React.lazy | 1 fichier (App.jsx) | S | Sonnet |
| Index FK + lazy images + doublon liveBook | 3 fichiers + 1 migration | M | Opus |
| CORS dynamique | 4 edge functions | S | Sonnet |

**Total P0 : 5 prompts, ~1h15 d'implémentation, ~$2-4 de tokens Claude Code**

### P1 (pendant beta)

| Bloc | Fichiers | Effort | Modèle |
|------|:--------:|:------:|:------:|
| Quick fixes (P1-4 à P1-14, semaine 1) | ~12 fichiers + 2 migrations SQL | M×3 | Sonnet |
| React.memo (P1-2) | ~8 fichiers | M | Opus |
| RPCs SQL (P1-3, P1-7) | 2 migrations + 2 hooks | M | Sonnet |
| Circuit breaker Google (P1-9) | 1 fichier | S | Sonnet |
| TanStack Query (P1-1) | ~18 hooks + App.jsx | L | Opus |

**Total P1 : ~8 prompts, ~6h d'implémentation, ~$8-15 de tokens Claude Code**

### Budget total P0 + P1

| | Prompts | Temps dev | Coût tokens estimé |
|-|:-------:|:---------:|:------------------:|
| P0 | 5 | ~1h15 | ~$3 |
| P1 | ~8 | ~6h | ~$12 |
| **Total** | **~13** | **~7h** | **~$15** |

> Note : les estimations de coût supposent Opus pour les refactors multi-fichiers et Sonnet pour les fixes ciblés. Le vrai coût dépend du nombre de re-prompts (erreurs, ajustements).

---

## Matrice risque × impact

```
IMPACT
  ▲
  │  ★ TanStack Query (P1-1)
  │            ★ Code splitting (P0-3)
  │     ★ useProfileData parallel (P0-2)
  │
  │  ★ React.memo (P1-2)    ★ RPC popular_lists (P1-3)
  │            ★ Circuit breaker (P1-9)
  │     ★ RPC available_genres (P1-7)
  │
  │  ★ Timeout Anthropic (P0-1)       ← risque éliminé
  │  ★ Index FK (P0-5)                ← risque éliminé
  │  ★ Env var Google (P0-4)          ← bug corrigé
  │
  ├──────────────────────────────────────▶ EFFORT
      S (5min)    M (30min)    L (3h)
```

---

## Backlog P2 détaillé

| # | Action | Effort | Quand |
|---|--------|--------|-------|
| P2-1 | Découper BookPage (27 states → 5 sous-composants) | L (2h) | Quand BookPage devient le goulot UX |
| P2-2 | pg_trgm + f_unaccent pour search (scaling >50K livres) | L (1h) | Quand la base atteint ~20K livres |
| P2-3 | RPC reorder_list_items (N→1 requête) | M (20 min) | Quand les listes dépassent 30 items |
| P2-4 | RPC book_lists avec JOIN | M (20 min) | Quand BookPage charge trop lentement |
| P2-5 | Supprimer 3 index redondants | S (2 min) | Housekeeping mensuel |
| P2-6 | pg_stat_statements + monitoring | S (15 min) | Dès que la base a du trafic réel |
| P2-7 | Investiguer colonne fantôme `awards` | S (10 min) | Quick check dans Supabase Dashboard |
| P2-8 | Self-host fonts woff2 subsetées | M (1h) | Si le LCP reste > 2s après P0+P1 |
| P2-9 | Réduire poids Geist (supprimer 500 si inutilisé) | S (5 min) | Vérifier avec grep avant |
| P2-10 | find_cover → Deno.serve() | S (5 min) | Housekeeping |
| P2-11 | verify_jwt explicite dans config.toml | S (2 min) | Housekeeping |
| P2-12 | Transition de page (fade) | M (30 min) | Polish UX |

---

## Résumé en une phrase

**Implémenter les 5 prompts P0 (~1h15) élimine les risques de crash et améliore le score de 52 à ~68/100. Ajouter TanStack Query (P1-1, 3h) est le seul changement qui transforme l'expérience utilisateur globale — navigation retour instantanée, -60% requêtes.**
