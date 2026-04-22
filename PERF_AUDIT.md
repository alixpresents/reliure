# Audit performance — Reliure

> Date : 2026-04-22
> Symptôme : cold refresh lent, pire que la navigation interne.
> Méthode : 6 agents en parallèle sur stratégie de rendu, bundle, React, Supabase, assets, routing.
> **Aucun code n'a été modifié** — ce document est un plan d'action à valider.

---

## Verdict sur l'hypothèse prerendering

**Le prerendering n'est pas le coupable principal — mais il est mal utilisé.**

- Le HTML statique est servi vite par Vercel (TTFB bas, meta + OG corrects dans le DOM).
- **MAIS** : les données prerendues sont ignorées côté client. `clientLoader.hydrate = true` a été désactivé (cf. CLAUDE.md : cassait les meta tags). Résultat : le `loader` écrit les données dans le HTML, puis `useBookBySlug` refait la même requête au montage. Le prerender paie un coût de build sans bénéfice TTI.
- Côté rendu, 3 facteurs dominent le cold refresh :
  1. Hydratation React + init Supabase/TanStack (~500–800 ms)
  2. Double-fetch des données prerendues (~300–500 ms)
  3. Waterfalls Supabase (book → reviews, list_items → lists) (~300–600 ms)

**Supprimer le prerender n'aiderait pas — le remettre à profit avec `hydrate = true` oui** (option évaluée plus bas).

---

## Top 10 goulots par ratio impact / effort

| # | Goulot | Fichier:ligne | Impact cold refresh | Effort |
|---|---|---|---|---|
| 1 | Carousels Explore : aucune `priority` sur couvertures above-the-fold | `ExplorePage.jsx` (~l.490), `Img.jsx:30` | -200–400 ms | Trivial |
| 2 | `clientLoader.hydrate` désactivé → refetch gratuit des données prerendues | `BookPageRoute.jsx:260`, CLAUDE.md l.41 | -400 ms si remis | Faible + test |
| 3 | Waterfall `useBookLists` (2 round-trips séquentiels) | `useBookLists.js:12-29` | -100–200 ms | Moyen (RPC) |
| 4 | Waterfall loader BookPageRoute (book → reviews) | `BookPageRoute.jsx` (`queryBookData`) | -200–400 ms | Moyen (RPC) |
| 5 | `select('*')` sur useBookBySlug + useReadingStatus + useQuotes | `useBookBySlug.js:27,30,33`, `useReadingStatus.js:19,38`, `useQuotes.js:62` | -50–150 ms | Trivial |
| 6 | `useAvailableGenres` scanne 2000 livres pour extraire genres en JS | `useExplore.js:98-127` | -300–600 ms (Explore) | Moyen (RPC/table) |
| 7 | `useLikes.js:14` — `targetIds.join(",")` recréé à chaque render → deps instables | `useLikes.js:14` | -20–50 ms + évite re-fetch | Trivial |
| 8 | Pas de preload `<link rel="preload">` pour fonts WOFF2 (FOIT) | `root.tsx` / `index.html` | -100–200 ms (FCP) | Trivial |
| 9 | Indexes partiels manquants (`reviews.body IS NOT NULL`, `books.babelio_popular_year`, `books.oeuvre_id`) | `schema.sql` | -100–300 ms (Explore + BookPage) | Faible (migration SQL) |
| 10 | Avatars non-lazy + `BookPage.jsx` (1216 lignes, pas de React.memo, 25+ useState) | `Avatar.jsx`, `BookPage.jsx` | -50–150 ms cumulé | Moyen |

---

## Quick wins (< 30 min, gain mesurable)

**Ordre d'exécution conseillé si validés :**

1. **`priority` sur couvertures hero/carousel Explore** — ajouter `priority={true}` sur les 5 premières couvertures visibles au premier paint. Bascule de `loading="lazy"` à `eager` + potentiellement `fetchpriority="high"`. **Gain : -200–400 ms LCP.**
2. **Preload fonts** — `<link rel="preload" as="font" href="/fonts/eb-garamond-latin.woff2" crossorigin>` + Geist, dans `root.tsx`. **Gain : -100–200 ms FCP.**
3. **`loading="lazy"` sur `Avatar.jsx`** — les 50+ avatars du feed sont chargés eager pour rien. **Gain : ~150 KB évités.**
4. **Colonnes explicites au lieu de `select('*')`** — dans `useBookBySlug`, `useReadingStatus`, `useCommunityQuotes`. Aligne sur la liste du loader SSR. **Gain : -50–150 ms + bandwidth.**
5. **`idsKey` stable dans `useLikes.js`** — wrapper `useMemo(() => targetIds.join(","), [targetIds])`. **Évite des re-fetchs accidentels.**
6. **Indexes partiels** (migration SQL) :
   ```sql
   CREATE INDEX reviews_body_not_null_idx ON public.reviews (book_id, created_at DESC) WHERE body IS NOT NULL;
   CREATE INDEX books_babelio_year_idx ON public.books (avg_rating DESC) WHERE babelio_popular_year IS NOT NULL;
   CREATE INDEX books_oeuvre_idx ON public.books (oeuvre_id) WHERE oeuvre_id IS NOT NULL;
   ```
   **Gain : -100–300 ms sur les requêtes concernées.**

**Cumul estimé quick wins : -500–900 ms sur cold refresh de la home et des fiches livres.**

---

## Chantiers structurels (à évaluer coût/bénéfice)

