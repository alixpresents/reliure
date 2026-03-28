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

- **Frontend** : React + Vite
- **Backend** : Supabase (auth, PostgreSQL, storage, realtime, edge functions)
- **Styling** : Tailwind CSS (migré depuis CSS-in-JS)
- **Déploiement** : Vercel
- **Jobs asynchrones** : pg_cron (stats agrégées, trending, cache invalidation)

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
- `books` — id, isbn_13, title, subtitle, authors (jsonb), publisher, publication_date, cover_url, language, genres (jsonb), page_count, avg_rating, rating_count, source
- `reviews` — id, user_id, book_id, rating (smallint), body, contains_spoilers, likes_count, created_at
- `reading_status` — id, user_id, book_id, status (want_to_read/reading/read/abandoned), started_at, finished_at, current_page, is_reread, created_at
- `reading_log_tags` — id, reading_status_id, user_id, tag_text, created_at
- `lists` — id, user_id, title, description, is_public, is_ranked, likes_count, created_at
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
- **Img** : couverture avec fallback titre si image ne charge pas
- **S** : étoiles de notation (couleur `#D4883A`)
- **Av** : avatar initiales (fond `#f0ede8`)
- **Tag** : pill cliquable avec hover state
- **Pill** : bouton de statut (En cours / Lu / À lire / Abandonné)
- **Hd** : heading de section en Instrument Serif italic
- **Lbl** : label uppercase discret pour les sous-sections
- **HScroll** : conteneur de scroll horizontal

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

### Navigation
6 sections principales : Explorer, Citations, Fil, Challenges, Profil | La Revue (séparée visuellement, serif italic).
Onglets profil : Journal (diary), Mes critiques, Mes citations, Mes listes, Bilan.

## Ce qu'on ne fait PAS au MVP

- Pas de recommandations algorithmiques
- Pas de gamification (badges, niveaux, streaks)
- Pas de clubs de lecture
- Pas d'app mobile native (PWA d'abord)
- Pas de messagerie privée
- Pas de scan code-barres (v2)
- Pas de lien librairies (v2)
- Pas de dark mode (v2, mais penser l'architecture couleur pour que ce soit ajoutable)
- Pas de notifications push
- Pas de table AUTHORS séparée (JSONB suffit au MVP)

## Séquence MVP

1. Auth (magic link + OAuth Google via Supabase)
2. Recherche de livres (Google Books API → import dans notre base)
3. Fiche livre (couverture, métadonnées, statut, notation, tags)
4. Profil (quatre favoris, en cours, diary, critiques, citations, listes, bilan)
5. Critiques et citations (écrire, lire, liker)
6. Listes (créer, ordonner, partager)
7. Follow + fil d'activité
8. Page Explorer (trending, tags, search)
9. Pages publiques (profil, listes, critiques — SEO + partage social)

## Fichiers de référence

- `reliure-merged.jsx` — prototype React complet avec toutes les pages
- `user-flows.md` — parcours utilisateur détaillés (inscription, ajout, back-fill, progression, rétention)
- `schema.sql` — schéma PostgreSQL complet pour Supabase
- Ce fichier `CLAUDE.md` — source de vérité pour les décisions produit et techniques
