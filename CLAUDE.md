# Reliure

**App sociale de lecture pour la communauté francophone.**
Le Letterboxd des livres. Rendre la lecture cool again.

## Instructions pour Claude Code

Quand une modification change une décision structurante (terminologie UI, navigation, architecture de données, conventions), mets à jour ce fichier CLAUDE.md automatiquement. Ne demande pas la permission, fais-le. Les corrections de code (bugs, CSS, responsive) ne nécessitent pas de mise à jour.

## Vision produit

Reliure est une bibliothèque personnelle et un réseau social littéraire qui cible la communauté francophone. Le positionnement : combler le vide entre Babelio (contenu riche mais UX datée), Gleeph (mobile-first mais pas de critiques), et The StoryGraph (UX moderne mais anglophone).

Ce qui rend Reliure différent :
- Une identité visuelle éditoriale et désirable (pas utilitaire)
- Un journal éditorial intégré (essais, entretiens, sélections — style Sabzian/Cahiers du Cinéma)
- Les citations comme feature sociale de premier plan (pas un ajout secondaire)
- Le diary de lecture (calendrier visuel des lectures terminées, comme Letterboxd)
- Le bilan annuel (Year in Review) intégré
- Tout en français, pensé pour le français (guillemets « », éditions françaises, librairies françaises)

L'app ne doit jamais ressembler à un tableur ou à un webzine. C'est un objet culturel. La page profil d'un utilisateur doit donner envie de créer la sienne.

## Paysage concurrentiel

