# Reliure — Backlog produit

> Idées de features collectées au fil des conversations. Chaque entrée documente le concept, le pourquoi, et les grandes lignes de l'implémentation envisagée.

---

1. Challenges de lecture
Statut : UI complète (données mock) · Post-bêta
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

Flex row : progression circulaire SVG à gauche (cercle 80px, stroke var(--avatar-bg) en fond, stroke var(--text-primary) en remplissage proportionnel, nombre d'items complétés au centre en 20px bold, total en 9px muted en dessous)
À droite du cercle : titre du challenge en Instrument Serif italic 24px, puis "Objectif : [palier visé]" avec le palier en doré (var(--color-warn-text) font-weight 500), "Palier actuel : [palier atteint]" en font-weight 500, puis "Par [créateur] · X participants · dates" en 12px muted

Filtres :

Rangée de pills horizontales scrollables : "Tous (100)" (pill active : fond var(--text-primary), texte var(--bg-primary)), "Complétés (34)", "À faire (66)", "Classement" (pills inactives : fond surface, texte muted)
Font-size 11px, padding 5px 14px, border-radius 14px

Timeline des items :

Ligne verticale continue à gauche : border-left 2px solid var(--border-subtle), padding-left 20px, margin-left 8px
Chaque item est un noeud sur la timeline :

Point rempli (12px, border-radius 50%, background var(--text-primary)) pour les items complétés
Point vide (12px, border-radius 50%, background var(--avatar-bg), border 2px solid var(--star-empty)) pour les items à faire
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

Bouton "Rejoindre ce challenge" centré : fond var(--text-primary), texte var(--bg-primary), padding 10px 28px, border-radius 20px, font-size 13px, font-weight 500

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

**Statut :** ✅ Fait
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
- Utiliser les CSS custom properties : fond `var(--bg-elevated)` pour les placeholders, shimmer en `var(--border-subtle)` (dark mode ready)
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

**Statut :** ✅ Fait (is_reread dans reading_status, toggle sur BookPage, badge relecture dans le fil)
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

## 6. Qualité des résultats de recherche (ranking, déduplication, apostrophes)

**Statut :** ✅ Fait — architecture DB-first + fixes apostrophes + cascade BnF (avril 2026)
**Portée :** `src/lib/googleBooks.js` + `src/components/Search.jsx` + RPC `search_books_v2`

### Architecture DB-first (implémentée)

La base locale (3830+ livres) est la source primaire. Google Books sert uniquement à la découverte.

**`searchBooks(query)`** fonctionne en séquentiel (RPC-first) avec skip logic :
1. **RPC `search_books_v2`** (migration 022) : cross-field matching (titre OU auteurs), scoring (+100 exact, +50 début, ×30 couverture titre, ×5 auteur, tie-breaker rating_count), matching compact (requête mono-token sans espaces), branche ISBN, **normalisation apostrophes** (CTE `norm` : toutes variantes `' ' ' ‹ ›  \`` → espace sur query ET sur champs DB avant comparaison).
2. **Skip Google** si ≥ 3 résultats DB (`db_sufficient`) ou ISBN trouvé (`isbn_found`) — ~60% d'appels évités.
3. **Google Books** (conditionnel) : une requête `langRestrict=fr`, max 8 résultats filtrés. **Circuit breaker** : HTTP 429 → API désactivée 15min. `isGoogleBooksAvailable()` exportée pour contrôle externe.

### Clic sur un résultat IA — cascade avec scoring (mis à jour avril 2026)

Quand l'utilisateur clique un résultat de la recherche assistée IA (`smart-search`) :
0. **Score >= 100 + ISBN disponible** → appel direct `book_import` edge function (pipeline 4 sources complet : Google, OL, BnF, MetasBooks) avant navigation. Évite la recherche Google redondante quand l'IA a identifié le bon livre avec certitude.
1. **Score < 100, Google disponible** : recherche Google + `scoreMatch()` (compare titre+auteur normalisés, seuil > 0) → importe le résultat avec le meilleur score, évite d'importer le mauvais livre.
2. **Google indisponible** (circuit breaker actif) → cascade BnF :
   - Tente l'ISBN fourni par l'IA via edge function `book_import`
   - Puis recherche BnF SRU par titre+auteur, import via edge function
   - Puis import direct en dernier recours

### Améliorations pipeline avril 2026

- **`cleanTitle()`** : 4 patterns regex pour nettoyer les sous-titres promotionnels Google Books (suffixes `-– roman/thriller/...`, `: roman/polar/...`, `: + sous-titre long (21+ chars)`, `(...)` en fin de titre)
- **`google-books-proxy` clés dynamiques** : boucle `while` scanne `GOOGLE_BOOKS_KEY_N` sans limite fixe (était hardcodé à 3 clés). Ajouter `GOOGLE_BOOKS_KEY_4`, `_5`, etc. sans toucher au code.
- **MetasBooks** : 4ème source dans `book_import`, enrichissement post-merge (description, couverture, éditeur). Source `multi_api_metasbooks` si actif.

### BnF SRU

Conservé dans l'edge function `book_import` pour l'import par ISBN et comme fallback IA. Hors de la recherche libre temps réel (trop lente, pas de couvertures).

### Ce qu'on ne fait PAS (toujours vrai)

- Pas de regroupement par œuvre (nécessite une table `works`)
- Pas de correction orthographique côté Reliure (Google Books le fait)

---

## 7. Personnaliser la page login

**Statut :** ✅ Fait (page custom avec branding Reliure, magic link OTP, OAuth Google)
**Portée :** Auth UI Supabase + template email magic link

### Ce qui est implémenté

- Page custom `LoginPage.jsx` : logo reliure + pill BETA, tagline Instrument Serif 32px, `CoverBackdrop` en fond
- Google OAuth (CTA primaire) : `supabase.auth.signInWithOAuth({ provider: "google" })`, redirect vers `/explorer`
- Magic link par email (secondaire) : input email + bouton, confirmation envoi avec "Utiliser une autre adresse"
- Mot de passe (lien discret) : révèle le champ password en `animate-page-in`, toggle retour vers magic link
- OAuth Google activé. Provider configuré dans Supabase Dashboard.
- Reste à faire : personnaliser le template de l'email magic link (sujet, contenu, branding Reliure)

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

**Statut :** ✅ Fonctionnel (migration DB + UI in-app) — avril 2026
**Portée :** Système transversal (in-app + email à terme)

### Le concept
Plusieurs features du backlog dépendent d'un système de notifications :
suivre une liste, les Défis (badge débloqué, soumission validée),
les critiques likées, les nouveaux abonnés. Sans ce système,
ces features sont incomplètes.

### Ce qui est implémenté (migration 025, avril 2026)

**Table `notifications`** :
- `id`, `user_id` (destinataire), `actor_id` (qui a déclenché, null pour badges système), `type` (enum : `follow`, `like_review`, `like_quote`, `like_list`, `badge`, `reply`), `target_id`, `target_type`, `metadata` (jsonb), `is_read` (bool), `created_at`
- Contrainte `user_id != actor_id` (pas d'auto-notification)
- RLS : lecture/update/delete owner only, pas d'INSERT policy (triggers SECURITY DEFINER)
- Index : `(user_id, is_read, created_at DESC)`, `(user_id, created_at DESC)`, `(actor_id, type, target_id)` (dédup)

**Fonction helper `create_notification()`** : SECURITY DEFINER, anti-spam (pas de doublon identique dans les 5 dernières minutes), vérifie `user_id != actor_id`.

**Triggers** :
- `trg_notify_follow` (AFTER INSERT on `follows`) → notifie `following_id`, metadata = `{ "username": "..." }`
- `trg_notify_like` (AFTER INSERT on `likes`) → notifie le propriétaire du contenu, metadata = `{ "book_title": "...", "book_slug": "..." }` (review/quote) ou `{ "list_title": "..." }` (list)
- `trg_notify_badge` (AFTER INSERT on `user_badges`) → notifie `user_id`, actor_id=NULL, metadata = `{ "badge_id": "...", "badge_name": "..." }`
- `trg_notify_review_reply` (AFTER INSERT on `review_replies`) → notifie l'auteur de la critique, metadata = `{ "book_title", "book_slug", "book_id", "reply_id", "reply_preview" }` (migration 026)

**RPCs** :
- `get_notifications(p_limit, p_offset)` → jointure actor (username, display_name, avatar_url)
- `get_unread_notification_count()` → int
- `mark_notifications_read(p_ids)` → NULL = tout marquer lu, sinon les IDs spécifiés

**Nettoyage** : pg_cron `cleanup-old-notifications` (> 90 jours, dimanche 3h)
**Realtime** : `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`

### UI implémentée (avril 2026)

- **`NotificationBell`** (`src/components/NotificationBell.jsx`) : cloche SVG 18×18 dans le Header (entre theme toggle et avatar), badge rouge compteur (`var(--color-spoiler)`), cap 99+
- **`NotificationPanel`** (`src/components/NotificationPanel.jsx`) : dropdown 360×440px, `bg-elevated`, border-radius 12. Header "Notifications" + "Tout marquer comme lu". Avatar acteur ou icône système (👤/♥/✦/💬), texte FR, timestamp relatif. Unread : fond `bg-surface` + dot rouge. Click-outside + Escape ferment.
- **`useNotifications`** (`src/hooks/useNotifications.js`) : TanStack Query (`["notifications"]` staleTime 1min, `["unreadCount"]` staleTime 30s) + Supabase Realtime (channel dans `useRef`). Optimistic UI mark-as-read.
- **`notificationHelpers.js`** (`src/utils/notificationHelpers.js`) : `getNotificationText()` (6 types FR), `getNotificationLink()` (React Router path), `relativeTime()` (français)
- **Header** : intégration bell + panel entre theme toggle et avatar, `handleNotifClick` (markOneAsRead + navigate), `handleMarkAllRead`

### Ce qu'on ne fait PAS en v1
- Pas de notifications push mobile (PWA d'abord)
- Pas d'email par action individuelle (email digest hebdomadaire en v2)
- Pas de table `notification_preferences` (tous les types activés par défaut)
- ~~Pas de trigger reply~~ → implémenté (migration 026, trigger `trg_notify_review_reply`)

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

**Statut :** ✅ Fait (CSVImport.jsx sur BackfillPage, Goodreads + Babelio, preview + progression + résumé)
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

**Statut :** ✅ Fait (edge function smart-search, Claude Haiku, ghost text, cache 7j, filtrage IA confirmé/non-confirmé, mode NL avril 2026)
**Portée :** src/lib/googleBooks.js + src/components/Search.jsx + src/hooks/useSmartSearch.js + API Anthropic

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

### Ce qui est implémenté (avril 2026)

- Edge function `smart-search` : Claude Haiku, ghost text, cache 7j, `looksLikeNaturalLanguage()`
- **Mode NL** (`isNL = looksLikeNaturalLanguage(q)`) : debounce 300ms (vs 400ms standard), résultats IA affichés **en premier** dans la dropdown, résultats classiques sous label "Autres résultats", "Recherche approfondie…" immédiat sans attendre la réponse IA
- **Debounce réduit à 300ms** (était 600ms) — réactivité améliorée
- Filtrage confirmé/non-confirmé : résultats classiques réordonnés selon confirmation IA (titre + auteur matching)
- Zero-result fast path : debounce 0ms si aucun résultat classique

### Ce qu'on ne fait PAS
- Pas d'IA sur les requêtes ISBN (inutile)
- Pas d'appel IA si query < 2 caractères
- Jamais bloquer la recherche si l'IA échoue (toujours retourne 200)

---

## 14. Enrichissement IA des fiches livres (système de crédits)

**Statut :** Partiellement implémenté · Système de crédits post-bêta
**Portée :** BookPage + modération communautaire + edge function

### Ce qui est implémenté

Edge function `book_ai_enrich` opérationnelle (déclenchée uniquement depuis BackfillPage) :
- Claude Haiku génère métadonnées + description FR pour les fiches incomplètes
- Cascade 4 sources pour la couverture (Google Books, BnF, Open Library, Amazon)
- Open Library confirme et fournit l'OLID
- Champ `source = 'ai_enriched'` et `ai_confidence` (numeric 3,2) dans `books`
- Badge "À vérifier" sur BookPage si `ai_confidence < 0.7`
- Accessible depuis BackfillPage (section "Fiches incomplètes") — jamais automatique

### Le concept original (système de crédits — post-bêta)
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

### Qui peut enrichir (post-bêta)
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

### Tables envisagées (système de crédits)
- `ai_credits` : user_id, balance, lifetime_earned, updated_at
- `ai_enrichment_log` : id, user_id, book_id, fields_enriched (jsonb), model_used, tokens_used, created_at

### Ce qu'on ne fait PAS encore
- Pas de système de crédits (enrichissement réservé aux admins via BackfillPage)
- Pas de vente de crédits
- Pas d'enrichissement des critiques ou citations
- Pas de rollback automatique (signalement manuel suffit)

---

## 15. Recommandations personnalisées IA ("Tu pourrais aimer")

**Statut :** ✅ Implémenté — 5 avril 2026
**Portée :** Section profil + edge function + cache DB

### Ce qui est implémenté

**Migration `030_book_recommendations.sql`** :
- Table `book_recommendations` : `user_id` (UNIQUE), `recommendations` (jsonb), `model_used`, `tokens_used`, `context_hash` (SHA-256), `generated_at`, `expires_at`
- RLS : lecture/écriture owner only
- Note : pas d'index partiel `WHERE expires_at > now()` (now() non IMMUTABLE en PostgreSQL)

**Edge function `book-recommendations`** :
- Flow : JWT auth → cache check → rate limit 24h → collectSignals → guard < 5 livres (204) → context hash check → Claude Sonnet → parse → resolve books → filter existants → require ≥ 3 valides → upsert → retour
- `collectSignals()` : reading_status + reviews comme 2 requêtes séparées (pas de FK entre les deux tables, PostgREST join embedded échoue silencieusement). Construit un `reviewMap: Map<book_id, {rating, body}>`.
- `buildWeightedContext()` : favoris ×5, note 5 ×4, relecture ×4, note 4 ×3, citations ×2.5, critique ×2, abandonné ×(−2), note 1-2 ×(−3)
- Résolution de chaque reco : ISBN-13 checksum → lookup DB → findByTitleAuthor → book_import si absent
- Context hash (SHA-256) : skip Sonnet si profil inchangé, renouveler seulement `expires_at`

**Hook `useRecommendations(userId)`** :
- TanStack Query `["recommendations", userId]`, staleTime 10min, gcTime 30min
- 204 → `{ notEnough: true }`, `rate_limited` flag géré
- `dismissed` state client-side, `generateRecommendations()` (invalidation), `dismissRecommendation(bookId)`

**Composant `RecommendationsSection`** :
- ProfilePage, `isOwnProfile` uniquement, après "En cours"
- 5 états : notEnough→null, isError→toast seul, isLoading→skeleton, all-dismissed→message + lien refresh, display
- Couvertures responsive `clamp(90px, 24vw, 110px)`, `<Img className="w-full">` pour remplir le wrapper
- Clic couverture → raison expandée, `key={selectedReco.book_id}` déclenche l'animation `recoReasonIn` à chaque changement
- "＋ À lire" : upsert reading_status + dismiss animé + toast, "Pas intéressé" : dismiss, "Voir le livre" : navigate
- Dismiss : `dismissingIds` Set, opacity+scale 200ms puis retrait DOM
- Refresh : spinner CSS `spin` quand `refreshPending && isFetching`, "↻ Demain" quand rate limited

### Ce qu'on ne fait PAS
- Pas de recommandations sociales (fil d'activité pour ça)
- Pas de filtrage collaboratif (l'IA résout le cold start dès 5 livres)
- Pas de micro-questionnaire "tu aimes plutôt…" (l'IA déduit depuis l'historique)

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

**Statut :** Partiellement implémenté · Modération communautaire post-bêta
**Inspiré de :** TMDb (contributions ouvertes + modération), Babelio (corrections communautaires), Open Library (éditions collaboratives)
**Portée :** Feature fiche livre + back-office modération

### Ce qui est implémenté

`EnrichModal` sur BookPage : tout utilisateur connecté peut modifier directement une fiche, sans file de modération (MVP simplifié). Déclenché via le bouton "Modifier la fiche" dans la section hero.

Ce qu'on peut modifier aujourd'hui :
- Couverture — deux modes :
  - **Upload fichier** (jpg/png, max 2 Mo) → Supabase Storage bucket `book-covers`
  - **Coller une URL** → preview live avec debounce 600ms, validation `onLoad`/`onError`, sauvegarde directe dans `books.cover_url` sans passer par Storage
- Description
- Nombre de pages
- Date de publication
- Éditeur

La modification est appliquée immédiatement (UPDATE dans `books`). Pas de file de modération en v1.

### Le concept original (modération — post-bêta)

Quand une fiche livre est incomplète, n'importe quel utilisateur connecté peut proposer une correction. La modification est soumise à validation avant d'être appliquée.

### Mécanique de modération (post-bêta)

Deux niveaux envisageables :

**V1 — modération manuelle par l'équipe Reliure** : toutes les contributions passent dans une file d'attente, l'équipe valide ou rejette. Simple à implémenter, contrôle total, mais ne scale pas.

**V2 — modération communautaire** : les utilisateurs avec un seuil de contributions validées (ex : 10+ acceptées) obtiennent un statut "contributeur de confiance" et leurs modifications sont appliquées directement, sans attente. Modèle Wikipedia/TMDb.

### UX sur la fiche livre (post-bêta)

- Formulaire léger : un champ à la fois, pas une page entière
- Feedback : "Merci ! Ta contribution sera examinée sous 48h"
- Si la contribution est acceptée : notification à l'utilisateur + badge "Contributeur" sur son profil

### Tables envisagées (système de modération)
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

### Ce qu'on ne fait PAS encore

- Pas d'historique de modifications visible publiquement (v2)
- Pas de système de votes sur les contributions
- Pas de merge automatique sans validation humaine (post-bêta)

---

---

## 18. Rôles utilisateur (admin / modérateur)

**Statut :** Post-bêta · Infrastructure
**Portée :** Supabase + UI profil + permissions

### Le concept
Système de rôles pour distinguer les utilisateurs ordinaires des
modérateurs et administrateurs. Permet de contrôler l'accès à
certaines actions (modifier les fiches livres, valider les
contributions communautaires, accéder au back-office).

### Rôles envisagés
- **user** : rôle par défaut, accès standard
- **moderator** : peut modifier toutes les fiches livres,
  valider les contributions communautaires
- **admin** : accès complet, peut promouvoir des modérateurs,
  accès au back-office

### Implémentation envisagée
- Table `user_roles` : user_id, role (enum), granted_by, granted_at
- RLS Supabase : policies conditionnelles selon le rôle
- Badge discret sur le profil public (✓ Modérateur / ✓ Admin)
- Bouton "Modifier la fiche" visible uniquement pour moderator/admin
- Back-office minimal : liste des contributions en attente,
  validation/rejet en un clic

### Ce qu'on ne fait PAS en v1
- Pas de permissions granulaires par livre ou par section
- Pas de système de candidature modérateur (nomination manuelle)
- Pas d'historique des actions de modération visible publiquement

---

## 19. Édition et suppression des critiques et citations (ContentMenu)

**Statut :** Implémenté · MVP
**Portée :** BookPage, ProfilePage, FeedPage, ExplorePage, CitationsPage

### Ce qui est implémenté

Composant `src/components/ContentMenu.jsx` — menu contextuel edit/delete visible uniquement par l'auteur du contenu (`user.id === item.user_id`).

- **Visibilité** : `opacity-0 group-hover:opacity-100` sur desktop, toujours visible sur mobile (`max-sm:opacity-100`)
- **Révélation** : le wrapper parent doit avoir `className="group"` et `position: relative`
- **Suppression** : supprime dans `reviews` ou `quotes` ET dans `activity` (nettoyage du fil)
- **Édition critique** : modal avec InteractiveStars, textarea body, checkbox spoilers — UPDATE dans `reviews` + update du metadata `activity`
- **Édition citation** : modal avec textarea body uniquement — UPDATE dans `quotes` + update du metadata `activity`
- **Callbacks** : `onDelete()` et `onEdit()` permettent au parent de refetch

Intégré partout où critiques/citations apparaissent :
- ProfilePage (onglets Mes critiques + Mes citations) → `refetchReviews()` / `refetchQuotes()`
- BookPage (onglets Critiques + Citations) → `refetchReviews()` / `refetchQuotes()`
- FeedPage → `refetchFeed()`
- ExplorePage → `window.location.reload()` (hooks useExplore sans refetch)
- CitationsPage → `refetch()` depuis `useCommunityQuotes`

---

## 20. État vide bibliothèque — onboarding enrichi

**Statut :** Implémenté · MVP
**Portée :** ProfilePage onglet Bibliothèque

### Ce qui est implémenté

Quand l'utilisateur connecté (`isOwnProfile`) n'a aucun livre dans sa bibliothèque, affichage d'un état vide éditorial inspiré d'Oku.club :

- Titre en Instrument Serif italic 22px : "Ta bibliothèque t'attend."
- Accroche 14px expliquant Reliure (critiques, citations, coups de cœur)
- Deux CTAs côte à côte : "📥 Importer depuis Goodreads" (→ `/backfill`, fond noir) + "Parcourir les livres" (→ `/explorer`, fond transparent)
- Note de bas de page 11px mentionnant import Babelio / Livraddict

---

## 21. Édition inline du profil (avatar, nom, bio)

**Statut :** Implémenté · MVP
**Portée :** ProfilePage — header, isOwnProfile uniquement

### Ce qui est implémenté

Suppression du bouton "Modifier le profil" → `/parametres`. Édition directement dans le header du profil, sans navigation.

**Avatar**
- Hover → overlay semi-transparent avec icône appareil photo SVG
- Clic → file picker (jpg/jpeg/png/webp, max 1 Mo)
- Validation côté client : type MIME strict, taille max 1 Mo
- Compression canvas avant upload : redimensionné à max 400×400px, exporté en JPEG qualité 0.85
- Upload vers Supabase Storage bucket `avatars`, chemin `${user.id}/avatar.jpg` (upsert — écrase toujours le même fichier)
- UPDATE `users.avatar_url` avec URL publique + cache-bust `?t=timestamp`
- Optimistic update local immédiat (`localAvatar` state)
- Spinner pendant l'upload
- Toast d'erreur inline (rouge, 4s) pour format non supporté ou fichier trop lourd

**Nom affiché**
- Clic sur le nom → input inline, même taille/police (22px Instrument Serif italic)
- Bordure bottom 1px uniquement, fond transparent
- Entrée ou blur → UPDATE `users.display_name` (max 50 chars)
- Escape annule sans sauvegarder

**Bio**
- Si null → placeholder italic "Ajoute une bio..." cliquable en 14px #999
- Clic → textarea inline avec compteur /160
- Cmd+Entrée ou blur → UPDATE `users.bio` (max 160 chars)
- Escape annule sans sauvegarder

**Lien Paramètres**
- Bouton "⚙ Paramètres" 11px #767676 sous les stats → `/parametres`
- Réservé aux réglages avancés : email, mot de passe, suppression de compte

### Bucket Supabase Storage requis
Bucket `avatars` avec policy : public read + authenticated insert/update (à créer si inexistant).

---

## 22. Audit couleurs — harmonisation palette

**Statut :** Implémenté · MVP
**Portée :** tous les fichiers `src/pages/` et `src/components/`

### Ce qui a été fait

Remplacement systématique de toutes les couleurs hors-palette par les valeurs officielles du design system (définies dans CLAUDE.md et `src/index.css @theme`).

**Règles appliquées :**
- `#737373`, `#999`, `#bbb`, `#ccc`, `#aaa` (texte/icône) → `#767676`
- `#ddd` (bordures) → `#eee`
- `#555` → `#666`, `#444` → `#333`, `#6b6b6b` → `#666`
- `stroke="#bbb"` sur SVGs décoratifs → `stroke="#f0f0f0"`
- `focus:border-[#ccc]` → `focus:border-[#767676]`
- `hover:border-[#bbb/ccc]` → `hover:border-[#eee]` ou `#767676` selon contexte

**Intouchable :** `#2E7D32`, `#c00`, `#8B6914`, `#f0ede8`, `#fef9e7`

Fichiers concernés : BackfillPage, ListPage, Search, BookPage, ProfilePage, ExplorePage, OnboardingPage, ChallengesPage, ContentMenu, Avatar (initiales).

---

## 23. Accessibilité clavier — focus-visible (WCAG 2.4.7)

**Statut :** Implémenté · MVP
**Portée :** `src/index.css`

### Ce qui a été fait

Extension de la règle CSS focus-visible pour couvrir tous les éléments interactifs :

```css
[role="button"]:focus-visible,
button:focus-visible,
a:focus-visible,
input:focus-visible,
textarea:focus-visible,
select:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: 4px;
}
:focus:not(:focus-visible) { outline: none; }
```

L'outline s'affiche à la navigation clavier, invisible au clic souris (UI propre).

---

## 24. Toast d'erreur pour les mutations

**Statut :** Implémenté · MVP
**Portée :** BookPage, ProfilePage, ExplorePage, FeedPage, CitationsPage, CreateListModal

### Ce qui a été fait

Feedback minimaliste quand une mutation réseau échoue (like, follow, création liste, publication citation).

**Architecture :**
- `src/components/Toast.jsx` — notification fixe centrée en bas, z-10000 (au-dessus des modals), fond `var(--text-primary)`, texte `var(--bg-primary)`, animation slide-up 180ms, auto-dismiss 3s
- `src/hooks/useToast.js` — hook `{ toast, showToast }`, timeout géré par ref (safe vis-à-vis des re-renders)
- `src/hooks/useLikes.js` — `toggle(targetId, onError?)` — paramètre optionnel
- `src/hooks/useFollow.js` — `follow(onError?)` / `unfollow(onError?)` — paramètre optionnel
- Toutes les pages passent `() => showToast("Une erreur est survenue")` comme `onError`

**Intégration :** `safeMutation` supportait déjà `onError` — aucun refactoring de la plomberie nécessaire.

---

## 25. Cohérence du fil d'activité — nettoyage et validation

**Statut :** Implémenté · MVP
**Portée :** `src/hooks/useActivity.js`, `src/hooks/useReadingStatus.js`, `src/hooks/useExplore.js`

### Problèmes corrigés

**Activité orpheline après suppression de contenu**
- `ContentMenu` (reviews/quotes) et `deleteList` (lists) supprimaient déjà l'entrée `activity` correspondante.
- Cas manquant : `useReadingStatus.setRating(0)` supprimait une review sans body (rating retiré) sans nettoyer l'activité. Corrigé.

**Filet de sécurité côté fil (`useFeed`)**
Après dédoublonnage, 3 requêtes parallèles vérifient que les reviews/quotes/lists référencées existent encore en base. Les entrées orphelines sont filtrées avant `setItems`. Les `reading_status` passent toujours (pas de contenu séparé à vérifier).

```
reviewIds → supabase.from("reviews").select("id").in(...)
quoteIds  → supabase.from("quotes").select("id").in(...)
listIds   → supabase.from("lists").select("id").in(...)
→ filter: target_type === "review" ? reviewSet.has(target_id) : ...
```

**Slugs manquants dans les sections populaires**
`usePopularReviews` et `usePopularQuotes` ne sélectionnaient pas `slug` dans le join `books(...)`. Résultat : navigation vers `/livre/{id}` au lieu de `/livre/{slug}`. Corrigé en ajoutant `slug` aux deux selects.

---

---

## Sprint Performance P1 — Avril 2026

**Statut :** ✅ Terminé

Série d'optimisations ciblées suite aux audits de performance (rapports `reports/audit-*.md`).

### P1-C : React.memo sur les composants en boucle
- `Img`, `LikeButton` enveloppés dans `memo()`
- `FeedItem`, `BookReviewItem`, `BookQuoteItem`, `ExploreReviewItem`, `ExploreQuoteItem` extraits comme composants memo'd avec props primitives
- `useLikes.toggle` stabilisé via `useCallback` + `likedSetRef` (pattern ref pour éviter que `memo` soit inutile)

### P1-D : RPC `popular_lists_with_covers`
- Remplace 3 requêtes séquentielles (listes + items + covers) par 1 seule RPC PostgreSQL avec sous-requête corrélée (`ARRAY(SELECT...)`)
- Migration : `supabase/migrations/011_popular_lists_rpc.sql`

### P1-E : Circuit breaker Google Books
- HTTP 429 → désactivation de l'API pendant 15 minutes (module-level `googleBooksDisabledUntil`)
- Skip reason `circuit_breaker` dans les analytics search
- Fichier : `src/lib/googleBooks.js`

### P1-F à P1-H : Migration complète vers TanStack Query
Tous les hooks de lecture et de mutation migrés vers `useQuery` / invalidation cross-cache.

**Hooks de lecture migrés :**
- `useProfileData` — `["profileData", userId]`
- `useBookBySlug` — `["book", slug]`
- `usePopularBooks/Reviews/Quotes/Lists` — `["popular*"]`
- `useAvailableGenres`, `useBooksByGenre` — `["availableGenres"]`, `["booksByGenre", genre]`
- `useMyReviews` — `["myReviews", userId]`
- `useMyLists` — `["myLists", userId]`
- `useFavorites` — `["favorites", userId]`
- `useMyQuotes` — `["myQuotes", userId]`
- `useFollowCounts` — `["followCounts", userId]`
- `useReadingList` — `["readingList", statusFilter, userId]`
- `useFeed` — `["feed"]`

**Mutations : invalidation cross-cache ajoutée :**
- `useLikes.toggle` → invalide `["popularReviews"]`, `["popularQuotes"]`, `["myReviews"]`, `["myQuotes"]`
- `useFollow.follow/unfollow` → invalide `["profileData"]`, `["followCounts"]`, `["feed"]`
- `useReadingStatus.setStatus/removeStatus` → invalide `["profileData"]`, `["popularBooks"]`, `["feed"]`
- `useUserRating.setRating` → invalide `["profileData"]`, `["myReviews"]`

**Config globale** (`src/main.jsx`) : `staleTime: 5min`, `gcTime: 30min`, `refetchOnWindowFocus: false`, `retry: 1`.

### Fixes associés
- `useUserRating` : `.single()` → `.maybeSingle()` (406 quand pas encore de note)
- `BookPage` livres similaires : `.contains("genres", [...])` → `.filter("genres", "cs", ...)` (400 JSONB)
- Edge functions CORS : accepte `*.vercel.app` pour les previews Vercel
- `smart-search` et `book_import` : `verify_jwt = false` (accessibles aux visiteurs non connectés)

---

## Retours bêta — Mars 2026

### B1. Couvertures manquantes — thème Manga

**Statut :** Post-bêta · Données
**Portée :** Google Books API, table `books`

Plusieurs livres du thème Manga (ex: Sakamoto Days tomes 15, 18, 23, 24) n'ont pas de `cover_url` et affichent le fallback texte. Problème de complétude des métadonnées Google Books sur les mangas/BD.

**Action envisagée :** enrichissement manuel ou fallback Open Library pour les livres sans cover dans les thèmes actifs.

**Ce qu'on ne fait PAS en v1 :** scraping automatique de couvertures tierces.

---

### B2. Couverture polluée — image e-commerce

**Statut :** Post-bêta · Données
**Portée :** Google Books API, pipeline d'import

Naruto Vol. 07 importe une capture d'écran e-commerce (prix, bouton "Add to cart") au lieu d'une vraie couverture. Problème de qualité à la source Google Books.

**Action envisagée :** ajouter une heuristique de détection dans le pipeline d'import — rejeter les images dont les dimensions sont atypiques (trop larges, ratio non 2:3) ou dont l'URL contient des signaux e-commerce.

---

### B3. Doublon dans les résultats de recherche

**Statut :** Post-bêta · Search
**Portée :** `src/hooks/useBookSearch.js`, pipeline de déduplication

La recherche "L'etranger" retourne un 3e résultat sans auteur ni couverture — probablement un doublon non dédupliqué issu d'une entrée incomplète en base ou d'un résultat Google Books dégradé.

**Action envisagée :** renforcer la déduplication par ISBN-13 puis par (titre normalisé + auteur normalisé) dans le scoring. Filtrer les résultats sans auteur ET sans cover.

**Ce qu'on ne fait PAS en v1 :** regroupement par "work" (toutes éditions confondues) — c'est un chantier v2.

---

### B4. Compteur "Listes" à 0 dans le Bilan

**Statut :** Post-bêta · Profil
**Portée :** `src/hooks/useProfileData.js`, onglet Bilan

Le Bilan affiche "0 Listes" même quand des listes existent. Le compteur est probablement basé sur les entrées `activity` de type `list` dans l'année, plutôt que sur le count réel des listes de l'utilisateur.

**Action envisagée :** aligner le compteur sur `SELECT count(*) FROM lists WHERE user_id = ? AND created_at >= yearStart`, indépendamment de l'activité.

---

### B5. Titres et couvertures non cliquables sur la page Citations

**Statut :** Post-bêta · UX
**Portée :** `src/pages/CitationsPage.jsx`

Sur `/citations`, les titres de livres et couvertures associés aux citations ne sont pas cliquables. L'utilisateur s'attend naturellement à pouvoir naviguer vers la fiche du livre.

**Action envisagée :** wrapper chaque titre et couverture dans un `<Link to={/livre/${quote.book.slug}}>`.

---

### B6. Fade-in trop lent au chargement du profil et du fil

**Statut :** Post-bêta · Performance / Polish
**Portée :** `src/components/Skeleton.jsx`, `.sk-fade`

Le contenu passe par un état très pâle pendant 2-3 secondes avant d'être pleinement lisible. La transition `.sk-fade` est trop longue.

**Action envisagée :** réduire la durée du fade-in de 200ms à 80-100ms, ou supprimer l'opacité initiale si le skeleton loading est déjà en place (pas besoin de double transition).

---

## 26. Dark mode

**Statut :** ✅ Complet — implémenté le 31 mars 2026
**Portée :** Toute l'app (index.css, composants, pages)

### Ce qui est implémenté

**Architecture CSS custom properties** (`src/index.css`) :
- `:root` définit les variables light, `[data-theme="dark"]` les override toutes
- Variables complètes : --bg-primary, --bg-surface, --bg-elevated, --text-primary, --text-secondary, --text-tertiary, --text-muted, --border-subtle, --border-default, --header-bg, --avatar-bg, --cover-fallback, --tag-bg, --tag-border, --tag-text, --focus-ring, --star-empty, --shadow-cover + toutes les variables sémantiques (--color-star, --color-spoiler, --color-success/bg, --color-error/bg/border, --color-warn-*/--color-wip-*)
- Les variables `@theme` Tailwind pointent vers les CSS vars → les classes utilitaires (`bg-surface`, `bg-cover-fallback`, etc.) switchent automatiquement

**Hook `useTheme()`** (`src/hooks/useTheme.js`) :
- `useState` initialisé depuis `localStorage('reliure-theme')`, défaut `'light'`
- `useEffect` applique `data-theme` sur `<html>` + persiste dans localStorage
- `toggleTheme()` toggle light/dark
- Appelé dans `App.jsx`, `theme` + `toggleTheme` passés à `Header`

**Bouton toggle** (`Header.jsx`) :
- Icône lune (light → dark) / soleil (dark → light), SVG 16×16
- Positionné entre la recherche et l'avatar
- `color: var(--text-tertiary)`, hover opacity 0.7
- `aria-label` : "Mode sombre" / "Mode clair"

**Migration complète — tous les fichiers JSX** :
Zéro hex hardcodé dans l'ensemble des composants et pages. Tous les fichiers utilisent `var(--xxx)` en inline style ou une classe Tailwind mappée sur une CSS var.

### Conventions établies

**Bouton inversé (CTA principal)** : `style={{ backgroundColor: "var(--text-primary)", color: "var(--bg-primary)" }}` + `hover:opacity-80`. Jamais de `bg-[#1a1a1a] text-white`.

**Track de barre de progression** : `bg-[var(--border-default)]` pour le fond vide — `bg-avatar-bg` est invisible en dark mode (même teinte que le fond de surface).

**Éléments intentionnellement stables** (pas de switch light/dark) :
- Couleurs de statut : `--color-star` (#D4883A), `--color-spoiler` (#e25555)
- Gradient étagère : `#c4a882` → `#a08462` (teinte bois, contexte décoratif)
- `JoinBanner` et `AnnouncementBanner` (fond `var(--text-primary)` — contraste inversé intentionnel)

### Ce qu'on ne fait PAS en v1
- Pas de `prefers-color-scheme` (toggle manuel uniquement pour la beta)
- Pas de thème par page ou par profil (toggle global uniquement)

---

## Enrichissement proactif de la base locale (Agent 5)

**Statut :** ✅ Fait — 93 livres importés via BnF+OL, 0 appel Google (mars 2026)
**Portée :** Scripts batch dans `scripts/`, rapports dans `reports/`

### Contexte

La base locale (~3737 livres) est la source primaire de recherche. Plus elle est complète, moins on dépend du quota Google Books (1000 req/jour). L'objectif : identifier les livres manquants les plus recherchés et les pré-importer.

### Pipeline réalisé

1. **Identification** (`scripts/identify-missing-books.mjs`) : liste curatée de ~200 livres FR incontournables (classiques, Goncourt, francophonie, mangas, essais) + extraction des queries `search_cache` sans résultat DB. Résultat : 118 livres manquants.
2. **Validation ISBN** (`scripts/validate-isbn.mjs`) : vérification de chaque ISBN via checksum + Open Library + BnF SRU. Leçon critique : 88% des ISBN générés par LLM étaient hallucités. Le script nullifie les ISBN invalides avec `--apply`.
3. **Résolution ISBN BnF** (`scripts/resolve-isbn-bnf.mjs`) : recherche BnF SRU par titre + auteur (CQL, UNIMARC zones 010/200/700), validation checksum ISBN-13, matching titre fuzzy (60% token overlap). Résultat : 84 ISBN résolus sur 107 (78,5%).
4. **Import batch** (`scripts/batch-import-missing.mjs`) : 3 modes (`--source edge|direct|google`). Mode `direct` = BnF + Open Library, 0 appel Google. Résultat : 93 livres importés, 0 erreur.

### Résultat

- Base passée de ~3737 à ~3830 livres
- 23 livres toujours sans ISBN (titres obscurs, classiques pré-ISBN, mangas très récents)
- Estimation : ~5-8% de recherches Google supplémentaires évitées grâce aux livres ajoutés

### Leçons

- **Ne jamais faire confiance aux ISBN générés par un LLM** — toujours valider via source externe (BnF, Open Library)
- **BnF SRU est excellente pour la résolution ISBN** (78,5% de taux) mais inutilisable en recherche libre temps réel (1,4s P50, pas de couvertures)
- **Open Library est inutilisable pour le catalogue FR** (1/10 recall sur les titres populaires FR, 5s+ de latence)

### Benchmark sources alternatives (détaillé dans `reports/alternative-sources-benchmark.md`)

| Source | Recall@3 | P50 latence | Couvertures | Verdict |
|--------|----------|-------------|-------------|---------|
| Google Books | 80% | 828ms | 83% | Reste primaire |
| BnF SRU | 70% | 1365ms | ~0% | Enrichissement async uniquement |
| Open Library | 53% | 4104ms | 42% | Inutilisable FR |

---

## Scripts d'enrichissement continu (seeds/)

**Statut :** Opérationnel — avril 2026
**Portée :** Qualité des données livres (couvertures, descriptions, métadonnées)

### Contexte

La base locale contient ~12 500 livres mais beaucoup ont des métadonnées incomplètes (~76% sans description, ~5% sans couverture). Plutôt que d'enrichir un par un, des scripts batch permettent de combler les trous en interrogeant Google Books et Open Library par titre+auteur.

### Scripts disponibles

| Script | Cible | Sources | Notes |
|--------|-------|---------|-------|
| `seeds/enrich-incomplete-books.js` | Livres avec ISBN mais sans cover/description | Edge function `book_import` | Repasse les livres dans le pipeline d'import standard |
| `seeds/recover-covers.js` | Livres sans `cover_url` | Google Books → Open Library | Recherche par titre+auteur, pas par ISBN |
| `seeds/recover-descriptions.js` | Livres sans `description` | Google Books → Open Library (work detail) | Seuil 50 chars, fallback OL via `/works/{key}.json` |
| `seeds/scrape-sc-list.js` | Listes SensCritique | Playwright (headless) | Scrape titres/auteurs, ISBN optionnel, merge |

### Conventions communes

- Tous utilisent `@supabase/supabase-js` + `node --env-file=.env`
- **Dry-run par défaut** (sans `--apply` = aperçu uniquement)
- Options : `--limit N`, `--offset N` (pour reprendre le lendemain après quota)
- Détection auto du quota Google Books (HTTP 429 → bascule Open Library uniquement)
- Warning à 900 appels Google (quota 1000/jour)
- Nettoyage titre partagé : suppression suffixes parasites "(French Edition)", sous-titres après ":", séries "(Naruto, #27)", nom d'auteur en fin de titre

### Ce qu'on ne fait PAS

- Pas d'enrichissement automatique déclenché par l'app (toujours manuel via scripts)
- Pas de scraping Google Books (API uniquement, respect ToS)
- Pas de réécriture des données existantes (UPDATE uniquement si le champ est NULL)

---

---

## 27. Gamification — Badge créateur (bêta)

**Statut :** ✅ Implémenté — 1 avril 2026
**Portée :** Profil + critiques/citations dans toutes les pages

### Ce qui est implémenté

Système de badges extensible avec un premier badge "Créateur" réservé aux utilisateurs bêta fondateurs.

**Infrastructure DB** (`supabase/migrations/017_creator_badge.sql`) :
- `badge_definitions` : table de référence des badges (id text PK, name, description, category enum, color, icon)
- `user_badges` : table de jonction user_id × badge_id, avec awarded_at et awarded_by
- `reserved_usernames` : table de pseudos réservés (username + email optionnel) avec RPCs d'attribution :
  - `check_username_availability(p_username, p_email)` → `'available' | 'reserved_for_you' | 'reserved' | 'taken'`
  - `claim_reserved_username(p_username)` (SECURITY DEFINER) — supprime la réservation à l'inscription

**Composants** :
- `src/components/CreatorBadge.jsx` — pill "✦ Créateur" (11px, CSS vars `--creator-bg/text/border`, dark mode ready)
- `src/components/UserName.jsx` — lien `@handle` avec prop `isCreator` → affiche `<CreatorBadge />` à la suite

**Hooks** :
- `src/hooks/useUserBadges.js` — `useUserBadges(userId)` → `{ badges, hasCreator, loading }` ; `useCreatorIds()` → `Set` de tous les IDs avec badge creator (query globale partagée, staleTime 10min, limite 500)

**Intégration UI** :
- ProfilePage : `<CreatorBadge />` à côté du `@username` dans le header profil
- BookPage, ExplorePage, FeedPage, CitationsPage : `creatorIds = useCreatorIds()` → `<UserName isCreator={creatorIds.has(item.user_id)} />` sur toutes les listes de critiques et citations

**Attribution** : script Node.js `scripts/award-creator-badge.js` — usage `node --env-file=.env scripts/award-creator-badge.js --username <pseudo>` (ou `--email`). Option `--dry-run`. Nécessite `SUPABASE_SERVICE_KEY`.

### Ce qu'on ne fait PAS encore

- Pas de page badges sur le profil (le badge est juste inline à côté du username)
- Pas d'autres badges (contributeur, challenge complété) — infrastructure prête, badges à définir
- Pas d'attribution automatique (toujours manuelle via script)
- Pas de notification au user lors de l'attribution

---

---

## 28. Gamification complète (badges, points, niveaux, classement)

**Statut :** ✅ Implémenté — 2 avril 2026
**Portée :** Profil + BadgesPage + ClassementPage + infra DB

### Ce qui est implémenté

**Infrastructure DB** (migrations 012–021) :
- `badge_definitions` : catalogue de badges (catégories : lecture, contribution, social, défis, spécial). Points par badge, sort_order, emoji/icône, description courte.
- `user_badges` : badges débloqués par user. `is_pinned` (bool), max 3 épinglés — contrainte via trigger (migration 019).
- `user_points` : total dénormalisé + level par user.
- `point_events` : log immuable de chaque action (book_read, review_written, quote_saved, like_received, follow_received, badge_earned). Lecture owner-only (RLS).
- RPCs : `get_monthly_ranking()` (points du mois en cours), `get_alltime_ranking()` (total points + level). Accessible anon + authenticated.
- pg_cron : reset des points mensuels à minuit le 1er de chaque mois (migration 016).

**Composants** :
- `BadgeIcon` (`src/components/BadgeIcon.jsx`) : rendu d'un badge avec forme (cercle, hexagone, bouclier, diamant via clip-path), couleur de fond par tier, bordure colorée. Double-layer div pour les shapes clip-path (contournement limitation CSS border+clip-path).
- `PinnedBadgesInline` (`src/components/PinnedBadgesInline.jsx`) : rangée de 3 slots de badges épinglés sur le profil public. Cliquable → ouvre BadgesPage.
- `Tooltip` : stratégie `absolute` par défaut, `strategy="fixed"` pour les contextes modaux (getBoundingClientRect). Évite le clipping par overflow.

**Pages** :
- `BadgesPage` (`src/pages/BadgesPage.jsx`) : modal complet sur le profil. Sections : "Badges épinglés" (3 slots cliquables) + grille de tous les badges par catégorie (débloqués en couleur, verrouillés grisés avec cadenas). En mode sélection (depuis les slots épinglés), click badge → swap. Tooltips `strategy="fixed"` pour tous les badges dans le modal. Bouton × de fermeture.
- `ClassementPage` (`/classement`) : onglets Mensuel / Tout temps. Rows avec rang, avatar, username, points + compteurs critiques/citations. Mise en avant du rang de l'user connecté (s'il est dans le top 100).

**Attribution** : script `scripts/award-creator-badge.js` (badge créateur initial, manuel). L'attribution automatique par triggers Supabase est prévue pour les futures catégories.

### Ce qu'on ne fait PAS encore
- Pas d'attribution automatique en temps réel via triggers DB (prochaine étape)
- Pas de notification à l'utilisateur lors de l'attribution
- Pas de badges challenge (infrastructure prête, badges à définir quand les Défis seront actifs)
- Pas d'animations de déverrouillage (toast ou confetti lors de l'obtention)

---

## 29. Sélections curées ("La Bibliothèque de...")

**Statut :** ✅ Implémenté — 2 avril 2026
**Portée :** `/selections`, BookPage, Explorer, La Revue

### Ce qui est implémenté

**Format éditorial** : une personnalité littéraire invitée partage sa bibliothèque idéale — livres choisis + commentaire sur chaque livre (note en Geist regular, guillemets en Instrument Serif italic).

**Infrastructure DB** (migration `supabase/migrations/018_curated_selections.sql`) :
- Colonnes ajoutées à `lists` : `is_curated` (bool), `curator_name`, `curator_role`, `curator_avatar_url`, `curator_intro`, `curator_pull_quote`, `published_at`.
- `user_id` = compte admin Reliure (contenu créé éditorialement, pas par les users).
- Index `lists_curated_idx` sur `(is_curated, published_at desc)`.
- RPC `curated_selections()` : index complet (id, slug, curator_*, likes_count, book_count, covers jsonb).
- RPC `curated_selection_by_slug(p_slug)` : détail avec `items jsonb` (position, note, book_id, title, authors, cover_url, slug, publication_date, page_count).

**Hooks** : `useCuratedSelections()` et `useCuratedSelection(slug)` (TanStack Query, staleTime 10min).

**Pages** :
- `/selections` (`SelectionsPage`) : sélection featured (la plus récente) + grille de cards compact.
- `/selections/:slug` (`SelectionPage`) : page éditoriale complète — breadcrumb, header (Label + "La Bibliothèque de" + nom curateur + rôle), portrait (maxHeight 280px), pull quote (guillemets Instrument Serif, texte Geist), intro multi-paragraphes, liste numérotée de livres avec note du curateur, footer (date + LikeButton), carousel "Autres sélections".

**Intégration** :
- `ExplorePage` : section "Sélections" avec HScroll de cards compact.
- `JournalPage` (onglet Textes) : card `featured` après l'article principal.
- `BookPage` : encart "Sélection" avant "Dans des listes" si le livre appartient à une sélection curée. Query `["bookCuratedSelections", bookId]`.

**Seed** : `scripts/seed-curated-selection.js` — seed la première sélection (à lancer avec `--apply`).

### Conventions éditoriales
- Notes des items : guillemets « » en Instrument Serif italic, corps en Geist regular. Border-left 2px.
- Pull quote curateur : même traitement hybride.
- Likes via `useLikes` existant (`target_type='list'`).

---

## 30. Réponses aux critiques dans le fil

**Statut :** ✅ Implémenté — avril 2026
**Portée :** FeedPage, BookPage, table `review_replies`

### Ce qui est implémenté

**Migration `026_review_replies.sql`** :
- Table `review_replies` (id, review_id, user_id, body 1-2000 chars, likes_count, created_at)
- Colonne `reviews.reply_count` (int, maintenu par trigger `reply_count_trigger`)
- Enums étendus : `activity_type` + 'reply', `likeable_type` + 'reply'
- `update_likes_count()` étendu pour target_type='reply'
- Trigger `trg_notify_review_reply` → notification type 'reply' (SECURITY DEFINER, via `create_notification`)
- Trigger `trg_log_reply_activity` → activité type 'reply' avec metadata book/cover/reply_preview
- RPC `get_review_replies(p_review_id, p_limit)` → jointure users
- RLS : lecture publique, INSERT/UPDATE/DELETE owner only

**Hook `useReviewReplies(reviewId)`** :
- TanStack Query `["reviewReplies", reviewId]`, staleTime 2min
- `submitReply(body)`, `deleteReply(replyId)` (+ nettoyage activité), `refetch`
- Invalidation cross-cache : book, feed, popularReviews, myReviews

**Composant `ReviewReplies`** (`src/components/ReviewReplies.jsx`) :
- Replié par défaut ("Voir les X réponses"), lien "Répondre" toujours visible
- Formulaire inline : textarea + Cmd+Entrée + Escape, avatar Reliure (useProfile)
- Chaque réponse : Avatar + UserName (badge creator) + timestamp + LikeButton + "Supprimer" inline
- Intégré dans BookPage (sous chaque critique) et FeedPage (sous chaque critique)
- Non-connecté → onRequireLogin (LoginModal sur BookPage, redirect /login sur FeedPage)

**Fil d'activité** :
- Type 'reply' affiché : "[Username] a répondu à une critique de [Titre]" + preview blockquote + mini cover
- `useFeed` enrichit les reviews avec `reply_count` frais de la DB
- Filet de sécurité étendu pour vérifier l'existence des `review_replies`

### Ce qu'on ne fait PAS en v1
- Pas de réponse à une réponse (1 seul niveau d'imbrication)
- Pas de mentions @utilisateur
- Pas de rich text
- Pas d'édition d'une réponse (juste suppression)

---

## 31. Notifications in-app

**Statut :** ✅ Fonctionnel — voir entrée #8 pour le détail complet (migration 025 + UI avril 2026)
**Portée :** Header, table `notifications`, Supabase Realtime

Entrée consolidée dans **#8. Notifications**. Migration DB complète + UI in-app (NotificationBell, NotificationPanel, useNotifications, notificationHelpers) implémentées en avril 2026.

### Ce qu'on ne fait PAS en v1
- Pas de notifications push (mobile ou web push) — in-app uniquement
- Pas d'email de notification (digest hebdo en v2)
- Pas de préférences de notification granulaires (v3)

---

## 32. App native iOS / Android

**Statut :** Post-bêta · Acquisition
**Portée :** Nouveau projet React Native / Expo

### Le concept
Une app native Reliure disponible sur l'App Store et le Google Play Store, après validation de la bêta web. La PWA est la priorité immédiate ; l'app native est la v2 si la demande est confirmée.

### Pourquoi c'est fort
- L'App Store est un canal d'acquisition organique majeur pour la cible (même profil utilisateur que Gleeph, dont 50%+ des users ont moins de 24 ans)
- Les notifications push natives sont le levier de rétention le plus puissant
- Le scan de code-barres (feature v2 déjà au backlog) est nativement accessible sur mobile
- Gleeph a prouvé que le mobile-first fonctionne sur ce marché

### Implémentation envisagée
- Stack : React Native + Expo (réutilisation maximale de la logique React existante)
- Supabase JS SDK compatible React Native
- Design system porté tel quel (CSS vars → StyleSheet)
- Features natives prioritaires : notifications push, scan code-barres (ISBN), accès galerie photo (feature "Scanne ta bibliothèque")
- PWA d'abord pour valider l'usage mobile avant d'investir dans l'app native

### Ce qu'on ne fait PAS en v1 native
- Pas de refonte UX spécifique mobile (adapter le web, pas repartir de zéro)
- Pas d'app séparée iOS / Android (Expo universal app)

---

## 33. "Scanne ta bibliothèque" — import par photo

**Statut :** Post-bêta · Onboarding
**Portée :** Nouvelle edge function `scan-bookshelf`, OnboardingPage, ProfilePage (backfill)

### Le concept
L'utilisateur prend une photo de son étagère (ou plusieurs) → l'IA détecte les titres et auteurs visibles sur les tranches → propose une liste de livres à confirmer → les ajoute en masse à la bibliothèque Reliure avec le statut "Lu".

C'est le moyen le plus rapide de résoudre le problème de la bibliothèque vide à l'onboarding. Une photo d'étagère = potentiellement 20-50 livres importés en 30 secondes.

### Pourquoi c'est fort
- Élimine la friction d'onboarding la plus importante (saisir ses lectures passées une par une)
- Feature virale : les gens photographient leurs étagères et partagent le résultat
- Différenciation forte vs Babelio (saisie manuelle) et The StoryGraph (import CSV Goodreads seulement)
- Gleeph fait le scan code-barres (un livre à la fois) — on fait l'étagère entière

### Implémentation envisagée

**Edge function `scan-bookshelf`** :
- Reçoit une image base64 (JPEG/PNG, max 5 Mo)
- Appelle Claude Vision (`claude-sonnet-4-5-20251022`) avec un prompt spécialisé : extraire tous les titres et auteurs lisibles sur les tranches de livres
- Retourne `{ books: [{ title, author, confidence }] }` — confidence entre 0 et 1
- Pour chaque livre détecté : recherche dans la base locale via `search_books_v2`, puis Google Books si absent
- Retourne la liste enrichie avec `dbMatch` (livre trouvé en base) ou `googleMatch` (à importer)

**UI** :
- Bouton "📷 Scanner mon étagère" sur la page backfill (`/backfill`) et dans l'onboarding (étape 3)
- Upload photo ou capture caméra (sur mobile)
- État "Analyse en cours..." avec skeleton
- Résultats : liste de livres détectés avec couverture, titre, auteur + checkbox cochée par défaut
- Livres à faible confidence (< 0.6) affichés en dernier avec warning "À vérifier"
- Bouton "Ajouter X livres à ma bibliothèque" → import en masse avec `status = 'read'`

### Ce qu'on ne fait PAS en v1
- Pas de détection des notes de lecture visibles sur les pages
- Pas d'import automatique sans confirmation utilisateur (toujours une étape de validation)
- Pas de traitement de plusieurs photos simultanées (une photo à la fois)
- Pas disponible pour les visiteurs non connectés

---

---

## 34. Explorer — Sections éditoriales Babelio + Sélections

**Statut :** ✅ Implémenté — 2 avril 2026
**Portée :** `src/pages/ExplorePage.jsx` + `src/hooks/useExplore.js`

### Ce qui est implémenté

**"Plébiscités par les lecteurs francophones"** : remplace l'ancienne section "Populaires cette semaine" (basée sur RPC `popular_books_week` qui manquait de données au bêta). La nouvelle section s'appuie sur la colonne `babelio_popular_year integer[]` populée via `seeds/seed-babelio-popular.mjs` depuis les classements annuels Babelio.

- Hook `useBabelioPopular()` : query `books WHERE babelio_popular_year IS NOT NULL ORDER BY avg_rating DESC LIMIT 10`, queryKey `["babelioPopular"]`, staleTime 30min
- Badge `×N ans` sur les livres présents dans plusieurs années de classements (`babelio_popular_year.length > 1`)
- Sublabel "Sélection d'après les classements Babelio"

**Sélections curées remontées** : le carousel `CuratedSelectionCard` est maintenant placé juste **avant** les critiques populaires (était après le skeleton des listes). Donne plus de visibilité aux sélections éditoriales dès le premier scroll.

**Ordre final des sections Explorer** :
1. Hero visiteurs (si non connecté) + barre de recherche + thèmes
2. Plébiscités par les lecteurs francophones (Babelio)
3. Sélections
4. Critiques populaires
5. Citations populaires
6. Top contributeurs
7. Listes populaires

### Colonnes DB

- `books.babelio_popular_year integer[]` — ajoutée via `schema.sql` (ALTER TABLE). Tableau des années où le livre figure dans les classements Babelio (ex : `[2024, 2025]`). Null = pas dans les classements.

---

## 35. Prerendering & SEO — React Router v7 Framework Mode

**Statut :** ✅ Fait (avril 2026)
**Portée :** Infrastructure build/déploiement — impact SEO sur toutes les pages publiques

### Ce qui a été fait

Migration de la SPA pure vers **React Router v7 Framework Mode** (`ssr: false` + `prerender()`). Le build génère du HTML statique pour toutes les pages publiques.

**Architecture :**
- `react-router.config.ts` : config prerender, fetch des ~1000 slugs livres + usernames depuis Supabase au build
- `src/root.tsx` : nouveau shell HTML + providers (remplace `index.html` + `main.jsx` + `App.jsx`)
- `src/routes.ts` : config déclarative des routes
- Pattern `loader` (build-time, Node) + `clientLoader` (browser, singleton Supabase) sur BookPageRoute et ProfilePageRoute
- Pas de `clientLoader.hydrate = true` (cassait les meta tags en rendant les données async)

**SEO livré :**
- `<title>`, `og:*`, `twitter:*` corrects dans le HTML prérendu
- `schema.org/Book` JSON-LD sur les fiches livres
- `sitemap.xml` généré post-build (`scripts/generate-sitemap.mjs`, ~1026 URLs)
- `robots.txt` copié automatiquement dans `build/client/`
- SPA fallback `__spa-fallback.html` pour les pages protégées et le contenu nouveau post-deploy

**Vercel :**
- `outputDirectory: build/client`, rewrite SPA vers `__spa-fallback.html`
- Cache immutable sur `/assets/`, `trailingSlash: false`
- Build time ~5 min (prerendering ~1000 pages)

**Fixes réalisés pendant la migration :**
- `parseAuthors()` gère `authors` comme array OU JSON string (Supabase JSONB)
- Singleton Supabase dans `clientLoader` (évite Multiple GoTrueClient warning)
- `data-theme` sur `<html>` via inline script (évite hydration mismatch)
- Google Fonts en non-bloquant (`rel="preload" as="style" onLoad={fn}`)

---

## 36. Intégration Electre NG API

**Statut :** ✅ Fait (avril 2026)
**Portée :** Data pipeline — source de métadonnées #1 pour les livres francophones

### Ce qui a été fait

Electre NG est désormais la **source de référence prioritaire** dans le pipeline d'import. Appelé en parallèle avec Google, OL, BnF et MetasBooks dans `book_import`.

**Infrastructure :**
- Migration `027_electre_integration.sql` : 6 colonnes sur `books` (`electre_notice_id`, `oeuvre_id`, `collection_name`, `flag_fiction`, `quatrieme_de_couverture`, `disponibilite`) + index
- `supabase/functions/electre-proxy/index.ts` : edge function proxy pour appels batch (OAuth2 password flow, token cache module-level)
- `fetchElectre()` direct dans `book_import` (pas de hop réseau via proxy) avec cache token
- `parseElectreNotice()` : extraction des champs Electre vers BookMeta

**Priorités de fusion (Electre first) :**
- `title` : Electre > BnF > Google > OL
- `authors` : Electre > Google > BnF > OL
- `publisher` : Electre > BnF > OL > Google
- `cover_url` : Electre > Google (zoom 2) > OL
- `description` : Electre (résumé/4ème couv) > Google > OL

**Batch enrichissement :** `scripts/enrich-from-electre.mjs` (dry-run par défaut, `--apply`, batches de 100 EANs, ne remplit que les champs NULL)

**Onglet Éditions (BookPage) :** query `books.eq('oeuvre_id', currentBook.oeuvre_id)` — grille de couvertures cliquables avec éditeur et année. Fallback message si pas d'oeuvre_id.

---

## 37. Optimisation recherche et prerendering

**Statut :** ✅ Fait (avril 2026)
**Portée :** Performance build + runtime recherche

### Prerendering sélectif (react-router.config.ts + generate-sitemap.mjs)
- Seuls les **top 1000 livres actifs** (`rating_count > 0`, triés DESC) sont prerendus au build
- Sitemap aligné sur la même logique
- Les autres livres restent accessibles via le SPA fallback `__spa-fallback.html`
- Réduit significativement le temps de build

### search_books_v2 — colonnes STORED (migration 028)
- Ajout de `norm_title` et `norm_authors` comme colonnes `GENERATED ALWAYS STORED` sur `books`
- Index trigram GIN (`gin_trgm_ops`) sur les deux colonnes
- Suppression du CTE `norm` qui recalculait la normalisation pour chaque ligne à chaque appel (full scan ~3s sur 30K livres)
- La RPC lit directement les colonnes stockées — scoring et matching inchangés
- SELECT final étendu avec les 6 colonnes Electre + `norm_title`/`norm_authors`

### CORS centralisé
- `supabase/functions/_shared/cors.ts` : fallback `reliure.page` + `www.reliure.page` + `localhost:5173`
- Les 7 edge functions importent `getCorsHeaders` depuis ce fichier unique

### Auth guard import IA (Search.jsx)
- `handleAIBookClick` vérifie `useAuth()` avant tout import
- Si non connecté : message "Connectez-vous pour ajouter ce livre à Reliure" avec lien login
- Plus de retry silencieux sur 401

---

## 38. Boussole — Découverte par ambiance et intrigue

**Statut :** ✅ Implémenté — 5 avril 2026
**Portée :** `/explorer/boussole` + table `book_facets` + tagging IA

### Ce qui est implémenté

**Table `book_facets`** (migration antérieure) :
- `book_id` (FK), `moods` (text[]), `rythme`, `registre`, `protag_age`, `protag_genre`, `intrigues` (text[])
- Valeurs validées : moods (contemplatif, mélancolique, joyeux, sombre, drôle, poétique, intense, relaxant), rythme (lent, moyen, rapide), registre (léger, sérieux, les_deux), protag_age (enfant, ado, adulte, senior, mixte), protag_genre (femme, homme, non_binaire, mixte, absent), intrigues (amour, amitié, famille, deuil, identité, voyage, enquête, guerre, nature, politique, rédemption, survie)
- RPC `search_boussole(p_moods, p_rythme, p_registre, p_protag_age, p_protag_genre, p_intrigues, p_limit, p_offset)` — opérateurs d'overlap `&&` pour les arrays, filtres optionnels

**Tagging IA automatique (`scripts/tag-book-facets.mjs`)** :
- Script batch : livres fiction avec description ≥ 50 chars, pas encore dans `book_facets`
- Pagination 1000 lignes / page pour dépasser la limite Supabase
- Claude Haiku : prompt structuré → JSON validé → upsert `book_facets`
- Dry-run par défaut, `--apply` pour exécuter, `--limit N` pour tester

**Tagging fire-and-forget dans `book_import`** :
- Après chaque upsert de livre avec `flag_fiction = true` et description ≥ 50 chars
- Vérifie l'absence dans `book_facets` avant d'appeler Haiku
- `.catch(e => console.error(...))` — ne bloque pas la réponse

**Hook `useBoussole(filters)`** (`src/hooks/useBoussole.js`) :
- TanStack Query `["boussole", ...filterValues]`, staleTime 5min
- `enabled: !!hasAnyFilter` (strict boolean TanStack Query v5)
- Normalise les résultats RPC en objets `{ id, t, a, c, slug }`

**Page `BoussolePage`** (`src/pages/BoussolePage.jsx`) :
- 2 onglets : "Ambiance" (moods + rythme + registre) et "Personnage & Intrigue" (protag_age, protag_genre, intrigues)
- Filtres partagés entre les deux onglets (état unique au niveau page)
- Moods : max 3 sélectionnables, Intrigues : max 2
- État vide : 6 raccourcis thématiques ("Un roman mélancolique", "Quelque chose d'intense"...)
- Grille de résultats avec animation staggered `boussoleCardIn` (60ms par carte)
- SEO : `meta()` export, prerendering ajouté dans `react-router.config.ts`
- Sitemap : `{ loc: "/explorer/boussole", priority: "0.6", changefreq: "weekly" }`

**CTA sur ExplorePage** :
- Card cliquable `→ /explorer/boussole` entre la barre de recherche et les thèmes
- "Quel livre pour toi en ce moment ? / Trouve par ambiance, intrigue, personnage"

---

*Dernière mise à jour : 5 avril 2026 — Entrées 15, 38 : Recommandations IA "Tu pourrais aimer" (Phase 1+2+polish), Boussole (découverte par facets), tagging facets fire-and-forget*
