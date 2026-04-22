# Reliure

**App sociale de lecture pour la communauté francophone.**
Le Letterboxd des livres. Rendre la lecture cool again.

## Instructions pour Claude Code

Quand une modification change une décision structurante (terminologie UI, navigation, architecture de données, conventions), mets à jour ce fichier CLAUDE.md automatiquement. Ne demande pas la permission, fais-le. Les corrections de code (bugs, CSS, responsive) ne nécessitent pas de mise à jour.

## Vision produit

Reliure est une bibliothèque personnelle et un réseau social littéraire francophone. Positionnement : combler le vide entre Babelio (contenu riche, UX datée), Gleeph (mobile-first, pas de critiques), et The StoryGraph (UX moderne, anglophone). L'app est un objet culturel — jamais un tableur ou un webzine. La page profil doit donner envie de créer la sienne.

Différenciateurs : journal éditorial intégré (La Revue), citations comme feature sociale de premier plan, diary de lecture visuel, bilan annuel, tout en français (guillemets « », éditions FR).

## Stack technique

> ⚠️ CRITIQUE : Ce projet est React + Vite, PAS Next.js.
> - Ne JAMAIS ajouter `"use client"` dans aucun fichier
> - Ne JAMAIS utiliser `next/router`, `next/image`, `next/link`
> - Ne JAMAIS suggérer des patterns Next.js (App Router, Server Components, etc.)
> - Le bundler est Vite, le déploiement est Vercel via un build Vite standard

- **Frontend** : React + Vite + React Router v7 Framework Mode (SSG + SPA)
- **Backend** : Supabase (auth, PostgreSQL, storage, realtime, edge functions)
- **Styling** : Tailwind CSS
- **Data fetching / cache** : TanStack Query (`@tanstack/react-query`). Config globale : `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false`. QueryClient dans `src/root.tsx`.
- **Routing** : React Router v7 Framework Mode (prerendering + SPA), convention URLs Letterboxd
- **Déploiement** : Vercel — `outputDirectory: build/client`, SPA fallback `__spa-fallback.html`
- **Jobs asynchrones** : pg_cron

## Prerendering & SEO (React Router v7)

### Architecture
- `react-router.config.ts` : `ssr: false` + `prerender()` — HTML statique au build
- `src/root.tsx` : shell HTML + providers
- `src/routes.ts` : config déclarative des routes

### Pièges connus
- `loader` (build-time, Node) crée son propre `createClient` ; `clientLoader` (browser) utilise le singleton `supabase` de `src/lib/supabase.js`
- **`clientLoader.hydrate = true` n'est PAS utilisé** — cassait les meta tags en rendant les données asynchrones
- Coexistence avec TanStack Query : le clientLoader fetch les données initiales, `useQuery` prend le relais
- **Hydratation + valeurs aléatoires** : `Math.random()` au scope du composant cause React error #418 (mismatch SSG/client). Pattern correct : `useState(() => Math.random()...)` + `suppressHydrationWarning` sur l'élément texte (le `<p>` ou `<span>`, pas le conteneur parent).
- **WebSocket Supabase en dev** : React 19 StrictMode double-mount les effets → le channel Realtime est créé puis détruit avant connexion → warning "WebSocket closed before connection". Bénin, n'apparaît pas en production.

### SEO
- Chaque route exporte `meta()` pour `<title>`, `og:*`, `twitter:*`
- JSON-LD `schema.org/Book` sur les fiches livres
- `scripts/generate-sitemap.mjs` génère `sitemap.xml` post-build
- Build time réduit : prerendering limité aux top 1000 livres actifs (`rating_count > 0`) + profils

### 404 et erreurs
- **Pas de route splat `*`** — `/:username` matcherait avant. La 404 est gérée par `ErrorBoundary` exporté depuis `src/root.tsx`.
- `ErrorBoundary` dans `root.tsx` : `isRouteErrorResponse(error) && error.status === 404` → `<NotFoundPage />`. Autres erreurs → message générique inline.
- `NotFoundPage` doit être **totalement autonome** : pas de `<Link>` (utiliser `<a href>`), pas de hooks contextuels (useAuth, useTheme). Il s'affiche hors de l'arbre provider.
- `NotFoundPage` a 3 variants littéraires tirés au hasard via `useState` lazy initializer : ChapitreIntrouvable, CouvertureVide, PageCornee.

### Fichiers clés
- `react-router.config.ts`, `src/root.tsx`, `src/routes.ts`
- `scripts/generate-sitemap.mjs`, `vercel.json`