### Babelio (concurrent direct #1)
- ~1,3M inscrits, fondé en 2007, leader francophone
- Forces : base de données massive (accès FEL/Dilicom), 3,3M de critiques, SEO dominant sur les fiches livres FR, partenariats éditeurs (Masse Critique), légitimité institutionnelle (Défi Babelio dans les écoles)
- Faiblesses : UX datée (n'a pas évolué depuis 10 ans), app mobile faible, design webzine plutôt qu'outil personnel
- Leur base de données s'appuie sur le FEL (Fichier Exhaustif du Livre via Dilicom, 1,4M titres, 60 données par notice, B2B payant) + enrichissement communautaire (182K associations manuelles, 286K regroupements algorithmiques) + veille presse (70 médias, 250 prix littéraires, 200K biographies auteurs)
- Monétisation : pub + partenariats éditeurs + Babelthèque (service pour bibliothèques publiques) + data analytics

### Gleeph (concurrent direct #2)
- ~750K utilisateurs, fondé en 2019, La Rochelle, 3M€ levés
- Forces : mobile-first, scan code-barres, lien librairies indépendantes, 50%+ des users <24 ans, soutien BPI/Banque des Territoires
- Faiblesses : pas de critiques sur les fiches livres, pas de version web, base incomplète sur les anciens livres, navigation parfois confuse
- Côté B2B : plateforme Bookmetrie pour les pros du livre (Gallimard, Hachette, Relay)

### Booknode
- ~500K inscrits, fondé en 2008, communauté orientée YA/Fantasy/Romance
- Forces : notation multicritères (scénario, écriture, suspense, personnages), forums actifs, bonne gestion des sagas
- Faiblesses : audience niche (YA), design conventionnel, app mobile buggée

### The StoryGraph (benchmark UX)
- 5M utilisateurs (jan 2026), fondé en 2019 par Nadia Odunayo
- Forces : UX best-in-class, stats de lecture détaillées (mood, pace, genre), import Goodreads, croissance organique via BookTok, App Store Award 2025
- Faiblesses pour nous : anglophone, pas de traduction FR, base francophone faible
- C'est le modèle à suivre pour l'UX et les features, adapté au marché FR

### SensCritique
- ~1M membres, généraliste culturel (films, séries, livres, musique, jeux)
- Les livres sont un segment secondaire, pas d'outils de gestion de bibliothèque

### Livraddict
- ~80K membres, bénévole, excellente gestion des sagas, communauté fidèle mais stagnante, pas d'app mobile

### Angles d'attaque
1. Cibler la frustration UX des utilisateurs Babelio/Booknode
2. Proposer ce que Gleeph ne fait pas : critiques, stats avancées, version web
3. Être le "StoryGraph français" avec base optimisée pour les éditions francophones
4. L'import de données depuis Babelio/Booknode/Goodreads est crucial pour réduire la friction de migration

## Stack technique

> ⚠️ CRITIQUE : Ce projet est React + Vite, PAS Next.js.
> - Ne JAMAIS ajouter `"use client"` dans aucun fichier
> - Ne JAMAIS utiliser `next/router`, `next/image`, `next/link`
> - Ne JAMAIS suggérer des patterns Next.js (App Router, Server Components, etc.)
> - Le bundler est Vite, le déploiement est Vercel via un build Vite standard

- **Frontend** : React + Vite + React Router (BrowserRouter)
- **Backend** : Supabase (auth, PostgreSQL, storage, realtime, edge functions)
- **Styling** : Tailwind CSS (migré depuis CSS-in-JS)
- **Routing** : React Router v7, convention URLs Letterboxd (/:username, /livre/:slug, /explorer, etc.)
- **Déploiement** : Vercel (vercel.json rewrite SPA)
- **Jobs asynchrones** : pg_cron (stats agrégées, trending, cache invalidation)

## Routes

### Pages globales
- `/` → redirige vers `/explorer`
- `/explorer` → ExplorePage
- `/explorer/theme/:tag` → TagPage
- `/citations` → CitationsPage
- `/fil` → FeedPage (protégée)
- `/defis` → ChallengesPage
- `/la-revue` → JournalPage
- `/la-revue/:slug` → ArticlePage
- `/livre/:slug` → BookPage (slug généré à l'import, fallback ID)
- `/login` → LoginPage
- `/parametres` → SettingsPage (protégée)
- `/backfill` → BackfillPage (protégée)

### Pages profil (pseudo à la racine)
- `/:username` → ProfilePage, onglet journal
- `/:username/bibliotheque` → onglet bibliothèque (read, reading, abandoned uniquement)
- `/:username/a-lire` → onglet À lire (want_to_read, avec compteur si > 0)
- `/:username/critiques` → onglet critiques
- `/:username/citations` → onglet citations
- `/:username/listes` → onglet listes
- `/:username/listes/:slug` → ListPage (page liste publique)
- `/:username/bilan` → onglet bilan

### Slugs livres
Générés à l'import via `src/utils/slugify.js`. Unicité garantie : titre → titre-auteur → titre-auteur-année → titre-n.

### Mots réservés
Liste dans `src/constants/reserved-usernames.js`. Vérifiés à l'inscription (frontend + backend).

## Sources de métadonnées livres

Stratégie hybride, par priorité :
1. **Google Books API** — socle principal, gratuit, excellente couverture FR, couvertures incluses
2. **BnF SRU** — catalogue légal exhaustif de tous les livres publiés en France ; utilisé en **recherche parallèle** (`src/lib/bnfSearch.js`) ET en import par ISBN (`book_import`)
3. **Open Library API** — complément pour les trous, open source
4. **Nudger (Open Data ISBN)** — base ISBN française, licence ODbL, CSV gratuit via data.gouv.fr
5. **Enrichissement communautaire** — les utilisateurs corrigent/complètent les fiches (comme TMDb pour Letterboxd)
6. **Claude Haiku (enrichissement IA)** — utilisé en fallback quand Google Books, BnF et Open Library échouent. Edge function `book_ai_enrich` : Haiku génère métadonnées + description FR, Open Library confirme + fournit OLID, cascade de 4 sources pour la couverture. Source `ai_enriched`, champ `ai_confidence` (numeric 3,2) indique le niveau de certitude. Badge "À vérifier" sur BookPage si confidence < 0.7. Déclenché uniquement via BackfillPage (jamais automatique).

L'edge function `book_import` (`supabase/functions/book_import/index.ts`) interroge 3 sources en parallèle par ISBN (Google Books, Open Library, BnF SRU), fusionne les résultats selon une priorité par champ, génère le slug, et upsert dans `books`. Si l'edge function échoue, `importBook.js` retombe sur un import client-side avec les données Google Books.

**Recherche BnF** (`src/lib/bnfSearch.js`) : toujours disponible pour l'edge function `book_import` (import par ISBN). N'est plus utilisée dans la recherche libre (supprimée pour éviter les timeouts de 3s).

### Priorité de fusion par champ (edge function `book_import`)
- `title` : BnF > Google > Open Library
- `authors` : Google > BnF > Open Library
- `publisher` : BnF > Open Library > Google
- `publication_date` : BnF > Google > Open Library
- `page_count` : Open Library > Google > BnF
- `cover_url` : Google (zoom 2) > Open Library
- `description` : Google > Open Library
- `language` : BnF > Google
- `genres` : Google > Open Library

### Qualité des résultats de recherche (`src/lib/googleBooks.js`)

Architecture DB-first : la base locale (3830+ livres) est la source primaire, Google Books sert uniquement à la découverte.

`searchBooks(query)` fonctionne en séquentiel (RPC-first) avec skip logic :

1. **Recherche locale** via RPC PostgreSQL `search_books_v2` (migration `008_improve_search_books_v2.sql`) :
   - **Cross-field matching** : chaque mot significatif (>2 chars) doit être présent dans le titre OU dans les auteurs (`bool_and` sur `title LIKE OR authors LIKE`). Permet "Victor Hugo Les Misérables", "Madame Bovary Flaubert".
   - **Scoring de pertinence** : match exact titre (+100), titre commence par query (+50), couverture titre (×30), couverture auteur (×5), rating_count en tie-breaker. Garantit que "Les Misérables" remonte avant des livres parasites.
   - **Matching compact** : pour les queries mono-token ≥5 chars (ex: "LETRANGER"), compare sans espaces ni ponctuation → matche "L'étranger".
   - **Branche ISBN** : si la query est un nombre de 10-13 chiffres, match exact sur `isbn_13`.
   - Gère apostrophes françaises, accents via `unaccent(lower())`.
2. **Skip logic** (économie quota Google Books, ~60% d'appels évités) :
   - Si RPC retourne ≥ 3 résultats → skip Google (`db_sufficient`)
   - Si query est un ISBN et RPC retourne ≥ 1 résultat → skip Google (`isbn_found`)
   - Sinon → appel Google Books pour découverte
   - Le tableau retourné porte `_skippedGoogle` et `_skipReason` en propriétés
3. **Google Books** (conditionnel) : une seule requête (`langRestrict=fr`, max 15 résultats), filtrée (sans couverture, sans ISBN, éditeurs parasites, mots-clés parasites exclus), limitée à 8 résultats après filtre.

**Logging** : chaque appel `searchBooks()` émet un `console.log('[search-analytics]', JSON.stringify({...}))` avec les compteurs DB, Google, skip. Greppable dans les logs Vercel.

**Smart-search aligné** : `useSmartSearch` dans `Search.jsx` est désactivé quand `dbResultCount >= 3` et que la query n'est pas en langage naturel — cohérent avec la skip logic Google.

**Déduplication** : les résultats Google qui dupliquent un résultat DB (même ISBN-13 ou même titre normalisé) sont supprimés. Les résultats DB ne sont jamais supprimés.

**Format de retour** (`{ googleId, _source, dbId, slug, title, authors, coverUrl, isbn13, ... }`) — même format pour DB et Google, consommé directement par `Search.jsx`.

**`searchSuggestions.js`** : autocomplete dynamique depuis Supabase (ilike titre par popularité, cache 1 min). N'est plus appelé dans le pipeline principal (remplacé par la RPC).

### Recherche assistée IA (`supabase/functions/smart-search/index.ts` + `src/hooks/useSmartSearch.js`)

Filet de secours intelligent qui enrichit le pipeline classique. Activé dès 2 caractères (debounce 600ms) seulement si `dbResultCount < 3` ou si la query est en langage naturel (`looksLikeNaturalLanguage`). Désactivé quand la DB suffit (aligné avec la skip logic Google). Le coût est amorti par le cache `search_cache` (7 jours).

**Edge function `smart-search`** :
- Appelle Claude Haiku (`claude-haiku-4-5-20251001`) avec un system prompt spécialisé livres francophones
- Retourne `{ books: [{title, author, isbn13, why}], ghost, interpreted_as }`
- Cache des résultats dans `search_cache` (7 jours, clé = query normalisée NFD+lowercase)
- Accès cache via `service_role` uniquement (pas de RLS publique)
- Toujours retourne 200 même en cas d'erreur (ne casse jamais la recherche)
- Requiert `ANTHROPIC_API_KEY` en secret Supabase

**Table `search_cache`** (`migrations/004_search_cache.sql`) :
- `query_normalized text` (PK), `response jsonb`, `hit_count int`, `expires_at timestamptz` (7 jours)
- Index sur `expires_at`, RLS activée (service_role only)

**Hook `useSmartSearch(query, { enabled, debounceMs })`** :
- Debounce 600ms, AbortController pour annulation
- Retourne `{ books, ghost, interpretedAs, isLoading }`
- `looksLikeNaturalLanguage(query)` : détecte les mots-clés NL ou queries ≥ 4 mots

**Intégration dans `Search.jsx`** :
- Ghost text : overlay invisible aligné sur l'input, accepté par Tab/ArrowRight, rejeté par Escape
- `displayResults` useMemo : quand l'IA a répondu, filtre les résultats classiques — confirmés (titre + auteur matching) en premier, non-confirmés limités à 2. `aiConfirmedMap` lie chaque résultat classique au livre IA correspondant.
- Résultats IA affichés sous les résultats classiques avec indicateur ✨, dédoublonnés par titre normalisé
- IA activée uniquement si résultats classiques < 2 OU query en langage naturel (`looksLikeNaturalLanguage`)
- Clic sur un résultat IA → recherche Google Books avec le titre canonique → import normal
- Clic sur un résultat DB → navigation directe via `slug ?? dbId` sans passer par importBook
- Indicateur "Recherche approfondie…" pendant le chargement IA
- Le SYSTEM_PROMPT de `smart-search` retourne l'ISBN de l'édition poche française (Folio, LdP, Points…)

### Enrichissement batch de la base locale

Scripts dans `scripts/`, rapports dans `reports/`. Pipeline exécuté en mars 2026 : +93 livres importés via BnF+OL (0 appel Google).

- `scripts/identify-missing-books.mjs` — liste curatée ~200 livres FR + extraction queries search_cache → `reports/missing-books.json`
- `scripts/validate-isbn.mjs` — validation ISBN via checksum + Open Library + BnF SRU. `--apply` nullifie les invalides.
- `scripts/resolve-isbn-bnf.mjs` — résolution ISBN par titre+auteur via BnF SRU (UNIMARC). 78,5% de taux de résolution. `--apply` met à jour missing-books.json.
- `scripts/batch-import-missing.mjs` — import batch, 3 modes : `--source edge` (edge function), `--source direct` (BnF+OL, 0 Google), `--source google`. Dry-run par défaut, `--apply` pour importer.

**Leçon critique** : ne jamais faire confiance aux ISBN générés par un LLM (88% d'hallucinations constatées). Toujours valider via source externe.

### Scripts d'enrichissement continu (seeds/)

Scripts autonomes dans `seeds/` pour enrichir les métadonnées des livres existants. Tous utilisent `@supabase/supabase-js`, env via `node --env-file=.env`. Dry-run par défaut, `--apply` pour exécuter. Options communes : `--limit N`, `--offset N`.

- `seeds/enrich-incomplete-books.js` — enrichit les livres avec ISBN mais sans cover ou description en les repassant dans l'edge function `book_import`. Options : `--cover-only`.
- `seeds/recover-covers.js` — récupère les couvertures manquantes par recherche titre+auteur sur Google Books puis Open Library (fallback). Nettoyage titre (suffixes parasites, sous-titres, séries). Détection auto quota Google (429 → bascule OL-only).
- `seeds/recover-descriptions.js` — récupère les descriptions manquantes par recherche titre+auteur sur Google Books puis Open Library (fallback via work detail). Seuil minimum 50 chars. Warning à 900 appels Google (quota 1000/jour).
- `seeds/generate-descriptions.js` — génère des descriptions FR via Claude Haiku (API Anthropic directe). 5 appels parallèles, 50ms entre chaque. Checkpoint `descriptions-progress.json` toutes les 200 requêtes. Options : `--cost-only`. Coût estimé : ~$0.0005/livre.
- `seeds/scrape-sc-list.js` — scrape une liste SensCritique via Playwright (headless). Gère infinite scroll, ISBN optionnel, merge, checkpoint Ctrl+C.

## Architecture de données

### Tables principales
- `users` — id, username, display_name, avatar_url, bio, created_at
- `books` — id, isbn_13, title, subtitle, authors (jsonb), publisher, publication_date, cover_url, language, genres (jsonb), page_count, avg_rating, rating_count, source, **slug** (unique, généré à l'import)
- `reviews` — id, user_id, book_id, rating (smallint), body, contains_spoilers, likes_count, created_at
- `reading_status` — id, user_id, book_id, status (want_to_read/reading/read/abandoned), started_at, finished_at, current_page, is_reread, created_at
- `reading_log_tags` — id, reading_status_id, user_id, tag_text, created_at
- `user_favorites` — id, user_id, book_id, position (1-4, CHECK), note (text, max 24 chars), created_at
- `lists` — id, user_id, title, description, is_public, is_ranked, likes_count, **slug** (unique par user, généré depuis le titre), created_at
- `list_items` — id, list_id, book_id, position, note
- `follows` — id, follower_id, following_id, created_at
- `activity` — id, user_id, action_type, target_id, target_type, metadata (jsonb), created_at
- `quotes` — id, user_id, book_id, text, likes_count, created_at
- `likes` — id, user_id, target_id, target_type (review/quote/list), created_at
- `search_cache` — query_normalized (PK), response (jsonb), hit_count, expires_at (service_role only, pas de RLS publique)

### Anti-doublons : regroupement des éditions par oeuvre
Reliure regroupe les éditions par oeuvre (comme Letterboxd : un film = une fiche). Avant toute création dans `books`, vérification par ISBN exact puis par titre normalisé + auteur principal via `findExistingBook` (`src/utils/deduplicateBook.js`). Appliqué dans les deux points d'insertion : `importBook.js` (client-side) et edge function `book_import` (server-side). Normalisation : remplacement des apostrophes françaises par un espace, suppression accents/ponctuation, coupe au premier `:` ou `/` (sous-titres BnF), extraction du nom de famille de l'auteur. Ce fix garantit que "L'Étranger", "L\u2019Étranger" et "L'Etranger" produisent la même clé normalisée.

### Décisions clés
- `reading_status` séparée de `reviews` : on peut marquer "lu" sans critiquer (geste minimal = plus de volume)
- `reading_status.finished_at` est nullable : si renseigné → entrée diary, sinon → bibliothèque seulement (résout la confusion watched/logged de Letterboxd)
- `reading_status.is_reread` distingue les relectures dans le diary (un lecteur qui relit Ficciones 3 fois a 3 entrées)
- `reading_log_tags` table séparée pour les tags personnels libres au moment du log ("en vacances", "recommandé par Margaux")
- `authors` en JSONB au MVP (pas de table de jointure), migration vers table `AUTHORS` + `BOOK_AUTHORS` quand on fera les pages auteurs
- `activity` est un event log polymorphe : chaque action génère une entrée, le feed est une requête sur les activités des follows
- `likes` table polymorphe (target_type) plutôt que likes_count dénormalisé seul — le compteur est maintenu par trigger
- Feed strategy au MVP : fan-out on read avec cache pg_cron toutes les 5 minutes
- Row Level Security (RLS) Supabase configurée dès le jour 1
- Seuil bilan annuel : 5 livres lus dans l'année (logique frontend, pas de table)
- `books.slug` unique, généré à `src/utils/slugify.js` (titre → titre-auteur → titre-auteur-année → titre-n). Migration `migrations/001_add_book_slugs.sql` à appliquer.
- `user_favorites` swap : pattern delete+reinsert (pas d'update) pour respecter le CHECK constraint position 1-4
- `useProfileData` distingue `diaryBooks` (read + finished_at non null, pour le diary/calendrier) et `allReadBooks` (tous les "read", pour stats/bilan/topRated)

## Design system

### Typographie
- **Display** : Instrument Serif (italic) — titres de section, titres de livres dans les fiches, headings éditoriaux
- **Body** : Geist — tout le reste (nav, labels, corps de texte, métadonnées)
- Pas de mélange de poids fantaisistes : 400 regular, 500 medium, 600 semibold, 700 bold

### Palette de couleurs — CSS custom properties (dark mode ready)

Toutes les couleurs UI sont gérées via CSS custom properties dans `src/index.css` (`:root` pour light, `[data-theme="dark"]` pour dark). Les variables `@theme` de Tailwind (`--color-*`) pointent vers ces custom properties pour que les classes utilitaires (`bg-surface`, `bg-cover-fallback`, etc.) switchent automatiquement.

**Variables principales** (valeurs light / dark) :
- `--bg-primary` : `#fff` / `#131211` — fond principal
- `--bg-surface` : `#fafaf8` / `#1a1918` — fond surface
- `--bg-elevated` : `#fff` / `#222120` — fond élevé (modals, cards, skeletons)
- `--text-primary` : `#1a1a1a` / `#e8e5df` — titres, noms, UI principale
- `--text-body` : `#333` / `#c5c2ba` — critiques, articles, contenu de lecture longue
- `--text-secondary` : `#666` / `#9c9890` — bio, auteurs, métadonnées
- `--text-tertiary` : `#767676` / `#706c65` — labels, timestamps, compteurs
- `--text-muted` : `#b5b0a8` / `#363330` — placeholders très discrets
- `--border-subtle` : `#f0f0f0` / `#262422` — séparateurs fins
- `--border-default` : `#eee` / `#302e2b` — bordures de composants
- `--header-bg` : `rgba(255,255,255,0.92)` / `rgba(19,18,17,0.95)` — header backdrop
- `--avatar-bg` : `#f0ede8` / `#2a2724` — fond avatar initiales
- `--cover-fallback` : `#e8e4de` / `#2a2724` — fond couverture fallback
- `--tag-bg` : `#f5f3f0` / `#1e1d1b` — fond tags
- `--tag-border` : `#eee` / `#302e2b` — bordure tags
- `--tag-text` : `#777` / `#7a756d` — texte tags
- `--focus-ring` : `#1a1a1a` / `#e8e5df` — outline focus clavier
- `--star-empty` : `#ddd` / `#3a3630` — étoiles non remplies
- `--shadow-cover` : `0 1px 3px rgba(0,0,0,0.08)` / `0 1px 4px rgba(0,0,0,0.4)` — ombre couvertures

**Couleurs sémantiques** (switchent entre light et dark) :
- `--color-star` : `#D4883A` — étoiles / notation (identique light/dark)
- `--color-spoiler` : `#e25555` — spoiler tag (identique light/dark)
- `--color-success` : `#2E7D32` / `#4ade80` — succès texte
- `--color-success-bg` : `#e8f5e9` / `#1a2e1a` — succès fond
- `--color-error` : `#c00` / `#f87171` — erreur texte
- `--color-error-bg` : `#fff3f3` / `#2a1515` — erreur fond
- `--color-error-border` : `#fdd` / `#4a2020` — erreur bordure
- `--color-warn-text` : `#8B6914` / `#e8c547` — warning texte
- `--color-warn-bg` : `#fef9e7` / `#2a2515` — warning fond
- `--color-warn-border` : `#f0e68c` / `#4a3d12` — warning bordure
- `--color-wip-text` : `#8B6914` / `#d4a843` — badge Aperçu texte
- `--color-wip-bg` : `#faf6f0` / `#231f15` — badge Aperçu fond
- `--color-wip-border` : `#e8dfd2` / `#3d3520` — badge Aperçu bordure

**Convention** : pour les nouvelles couleurs, toujours utiliser `var(--xxx)` en inline style ou la classe Tailwind correspondante (ex: `bg-cover-fallback`). Ne jamais hardcoder de hex pour les couleurs UI.

**Bouton inversé** (CTA principal) : `style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}` + `hover:opacity-80`. Jamais de `bg-[#1a1a1a] text-white`.

**Track de barre de progression** : utiliser `bg-[var(--border-default)]` pour le fond vide — `bg-avatar-bg` est invisible en dark mode (même teinte que le fond de surface).

### Dark mode

- Migration complète : zéro hex hardcodé dans tous les fichiers JSX. Toutes les couleurs passent par `var(--xxx)` ou une classe Tailwind mappée.
- Toggle manuel via `useTheme()` (`src/hooks/useTheme.js`)
- Persisté dans `localStorage` sous `reliure-theme`
- Applique `data-theme="light|dark"` sur `<html>`
- Pas de `prefers-color-scheme` — toggle manuel uniquement pour la beta
- Bouton lune/soleil dans le Header entre la recherche et l'avatar
- `useTheme()` appelé dans `App.jsx`, `theme` + `toggleTheme` passés au Header

### Layout
- Max-width contenu : `760px` (single column, optimal pour lecture longue)
- Header sticky avec backdrop-filter blur
- Séparateurs : `1px solid var(--border-subtle)`
- Couvertures : ratio 2:3, `border-radius: 3px`, ombre `var(--shadow-cover)`
- Carousels horizontaux pour les sections "Populaires" et "Trending"

### Composants clés
- **WipBanner** : bandeau fond `var(--color-wip-bg)` / texte `var(--color-wip-text)` / border `var(--color-wip-border)` — affiché en haut des pages "Aperçu" (La Revue, Défis). Pill "Aperçu" également visible dans la nav du Header sur ces deux liens.
- **Img** : couverture avec fallback Instrument Serif italic centré, max 2 lignes, `clamp(9px, 12%, 13px)`, fond `#e8e4de`, couleur `#999` — affiché quand `cover_url` est null ou si l'image échoue. `alt=""` pour éviter le texte alt navigateur. Hover lift + shadow quand cliquable.
- **Stars** : étoiles de notation read-only (couleur `#D4883A`)
- **InteractiveStars** : étoiles cliquables avec hover scale, pop animation, accessibilité (role, tabIndex, aria-label)
- **Avatar** : avatar initiales circulaire (fond `#f0ede8`). Taille via prop `s` (px). Src via prop `src` (fallback sur initiales). Styles inline : `borderRadius: "50%"`, `overflow: "hidden"` sur le conteneur ; `objectFit: "cover"`, `objectPosition: "center"` sur l'img.
- **Tag** : pill cliquable avec hover state pour les thèmes descriptifs
- **Pill** : bouton de statut (En cours / Lu / À lire / Abandonné) avec active:scale-95
- **Heading** : heading de section en Instrument Serif italic avec lien optionnel à droite
- **Label** : label uppercase discret pour les sous-sections (10px, tracking 2px, muted)
- **HScroll** : conteneur de scroll horizontal sans scrollbar
- **LikeButton** : coeur toggle avec animation scale, compteur, couleur spoiler quand liked
- **Search** : dropdown de recherche ancré au header (420px, border-radius 12, pas d'overlay plein écran). Filtres chips (Tout/Livres/Auteurs/Lecteurs). Click-outside + Escape ferment. Rendu dans `Header.jsx`.
- **ContentMenu** : menu "···" édition/suppression pour critiques et citations. Visible uniquement si `user.id === item.user_id`. Desktop : opacity 0 → 1 au hover du parent (`group`/`group-hover`). Mobile : toujours visible. Menu contextuel (blanc, border, shadow) avec "✏️ Modifier" (modal inline) et "🗑 Supprimer" (confirmation "Oui/Annuler"). Modal d'édition : textarea pré-rempli + InteractiveStars + checkbox spoilers pour les critiques. Intégré dans BookPage, ProfilePage, ExplorePage, FeedPage, CitationsPage.
- **AnnouncementBanner** : bandeau au-dessus du header (fond `#1a1a1a`, texte blanc). Props : `pill`, `message`, `ctaLabel`, `ctaHref`, `storageKey`. Fermable via localStorage. Affiché dans `App.jsx` avant le Header.
- **Toast** : notification d'erreur fixe, centrée en bas (z-10000), fond `var(--text-primary)`, texte `var(--bg-primary)`, animation slide-up 180ms, auto-dismiss 3s. Hook `useToast()` → `{ toast, showToast }` (src/hooks/useToast.js). Déclenché sur les erreurs de mutation (likes, follows, création de liste, publication de citation). Intégré dans BookPage, ProfilePage, ExplorePage, FeedPage, CitationsPage, CreateListModal.

## Règles React — performance et boucles

- Jamais de `new Date()`, `[]`, `{}` ou de fonction créés au scope du composant dans les dépendances de `useCallback`/`useMemo`/`useEffect`.
  → Toujours des primitifs (string, number, boolean) ou des valeurs déplacées à l'intérieur du callback.

- Toute dépendance `useEffect`/`useCallback` qui est un objet doit être justifiée ou remplacée par son identifiant primitif (`user` → `user.id`, `book` → `book.id`).

- Tout hook qui fait un fetch Supabase doit avoir :
  - Un guard `if (!userId) return` en tête
  - Des colonnes explicites (jamais `select('*')` ni `books(*)`)
  - Un `.limit()` explicite

## Conventions

### Langue
- Tout le UI est en français, sans exception
- Guillemets français « » pour les citations (pas de guillemets droits "")
- Pas de em dashes (—), utiliser des tirets simples ou reformuler
- Les variables et noms de composants dans le code peuvent rester en anglais
- Les textes visibles par l'utilisateur sont toujours en français

### Terminologie UI
- "Fil" (pas "Feed")
- "Profil" (pas "Profile")
- "Critiques" (pas "Reviews")
- "Citations" (pas "Quotes")
- "Listes" (pas "Lists")
- "Abonnés / Abonnements" (pas "Followers / Following")
- "En cours" (pas "Currently reading")
- "À lire" (pas "Want to read")
- "Abandonné" (pas "DNF")
- "Bilan" (pas "Year in Review")
- "Où lire" (pas "Where to read")
- "Les lecteurs ont aussi aimé" (pas "Fans also like")
- "Populaires" (pas "Trending" ou "Heavy Rotation")
- "Qui suivre" (pas "Who to follow")
- "Répondre" (pas "Reply")
- "Cette critique contient des spoilers" (pas "This review may contain spoilers")
- "Pas encore de citations" (pas "No quotes yet")
- "La Revue" (pas "Journal" pour l'éditorial — "Journal" est réservé au diary dans le profil)
- "Mes critiques / Mes citations / Mes listes" (onglets profil, avec le possessif pour éviter la confusion avec les pages communautaires)
- "Thèmes" (pas "Tags" pour les tags descriptifs sur les fiches livres — "Tags" sera réservé aux tags personnels de lecture)
- "Évaluations" (pas "Notes" pour le compteur communautaire — "Note" est réservé à la notation personnelle)

- "Défis" (pas "Challenges" — terme français pour les challenges de lecture)

### Navigation
React Router (BrowserRouter). Header avec NavLink. Navigation via `useNav()` context (goToBook) et `useNavigate()`.
6 sections principales : Explorer, Citations, Fil, Défis, Profil | La Revue (séparée visuellement, serif italic).
Onglets profil : Journal (diary), Bibliothèque, À lire, Mes critiques, Mes citations, Mes listes, Bilan.
Chaque onglet a sa propre URL (`/:username/critiques`, etc.).

## État d'avancement des features

### Branché sur Supabase (fonctionnel)

#### Auth
- Magic link + OAuth Google via Supabase Auth
- Onboarding flow 2 étapes : pseudo + ajout de livres (vérification dispo réelle)
- Détection nouvel utilisateur dans `App.jsx` : `needsOnboarding = isLoggedIn && !profile` — si l'user n'a pas de row dans `users`, affiche directement `OnboardingPage` (pas de route dédiée)
- Après onboarding, redirection vers `/explorer`
- ProtectedRoute pour les pages /fil, /parametres, /backfill

#### Fiche livre (BookPage)
- Couverture, métadonnées, note communautaire (masquée si 0 évaluation)
- Étoiles cliquables (InteractiveStars) — notation persistée via `useUserRating`
- Pills de statut (En cours / Lu / À lire / Abandonné) — persistées via `useReadingStatus`
- Si "Lu" : date picker (date passée uniquement, futur bloqué), relecture toggle, "Ajouter une date" si lu sans date
- Tags personnels avec autocomplétion accent-insensitive (max 5)
- Likes sur critiques et citations — persistés via `useLikes`
- Navigation vers les livres par slug (`/livre/:slug`)
- **Modifier la fiche** (EnrichModal) : bouton pill dans le hero sous les métadonnées, visible pour tous les users connectés sur les livres à UUID. Modal avec couverture (upload Supabase Storage bucket `book-covers`), description, pages, éditeur, date de publication. UPDATE immédiat en base, refetch post-save, toast confirmation.
- **ContentMenu** sur les critiques et citations : édition/suppression inline, refetch après modification

#### Profil
- Données réelles via `useProfileData` (allStatuses, diaryBooks, allReadBooks, reviews, stats, chronologie, topRated)
- Quatre favoris : drag & drop + touch mobile, swap via SearchOverlay, mini-note (max 24 chars), suppression — persistés via `useFavorites`
- En cours de lecture : progression interactive, édition inline de page, complétion
- **Édition inline du header** (isOwnProfile) : avatar uploadable (bucket `avatars`, compression canvas 400×400 JPEG 0.85, max 1 Mo), nom cliquable → input inline avec icône crayon ✎ au hover, bio cliquable → textarea 160 chars avec icône crayon ✎ au hover. Pas de bouton Paramètres sur le profil.
- Onglet Bibliothèque : 3 modes grille/liste/étagère, ratings réels
  - Grille : `grid-cols-5 sm:grid-cols-8`, ratio 2:3, fallback Img
  - Étagère : 5 livres/rangée mobile, 8 desktop, covers 80×120px, rotation alternée ±1.5°/1°, planche bois, fallback Img
  - État vide (`isOwnProfile`) : titre Instrument Serif italic, accroche, bouton "📥 Importer depuis Goodreads" → /backfill, bouton "Parcourir les livres" → /explorer, mention Babelio/Livraddict
- Onglet Journal : diary (lectures avec date), calendrier visuel
- Onglet Mes citations : titre du livre cliquable → `/livre/:slug`
- Onglet Bilan : stats réelles (total, année, pages, note moy), chronologie, top noté
- Navigation profil par `/:username/:tab`
- **ContentMenu** sur les critiques et citations (onglets Mes critiques, Mes citations)

#### Explorer
- Livres populaires via RPC `popular_books_week` (fallback rating_count)
- Critiques populaires, citations populaires, listes populaires — données réelles
- Filtrage par genre (`useBooksByGenre`) — filtre JSONB via `.filter("genres", "cs", `["${genre}"]`)` (opérateur PostgREST `cs`)
- Thèmes : liste curatée statique `THEMES_PRINCIPAUX` (20 thèmes hardcodés, pas de fetch dynamique)
- **ContentMenu** sur les critiques et citations de l'Explorer

#### Listes
- Création (titre, description, publique/privée, classement) avec tooltips sur les options
- URL par slug lisible (`/:username/listes/:slug`), slug unique par user, généré depuis le titre via `slugify()`
- Ajout multiple de livres via SearchOverlay (mode multi-add : overlay reste ouvert, checkmarks ✓, bouton "Terminé")
- Réordonnement par drag & drop (positions 1..N)
- Notes par item (optionnelles)
- Likes via `useLikes` (polymorphe target_type='list')
- Page liste publique avec édition inline titre/description
- Suppression avec confirmation
- Onglet "Mes listes" branché sur Supabase (tables `lists` + `list_items`)
- Cards listes cliquables dans ExplorePage (navigation vers la page liste)

#### Fil d'activité
- Branché sur table `activity`, dédoublonnage, types : reading_status, review, quote, list
- Affichage cover, relecture badge, notation
- Type `list` : logged à la création (si publique) et au passage privé→publique, supprimé avec la liste ; card avec titre italic cliquable + mosaïque des 3 premières couvertures
- **ContentMenu** sur les critiques et citations du fil
- `useFeed` sélectionne `users(username, display_name, avatar_url)` — le champ `avatar_url` est requis pour afficher le bon avatar dans le fil

### Frontend (UI complète, données mock ou partiellement branchées)

#### Backfill
- Page dédiée pour ajouter des lectures passées en batch
- Recherche + mode découverte "Les plus lus" avec pills Lu/À lire mutuellement exclusives
- Pile visuelle avec étoiles et bouton sticky "Ajouter X livres à ma bibliothèque"

#### La Revue (éditorial)
- Page index avec articles featured et liste
- ArticlePage avec lettrine, sidebar livre lié, section "À lire aussi"
- Barre de progression de lecture sticky sous le header
- Bandeau WIP affiché en haut de page (composant `WipBanner`)

#### Défis (challenges)
- Page index avec "Mes challenges" (progression circulaire) et "Découvrir" (bouton Rejoindre)
- Vue participant : cercle de progression SVG, filtres, timeline avec items complétés/à faire
- Vue publique : hero centré, stats, paliers, aperçu items, participants récents
- Bandeau WIP affiché en haut de page (composant `WipBanner`)

### Skeleton loading

- Composant global : `src/components/Skeleton.jsx`
- CSS injecté une fois via `document.head` au chargement du module (pas de fichier CSS séparé)
- Classe `.sk` : fond `var(--bg-elevated)` + shimmer `::after` `var(--border-subtle)` animé (1.4s ease-in-out)
- Classe `.sk-fade` : fade-in 200ms sur le contenu réel une fois chargé (appliquer sur le wrapper du contenu)
- Sous-composants : `Skeleton.Cover` (ratio 2:3), `Skeleton.Text` (barre arrondie), `Skeleton.Avatar` (cercle), `Skeleton.Stars`, `Skeleton.Card` (ligne fil d'activité)
- Skeleton de page (route-level) : dans les fichiers `*Route.jsx` — `BookPageRoute`, `ProfilePageRoute`
- Skeleton inline (section-level) : dans `FeedPage` (3 × `Skeleton.Card`), `ExplorePage` (couvertures, critiques, citations, listes), `ProfilePage` (favoris 4 covers, journal 5 covers)
- Ne jamais utiliser `animate-pulse` de Tailwind — utiliser uniquement les classes `.sk` du composant global

### Micro-interactions
- LikeButton avec animation scale + toggle couleur
- Étoiles avec hover scale-110, click scale-125 pop
- Pills avec active:scale-95
- Couvertures avec hover translateY + shadow
- Transitions de page fadeIn 200ms
- Focus-visible outline pour navigation clavier

## RLS — Policies de lecture publique

Migration `migrations/003_public_read_policies.sql` à appliquer dans Supabase.

Tables avec `SELECT using (true)` (lecture publique) :
`users`, `books`, `reading_status`, `user_favorites`, `reviews`, `quotes`, `follows`

Tables avec lecture conditionnelle :
- `lists` : `is_public = true OR auth.uid() = user_id`
- `list_items` : visible si la liste parente est visible (EXISTS sur `lists`)

Tables privées (owner only) : `reading_log_tags`

Les opérations d'écriture (INSERT/UPDATE/DELETE) exigent toujours `auth.uid() = user_id`.

## Hooks profil — paramètre `profileUserId`

Les hooks suivants acceptent un `profileUserId` optionnel pour charger les données d'un profil visité (y compris pour les visiteurs non connectés). Si omis, ils utilisent `user.id` (comportement legacy).

- `useProfileData(profileUserId?)` — statuts, diary, stats, bilan
- `useFavorites(profileUserId?)` — quatre favoris
- `useMyLists(profileUserId?)` — listes (filtrées sur `is_public` pour les visiteurs)
- `useMyReviews(profileUserId?)` — critiques
- `useMyQuotes(profileUserId?)` — citations
- `useReadingList(statusFilter, profileUserId?)` — en cours de lecture

Dans `ProfilePage`, tous ces hooks reçoivent `viewedProfile?.id`.

## Pages publiques (sans connexion)

Toutes les pages sont accessibles sans compte, sauf `/fil`, `/parametres`, `/backfill`.

- Header visible pour tous : nav réduite (Explorer, Citations, La Revue) + bouton "Se connecter" pour les visiteurs
- `JoinBanner` : bandeau fixe en bas (48px, fond #1a1a1a) visible uniquement pour les non-connectés, fermable via localStorage (`reliure_join_banner_dismissed`)
- Fiche livre : pills de statut et étoiles visibles mais protégées — clic → mini-modal `LoginModal` avec couverture du livre, titre "Garde une trace de cette lecture", CTA "Créer mon profil" → /login, Échap/clic extérieur ferme
- Intention persistée : clic "À lire" sans compte → `reliure_pending_intent` dans localStorage `{ bookId, bookSlug, action: 'want_to_read' }` — exécutée automatiquement au retour sur la fiche après connexion (`useEffect` sur `user?.id + statusLoading`)
- Profil : bouton "Suivre" visible sur tous les profils tiers ; redirige vers `/login` si non connecté, sinon toggle follow/unfollow via `useFollow`

## Logique profil visiteur vs. propriétaire

**Header profil** : toutes les données viennent de `viewedProfile` (Supabase). Aucune valeur hardcodée.
- `display_name || username` — nom affiché
- `@username` — sous le nom
- `bio` — affiché seulement si non null
- `avatar_url` — `Avatar` supporte `src` (prop optionnelle), fallback sur initiales
- Badges : pas encore dans le schéma, section retirée jusqu'à implémentation

Variable `isOwnProfile = user?.id === viewedProfile?.id` contrôle l'affichage conditionnel.

**Visible uniquement si `isOwnProfile`**
- Bandeau backfill ("Tu as lu d'autres livres ?")
- Édition inline du profil (pas de bouton "Modifier le profil" — voir ci-dessous)
- Bouton "+ Nouvelle liste" + CTA dans l'état vide listes
- Drag & drop sur les quatre favoris (prop `isOwner` de `FavoritesSection`)
- Édition inline de la progression de lecture + bannière de complétion (`ReadingItem` prop `isOwner`)
- Tous les CTAs d'action dans les états vides (chercher, ajouter, créer)

**Édition inline du profil (isOwnProfile)**
- **Avatar** : hover → overlay appareil photo SVG. Clic → file picker (jpg/png/webp, max 1 Mo). Compression canvas côté client (max 400×400px, JPEG 0.85). Upload vers Supabase Storage bucket `avatars` (`${user.id}/avatar.jpg`, upsert). `avatar_url` mis à jour via UPDATE `users` + optimistic local state. Cache-bust via `?t=timestamp`.
- **Nom affiché** : clic → input inline, même taille/style, bordure bottom 1px uniquement. Entrée ou blur → UPDATE `users.display_name` (max 50 chars). Escape annule.
- **Bio** : si null → placeholder italic "Ajoute une bio..." cliquable. Clic → textarea avec compteur /160. Cmd+Entrée ou blur → UPDATE `users.bio` (max 160 chars). Escape annule.
- **Paramètres** : page `/parametres` accessible directement par URL. Aucun bouton ou lien Paramètres affiché sur la page profil — l'édition inline suffit pour avatar/nom/bio.

**Quatre favoris** : section masquée pour les visiteurs si `favorites.some(f => f.book)` est faux.

**États vides selon contexte**
| Onglet | isOwnProfile | !isOwnProfile |
|--------|-------------|----------------|
| Journal | "Ton journal de lecture est vide. Ajoute ton premier livre." + Chercher | "Aucune lecture enregistrée pour l'instant." |
| Bibliothèque | Titre Instrument Serif "Ta bibliothèque t'attend." + accroche + deux CTAs ("📥 Importer depuis Goodreads" → /backfill, "Parcourir les livres" → /explorer) + note Babelio/Livraddict | "Aucun livre dans la bibliothèque." |
| Critiques | "Tu n'as pas encore écrit de critique." + Explorer | "Aucune critique pour l'instant." |
| Citations | "Tu n'as pas encore sauvegardé de citation." | "Aucune citation pour l'instant." |
| Listes | "Tu n'as pas encore créé de liste." + Nouvelle liste | "Aucune liste publique pour l'instant." |

## Ce qu'on ne fait PAS au MVP

- Pas de recommandations algorithmiques
- Pas de clubs de lecture
- Pas d'app mobile native (PWA d'abord)
- Pas de messagerie privée
- Pas de scan code-barres (v2)
- Pas de lien librairies (v2)
- ~~Pas de dark mode~~ → implémenté (toggle manuel, CSS custom properties, pas de prefers-color-scheme)
- Pas de notifications push
- Pas de table AUTHORS séparée (JSONB suffit au MVP)

## Séquence MVP

1. ✅ Auth (magic link + OAuth Google via Supabase)
2. ✅ Recherche de livres (Google Books API → import dans notre base)
3. ✅ Fiche livre (couverture, métadonnées, statut, notation, tags personnels, thèmes, section "Dans des listes")
4. ✅ Profil (quatre favoris, en cours, diary, bibliothèque, critiques, citations, listes, bilan)
5. ✅ Critiques et citations (écrire, lire, liker)
6. ✅ Follow + fil d'activité
7. ✅ Page Explorer (trending, thèmes, search)
8. ✅ Onboarding + backfill
9. ✅ Listes (créer, ordonner, partager, tri, notes par livre, section "Dans des listes" sur BookPage)
10. La Revue (éditorial)
11. Défis de lecture (challenges)
12. Pages publiques (profil, listes, critiques — SEO + partage social)


## Fichiers de référence

- `reliure-merged.jsx` — prototype React complet avec toutes les pages
- `user-flows.md` — parcours utilisateur détaillés (inscription, ajout, back-fill, progression, rétention)
- `schema.sql` — schéma PostgreSQL complet pour Supabase
- Ce fichier `CLAUDE.md` — source de vérité pour les décisions produit et techniques