### A. Réactiver `clientLoader.hydrate = true` sur les routes prerendues
**Gain potentiel** : -400 ms cold refresh.
**Risque** : bug meta tags documenté dans CLAUDE.md (meta cassés car data async). Nécessite de **rejouer** le cas : est-ce toujours reproductible avec RR7 actuel ? Si oui, alternative = passer les meta critiques dans le loader build-time uniquement (pas dans `clientLoader`).
**Effort** : 1–2h de test + validation SEO (View Source, Twitter Card Validator, `curl` pour vérifier meta dans HTML servi).

### B. RPCs pour éliminer les waterfalls BookPage
**Gain** : -300–600 ms sur fiche livre cold.
- `get_book_with_reviews(slug, review_limit)` — retourne book + top reviews en 1 round-trip
- `get_lists_for_book(book_id, limit)` — join list_items + lists + is_public en 1 appel
**Effort** : 4–6h (migrations SQL + refacto hooks + tests).

### C. Normaliser les genres (Explore)
**Gain** : -300–600 ms sur Explore cold.
- Option 1 : RPC `get_genre_stats()` avec `count` agrégé côté DB
- Option 2 : table `book_genres` normalisée (book_id, genre) + index → requêtes natives
**Effort** : 6–8h. À évaluer : combien de fois la page Explore est vue froide ? Si minorité des sessions, priorité basse.

### D. Splitter `BookPage.jsx` (1216 lignes, 25+ useState)
**Gain** : -100–200 ms render + meilleure maintenabilité.
- Extraire `ReviewsSection`, `QuotesSection`, `PersonalTracking` en sous-composants mémoïsés
- Les requêtes critiques/citations pourraient être derrière `React.lazy` (tabs)
**Effort** : 3–4h. **Gain marginal sur le TTI mais énorme sur la lisibilité.**

---

## Ce qui va déjà bien (ne pas toucher)

- **Bundle size** : ~140 KB gzip initial, route-splitting automatique via RR7. Bien dimensionné pour l'app.
- **Dépendances** : pas de moment/lodash/date-fns massifs, Tailwind purgé (9.5 KB gzip).
- **Cache Vercel** : `/assets/*` et `/fonts/*` en `max-age=31536000, immutable` avec hash dans les noms → correct.
- **Image proxy** (`/api/image-proxy`) : Sharp + WebP + cache 1 an + domaines whitelistés → bien conçu.
- **Fonts** : self-hosted WOFF2, `font-display: swap` partout (pas de FOIT).
- **ProfilePage** : onglets correctement lazy-loaded via `{ enabled }`.
- **ExplorePage** : 7 requêtes en parallèle dans le loader + CacheSeeder TanStack Query → bon pattern.
- **Providers root** : minimaux (QueryClient + Auth), pas d'excès.
- **TanStack Query** : staleTime 5 min + gcTime 30 min + `refetchOnWindowFocus: false` = config saine.
- **Realtime Supabase** : channel ouvert seulement si `userId` (pas d'orphelins).
- **Singleton Supabase** côté client : pas de client recréé par page.
- **Scroll restoration** : `<ScrollRestoration />` présent.

---

## Pièges signalés (à ne pas faire)

- **Optimiser le bundle davantage** : cargo cult. 140 KB gzip est normal pour cette app. Pas de gains à chercher ici.
- **Virtualiser les listes** : les carousels Explore sont à ≤ 10 items, les onglets profil à ≤ 200. Pas de gain réel.
- **Memoïser tout `BookPage`** : sans diagnostic profiling précis, React.memo au-dessus d'un composant à 25 useState ne résoudra rien. À faire seulement si profiler confirme re-renders excessifs.
- **Service Worker + precache** : complexe à maintenir, risque d'assets stale. Vercel + cache immutable font déjà le job.
- **Code splitting plus agressif manuel** : RR7 Framework Mode le fait déjà au niveau route.

---

## Ce qui n'a pas pu être mesuré depuis l'analyse statique

- **TTFB réel Vercel edge** vs. cold start Supabase (us-east-1 ?)
- **LCP / FCP / CLS réels** : nécessite Lighthouse ou le panel Performance de Chrome en throttling Slow 3G
- **Coût RLS effectif** sur `list_items` et `lists` avec volumétrie prod (estimé 50–150 ms mais dépend des volumes)
- **Latence Dilicom** variable selon l'heure (SOAP externe, timeout à 5 s dans le proxy)
- **Long tasks** bloquant le main thread pendant l'hydratation (profiler navigateur uniquement)
- **CPU budget** réel sur mobile bas-de-gamme (Moto G4 / Galaxy A13)
- **Taille exacte de chaque chunk** après gzip/brotli en prod (analyse statique approximative)
- **Impact réel** des fonts WOFF2 sans preload (dépend CSS loading)

**Pour ces points** : lancer un Lighthouse throttled en prod sur 3 pages clés (`/`, `/livre/populaire`, `/alix`), onglet Performance Chrome en enregistrement, puis réévaluer.

---

## Recommandation d'ordre d'action

1. **Phase 1 (2h)** : appliquer les quick wins 1–5 + indexes SQL. Mesurer avec Lighthouse avant/après.
2. **Phase 2 (1 jour)** : tester chantier A (`hydrate = true`) en profondeur. Si les meta tags tiennent, garder.
3. **Phase 3 (après mesures)** : attaquer chantiers B et C seulement si les quick wins + A ne suffisent pas.
4. **Phase 4 (qualité)** : chantier D (split BookPage) indépendant de la perf — faire quand la charge permet.

**Hypothèse réaliste après phases 1+2** : cold refresh divisé par 1.5 à 2, soft nav inchangée (déjà bonne à ~250 ms).
