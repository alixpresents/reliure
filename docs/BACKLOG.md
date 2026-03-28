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

*Dernière mise à jour : 28 mars 2026*
