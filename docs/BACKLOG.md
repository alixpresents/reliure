# Reliure — Backlog produit

> Idées de features collectées au fil des conversations. Chaque entrée documente le concept, le pourquoi, et les grandes lignes de l'implémentation envisagée.

---

1. Challenges de lecture
Statut : Idée · Priorité à définir
Inspiré de : Challenges annuels sur les forums Babelio (ex : Challenge Multi-Défis 2026)
Portée : Nouvelle section majeure (onglet nav)
Le concept
Un challenge est une liste de contraintes de lecture créatives, organisée par la communauté, avec une durée définie (typiquement annuelle). Les participants s'inscrivent, choisissent un palier de difficulté, et complètent les items au fil du temps en liant leurs lectures + critiques.
Exemples d'items (tirés du Challenge Multi-Défis Babelio 2026)

Item JOKER : Le roman de mon choix
Item 100% FÉMININ : Le roman de cette autrice est traduit par une femme
Item JO 2026 : Un·e auteur·ice italien·ne
Item VENDETTA : La vengeance est le fil rouge de ce livre
Item COLUMBO : Un des 100 meilleurs polars depuis 1945 d'après le Sunday Times
Item CIAO L'ARTISTE : Un·e auteur·ice décédé·e
Item BOTTE DE PAILLE : L'action se déroule exclusivement en milieu rural
Item IONESCO : Une pièce de théâtre
Item ACTION ! : Ce roman a été adapté en film, téléfilm ou série TV
Item POILU : La Première Guerre mondiale est le contexte de ce livre

Le challenge analysé compte ~100 items et ~230 participants, avec un système de paliers nommés d'après des oiseaux (Coucou, Moineau, Mésange, Tourterelle, Merle, Hirondelle, Pie, Alouette, Rossignol — du plus facile au plus exigeant).
Pourquoi c'est fort pour Reliure

Engagement long terme : un challenge annuel maintient les utilisateurs actifs toute l'année
Découverte de livres : voir ce que les autres participants ont lu pour chaque item est un moteur de découverte organique
Communauté : le rôle de modérateur crée des leaders communautaires investis
Acquisition : les pages challenges publiques sont un excellent contenu SEO (requêtes type "challenge lecture 2027", "défi littéraire")
Rétention : le badge profil récompense la complétion et donne envie de recommencer l'année suivante
Différenciation : ni The StoryGraph ni Gleeph ne proposent ça de manière native

Système de paliers
Chaque challenge définit ses propres paliers avec un nombre d'items requis. Le créateur nomme et configure les seuils librement.
Exemple (Multi-Défis 2026) :
PalierItems requisPointsCoucou~10FacileMoineau~20Mésange~30Tourterelle~40MoyenMerle~50Hirondelle~60Pie~70DifficileAlouette~80Rossignol~90+
Le palier visé est choisi à l'inscription. Le palier atteint est calculé en temps réel.
Rôles

Créateur : crée le challenge, définit les paliers, les règles générales, la durée
Modérateurs : un ou plusieurs par item, rédigent la contrainte, valident les soumissions contestées, répondent aux questions des participants
Participants : s'inscrivent, choisissent un palier, soumettent leurs lectures

Mécanique de validation

Le participant lit un livre et poste sa critique sur Reliure (flux normal)
Il associe cette lecture à un item du challenge
L'association est visible par tous les participants
En cas de contestation, le modérateur de l'item tranche
Quand le nombre d'items validés atteint le palier visé → badge débloqué

Badge profil

Badge officiel affiché sur le profil public, dans une section dédiée
Design spécifique par challenge (le créateur peut choisir un visuel)
Mentionne le palier atteint et l'année
Pas de gamification excessive : un badge sobre et élégant, cohérent avec l'identité Reliure

Page challenge — Vue participant (inscrit)
Direction esthétique : journal de bord en timeline. Le participant voit sa progression personnelle et son historique de soumissions comme un carnet de lecture dédié au challenge.
Header :

