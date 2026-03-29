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
- `/:username/bibliotheque` → onglet bibliothèque
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
2. **Open Library API** — complément pour les trous, open source
3. **BnF (data.bnf.fr / SRU)** — métadonnées de référence française, licence ouverte depuis 2014, API couverture
4. **Nudger (Open Data ISBN)** — base ISBN française, licence ODbL, CSV gratuit via data.gouv.fr
5. **Enrichissement communautaire** — les utilisateurs corrigent/complètent les fiches (comme TMDb pour Letterboxd)

L'edge function `book_import` interroge les sources par ISBN, fusionne les résultats, et stocke le livre consolidé dans la table `books`. Une fois importé, le livre vit dans notre base.

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

### Palette de couleurs (corrigée accessibilité WCAG AA)
- Texte primaire : `#1a1a1a` (titres, noms, UI principale)
- Texte corps : `#333` (critiques, articles, contenu de lecture longue)
- Texte secondaire : `#666` (bio, auteurs, métadonnées lisibles)
- Texte tertiaire : `#767676` (labels, timestamps, compteurs — gris le plus clair passant AA sur blanc)
- Étoiles / notation : `#D4883A`
- Spoiler tag : `#e25555`
- Fond principal : `#fff`
- Fond surface : `#fafaf8`
- Fond couverture fallback : `#e8e4de`
- Bordures : `#f0f0f0` (séparateurs fins), `#eee` (bordures de composants)
- Fond tags : `#f5f3f0` avec bordure `#eee`

### Layout
- Max-width contenu : `760px` (single column, optimal pour lecture longue)
- Header sticky avec backdrop-filter blur
- Séparateurs : `1px solid #f0f0f0`
- Couvertures : ratio 2:3, `border-radius: 3px`, ombre `0 1px 3px rgba(0,0,0,0.08)`
- Carousels horizontaux pour les sections "Populaires" et "Trending"

### Composants clés
- **WipBanner** : bandeau fond #faf6f0 / texte #8B6914 / border #e8dfd2 — affiché en haut des pages "Aperçu" (La Revue, Défis). Pill "Aperçu" également visible dans la nav du Header sur ces deux liens.
- **Img** : couverture avec fallback titre si image ne charge pas, hover lift + shadow quand cliquable
- **Stars** : étoiles de notation read-only (couleur `#D4883A`)
- **InteractiveStars** : étoiles cliquables avec hover scale, pop animation, accessibilité (role, tabIndex, aria-label)
- **Avatar** : avatar initiales circulaire (fond `#f0ede8`)
- **Tag** : pill cliquable avec hover state pour les thèmes descriptifs
- **Pill** : bouton de statut (En cours / Lu / À lire / Abandonné) avec active:scale-95
- **Heading** : heading de section en Instrument Serif italic avec lien optionnel à droite
- **Label** : label uppercase discret pour les sous-sections (10px, tracking 2px, muted)
- **HScroll** : conteneur de scroll horizontal sans scrollbar
- **LikeButton** : coeur toggle avec animation scale, compteur, couleur spoiler quand liked
- **Search** : overlay de recherche plein écran avec champ + résultats filtrés

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
Onglets profil : Journal (diary), Bibliothèque, Mes critiques, Mes citations, Mes listes, Bilan.
Chaque onglet a sa propre URL (`/:username/critiques`, etc.).

## État d'avancement des features

### Branché sur Supabase (fonctionnel)

#### Auth
- Magic link + OAuth Google via Supabase Auth
- Onboarding flow 2 étapes : pseudo + ajout de livres (vérification dispo réelle)
- ProtectedRoute pour les pages /fil, /parametres, /backfill

#### Fiche livre (BookPage)
- Couverture, métadonnées, note communautaire (masquée si 0 évaluation)
- Étoiles cliquables (InteractiveStars) — notation persistée via `useUserRating`
- Pills de statut (En cours / Lu / À lire / Abandonné) — persistées via `useReadingStatus`
- Si "Lu" : date picker (date passée uniquement, futur bloqué), relecture toggle, "Ajouter une date" si lu sans date
- Tags personnels avec autocomplétion accent-insensitive (max 5)
- Likes sur critiques et citations — persistés via `useLikes`
- Navigation vers les livres par slug (`/livre/:slug`)

#### Profil
- Données réelles via `useProfileData` (allStatuses, diaryBooks, allReadBooks, reviews, stats, chronologie, topRated)
- Quatre favoris : drag & drop + touch mobile, swap via SearchOverlay, mini-note (max 24 chars), suppression — persistés via `useFavorites`
- En cours de lecture : progression interactive, édition inline de page, complétion
- Onglet Bibliothèque : 3 modes grille/liste/étagère, ratings réels
- Onglet Journal : diary (lectures avec date), calendrier visuel
- Onglet Bilan : stats réelles (total, année, pages, note moy), chronologie, top noté
- Navigation profil par `/:username/:tab`

#### Explorer
- Livres populaires via RPC `popular_books_week` (fallback rating_count)
- Critiques populaires, citations populaires, listes populaires — données réelles
- Filtrage par genre (`useBooksByGenre`)

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
- Fiche livre : pills de statut et étoiles visibles mais protégées — clic → toast "Connecte-toi pour interagir avec ce livre" (auto-dismiss 3,5s)
- Profil : bouton "Suivre" visible sur tous les profils tiers ; redirige vers `/login` si non connecté, sinon toggle follow/unfollow via `useFollow`

## Logique profil visiteur vs. propriétaire

Variable `isOwnProfile = user?.id === viewedProfile?.id` contrôle l'affichage conditionnel.

**Visible uniquement si `isOwnProfile`**
- Bandeau backfill ("Tu as lu d'autres livres ?")
- Bouton "Modifier le profil" (→ `/parametres`)
- Bouton "+ Nouvelle liste" + CTA dans l'état vide listes
- Drag & drop sur les quatre favoris (prop `isOwner` de `FavoritesSection`)
- Édition inline de la progression de lecture + bannière de complétion (`ReadingItem` prop `isOwner`)
- Tous les CTAs d'action dans les états vides (chercher, ajouter, créer)

**Quatre favoris** : section masquée pour les visiteurs si `favorites.some(f => f.book)` est faux.

**États vides selon contexte**
| Onglet | isOwnProfile | !isOwnProfile |
|--------|-------------|----------------|
| Journal | "Ton journal de lecture est vide. Ajoute ton premier livre." + Chercher | "Aucune lecture enregistrée pour l'instant." |
| Bibliothèque | "Ta bibliothèque est vide. Commence par ajouter des lectures passées." + Ajouter | "Aucun livre dans la bibliothèque." |
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
- Pas de dark mode (v2, mais penser l'architecture couleur pour que ce soit ajoutable)
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
