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

### SEO
- Chaque route exporte `meta()` pour `<title>`, `og:*`, `twitter:*`
- JSON-LD `schema.org/Book` sur les fiches livres
- `scripts/generate-sitemap.mjs` génère `sitemap.xml` post-build
- Build time réduit : prerendering limité aux top 1000 livres actifs (`rating_count > 0`) + profils

### Fichiers clés
- `react-router.config.ts`, `src/root.tsx`, `src/routes.ts`
- `scripts/generate-sitemap.mjs`, `vercel.json`

## Routes

### Pages globales
- `/` → ExplorePage (route primaire)
- `/explorer` → redirige vers `/` (301)
- `/explorer/theme/:tag` → TagPage
- `/citations` → CitationsPage
- `/fil` → FeedPage (protégée)
- `/defis` → ChallengesPage
- `/la-revue` → JournalPage
- `/la-revue/:slug` → ArticlePage
- `/selections` → SelectionsPage
- `/selections/:slug` → SelectionPage
- `/livre/:slug` → BookPage (slug généré à l'import, fallback ID)
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
1. **Electre NG API** — source de référence pour les livres francophones. Appelé en parallèle dans `book_import` (OAuth2 password flow, token cache module-level). Edge function proxy `electre-proxy` disponible pour les appels batch. Colonnes exclusives : `electre_notice_id`, `oeuvre_id`, `collection_name`, `flag_fiction`, `quatrieme_de_couverture`, `disponibilite`. Source taggée `multi_api_electre`. Script batch : `scripts/enrich-from-electre.mjs` (dry-run par défaut, batches de 100 EANs, ne remplit que les champs NULL).
2. **Google Books API** — via edge function proxy `google-books-proxy` (rotation de clés dynamiques `GOOGLE_BOOKS_KEY_N`, cache 6h dans `search_cache`)
3. **BnF SRU** — import par ISBN dans `book_import` + recherche parallèle (`src/lib/bnfSearch.js`)
4. **Wikidata** — batch uniquement (trop lent en temps réel). **Ne jamais faire confiance aux ISBN Wikidata.**
5. **Open Library API** — parallèle avec Google quand DB < 3 résultats. Seule source quand circuit breaker Google actif.
6. **MetasBooks** — enrichissement post-merge dans `book_import` uniquement
7. **Claude Haiku** — fallback IA via `book_ai_enrich`. Source `ai_enriched`, badge "À vérifier" si `ai_confidence < 0.7`. Déclenché via BackfillPage uniquement.

**`book_import`** (`supabase/functions/book_import/index.ts`) : **5 sources en parallèle** par ISBN (Electre, Google, OL, BnF, MetasBooks), fusion par priorité, slug, upsert. `verify_jwt = false` (catalogue partagé). Fallback client-side si échec.

### Priorité de fusion par champ
- `title` : Electre > BnF > Google > OL
- `authors` : Electre > Google > BnF > OL
- `publisher` : Electre > BnF > OL > Google
- `publication_date` : Electre > BnF > Google > OL
- `page_count` : Electre > OL > Google > BnF
- `cover_url` : Electre > Google (zoom 2) > OL
- `description` : Electre (résumé/4ème couv) > Google > OL
- `language` : Electre > BnF > Google
- `genres` : Electre > Google > OL

### Recherche (`src/lib/googleBooks.js`)

Architecture DB-first : RPC `search_books_v2` en premier → skip logic (≥3 résultats DB → skip Google+OL) → Google+OL en parallèle si nécessaire.

- **`search_books_v2`** : cross-field matching, scoring de pertinence, colonnes STORED `norm_title`/`norm_authors` avec index trigram GIN (migration 028), matching compact (LETRANGER → L'étranger)
- **Skip logic** : ~60% d'appels Google évités
- **Circuit breaker** : 429 → Google désactivé 15 min → OL seul
- **Recherche IA** (`smart-search`) : Claude Haiku, cache 7j, ghost text, mode NL. Toujours retourne 200.

### Seeds et enrichissement batch
Scripts dans `scripts/` et `seeds/`. Tous : dry-run par défaut, `--apply` pour exécuter. **Règle critique** : ne jamais faire confiance aux ISBN d'un LLM — toujours valider via checksum. Passer par `book_import`.

## Architecture de données

### Tables principales
`users`, `books` (avec `slug`, `description`, `ai_confidence`, `electre_notice_id`, `oeuvre_id`, `collection_name`, `flag_fiction`, `quatrieme_de_couverture`, `disponibilite`, `norm_title`/`norm_authors` GENERATED STORED), `reviews` (avec `reply_count`), `review_replies`, `reading_status` (avec `is_reread`), `reading_log_tags`, `user_favorites` (position 1-4), `lists` (avec colonnes `is_curated`/`curator_*`), `list_items`, `follows`, `activity`, `quotes`, `likes` (polymorphe), `search_cache`, `badge_definitions`, `user_badges` (max 3 `is_pinned`), `user_points`, `point_events`, `reserved_usernames`, `notifications`.

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
- `useProfileData` distingue `diaryBooks` (read + finished_at) et `allReadBooks` (tous les "read")
- Seuil bilan annuel : 5 livres lus (logique frontend)
- Electre comme source #1 : appelé directement dans `book_import` (pas de hop via `electre-proxy`) pour réduire la latence. `electre-proxy` existe pour les appels batch externes. `oeuvre_id` Electre = regroupement des éditions
- Onglet "Éditions" sur BookPage : query `books.eq('oeuvre_id', oeuvreId)` si `oeuvre_id` présent, grille de couvertures cliquables
- CORS centralisé : `supabase/functions/_shared/cors.ts` — fallback `reliure.page` + `www.reliure.page` + localhost. Toutes les edge functions importent `getCorsHeaders` depuis ce fichier unique
- Prerendering sélectif : seuls les top 1000 livres actifs (`rating_count > 0`) sont prerendus. Sitemap aligné. Les autres livres sont accessibles en SPA via fallback
- Import IA (Search.jsx) : bloqué si non connecté, message "Connectez-vous pour ajouter ce livre" avec lien login

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

### Skeleton loading
- Composant global `src/components/Skeleton.jsx` avec classes `.sk` et `.sk-fade`
- **Ne jamais utiliser `animate-pulse` de Tailwind** — utiliser uniquement `.sk`

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

## RLS

Tables lecture publique : `users`, `books`, `reading_status`, `user_favorites`, `reviews`, `quotes`, `follows`.
Lecture conditionnelle : `lists` (is_public OR owner), `list_items` (via parent list).
Privées : `reading_log_tags`, `point_events`.
Écriture : toujours `auth.uid() = user_id`.
`notifications` : lecture/update/delete owner only, INSERT via triggers SECURITY DEFINER.

## Pages publiques

Toutes accessibles sans compte sauf `/fil`, `/parametres`, `/backfill`. `isOwnProfile = user?.id === viewedProfile?.id` contrôle l'affichage conditionnel. Hooks profil acceptent un `profileUserId` optionnel (supporte visiteurs non connectés).

## Ce qu'on ne fait PAS au MVP

- Pas de recommandations algorithmiques, pas de clubs de lecture, pas d'app mobile native (PWA)
- Pas de messagerie privée, pas de scan code-barres, pas de lien librairies
- Pas de notifications push, pas de table AUTHORS séparée (JSONB suffit)

## Fichiers de référence

- `reliure-merged.jsx` — prototype React complet
- `user-flows.md` — parcours utilisateur détaillés
- `schema.sql` — schéma PostgreSQL complet
- Ce fichier `CLAUDE.md` — source de vérité pour les décisions et conventions