Flex row : progression circulaire SVG à gauche (cercle 80px, stroke #f0ede8 en fond, stroke #1a1a1a en remplissage proportionnel, nombre d'items complétés au centre en 20px bold, total en 9px muted en dessous)
À droite du cercle : titre du challenge en Instrument Serif italic 24px, puis "Objectif : [palier visé]" avec le palier en doré (#8B6914 font-weight 500), "Palier actuel : [palier atteint]" en font-weight 500, puis "Par [créateur] · X participants · dates" en 12px muted

Filtres :

Rangée de pills horizontales scrollables : "Tous (100)" (pill active : fond #1a1a1a, texte blanc), "Complétés (34)", "À faire (66)", "Classement" (pills inactives : fond surface, texte muted)
Font-size 11px, padding 5px 14px, border-radius 14px

Timeline des items :

Ligne verticale continue à gauche : border-left 2px solid #f0ede8, padding-left 20px, margin-left 8px
Chaque item est un noeud sur la timeline :

Point rempli noir (12px, border-radius 50%, background #1a1a1a) pour les items complétés
Point vide (12px, border-radius 50%, background #f0ede8, border 2px solid #ddd) pour les items à faire
Le point est positionné en absolute à left: -27px du bord gauche de la timeline



Item complété :

Nom de l'item en 11px font-weight 600 + badge "Complété" (fond #e8f5e9, texte #2e7d32, 9px, padding 2px 6px, border-radius 8px)
Description de la contrainte en 13px primary, margin-bottom 6px
"Ma réponse" : flex row avec couverture miniature (32x48, border-radius 2px), titre du livre en 11px italic, date + étoiles en 10px muted
À droite : pile de 2-3 mini couvertures (24x36) des autres participants + compteur "+184" en 9px muted
Padding-bottom 28px entre chaque item

Item à faire :

Nom de l'item en 11px font-weight 600 couleur muted (pas primary)
Si difficulté "Difficile" : pill dorée à côté du nom (fond #faf6f0, border #e8dfd2, texte #8B6914, 9px)
Description en 13px primary
"Mod. : [nom] · X réponses" en 11px muted
Bouton "+ Soumettre un livre" en pill dashed (border 1.5px dashed #ddd, texte muted, 11px, padding 5px 12px, border-radius 14px)

Page challenge — Vue publique (visiteur non inscrit)
Direction esthétique : landing page épurée. Le visiteur doit comprendre le challenge en 5 secondes et avoir envie de s'inscrire. C'est la page qu'on partage, le SEO, le hook d'acquisition.
Hero centré :

Icône du challenge : carré arrondi 64px (border-radius 16px), fond gradient doré (#faf6f0 → #f0e8d8), border 1.5px solid #e8dfd2, étoile dorée 28px au centre. Centré, margin auto.
Titre en Instrument Serif italic 28px, centré
Description en 14px muted, line-height 1.5, max-width 400px centrée
"Par [créateur]" avec le nom en font-weight 500 + dates, en 12px muted, centré

Stats :

3 colonnes centrées : "230 participants", "~100 items", "9 paliers"
Chaque stat : chiffre en 22px bold, label en 11px muted, text-align center, gap 24px

CTA :

Bouton "Rejoindre ce challenge" centré : fond #1a1a1a, texte blanc, padding 10px 28px, border-radius 20px, font-size 13px, font-weight 500

Séparateur, puis section "Paliers" :

Label uppercase "Paliers"
Pills en flex-wrap : chaque palier est une pill (fond surface, texte muted, 11px, padding 4px 12px, border-radius 12px) avec le nom + le nombre d'items requis. Le dernier palier (Rossignol) a un style doré (fond #faf6f0, border #e8dfd2, texte #8B6914, étoile avant le nom)

Section "Aperçu des items" :

Label uppercase "Aperçu des items"
Liste simple des 4-5 premiers items : nom en 11px bold + compteur réponses en 10px muted sur la première ligne, description en 13px primary sur la deuxième
Séparés par border-bottom 0.5px
Pas de soumissions visibles (le visiteur n'est pas inscrit)
Lien "Voir les 100 items ›" en 13px muted centré en bas

Section "Participants récents" :

Label uppercase "Participants récents"
Rangée d'avatars circulaires (32px) qui se chevauchent (margin-left négatif -8px), border 2px solid blanc pour la séparation. 5 avatars visibles + compteur "+225" en 11px muted à droite

Interactions avec le reste de Reliure

Les critiques liées à un challenge apparaissent dans le fil d'activité avec un tag challenge
Les livres découverts via un challenge peuvent être ajoutés à une liste ou à la PAL
Le bilan annuel intègre les challenges complétés
La page Explorer peut mettre en avant les challenges actifs

Tables envisagées
challenges
  id, creator_id, title, description, rules, start_date, end_date,
  is_public, cover_url, created_at

challenge_tiers
  id, challenge_id, name, items_required, position

challenge_items
  id, challenge_id, position, title, subtitle, description,
  difficulty (easy/medium/hard), points, created_at

challenge_item_moderators
  id, challenge_item_id, user_id

challenge_participants
  id, challenge_id, user_id, target_tier_id, enrolled_at

challenge_submissions
  id, challenge_item_id, user_id, book_id, review_id,
  status (pending/validated/contested/rejected),
  validated_by, submitted_at

challenge_badges
  id, challenge_id, tier_id, user_id, awarded_at
Ce qu'on ne fait PAS en v1

Pas de création de challenge par n'importe quel utilisateur (modération éditoriale d'abord, ouverture progressive)
Pas de système de points complexe (un item = un item, pas de pondération)
Pas de challenges en équipe
Pas de récompenses monétaires ou partenariats éditeurs (v2)
Pas de suggestions automatiques de livres par item (v2, mais c'est une killer feature potentielle)

Questions ouvertes

Faut-il limiter le nombre de challenges actifs simultanément par utilisateur ?
Un livre peut-il être utilisé pour plusieurs items du même challenge ?
Le créateur peut-il modifier les items après le lancement du challenge ?
Quelle modération pour les challenges publics créés par la communauté ?

---

## 2. Thèmes de profil personnalisés

**Statut :** Idée · Priorité à définir
**Inspiré de :** Tumblr (thèmes HTML/CSS libres), MySpace (personnalisation totale), The StoryGraph (thèmes couleur), MAL (profils CSS custom)
**Portée :** Feature profil · Personnalisation visuelle

### Le concept

Permettre aux utilisateurs de personnaliser l'apparence de leur profil Reliure avec des thèmes visuels. Trois niveaux possibles, du plus simple au plus libre :

1. **Thèmes prédéfinis** (v1) : Reliure propose une galerie de thèmes créés par l'équipe. L'utilisateur en choisit un, son profil change de palette de couleurs, de fond, et éventuellement de typographie display. Pensé pour la majorité des utilisateurs.

2. **Personnalisation par variables** (v1.5) : L'utilisateur peut modifier un ensemble de variables CSS contrôlées (couleur primaire, couleur de fond, couleur d'accent, image de fond, police display). Plus de liberté, mais dans un cadre sécurisé. Pas besoin de savoir coder.

3. **CSS custom importé** (v2) : L'utilisateur peut coller ou importer un fichier CSS qui override les styles de sa page profil. C'est le niveau MySpace/Tumblr — liberté totale, mais avec des gardes-fous.

### Pourquoi c'est fort pour Reliure

- **Expression personnelle** : un profil Reliure doit donner envie de créer le sien. La personnalisation renforce ce sentiment de propriété
- **Communautés de niche** : les fans de Fantasy, de Romance, de manga veulent des profils qui reflètent leur univers. Un thème sombre avec des enluminures médiévales pour un lecteur de Tolkien, un thème pastel fleuri pour une lectrice de Romance — c'est un levier d'engagement puissant
- **Viralité** : un profil visuellement distinctif donne envie de le partager et de demander « c'est quoi ton thème ? »
- **Écosystème communautaire** : si on ouvre le CSS custom, une communauté de créateurs de thèmes peut émerger (comme sur Tumblr), avec partage, remix, et curation
- **Différenciation** : Babelio et Gleeph ne proposent aucune personnalisation visuelle. The StoryGraph a des thèmes de couleur basiques. C'est un territoire libre

### Architecture technique envisagée

#### Option A — Thèmes via CSS custom properties (recommandée pour v1)

Le profil utilise exclusivement des CSS custom properties (`--profile-bg`, `--profile-text`, `--profile-accent`, etc.). Le thème de l'utilisateur est un petit objet JSON stocké en base qui override ces variables. Côté client, les variables sont injectées en inline style sur le conteneur du profil.

```json
{
  "theme": "custom",
  "vars": {
    "--profile-bg": "#1a1a2e",
    "--profile-text": "#e0e0e0",
    "--profile-accent": "#e94560",
    "--profile-surface": "#16213e",
    "--profile-border": "#0f3460",
    "--profile-font-display": "'Playfair Display', serif"
  },
  "bg_image_url": "https://...",
  "bg_opacity": 0.15
}
```

Avantages : sécurisé par design (on ne peut modifier que les variables exposées), léger (pas de parsing CSS), compatible avec un éditeur visuel (color pickers, sliders).

#### Option B — CSS custom libre (v2, si on va jusque là)

L'utilisateur colle un bloc CSS qui est sandboxé et appliqué uniquement sur sa page profil. Le CSS est parsé côté serveur pour filtrer les propriétés dangereuses (`position: fixed`, `z-index` excessifs, `url()` vers des domaines non autorisés, `@import`, `expression()`, etc.).

Risques à gérer :
- **Sécurité** : injection de contenu via `content:`, appels réseau via `url()`, clickjacking via `position`/`z-index`
- **Performance** : CSS trop lourd, animations excessives
- **UX dégradée** : un thème cassé peut rendre le profil illisible

Mitigations :
- Whitelist de propriétés CSS autorisées
- Limite de taille du CSS (ex : 10 Ko max)
- Aperçu obligatoire avant publication
- Bouton "réinitialiser le thème" toujours accessible
- Le CSS custom ne s'applique qu'à la page profil, jamais au reste de l'app

#### Où ça vit côté données

```
user_themes
  id, user_id, preset_id (nullable), custom_vars (jsonb),
  custom_css (text, nullable), bg_image_url, is_active, created_at

theme_presets
  id, name, slug, preview_url, vars (jsonb), created_by,
  is_official, created_at
```

### Galerie de thèmes prédéfinis — premières idées

- **Reliure Classic** : le thème par défaut, fond blanc, Geist + Instrument Serif
- **Encre** : fond noir, texte crème, accent doré — pour les lecteurs de littérature sombre
- **Parchemin** : fond beige texturé, typographie serif, bordures enluminées — Fantasy, classiques
- **Néon** : fond sombre, accents vifs (rose, cyan) — manga, SF, contemporain
- **Jardin** : fond vert pâle, motifs botaniques subtils, accent terracotta — nature writing, poésie
- **Crépuscule** : dégradé bleu-violet, texte clair — Romance, feel-good

Les thèmes prédéfinis servent aussi de point de départ pour la personnalisation par variables.

### Scope visiteur vs propriétaire

Point important soulevé dans l'idée initiale : le thème peut être appliqué **côté visiteur** (le visiteur voit le profil thémé) ou **côté propriétaire seulement** (seul le propriétaire voit son propre thème, les visiteurs voient le profil par défaut).

Recommandation : **visible par tous les visiteurs**. C'est ce qui crée la viralité et l'envie de personnaliser. Mais offrir un toggle « voir en thème par défaut » pour les visiteurs qui préfèrent une lecture uniforme.

### Interactions avec le reste de Reliure

- Le thème n'affecte que la page profil publique (pas la navigation, pas les fiches livres, pas le fil)
- Les thèmes prédéfinis peuvent être liés à des challenges (badge + thème débloqué en récompense ?)
- Le bilan annuel pourrait hériter du thème du profil
- Les listes publiques pourraient éventuellement avoir leur propre thème (v3)

### Ce qu'on ne fait PAS en v1

- Pas de CSS custom libre (trop de surface d'attaque, commencer par les variables)
- Pas de marketplace de thèmes (v2)
- Pas de thème sur les listes ou les critiques (profil uniquement)
- Pas d'animations personnalisées
- Pas de modification du layout (seulement les couleurs, typo display, et fond)

### Questions ouvertes

- Faut-il limiter les thèmes custom aux utilisateurs payants (si modèle freemium) ?
- Autoriser les images de fond uploadées ou seulement des URLs ? (implications stockage Supabase)
- Faut-il un système de signalement pour les thèmes inappropriés (images choquantes en fond) ?
- Les thèmes prédéfinis doivent-ils être saisonniers / renouvelés ?

---

## 3. Pages Librairies (profils officiels)

**Statut :** Idée · Priorité à définir
**Inspiré de :** Letterboxd (comptes studios/festivals badgés), Instagram (comptes vérifiés)
**Portée :** Nouveau type de profil

### Le concept

Des pages qui ressemblent à un profil membre classique, mais avec un badge "officiel" et quelques adaptations. Une librairie peut publier des critiques, des citations, des listes (« Nos coups de cœur mars 2026 », « Sélection rentrée littéraire »), le tout sous son identité badgée. Le contenu apparaît dans le fil d'activité des abonnés comme n'importe quel autre compte.

### Pourquoi c'est fort pour Reliure

- **Acquisition B2B → B2C** : une librairie qui crée sa page invite naturellement ses clients à la suivre sur Reliure. Chaque librairie partenaire est un canal d'acquisition organique
- **Contenu éditorial qualifié** : les recos d'un libraire ont un poids que n'a pas un utilisateur lambda. Ça enrichit l'écosystème de contenu
- **Ancrage local** : une librairie a une adresse. Ça ouvre la porte à la découverte géolocalisée (v2 : « Librairies près de chez toi »)
- **Monétisation future** : pages librairies premium (mise en avant, stats sur leurs recos, lien direct vers leur e-shop)
- **Légitimité** : avoir des librairies indépendantes sur la plateforme crédibilise Reliure auprès du milieu littéraire français
- **Différenciation** : Babelio a des partenariats éditeurs mais pas de présence librairie. Gleeph a un lien librairies mais côté achat, pas côté contenu social

### Différences avec un profil membre

- **Badge « Librairie »** visible sur le profil et à côté du nom dans le fil/les critiques
- **Champs spécifiques** : adresse, horaires, lien site web/e-shop, photo de la librairie
- **Pas de diary personnel** (une librairie ne « lit » pas) — remplacé par une section « Sélections » ou « Vitrines »
- **Pas de bilan annuel** — remplacé par des stats publiques (nombre de recos, livres mis en avant, etc.)
- **Listes = Vitrines** : renommage contextuel, une liste d'une librairie s'appelle une « Vitrine » ou « Sélection »

### Validation / onboarding

- En v1 : création sur invitation ou demande manuelle (modération éditoriale, comme les challenges)
- Le compte librairie est lié à un utilisateur admin (le libraire) qui peut aussi avoir son profil perso séparé
- Vérification légère : lien vers le site web de la librairie, ou confirmation par email sur le domaine

### Interactions avec le reste de Reliure

- Les critiques d'une librairie apparaissent dans le fil avec le badge
- On peut suivre une librairie comme n'importe quel compte
- Les listes/vitrines d'une librairie apparaissent dans Explorer
- La fiche livre peut afficher « Recommandé par Librairie X » si une librairie l'a critiqué ou listé
- Les événements du Journal (agenda) pourraient être liés à une librairie (« Rencontre chez Compagnie »)

### Tables envisagées

```
bookshops
  id, user_id (admin), name, slug, badge_type ('bookshop'),
  address, city, postal_code, latitude, longitude,
  website_url, description, cover_image_url,
  is_verified, created_at

-- Le reste réutilise les tables existantes :
-- reviews, quotes, lists (avec user_id = le user lié au bookshop)
-- Un champ is_bookshop ou bookshop_id sur users pourrait suffire au MVP
```

### Ce qu'on ne fait PAS en v1

- Pas de lien e-commerce direct (« acheter chez cette librairie »)
- Pas de géolocalisation / carte des librairies
- Pas d'ouverture en self-service (sur invitation uniquement)
- Pas de dashboard analytics pour les librairies
- Pas de distinction librairie indépendante vs chaîne (à réfléchir)

### Questions ouvertes

- Faut-il un type de compte séparé ou juste un flag `is_bookshop` sur la table `users` ?
- Les éditeurs aussi ? (Gallimard qui fait ses recos, c'est tentant mais c'est un autre sujet)
- Quel seuil d'ouverture ? Commencer avec 5-10 librairies parisiennes triées sur le volet ?
- Les librairies peuvent-elles sponsoriser un livre / une liste (monétisation v2) ?

---

## To Do — Contacts & Outreach

- [ ] **Contacter Incipit (Leonard)** — Explorer une synergie potentielle avec leur projet
- [ ] **Contacter le fondateur de Yard** — Il a exprimé une volonté de rendre la lecture plus accessible, intéressant pour un éventuel partenariat ou échange
- [ ] **Personnaliser la page login (magic link)** — L'écran actuel n'est pas à la hauteur de l'identité Reliure. Customiser la page d'auth Supabase : logo, typo Instrument Serif, couleurs de la palette, message d'accueil éditorial. Vérifier aussi le template de l'email magic link (sujet, contenu, branding).

---

## 4. Skeleton loaders et animations de chargement

**Statut :** Idée · Priorité à définir
**Inspiré de :** Record Club (skeleton loaders sur couvertures et textes), Letterboxd, Instagram
**Portée :** UX transversale · Chargement perçu

### Le concept

Remplacer les états de chargement vides (écran blanc, spinner) par des placeholders animés qui imitent la forme du contenu à venir. Quand une page se charge ou qu'une API répond, l'utilisateur voit des rectangles gris avec une animation shimmer (vague de lumière qui passe) à la place des couvertures, des titres et des blocs de texte. Le contenu réel remplace le placeholder avec une transition douce (fade-in) quand il arrive.

Record Club fait ça particulièrement bien : chaque couverture d'album, chaque bloc de texte a son placeholder animé qui respecte exactement les dimensions du contenu final. Pas de "saut" de layout quand le contenu arrive.

### Où l'appliquer dans Reliure

- **Couvertures de livres** : rectangle ratio 2:3 avec shimmer, couleur de fond `#e8e4de` (le fallback actuel), remplacé par l'image avec un fade-in
- **Textes (titres, auteurs, métadonnées)** : barres arrondies de hauteurs variables selon le type de texte (titre plus haut, auteur plus fin)
- **Profil** : avatar, bio, compteurs, grille du diary
- **Fil d'activité** : chaque carte d'activité a son skeleton complet (avatar + couverture + lignes de texte)
- **Fiche livre** : couverture + bloc métadonnées + étoiles + pills de statut
- **Listes et carousels** : les items du HScroll ont chacun leur skeleton

### Deux types de chargement

1. **Chargement initial de page** (navigation entre onglets, arrivée sur un profil) — skeleton complet de toute la section visible
2. **Chargement d'images** (les couvertures via URL externe) — le skeleton reste sur chaque image individuelle tant que l'image n'a pas fini de charger, même si le texte est déjà là

### Principes

- Le skeleton doit reproduire fidèlement le layout du contenu final (mêmes dimensions, mêmes espacements) pour éviter le layout shift
- Animation subtile : shimmer léger ou pulse d'opacité, pas de clignotement agressif
- Transition fade-in quand le contenu arrive (200-300ms)
- Utiliser les couleurs du design system : fond `#f0ede8` pour les placeholders, shimmer en `#f8f6f2`
- Jamais de spinner sauf pour les actions utilisateur (envoi de critique, sauvegarde)

### Implémentation envisagée

Un composant `Skeleton` réutilisable avec des variantes :

- `Skeleton.Cover` — ratio 2:3, border-radius 3px (comme `Img`)
- `Skeleton.Text` — barre arrondie, largeur variable (80%, 60%, 40% pour simuler des lignes de texte)
- `Skeleton.Avatar` — cercle (comme `Av`)
- `Skeleton.Stars` — largeur fixe pour la zone de notation
- `Skeleton.Card` — composition des éléments ci-dessus pour un item de feed ou de liste

L'animation shimmer en CSS pur (un gradient linéaire animé en `translateX`), pas de dépendance externe.

### Ce qu'on ne fait PAS en v1

- Pas de skeleton pour le contenu déjà en cache (si on a du cache local, afficher direct)
- Pas d'animation de chargement custom par page (un seul système cohérent partout)
- Pas de skeleton pour les modales ou les overlays (le search overlay peut rester simple)

---

## 5. Critique par relecture

**Statut :** Idée · Post-MVP
**Portée :** Évolution du système de critiques

### Le concept

Actuellement : une critique par livre par utilisateur (upsert sur `user_id` + `book_id`). Si l'utilisateur relit un livre, sa nouvelle critique écrase l'ancienne.

Évolution envisagée : lier la review au `reading_status_id` plutôt qu'au `book_id`, pour permettre une critique par lecture. Un lecteur qui relit *Ficciones* trois fois pourrait avoir trois critiques distinctes, chacune liée à une entrée du diary.

### Changements nécessaires

- Ajouter `reading_status_id` (nullable, FK) sur la table `reviews`
- Revoir le unique constraint : passer de `(user_id, book_id)` à `(user_id, book_id, reading_status_id)`
- Côté UI : dans le diary, chaque relecture affiche sa propre critique
- Sur la fiche livre : les critiques multiples d'un même utilisateur sont regroupées avec un indicateur "Relecture #2", "Relecture #3"
- La note du livre reste la moyenne de toutes les critiques (pas seulement la dernière)

### Ce qu'on ne fait PAS en v1

- Pas de migration des critiques existantes (elles restent liées au `book_id` seul)
- Pas de critique par relecture tant que le système de relecture n'est pas activement utilisé

---

## 6. Qualité des résultats de recherche (ranking & déduplication)

**Statut :** Idée · Priorité haute (impacte l'onboarding et la boucle quotidienne)
**Portée :** Edge function `book_import` + logique de ranking côté recherche

### Le problème

Google Books API renvoie beaucoup de bruit. Une recherche « Monte Cristo » devrait évidemment remonter *Le Comte de Monte-Cristo* d'Alexandre Dumas en premier résultat. En pratique, l'API mélange l'édition de référence avec des résumés scolaires, des adaptations jeunesse, des versions abrégées, des ebooks sans couverture, des doublons ISBN, et des titres vaguement apparentés.

C'est un problème critique : la recherche est le premier geste de l'utilisateur (onboarding, ajout quotidien). Si le bon livre n'apparaît pas dans les 3 premiers résultats, l'expérience est cassée.

### Stratégie de ranking envisagée

**Étape 1 — Filtrage côté API (immédiat)**
- Privilégier `langRestrict=fr` pour les recherches en français
- Filtrer les résultats sans `industryIdentifiers` (ISBN) quand possible
- Exclure les résultats sans couverture (`imageLinks` absent) ou les reléguer en fin de liste

**Étape 2 — Scoring côté Reliure (MVP)**
Un score composite calculé à l'import ou à la recherche, basé sur :
- **Complétude des métadonnées** : titre, auteur, couverture, ISBN, nombre de pages → plus c'est complet, plus le score monte
- **Nombre de pages** : un résumé scolaire de 32 pages ne devrait pas passer devant l'édition intégrale de 1200 pages
- **Nombre de ratings/reviews Google Books** : signal de popularité, l'édition de référence en a plus
- **Langue** : boost FR si l'utilisateur est francophone
- **Éditeur connu** : Gallimard, Folio, Poche, Flammarion, etc. → boost par rapport à un éditeur inconnu ou auto-édité
- **Présence dans notre base** : si le livre a déjà été importé et a des reading_status/reviews chez nous, c'est probablement la bonne édition → boost fort

**Étape 3 — Déduplication / regroupement par œuvre (v2)**
- Regrouper les éditions d'une même œuvre (poche, relié, audio, traductions) sous une fiche unique
- Identifier l'œuvre par titre normalisé + auteur, ou par liens entre ISBN (quand disponible via BnF/Nudger)
- Afficher l'édition « principale » en résultat de recherche, avec un lien « Voir les X éditions » sur la fiche livre
- C'est ce que fait Babelio avec leurs 286K regroupements algorithmiques — on peut s'en inspirer sans avoir besoin de leur volume au départ

### Heuristiques spécifiques

- Si le titre exact match un classique connu (dictionnaire de ~500 œuvres canoniques ?), forcer le résultat en premier
- Si l'auteur est identifié dans la requête (« Dumas Monte Cristo »), filtrer agressivement les résultats sans cet auteur
- Les résultats de type « study guide », « SparkNotes », « résumé » devraient être exclus ou relégués (détection par éditeur ou mots-clés dans le sous-titre)

### Ce qu'on ne fait PAS en v1

- Pas de regroupement par œuvre (trop complexe, nécessite une table `works`)
- Pas de dictionnaire de classiques (commencer par le scoring générique)
- Pas de correction orthographique / fuzzy search côté Reliure (Google Books le fait déjà)

### Questions ouvertes

- Faut-il cacher les résultats en dessous d'un seuil de score, ou juste les ordonner ?
- Le scoring doit-il tourner dans l'edge function (à l'import) ou côté client (au moment de la recherche) ?
- Faut-il un mécanisme de signalement communautaire (« ce n'est pas le bon livre ») pour améliorer le ranking au fil du temps ?

---

## 7. Personnaliser la page login

**Statut :** To Do · Priorité moyenne
**Portée :** Auth UI Supabase + template email magic link

### Le problème

La page de login par défaut de Supabase est générique et ne reflète pas l'identité Reliure. C'est le premier écran qu'un nouvel utilisateur voit après avoir cliqué « Créer mon profil » — ça doit être à la hauteur.

### Ce qu'il faut faire

- Customiser l'écran d'auth Supabase : logo Reliure, typo Instrument Serif pour le titre, palette de couleurs du design system, message d'accueil éditorial
- Personnaliser le template de l'email magic link : sujet, contenu, branding Reliure (pas le template Supabase par défaut)
- S'assurer que le flow est fluide sur mobile (l'email s'ouvre souvent dans un autre navigateur)

---

## Listes — Post-bêta

**Dupliquer une liste**
Statut : Post-bêta
Utile mais pas critique au lancement. Permettre de copier une liste existante (la sienne ou celle d'un autre) comme point de départ pour en créer une nouvelle.

**Suivre une liste**
Statut : Post-bêta
Nécessite un système de notifications pas encore en place. Recevoir une notification quand le créateur ajoute un livre à une liste qu'on suit.

**Sauvegarder la liste d'un autre**
Statut : Post-bêta · v2
Feature sociale avancée. Permettre de "repost" discret d'une liste publique dans son propre profil, sans la copier — juste un raccourci vers l'original.

---

## Recherche globale (Livres / Listes / Utilisateurs)

**Statut :** Post-bêta · v2
**Portée :** Refonte de la recherche actuelle

### Le concept
La recherche actuelle est centrée sur les livres uniquement. En v2, étendre la recherche à tous les types de contenu avec un système d'onglets :
- **Livres** (défaut) — comportement actuel inchangé
- **Listes** — recherche sur le titre et la description des listes publiques
- **Utilisateurs** — recherche sur username et display_name

### Pourquoi post-bêta
Au lancement, les listes sont découvrables via le profil, l'Explorer, le fil d'activité et les fiches livres — suffisant pour le bêta.
La recherche globale nécessite une UI plus complexe (onglets, types de résultats hétérogènes) et des requêtes Supabase supplémentaires. À implémenter en une seule fois plutôt que par ajouts successifs.

### Implémentation envisagée
- Onglets dans l'overlay de recherche : Livres (défaut) / Listes / Utilisateurs
- Requêtes parallèles sur books, lists (is_public = true), users
- Résultats listes : titre, description tronquée, username créateur, nb livres
- Résultats utilisateurs : avatar initiales, username, display_name, nb livres lus
- L'onglet actif est mémorisé pendant la session

---

## Tags sur les listes

**Statut :** Post-bêta
**Portée :** Feature listes + Explorer

### Le concept
Permettre d'ajouter des tags libres sur une liste pour faciliter la découverte et le filtrage. Similaire aux thèmes sur les fiches livres, mais appliqués aux listes.

### Fonctionnalités envisagées
- Ajout de tags sur ListPage (max 5 tags, max 30 chars chacun)
- Autocomplétion sur les tags existants
- Tags cliquables → Explorer filtré par tag
- Dans ExplorePage section listes : pills des tags les plus utilisés en filtre rapide
- Tags visibles sur les cards listes dans l'Explorer et le fil

### Base de données
- Nouvelle table `list_tags` : id, list_id (FK lists), tag_text, created_at
- RLS : lecture publique, écriture réservée au propriétaire
- Index sur list_id et tag_text

### Ce qu'on ne fait PAS en v1
- Pas de tags imposés (tout est libre comme les tags personnels de lecture)
- Pas de page tag dédiée pour les listes (utiliser l'Explorer existant)

---

## 8. Notifications

**Statut :** Post-bêta · Priorité haute avant v2 sociale
**Portée :** Système transversal (in-app + email)

### Le concept
Plusieurs features du backlog dépendent d'un système de notifications :
suivre une liste, les Défis (badge débloqué, soumission validée),
les critiques likées, les nouveaux abonnés. Sans ce système,
ces features sont incomplètes.

### Types de notifications envisagées
- Quelqu'un a liké ta critique ou ta citation
- Quelqu'un t'a suivi
- Un livre a été ajouté à une liste que tu suis
- Ta soumission à un Défi a été validée
- Quelqu'un a répondu à ta critique

### Deux canaux
- **In-app** : cloche dans le header, badge rouge, liste de notifications
  avec mark-as-read. Priorité absolue.
- **Email digest** : résumé hebdomadaire optionnel ("cette semaine sur Reliure").
  Désactivable dans les paramètres. Jamais d'email pour chaque action
  individuelle — trop agressif.

### Préférences utilisateur
Table `notification_preferences` : un toggle par type d'événement,
in-app et email séparément. Désactivé par défaut pour l'email,
activé par défaut pour l'in-app.

### Tables envisagées
```
notifications
  id, user_id, type, actor_id, target_id, target_type,
  is_read, created_at
notification_preferences
  user_id, event_type, in_app_enabled, email_enabled
```

### Ce qu'on ne fait PAS en v1
- Pas de notifications push mobile (PWA d'abord)
- Pas d'email par action individuelle
- Pas de notifications temps réel (polling toutes les 30s suffit au MVP)

---

## 9. Pages auteurs

**Statut :** Post-bêta · Fort levier SEO
**Portée :** Nouvelle page + migration données

### Le concept
Une page par auteur regroupant sa bibliographie sur Reliure,
ses stats communautaires (note moyenne, nombre de lecteurs),
et les critiques les plus likées. Accessible via `/auteur/:slug`.

### Pourquoi c'est fort pour Reliure
- **SEO** : les requêtes "livres de [auteur]", "bibliographie [auteur]"
  sont parmi les plus recherchées en littérature. Babelio domine
  ces requêtes — c'est un territoire à conquérir.
- **Découverte** : depuis une fiche livre, cliquer sur l'auteur
  pour voir toute son œuvre disponible sur Reliure.
- **Données** : les auteurs `jsonb` dans `books` deviennent une
  vraie table avec pages dédiées.

### Contenu de la page auteur
- Photo (Wikimedia Commons, licence libre) + biographie courte
- Liste de ses livres présents sur Reliure, triés par popularité
- Note moyenne communautaire par livre
- Citations populaires extraites de ses œuvres
- "X lecteurs sur Reliure ont lu cet auteur"

### Migration nécessaire
Passer de `authors jsonb` dans `books` à une table `authors`
+ table de jointure `book_authors`. Prévoir la migration sans
casser l'existant (nullable au début, migration progressive).

### Ce qu'on ne fait PAS en v1
- Pas de page auteur éditable par la communauté (modération trop lourde)
- Pas de biographie longue (Wikipedia suffit, on linke)
- Pas de timeline de parution

---

## 10. Import CSV Babelio / Goodreads

**Statut :** Post-bêta · Levier d'acquisition #1
**Portée :** BackfillPage + edge function d'import

### Le concept
Permettre aux utilisateurs de migrer leur bibliothèque depuis
Babelio, Goodreads ou Booknode en important un fichier CSV.
C'est le levier d'acquisition le plus fort pour convertir
les utilisateurs des plateformes concurrentes.

### Pourquoi c'est critique
Un utilisateur Babelio a potentiellement 500 livres loggés.
Le back-fill manuel un par un est dissuasif. L'import CSV
réduit le cold start de plusieurs heures à quelques secondes.
C'est exactement ce qu'a fait The StoryGraph pour détrôner
Goodreads — l'import Goodreads était leur feature #1 au lancement.

### Sources supportées
- **Goodreads** : export CSV natif depuis les paramètres du compte.
  Champs : Title, Author, ISBN, My Rating, Date Read, Bookshelves.
- **Babelio** : export via leur interface (format CSV).
  Champs similaires, encodage parfois différent.
- **Booknode** : export CSV communautaire.

### Implémentation envisagée
- Page `/backfill` enrichie avec un onglet "Importer un fichier"
- Upload CSV → parsing côté client (PapaParse)
- Matching par ISBN en priorité, fallback titre+auteur
- Prévisualisation avant import : "X livres trouvés, Y non reconnus"
- Les livres non reconnus sont listés pour correction manuelle
- Import en batch vers Supabase via edge function

### Ce qu'on ne fait PAS en v1
- Pas d'import des critiques (trop complexe, encodages variables)
- Pas d'import des dates de lecture (trop peu fiables dans les exports)
- Pas d'import automatique via API (Goodreads a fermé leur API)

---

## 11. Partage social (image générée)

**Statut :** Post-bêta · Fort levier de viralité
**Portée :** Feature transversale (bilan, listes, critiques)

### Le concept
Générer une image partageable au format carré (1:1) ou story (9:16)
depuis les contenus clés de Reliure. L'image est téléchargeable
et partageable directement sur Instagram, Twitter/X, ou en story.

### Pourquoi c'est fort
Le bilan annuel Letterboxd est viral chaque année en décembre.
Spotify Wrapped a popularisé ce format. Reliure peut faire pareil
avec le bilan de lecture — et l'image devient une publicité
organique gratuite portant le nom "reliure" dans le feed des amis.

### Contenus partageables envisagés
- **Bilan annuel** : "J'ai lu X livres en 2026 sur Reliure" avec
  les 4 meilleures couvertures, la note moyenne, le nombre de pages
- **Une liste** : titre de la liste + mosaïque de couvertures + username
- **Une critique** : extrait de la critique + couverture + étoiles
- **Une citation** : la citation en grand + titre du livre

### Implémentation envisagée
- Génération côté client avec `html2canvas` ou `dom-to-image`
- Template fixe par type de contenu, couleurs du design system
- Bouton "Partager" sur le bilan, les listes et les critiques
- Téléchargement direct en PNG

### Ce qu'on ne fait PAS en v1
- Pas de partage direct vers les réseaux (juste téléchargement)
- Pas de template personnalisable
- Pas de watermark agressif (juste "reliure" discret en bas)

---

## 13. Normalisation IA des requêtes de recherche

**Statut :** Post-bêta · Priorité haute
**Portée :** src/lib/googleBooks.js + API Anthropic

### Le concept
Avant d'envoyer une requête à Google Books, passer par
Claude Haiku pour normaliser et enrichir la query.
"bolano detectiv" → "Les Détectives sauvages Roberto Bolaño".
"letranger" → "L'Étranger Albert Camus".

### Pourquoi c'est nécessaire
Google Books est une source bruyante contrairement à TMDb
(Letterboxd) ou FEL/Dilicom (Babelio) qui sont des bases
propres à la source. Le scoring compense en partie ce
désavantage structurel, mais la normalisation IA le règle
définitivement pour les requêtes ambiguës ou mal orthographiées.

### Implémentation envisagée
- Fonction `normalizeQueryWithAI(query)` dans googleBooks.js
- Modèle : Claude Haiku (~$0.00025/requête, quasi gratuit au bêta)
- Timeout 800ms max — fallback query originale si pas de réponse
- Cache en mémoire (même Map que les résultats)
- Retourne : { normalizedQuery, authorHint, titleHint }
- Utiliser authorHint pour ajouter une requête parallèle
  `inauthor:+intitle:` au mix existant

### Ce qu'on ne fait PAS en v1
- Pas d'IA sur les requêtes ISBN (inutile)
- Pas d'appel IA si query < 3 caractères
- Jamais bloquer la recherche si l'IA échoue

---

## 14. Enrichissement IA des fiches livres (système de crédits)

**Statut :** Post-bêta · Priorité moyenne
**Portée :** BookPage + modération communautaire + edge function

### Le concept
Certaines fiches livres sont pauvres : description absente
ou trop courte, genres incorrects, thèmes manquants.
Permettre aux utilisateurs de confiance de déclencher
un enrichissement IA de la fiche, financé par un système
de crédits.

### Pourquoi un système de crédits
- Évite les abus (enrichissement en masse, spam)
- Crée une mécanique de contribution valorisante
- Le coût réel est faible (Claude Haiku ~$0.001 par
  enrichissement) mais le crédit donne une valeur perçue

### Qui peut enrichir
- **Modérateurs** : crédits illimités, accès immédiat
- **Users vérifiés** (badge "Contributeur") :
  5 crédits/mois offerts, rechargeables
- **Tous les users** : 1 crédit offert à l'inscription,
  gagnable par contribution (critique longue, citations, etc.)

### Ce que l'IA enrichit
Bouton discret "Améliorer cette fiche" sur BookPage,
visible uniquement si l'user a des crédits :
- **Description** : si absente ou < 100 chars, générer
  150-200 mots sobres à partir titre/auteur/année/genres
- **Thèmes** : suggérer 3-5 thèmes pertinents
  (à valider avant publication)
- **Biographie auteur courte** : 2-3 phrases factuelles
- **Genres affinés** : remplacer "Fiction" générique
  par des genres précis

### Validation obligatoire
L'enrichissement n'est jamais publié automatiquement.
L'user voit un aperçu et valide ou rejette chaque champ.
Un champ rejeté ne consomme pas de crédit.

### Tables envisagées
- `ai_credits` : user_id, balance, lifetime_earned, updated_at
- `ai_enrichment_log` : id, user_id, book_id, fields_enriched (jsonb), model_used, tokens_used, created_at

### Ce qu'on ne fait PAS en v1
- Pas d'enrichissement automatique sans action humaine
- Pas de vente de crédits (gratuit uniquement)
- Pas d'enrichissement des critiques ou citations
- Pas de rollback automatique (signalement manuel suffit)

---

## 15. Recommandations personnalisées IA

**Statut :** Post-bêta · Différenciateur majeur
**Portée :** Nouvelle section profil + algorithme de recommandation

### Le concept
"Basé sur tes 5 derniers livres, tu pourrais aimer..."
Une recommandation personnalisée générée par IA à partir
de l'historique de lecture réel de l'utilisateur.
Ni Letterboxd ni Babelio ne font ça bien.
C'est un territoire libre sur le marché francophone.

### Pourquoi c'est fort
- La recommandation algorithmique classique nécessite
  des millions d'utilisateurs (cold start problem)
- L'IA générative peut faire des recommandations
  pertinentes dès le premier utilisateur, à partir
  de seulement 5-10 livres lus
- C'est visible, utile, et immédiatement perçu
  comme de la valeur par l'utilisateur

### Implémentation envisagée
- Déclenchement : quand l'user a 5+ livres lus
- Contexte envoyé à Claude Sonnet :
  liste des livres lus avec notes, auteurs, années, thèmes
- Output : 3 recommandations avec explication courte
  "Parce que tu as aimé Bolaño, tu pourrais aimer..."
- Affichage : section "Pour toi" sur la page Explorer
  ou widget sur le profil
- Rafraîchissement : hebdomadaire ou après 3 nouvelles lectures
- Cache Supabase : stocker les recommandations pour ne pas
  recalculer à chaque visite

### Modèle recommandé
Claude Sonnet (meilleure qualité de recommandation
que Haiku pour ce type de raisonnement littéraire).
Coût estimé : ~$0.01 par génération, 1x/semaine max.

### Ce qu'on ne fait PAS en v1
- Pas de recommandations temps réel
- Pas d'explication algorithmique visible ("parce que
  tu as noté X étoiles à Y") — garder ça magique
- Pas de recommandations sociales (ce que tes amis lisent
  est dans le fil, pas dans les recommandations perso)

---

## 16. Analyse du profil de lecteur IA

**Statut :** Post-bêta · Différenciateur unique
**Portée :** Onglet Bilan + edge function analyse

### Le concept
"Tu lis surtout de la littérature latino-américaine
post-1980, avec une préférence pour les structures
non-linéaires et les narrateurs ambigus."
Une analyse textuelle de ton profil de lecteur,
générée par IA à partir de l'ensemble de ta bibliothèque.
Personne ne propose ça actuellement.

### Pourquoi c'est unique
- Les stats classiques (nb de livres, pages, note moyenne)
  sont présentes partout
- Une analyse qualitative de tes goûts littéraires
  est quelque chose qu'aucune app ne fait
- C'est partageable, identitaire, et donne envie
  de compléter sa bibliothèque pour affiner l'analyse
- Effet miroir : voir son propre profil décrit avec
  précision crée une forte adhésion émotionnelle

### Implémentation envisagée
- Déclenchement : 10+ livres lus (seuil de pertinence)
- Contexte envoyé à Claude Opus :
  liste complète des livres avec notes, auteurs, années,
  pays d'origine, genres, thèmes, critiques écrites
- Output structuré :
  - "Tes territoires littéraires" : 2-3 zones géo/temporelles
  - "Ce que tu cherches dans un livre" : 2-3 tendances
  - "Ton auteur emblématique" : celui qui représente
    le mieux tes goûts
  - "Ta prochaine frontière" : un territoire que tu
    n'as pas encore exploré mais qui te correspondrait
- Affiché dans l'onglet Bilan, section dédiée
- Ton : littéraire, précis, jamais condescendant

### Modèle recommandé
Claude Opus — ce type d'analyse qualitative fine
nécessite le meilleur modèle.
Coût estimé : ~$0.05 par analyse, 1x/mois max.
Généré à la demande (bouton "Analyser ma bibliothèque")
pas automatiquement.

### Ce qu'on ne fait PAS en v1
- Pas de comparaison entre utilisateurs
  ("ton profil ressemble à @margaux")
- Pas d'analyse en temps réel (trop cher)
- Pas d'export de l'analyse (screenshot suffit)

---

## 17. Résumé intelligent des critiques

**Statut :** Post-bêta · Différenciateur fort
**Portée :** BookPage + edge function synthèse

### Le concept
Synthétiser les critiques d'un livre en "ce que les
lecteurs Reliure en pensent vraiment" — un paragraphe
court, honnête, qui capture le consensus et les
divergences. StoryGraph commence à faire quelque chose
dans ce sens mais en anglais uniquement.

### Pourquoi c'est fort
- Sur une fiche avec 50 critiques, personne ne les lit
  toutes — le résumé IA donne accès à l'intelligence
  collective en 10 secondes
- C'est un contenu unique à Reliure, généré à partir
  de notre communauté — impossible à copier sans
  avoir la même base d'utilisateurs
- Différenciateur visible sur la fiche livre

### Implémentation envisagée
- Déclenchement : 5+ critiques sur un livre
- Contexte : toutes les critiques du livre avec notes
- Output :
  - 1 paragraphe "Ce qu'en pensent les lecteurs" (100 mots)
  - "Points forts mentionnés" : 2-3 bullets
  - "Points de divergence" : 1-2 bullets si applicable
  - Score de consensus (% qui recommandent)
- Affiché en haut des critiques sur BookPage,
  avant les critiques individuelles
- Rafraîchissement : à chaque nouvelle critique
  (si le livre a < 20 critiques) ou hebdomadaire
  (si le livre a 20+ critiques)
- Stocké en cache dans la table `books`
  (champ `review_summary jsonb`)

### Modèle recommandé
Claude Haiku suffit pour cette synthèse.
Coût estimé : ~$0.001 par synthèse.

### Ce qu'on ne fait PAS en v1
- Pas de résumé si < 5 critiques (pas assez de signal)
- Pas de résumé sur les critiques avec spoilers
  (trop risqué de les synthétiser)
- Pas d'indication que c'est généré par IA
  dans l'UI principale (note de bas de page discrète suffit)

---

## 4. Enrichissement communautaire des fiches livres

**Statut :** Idée · Post-beta
**Inspiré de :** TMDb (contributions ouvertes + modération), Babelio (corrections communautaires), Open Library (éditions collaboratives)
**Portée :** Feature fiche livre + back-office modération

### Le concept

Quand une fiche livre est incomplète (pas de couverture, pas de description, nombre de pages manquant, auteur mal orthographié), n'importe quel utilisateur connecté peut proposer une correction ou un enrichissement. La modification est soumise à validation avant d'être appliquée.

### Ce qu'on peut enrichir

- Couverture (upload d'image)
- Description / résumé
- Nombre de pages
- Date de publication
- Éditeur
- ISBN
- Genres / thèmes
- Correction du titre ou de l'auteur

### Mécanique de modération

Deux niveaux envisageables :

**V1 — modération manuelle par l'équipe Reliure** : toutes les contributions passent dans une file d'attente, l'équipe valide ou rejette. Simple à implémenter, contrôle total, mais ne scale pas.

**V2 — modération communautaire** : les utilisateurs avec un seuil de contributions validées (ex : 10+ acceptées) obtiennent un statut "contributeur de confiance" et leurs modifications sont appliquées directement, sans attente. Modèle Wikipedia/TMDb.

### UX sur la fiche livre

- Bouton discret "Compléter cette fiche" visible uniquement si des champs sont manquants
- Formulaire léger : un champ à la fois, pas une page entière
- Feedback : "Merci ! Ta contribution sera examinée sous 48h"
- Si la contribution est acceptée : notification à l'utilisateur + badge "Contributeur" sur son profil

### Tables envisagées
```sql
book_contributions
  id, user_id, book_id,
  field (cover/description/page_count/etc.),
  proposed_value text,
  status (pending/accepted/rejected),
  reviewed_by, reviewed_at,
  created_at

-- Optionnel v2 :
contributor_stats
  user_id, accepted_count, rejected_count, trusted (boolean)
```

### Ce qu'on ne fait PAS en v1

- Pas d'historique de modifications visible publiquement (v2)
- Pas de système de votes sur les contributions
- Pas d'upload de couverture par les users en v1 (trop complexe — modération image, stockage Supabase Storage) — uniquement les champs texte/numériques
- Pas de merge automatique sans validation humaine

---

*Dernière mise à jour : 29 mars 2026*