## Routes

### Pages globales
- `/` → ExplorePage (route primaire)
- `/explorer` → redirige vers `/` (301)
- `/explorer/boussole` → BoussolePage (découverte par humeur/intrigue)
- `/explorer/theme/:tag` → TagPage
- `/citations` → CitationsPage
- `/fil` → FeedPage (protégée)
- `/defis` → ChallengesPage
- `/la-revue` → JournalPage
- `/la-revue/:slug` → ArticlePage
- `/selections` → SelectionsPage
- `/selections/:slug` → SelectionPage
- `/livre/:slug` → BookPage (slug généré à l'import, fallback ID). Slug `"importing"` est un état transitoire SPA : `BookPageRoute` détecte `slug === "importing"` avant `useBookBySlug`, affiche `BookSkeletonEnriched` avec les données Dilicom passées en `location.state.previewData`, redirige vers `/` si accès direct sans state.
- `/login` → LoginPage
- `/parametres` → SettingsPage (protégée)
- `/backfill` → BackfillPage (protégée)

### Pages profil (pseudo à la racine)
- `/:username` → ProfilePage, onglet journal
- `/:username/bibliotheque` → onglet bibliothèque (read, reading, abandoned uniquement)
- `/:username/a-lire` → onglet À lire (want_to_read)
- `/:username/critiques` → onglet critiques
- `/:username/citations` → onglet citations
- `/:username/listes` → onglet listes
- `/:username/listes/:slug` → ListPage
- `/:username/bilan` → onglet bilan

### Slugs livres
Générés à l'import via `src/utils/slugify.js`. Unicité : titre → titre-auteur → titre-auteur-année → titre-n.

### Mots réservés
Liste dans `src/constants/reserved-usernames.js`. Vérifiés à l'inscription (frontend + backend).

## Sources de métadonnées livres

Stratégie hybride, par priorité :
1. **Dilicom FEL Search** — catalogue physique français (~1.8M refs). Edge function `dilicom-search` : recherche texte (quickSearch) + lookup EAN (advancedSearch). SOAP/XML, parsing regex. Couvertures via `images.centprod.com`. Source taggée `multi_api_dilicom`. `verify_jwt = false`.
2. **Electre NG API** — champs exclusifs : `electre_notice_id`, `oeuvre_id`, `collection_name`, `flag_fiction`, `quatrieme_de_couverture`. OAuth2 password flow, token cache module-level. Edge function proxy `electre-proxy` pour appels batch. Source taggée `multi_api_electre`. Script batch : `scripts/enrich-from-electre.mjs`.
3. **Google Books API** — via edge function proxy `google-books-proxy` (rotation de clés dynamiques `GOOGLE_BOOKS_KEY_N`, cache 6h dans `search_cache`)
4. **BnF SRU** — import par ISBN dans `book_import` + recherche parallèle (`src/lib/bnfSearch.js`)
5. **Wikidata** — batch uniquement (trop lent en temps réel). **Ne jamais faire confiance aux ISBN Wikidata.**
6. **Open Library API** — parallèle avec Google quand DB < 3 résultats. Seule source quand circuit breaker Google actif.
7. **MetasBooks** — enrichissement post-merge dans `book_import` uniquement
8. **Claude Haiku** — fallback IA via `book_ai_enrich`. Source `ai_enriched`, badge "À vérifier" si `ai_confidence < 0.7`. Déclenché via BackfillPage uniquement.

**`book_import`** (`supabase/functions/book_import/index.ts`) : **6 sources en parallèle** par ISBN (Dilicom, Electre, Google, OL, BnF, MetasBooks), fusion par priorité, slug, upsert. `verify_jwt = false` (catalogue partagé). Fallback client-side si échec.

### Priorité de fusion par champ
- `title` : Electre > Dilicom > BnF > Google > OL
- `authors` : Electre > Google > Dilicom > BnF > OL
- `publisher` : Dilicom > Electre > BnF > OL > Google
- `publication_date` : Electre > BnF > Dilicom > Google > OL
- `page_count` : Electre > OL > Dilicom > Google > BnF
- `cover_url` : Dilicom > Electre > Google (zoom 2) > OL
- `description` : Electre (résumé/4ème couv) > Dilicom > Google > OL
- `language` : Electre > Dilicom > BnF > Google
- `genres` : Electre > Dilicom > Google > OL
- `disponibilite` : Electre > Dilicom

### Recherche (`src/lib/googleBooks.js`)

Architecture parallèle Tier 1 : DB locale + Dilicom en `Promise.all` → merge scoré + dédup → Google seulement si pool insuffisant → OL en fallback si Google down.

- **Tier 1 (toujours, en parallèle)** : `searchLocalBooks` (RPC `search_books_v2`) + `fetchDilicom` — Dilicom n'est jamais skippé (sauf ISBN exact trouvé en DB → court-circuit total)
- **Tier 2 (conditionnel)** : Google Books si pool fusé DB+Dilicom < 3 résultats ET pas de `hasExactTitleMatch`. `hasExactTitleMatch` : `fusedPool[0]._score >= 200` → skip Google (Dilicom a déjà trouvé titre exact — évite 4-6s d'attente inutile)
- **Tier 3** : Open Library si Google down
- **`search_books_v2`** : cross-field matching, scoring de pertinence avec bonus phrase-substring (+60), colonnes STORED `norm_title`/`norm_authors` avec index trigram GIN (migration 028), matching compact (LETRANGER → L'étranger)
- **Merge scoré** : exact match (+200) > préfixe (+100) > substring (+50) > auteur (+40) > bonus DB (+15) > popularité. Dédup par ISBN puis titre normalisé.
- **Circuit breaker** : 429 → Google désactivé 15 min → OL seul
- **Recherche IA** (`smart-search`) : Claude Haiku, cache 7j, ghost text, mode NL. Toujours retourne 200. Retourne jusqu'à **8 suggestions** (max_tokens 700). Haiku doit toujours proposer des livres si l'intention est littéraire — `books: []` réservé aux requêtes hors-livres (météo, recettes…).
- **`aiEnabled`** : activé si `dbResultCount < 3 || isNL || wordCount >= 3`. Les requêtes 3+ mots sont considérées thématiques même si la DB retourne ≥3 résultats mécaniques.
- **"Voir plus de suggestions ✨"** : les 3 premiers résultats IA sont affichés, un bouton discret révèle les suivants (`showAllAI` state, reset à chaque nouvelle requête).

### Seeds et enrichissement batch
Scripts dans `scripts/` et `seeds/`. Tous : dry-run par défaut, `--apply` pour exécuter. **Règle critique** : ne jamais faire confiance aux ISBN d'un LLM — toujours valider via checksum. Passer par `book_import`.

## Architecture de données

### Tables principales
`users`, `books` (avec `slug`, `description`, `ai_confidence`, `electre_notice_id`, `oeuvre_id`, `collection_name`, `flag_fiction`, `quatrieme_de_couverture`, `disponibilite`, `norm_title`/`norm_authors` GENERATED STORED), `reviews` (avec `reply_count`), `review_replies`, `reading_status` (avec `is_reread`), `reading_log_tags`, `user_favorites` (position 1-4), `lists` (avec colonnes `is_curated`/`curator_*`), `list_items`, `follows`, `activity`, `quotes`, `likes` (polymorphe), `search_cache`, `badge_definitions`, `user_badges` (max 3 `is_pinned`), `user_points`, `point_events`, `reserved_usernames`, `notifications`, `book_facets` (moods, rythme, registre, protag, intrigues — feature Boussole), `book_recommendations` (recos IA personnalisées, 1 set/user, TTL 7j, owner-only).

Schéma complet : `schema.sql`.

### Anti-doublons
Reliure regroupe les éditions par oeuvre. Vérification ISBN exact puis titre normalisé + auteur via `findExistingBook` (`src/utils/deduplicateBook.js`). Appliqué dans `importBook.js` (client) et `book_import` (server). "L'Étranger", "L\u2019Étranger", "L'Etranger" = même clé.

### Décisions clés
- `reading_status` séparée de `reviews` (marquer "lu" sans critiquer)
- `finished_at` nullable : si renseigné → diary, sinon → bibliothèque seulement
- `is_reread` distingue les relectures dans le diary
- `authors` en JSONB au MVP (migration vers table dédiée avec les pages auteurs)
- `activity` = event log polymorphe, feed = requête sur les activités des follows
- `likes` polymorphe (target_type), compteur maintenu par trigger
- `user_favorites` swap : delete+reinsert (pas d'update) pour le CHECK position 1-4
- `useProfileData` : 2 requêtes PostgREST (reading_status + reviews), dérive `diaryBooks` et `allReadBooks` côté client. `allReadBooks` supprimé du return (non consommé). Les "reading" books sont dérivés depuis `allStatuses` dans ProfilePage.
- **Onglets profil lazy-loaded** : `useMyReviews`, `useMyQuotes`, `useMyLists` acceptent `{ enabled }` — seul l'onglet actif déclenche sa requête. Les données above-the-fold (diary, stats, favoris, follow counts) se chargent immédiatement.
- Seuil bilan annuel : 5 livres lus (logique frontend)
- Electre comme source #1 : appelé directement dans `book_import` (pas de hop via `electre-proxy`) pour réduire la latence. `electre-proxy` existe pour les appels batch externes. `oeuvre_id` Electre = regroupement des éditions
- Onglet "Éditions" sur BookPage : query `books.eq('oeuvre_id', oeuvreId)` si `oeuvre_id` présent, grille de couvertures cliquables
- CORS centralisé : `supabase/functions/_shared/cors.ts` — fallback `reliure.page` + `www.reliure.page` + localhost. Toutes les edge functions importent `getCorsHeaders` depuis ce fichier unique
- Prerendering sélectif : seuls les top 1000 livres actifs (`rating_count > 0`) sont prerendus. Sitemap aligné. Les autres livres sont accessibles en SPA via fallback
- Import IA (Search.jsx) : bloqué si non connecté, message "Connectez-vous pour ajouter ce livre" avec lien login
- **Navigation optimiste import** : clic résultat Dilicom → `navigate("/livre/importing", { state: { previewData } })` immédiat → `importBook().then(navigate)` en arrière-plan. Pas d'`await`, pas de toast de chargement.
- **`stripGoogleDescription()`** : appliqué dans `src/lib/googleBooks.js` et `supabase/functions/book_import/index.ts` — nettoie HTML (`<b>`, `<i>`, `<p>`, `<br/>`) et entités (`&lt;`, `&amp;`, etc.) des descriptions Google Books. Script batch : `scripts/fix-google-descriptions.mjs`.
- **`CacheSeeder` (ExplorePageRoute)** : ne sette le cache TanStack Query que si les données ne sont pas vides — évite de bloquer les refetch si le build SSG a produit des tableaux vides (ex: timeout Supabase pendant le prerender).

## Design system

### Typographie
- **Display** : EB Garamond (roman) — titres, headings, nom de profil. Italic réservé aux citations « » et au fallback cover. Classe : `font-display`.
- **Body** : Geist — tout le reste. Classe : `font-body`.
- Poids : 400 regular, 500 medium, 600 semibold, 700 bold

### Couleurs — CONVENTION CRITIQUE

Toutes les couleurs via CSS custom properties dans `src/index.css` (`:root` light, `[data-theme="dark"]` dark). Les variables `@theme` Tailwind pointent vers ces custom properties.

**Règle absolue** : toujours `var(--xxx)` en inline style ou classe Tailwind. **Jamais de hex hardcodé.** Voir `src/index.css` pour le catalogue complet.

- Bouton inversé (CTA) : `style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}`
- Track de progression : `bg-[var(--border-default)]` (pas `bg-avatar-bg`, invisible en dark)

### Dark mode
- Toggle manuel via `useTheme()` (`src/hooks/useTheme.js`), `data-theme="light|dark"` sur `<html>`
- Pas de `prefers-color-scheme` — toggle manuel uniquement pour la beta

### Layout
- Max-width : `760px`, header sticky blur, couvertures ratio 2:3, carousels horizontaux

### Upload avatar
- Compression canvas avant upload : **200×200px max, JPEG qualité 0.70** (affiché à ~104px, 200 = 2× retina). Ne pas augmenter — l'ancienne valeur 400×400/0.85 produisait des fichiers de ~1 MB.

### Skeleton loading
- Composant global `src/components/Skeleton.jsx` avec classes `.sk` et `.sk-fade`
- **Ne jamais utiliser `animate-pulse` de Tailwind** — utiliser uniquement `.sk`
- Variables CSS dédiées dans `src/index.css` : `--bg-skeleton` (fond) et `--bg-skeleton-shine` (reflet shimmer). Ne jamais utiliser `--bg-elevated` ou `--border-subtle` pour les skeletons — contraste insuffisant en dark mode.
- `BookSkeletonEnriched` (`BookPageRoute.jsx`) : skeleton enrichi pendant import Dilicom — affiche vraie couverture + titre + auteur si disponibles en `previewData`.

## Règles React — performance et boucles

- Jamais de `new Date()`, `[]`, `{}` ou de fonction créés au scope du composant dans les dépendances de `useCallback`/`useMemo`/`useEffect`. Toujours des primitifs.
- Toute dépendance objet → remplacer par son identifiant primitif (`user` → `user.id`).
- Tout hook Supabase : guard `if (!userId) return`, colonnes explicites (jamais `select('*')`), `.limit()` explicite.

### Conventions TanStack Query

- Tous les hooks de lecture utilisent `useQuery`. Plus de `useState` + `useEffect` + fetch manuel.
- QueryKeys :
  - `["book", slug]`, `["bookReviews", bookId]`, `["bookQuotes", bookId]`
  - `["profileData", userId]`, `["myReviews", userId]`, `["myQuotes", userId]`, `["myLists", userId]`
  - `["favorites", userId]`, `["followCounts", userId]`, `["readingList", statusFilter, userId]`
  - `["babelioPopular"]`, `["popularReviews"]`, `["popularQuotes"]`, `["popularLists"]`
  - `["booksByGenre", genre]`, `["feed"]`, `["reviewReplies", reviewId]`
  - `["otherEditions", oeuvreId, bookId]`, `["bookCuratedSelections", bookId]`
  - `["notifications"]` (staleTime 1min), `["unreadCount"]` (staleTime 30s)
  - `["boussole", filters]`, `["boussoleCount"]`
  - `["recommendations", userId]` (staleTime 10min, cache DB 7j, rate limit 1/24h)
- **Invalidation cross-cache** : après mutation, invalider toutes les queryKeys affectées.
- **Optimistic UI** : préserver le pattern `safeMutation` + `useRef` pour les toggles likes.

## Conventions

### Langue
- UI en français, sans exception. Guillemets « ». Pas de em dashes (—).
- Variables et composants en anglais, textes visibles en français.

### Terminologie UI
- "Fil" (pas "Feed"), "Profil", "Critiques" (pas "Reviews"), "Citations" (pas "Quotes")
- "Listes", "Abonnés / Abonnements" (pas "Followers"), "En cours", "À lire", "Abandonné"
- "Bilan" (pas "Year in Review"), "La Revue" (pas "Journal" — réservé au diary)
- "Mes critiques / Mes citations / Mes listes" (onglets profil, possessif)
- "Thèmes" (tags descriptifs), "Évaluations" (compteur communautaire), "Défis" (pas "Challenges")
- "Populaires" (pas "Trending"), "Répondre" (pas "Reply")

### Navigation
6 sections : Explorer, Citations, Fil, Défis, Profil | La Revue (serif italic).
Onglets profil : Journal, Bibliothèque, À lire, Mes critiques, Mes citations, Mes listes, Bilan.

### Profil
**Quatre favoris** : mode édition explicite via bouton "Modifier" (desktop et mobile identiques). En mode édition, overlay persistant avec 3 actions (× retirer, ⋮⋮ déplacer, swap remplacer). Slots vides toujours cliquables pour ajouter. Bouton "Modifier" visible uniquement si ≥1 favori. Message italique serif si 0 favori vu par un visiteur.

## RLS

Tables lecture publique : `users`, `books`, `reading_status`, `user_favorites`, `reviews`, `quotes`, `follows`, `book_facets`.
Lecture conditionnelle : `lists` (is_public OR owner), `list_items` (via parent list).
Privées : `reading_log_tags`, `point_events`, `book_recommendations` (owner-only SELECT, écriture via edge function service_role).
Écriture : toujours `auth.uid() = user_id`.
`notifications` : lecture/update/delete owner only, INSERT via triggers SECURITY DEFINER.

## Pages publiques

Toutes accessibles sans compte sauf `/fil`, `/parametres`, `/backfill`. `isOwnProfile = user?.id === viewedProfile?.id` contrôle l'affichage conditionnel. Hooks profil acceptent un `profileUserId` optionnel (supporte visiteurs non connectés).

## Ce qu'on ne fait PAS au MVP

- Pas de recommandations collaborative filtering (les recos sont LLM content-based via `book-recommendations` edge function), pas de clubs de lecture, pas d'app mobile native (PWA)
- Pas de messagerie privée, pas de scan code-barres, pas de lien librairies
- Pas de notifications push, pas de table AUTHORS séparée (JSONB suffit)
- Pas de micro-questionnaire post-lecture (les facets sont enrichis par IA batch uniquement)

## Fichiers de référence

- `reliure-merged.jsx` — prototype React complet
- `user-flows.md` — parcours utilisateur détaillés
- `schema.sql` — schéma PostgreSQL complet
- Ce fichier `CLAUDE.md` — source de vérité pour les décisions et conventions
