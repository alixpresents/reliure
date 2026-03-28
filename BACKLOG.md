# Reliure — Backlog produit

> Idées de features collectées au fil des conversations. Chaque entrée documente le concept, le pourquoi, et les grandes lignes de l'implémentation envisagée.

---

## 1. Challenges de lecture

**Statut :** Idée · Priorité à définir
**Inspiré de :** Challenges annuels sur les forums Babelio (ex : Challenge Multi-Défis 2026)
**Portée :** Nouvelle section majeure (onglet nav)

### Le concept

Un challenge est une liste de contraintes de lecture créatives, organisée par la communauté, avec une durée définie (typiquement annuelle). Les participants s'inscrivent, choisissent un palier de difficulté, et complètent les items au fil du temps en liant leurs lectures + critiques.

### Exemples d'items (tirés du Challenge Multi-Défis Babelio 2026)

- Item JOKER : Le roman de mon choix
- Item 100% FÉMININ : Le roman de cette autrice est traduit par une femme
- Item JO 2026 : Un·e auteur·ice italien·ne
- Item VENDETTA : La vengeance est le fil rouge de ce livre
- Item COLUMBO : Un des 100 meilleurs polars depuis 1945 d'après le Sunday Times
- Item CIAO L'ARTISTE : Un·e auteur·ice décédé·e
- Item BOTTE DE PAILLE : L'action se déroule exclusivement en milieu rural
- Item IONESCO : Une pièce de théâtre
- Item ACTION ! : Ce roman a été adapté en film, téléfilm ou série TV
- Item POILU : La Première Guerre mondiale est le contexte de ce livre

Le challenge analysé compte ~100 items et ~230 participants, avec un système de paliers nommés d'après des oiseaux (Coucou, Moineau, Mésange, Tourterelle, Merle, Hirondelle, Pie, Alouette, Rossignol — du plus facile au plus exigeant).

### Pourquoi c'est fort pour Reliure

- **Engagement long terme** : un challenge annuel maintient les utilisateurs actifs toute l'année
- **Découverte de livres** : voir ce que les autres participants ont lu pour chaque item est un moteur de découverte organique
- **Communauté** : le rôle de modérateur crée des leaders communautaires investis
- **Acquisition** : les pages challenges publiques sont un excellent contenu SEO (requêtes type "challenge lecture 2027", "défi littéraire")
- **Rétention** : le badge profil récompense la complétion et donne envie de recommencer l'année suivante
- **Différenciation** : ni The StoryGraph ni Gleeph ne proposent ça de manière native

### Système de paliers

Chaque challenge définit ses propres paliers avec un nombre d'items requis. Le créateur nomme et configure les seuils librement.

Exemple (Multi-Défis 2026) :
| Palier | Items requis | Points |
|---|---|---|
| Coucou | ~10 | Facile |
| Moineau | ~20 | |
| Mésange | ~30 | |
| Tourterelle | ~40 | Moyen |
| Merle | ~50 | |
| Hirondelle | ~60 | |
| Pie | ~70 | Difficile |
| Alouette | ~80 | |
| Rossignol | ~90+ | |

Le palier visé est choisi à l'inscription. Le palier atteint est calculé en temps réel.

### Rôles

- **Créateur** : crée le challenge, définit les paliers, les règles générales, la durée
- **Modérateurs** : un ou plusieurs par item, rédigent la contrainte, valident les soumissions contestées, répondent aux questions des participants
- **Participants** : s'inscrivent, choisissent un palier, soumettent leurs lectures

### Mécanique de validation

1. Le participant lit un livre et poste sa critique sur Reliure (flux normal)
2. Il associe cette lecture à un item du challenge
3. L'association est visible par tous les participants
4. En cas de contestation, le modérateur de l'item tranche
5. Quand le nombre d'items validés atteint le palier visé → badge débloqué

### Badge profil

- Badge officiel affiché sur le profil public, dans une section dédiée
- Design spécifique par challenge (le créateur peut choisir un visuel)
- Mentionne le palier atteint et l'année
- Pas de gamification excessive : un badge sobre et élégant, cohérent avec l'identité Reliure

### Page challenge — structure envisagée

- **En-tête** : titre, description, durée, créateur, nombre de participants, paliers
- **Ma progression** : barre de progression vers le palier visé, items complétés / restants
- **Liste des items** : chaque item affiche la contrainte, le(s) modérateur(s), le nombre de réponses, et les couvertures des livres soumis par les participants
- **Classement** (optionnel, activable par le créateur) : participants triés par nombre d'items complétés
- **Fil d'activité du challenge** : dernières soumissions en temps réel

### Interactions avec le reste de Reliure

- Les critiques liées à un challenge apparaissent dans le fil d'activité avec un tag challenge
- Les livres découverts via un challenge peuvent être ajoutés à une liste ou à la PAL
- Le bilan annuel intègre les challenges complétés
- La page Explorer peut mettre en avant les challenges actifs

### Tables envisagées

```
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
```

### Ce qu'on ne fait PAS en v1

- Pas de création de challenge par n'importe quel utilisateur (modération éditoriale d'abord, ouverture progressive)
- Pas de système de points complexe (un item = un item, pas de pondération)
- Pas de challenges en équipe
- Pas de récompenses monétaires ou partenariats éditeurs (v2)
- Pas de suggestions automatiques de livres par item (v2, mais c'est une killer feature potentielle)

### Questions ouvertes

- Faut-il limiter le nombre de challenges actifs simultanément par utilisateur ?
- Un livre peut-il être utilisé pour plusieurs items du même challenge ?
- Le créateur peut-il modifier les items après le lancement du challenge ?
- Quelle modération pour les challenges publics créés par la communauté ?

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

*Dernière mise à jour : 28 mars 2026*
