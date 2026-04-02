# Reliure — Système de gamification

> Points, badges, défis, classement : rendre la lecture ludique sans trahir l'identité éditoriale de Reliure.

---

## Philosophie

Reliure n'est pas Duolingo. La gamification doit rester **sobre, élégante, et au service de la lecture** — jamais infantilisante. On récompense la contribution authentique (écrire une belle critique, enrichir une fiche, partager une citation), pas le grind mécanique.

Trois piliers :

1. **Points (« Encre »)** — monnaie interne qui récompense chaque contribution
2. **Badges** — jalons visuels affichés sur le profil, source de fierté
3. **Classement contributeur** — visibilité communautaire pour les membres les plus actifs

Ces trois systèmes sont interconnectés mais indépendants : on peut avoir des badges sans être dans le classement, et des points sans badge.

---

## 1. Système de points — « Encre »

### Pourquoi « Encre »

Le nom doit coller à l'univers littéraire. Pas de "XP", pas de "coins". L'**encre** est la matière première du livre. « Tu as gagné 15 encres » sonne bien en français, c'est concret, c'est poétique sans être précieux.

Alternative envisagée : "Pages" (mais conflit sémantique avec le nombre de pages des livres).

### Barème

Chaque action sur Reliure génère des points. Le barème est calibré pour récompenser les contributions qui enrichissent la communauté, pas les gestes mécaniques.

#### Actions de lecture (faible valeur — geste personnel)

| Action | Encre | Condition |
|--------|-------|-----------|
| Marquer un livre "Lu" | 2 | — |
| Marquer un livre "En cours" | 1 | — |
| Marquer un livre "À lire" | 1 | — |
| Finir un livre (avec date) | 3 | `finished_at` renseigné |

#### Contributions communautaires (haute valeur — enrichit les autres)

| Action | Encre | Condition |
|--------|-------|-----------|
| Écrire une critique | 10 | Minimum 50 caractères |
| Écrire une critique longue | 20 | 500+ caractères |
| Poster une citation | 5 | — |
| Créer une liste publique | 8 | Au moins 3 livres |
| Ajouter un livre à une liste existante | 1 | Max 10 encre/jour par liste |
| Corriger une fiche livre | 5 | Contribution acceptée (post-bêta) |
| Corriger une couverture manquante | 8 | Upload vérifié |
| Signaler une erreur confirmée | 3 | — |

#### Actions sociales (valeur moyenne — anime la communauté)

| Action | Encre | Condition |
|--------|-------|-----------|
| Recevoir un like sur une critique | 2 | Max 50 encre/jour (anti-ring) |
| Recevoir un like sur une citation | 1 | Max 30 encre/jour |
| Recevoir un like sur une liste | 1 | Max 30 encre/jour |
| Être suivi par un nouvel utilisateur | 1 | Max 20 encre/jour |

#### Défis (bonus)

| Action | Encre | Condition |
|--------|-------|-----------|
| S'inscrire à un défi | 5 | — |
| Valider un item de défi | 5 | Soumission acceptée |
| Atteindre un palier | 15–50 | Selon difficulté du palier |
| Compléter un défi (palier max) | 100 | — |

### Anti-triche et plafonds

- **Plafonds journaliers** sur les actions passives (likes reçus, follows reçus) pour éviter les bots et les rings de likes
- **Pas de points pour les likes donnés** (sinon spam de likes)
- **Pas de points pour "À lire" au-delà de 5/jour** (sinon PAL gonflée artificiellement)
- **Critiques de moins de 50 caractères** = 0 encre (pas de "bien", "ok", "nul")
- **Suppression d'une contribution** = récupération des points (pas de post-and-delete)
- **Comptes < 24h** : points en attente 24h avant comptabilisation (anti-spam inscription)

### Niveaux de lecteur

Les points cumulés débloquent des niveaux. Chaque niveau a un nom littéraire et un seuil. Les niveaux sont affichés sur le profil à côté du nom.

| Niveau | Seuil (encre cumulée) | Nom |
|--------|----------------------|-----|
| 1 | 0 | Curieux |
| 2 | 50 | Lecteur |
| 3 | 150 | Bibliophile |
| 4 | 400 | Passeur |
| 5 | 800 | Plume |
| 6 | 1 500 | Critique |
| 7 | 3 000 | Érudit |
| 8 | 6 000 | Lettré |
| 9 | 12 000 | Encyclopédiste |
| 10 | 25 000 | Immortel |

Le niveau est visible sur le profil sous forme d'un petit badge texte discret sous le nom (comme le badge admin/modérateur existant). Pas de barre de progression XP visible en permanence — on peut afficher la progression vers le prochain niveau dans les paramètres ou sur la page profil uniquement.

---

## 2. Badges

### Catégories

Les badges sont organisés en 5 familles, chacune avec son identité visuelle.

#### A. Badges de lecture (icône : livre ouvert)

| Badge | Condition | Paliers |
|-------|-----------|---------|
| Première lecture | 1 livre marqué "Lu" | — |
| Dévoreur | X livres lus | 10 → 25 → 50 → 100 → 250 → 500 |
| Marathonien | X livres lus en un an civil | 12 → 24 → 52 (1/semaine !) |
| Éclectique | Livres lus dans X genres différents | 5 → 8 → 12 |
| Long courrier | Lire un livre de 800+ pages | — |
| Sprint | Lire un livre en moins de 3 jours | `finished_at - started_at < 3 jours` |

#### B. Badges de contribution (icône : plume)

| Badge | Condition | Paliers |
|-------|-----------|---------|
| Première critique | 1 critique écrite | — |
| Critique assidu | X critiques écrites | 5 → 15 → 50 → 100 → 250 |
| Essayiste | X critiques longues (500+ chars) | 3 → 10 → 30 |
| Citateur | X citations postées | 5 → 20 → 50 → 100 |
| Curateur | X listes publiques créées | 3 → 10 → 25 |
| Archiviste | X fiches livres corrigées (acceptées) | 5 → 20 → 50 → 100 |
| Couverturiste | X couvertures manquantes ajoutées | 3 → 10 → 30 |

#### C. Badges sociaux (icône : deux silhouettes)

| Badge | Condition | Paliers |
|-------|-----------|---------|
| Connecté | X abonnements | 5 → 20 → 50 |
| Influenceur | X abonnés | 10 → 50 → 100 → 500 |
| Apprécié | X likes reçus (tous types) | 10 → 50 → 200 → 1 000 |
| Prescripteur | X livres ajoutés en PAL par d'autres depuis tes critiques/listes | 5 → 20 → 50 |

#### D. Badges de défi (icône : étoile)

| Badge | Condition | Paliers |
|-------|-----------|---------|
| Challenger | Compléter 1 défi (n'importe quel palier) | — |
| Collectionneur de défis | X défis complétés | 3 → 5 → 10 |
| Rossignol | Atteindre le palier maximum d'un défi | — |

*Note : les badges spécifiques par challenge (ex : "Multi-Défis 2026 — Palier Merle") sont gérés par le système de challenge existant (`challenge_badges`). Les badges ci-dessus sont les badges généraux liés à la participation aux défis.*

#### E. Badges spéciaux (icône : éclair ou cœur)

| Badge | Condition |
|-------|-----------|
| Pionnier | S'être inscrit pendant la bêta |
| Année en livres | Avoir un bilan annuel avec 5+ livres |
| Fidèle | Être actif 12 mois consécutifs (au moins 1 action/mois) |
| Noctambule | Poster une critique entre 2h et 5h du matin |
| Premiers pas | Compléter l'onboarding |
| Mécène | Avoir enrichi une fiche via l'IA (système de crédits) |

### Design des badges

Chaque badge est un SVG 48×48 px avec :
- Fond circulaire subtil (couleur de la famille)
- Icône minimaliste au centre (style ligne fine, 1.5px stroke)
- Les paliers sont indiqués par un petit chiffre romain en bas (I, II, III, IV, V, VI) ou par un changement de teinte (bronze → argent → or → diamant pour les 4 premiers paliers)

**Palette par famille :**
- Lecture : `#4A7C6F` (vert sauge)
- Contribution : `#8B6914` (doré, cohérent avec le doré des défis)
- Social : `#5B6ABF` (bleu indigo)
- Défi : gradient doré existant (`#faf6f0 → #f0e8d8`)
- Spécial : `#9B5DE5` (violet)

Le palier le plus élevé d'un badge a un traitement spécial : léger effet shimmer ou bordure dorée animée (CSS only, pas de GIF).

### Affichage sur le profil

Nouvelle section sur le profil public, après les favoris et avant le journal :

```
BADGES                               Voir tous ›

[🟢 Dévoreur III] [🟡 Essayiste II] [🔵 Apprécié I] [⭐ Rossignol] [🟣 Pionnier]
```

- Affiche les 5 badges les plus récents ou les plus rares par défaut
- L'utilisateur peut épingler jusqu'à 5 badges de son choix (réordonner dans les paramètres)
- "Voir tous" ouvre une page `/[username]/badges` avec la collection complète
- Les badges non débloqués sont visibles mais grisés (donne envie de les obtenir)

---

## 3. Badge "Top Contributeur"

### Le concept

Chaque mois, Reliure attribue automatiquement le badge **« Top Contributeur »** aux utilisateurs les plus actifs. Ce badge est temporaire (valide 1 mois) et renouvelable.

### Mécanique

- Calcul le 1er de chaque mois à minuit (pg_cron)
- Critère : **top 3% des utilisateurs actifs du mois** en encre gagnée (hors points passifs)
- Seuls comptent les points de contribution active : critiques, citations, listes, corrections de fiches
- Le badge apparaît sur le profil avec une mention "Top Contributeur · Avril 2026"
- À la fin du mois, le badge expire visuellement (passe en grisé) mais reste dans l'historique

### Avantages du badge Top Contributeur

- **Visibilité** : badge doré spécial sur le profil et à côté du nom dans les critiques/citations
- **Confiance** : à terme, les Top Contributeurs accèdent à la modération communautaire des fiches (contributions appliquées sans validation — modèle TMDb/Wikipedia)
- **Crédits IA** : 3 crédits d'enrichissement IA offerts le mois suivant
- **Pas de privilèges exclusifs** : tout le monde peut écrire, noter, lister. Le badge est honorifique + confiance accélérée

### Classement

Page dédiée `/classement` (ou section dans Explorer) :

```
TOP CONTRIBUTEURS · AVRIL 2026

1. @margaux_lit     — 342 encre · 12 critiques · 8 corrections
2. @paul_bouquine   — 289 encre · 9 critiques · 15 citations
3. @leonie.reads    — 276 encre · 7 critiques · 3 listes
...
```

- Top 10 visible publiquement
- Chaque utilisateur voit son propre rang même s'il n'est pas dans le top 10
- Onglets : "Ce mois" / "Tout temps"
- Le classement "Tout temps" compte l'encre cumulée totale

---

## 4. Implémentation technique

### Nouvelles tables

```sql
-- ─── Points (Encre) ─────────────────────────
create table public.point_events (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  points smallint not null,
  reason text not null,          -- 'review', 'review_long', 'quote', 'like_received', etc.
  source_id uuid,                -- ID de la critique, citation, etc. (pour récupération si supprimé)
  source_type text,              -- 'review', 'quote', 'list', 'reading_status', 'like', etc.
  created_at timestamptz default now() not null
);

create index point_events_user_idx on public.point_events (user_id, created_at desc);
create index point_events_source_idx on public.point_events (source_id, source_type);
-- Index pour le calcul mensuel du classement :
create index point_events_monthly_idx on public.point_events (user_id, created_at)
  where reason not in ('like_received', 'follow_received');

-- Compteur agrégé (mis à jour par trigger ou pg_cron)
-- Évite de SUM() sur point_events à chaque affichage profil
create table public.user_points (
  user_id uuid references public.users(id) on delete cascade primary key,
  total_points int default 0 not null,
  monthly_points int default 0 not null,      -- reset le 1er de chaque mois
  level smallint default 1 not null,
  updated_at timestamptz default now() not null
);

-- ─── Badges ──────────────────────────────────
create type badge_category as enum ('reading', 'contribution', 'social', 'challenge', 'special');

create table public.badge_definitions (
  id text primary key,                          -- ex: 'devourer_3', 'first_review', 'pioneer'
  name text not null,                           -- "Dévoreur III"
  description text not null,                    -- "Avoir lu 50 livres"
  category badge_category not null,
  tier smallint default 0,                      -- 0 = pas de palier, 1-6 = palier
  icon_key text not null,                       -- clé pour le SVG côté frontend
  condition_type text not null,                 -- 'count_read', 'count_reviews', 'manual', etc.
  condition_threshold int,                      -- 50 pour "50 livres lus"
  sort_order int default 0,
  is_active boolean default true
);

create table public.user_badges (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  badge_id text references public.badge_definitions(id) not null,
  awarded_at timestamptz default now() not null,
  expires_at timestamptz,                       -- null = permanent, date = temporaire (top contributeur)
  is_pinned boolean default false,              -- épinglé sur le profil

  unique (user_id, badge_id)
);

create index user_badges_user_idx on public.user_badges (user_id);
create index user_badges_pinned_idx on public.user_badges (user_id) where is_pinned = true;

-- ─── Classement mensuel (matérialisé par pg_cron) ──────
create table public.monthly_leaderboard (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  year_month text not null,                     -- '2026-04'
  points_earned int not null,
  rank int not null,
  reviews_count int default 0,
  quotes_count int default 0,
  corrections_count int default 0,
  is_top_contributor boolean default false,
  computed_at timestamptz default now() not null,

  unique (user_id, year_month)
);

create index leaderboard_month_idx on public.monthly_leaderboard (year_month, rank);
```

### Trigger : attribution de points

```sql
-- Exemple : points à la création d'une critique
create or replace function award_review_points()
returns trigger language plpgsql security definer as $$
declare
  pts smallint;
begin
  if char_length(NEW.body) >= 500 then
    pts := 20;
  elsif char_length(NEW.body) >= 50 then
    pts := 10;
  else
    pts := 0;
  end if;

  if pts > 0 then
    insert into public.point_events (user_id, points, reason, source_id, source_type)
    values (NEW.user_id, pts, case when pts = 20 then 'review_long' else 'review' end, NEW.id, 'review');

    update public.user_points
    set total_points = total_points + pts,
        monthly_points = monthly_points + pts,
        level = case
          when total_points + pts >= 25000 then 10
          when total_points + pts >= 12000 then 9
          when total_points + pts >= 6000 then 8
          when total_points + pts >= 3000 then 7
          when total_points + pts >= 1500 then 6
          when total_points + pts >= 800 then 5
          when total_points + pts >= 400 then 4
          when total_points + pts >= 150 then 3
          when total_points + pts >= 50 then 2
          else 1
        end,
        updated_at = now()
    where user_id = NEW.user_id;

    -- Upsert si user_points n'existe pas encore
    if not found then
      insert into public.user_points (user_id, total_points, monthly_points, level)
      values (NEW.user_id, pts, pts, case when pts >= 50 then 2 else 1 end);
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_review_points
  after insert on public.reviews
  for each row execute function award_review_points();
```

### pg_cron : jobs mensuels

```sql
-- 1. Reset monthly_points le 1er de chaque mois à 00:05
select cron.schedule('reset-monthly-points', '5 0 1 * *', $$
  update public.user_points set monthly_points = 0, updated_at = now();
$$);

-- 2. Calculer le classement mensuel le 1er à 00:10
select cron.schedule('compute-leaderboard', '10 0 1 * *', $$
  with monthly as (
    select user_id,
           sum(points) as pts,
           count(*) filter (where reason in ('review', 'review_long')) as rev_count,
           count(*) filter (where reason = 'quote') as quote_count,
           count(*) filter (where reason in ('correction', 'cover_fix')) as corr_count
    from public.point_events
    where created_at >= date_trunc('month', now() - interval '1 month')
      and created_at < date_trunc('month', now())
      and reason not in ('like_received', 'follow_received')
    group by user_id
  ),
  ranked as (
    select *, row_number() over (order by pts desc) as rk,
           percent_rank() over (order by pts desc) as pct
    from monthly
  )
  insert into public.monthly_leaderboard
    (user_id, year_month, points_earned, rank, reviews_count, quotes_count, corrections_count, is_top_contributor)
  select user_id,
         to_char(now() - interval '1 month', 'YYYY-MM'),
         pts, rk, rev_count, quote_count, corr_count,
         pct <= 0.03  -- top 3%
  from ranked;
$$);

-- 3. Attribuer les badges Top Contributeur le 1er à 00:15
select cron.schedule('award-top-contributor', '15 0 1 * *', $$
  -- Expirer les anciens badges Top Contributeur
  update public.user_badges
  set expires_at = now()
  where badge_id = 'top_contributor'
    and expires_at is null;

  -- Attribuer les nouveaux
  insert into public.user_badges (user_id, badge_id, expires_at)
  select user_id, 'top_contributor',
         date_trunc('month', now()) + interval '1 month'
  from public.monthly_leaderboard
  where year_month = to_char(now() - interval '1 month', 'YYYY-MM')
    and is_top_contributor = true
  on conflict (user_id, badge_id) do update
    set expires_at = excluded.expires_at,
        awarded_at = now();
$$);
```

### Vérification des badges (edge function ou pg_cron)

Le check des badges est déclenché après chaque attribution de points. On peut soit :

**Option A — Trigger SQL (simple, synchrone) :** après chaque `INSERT` dans `point_events`, une fonction vérifie les seuils et attribue les badges. Risque : alourdit les écritures.

**Option B — pg_cron toutes les 5 min (recommandé) :** un job parcourt les users dont `updated_at` a changé depuis le dernier run, et vérifie leurs badges. Découplé, pas de latence sur l'écriture.

**Option C — Edge function async :** appelée en fire-and-forget après les actions clés. Plus flexible mais plus complexe.

**Recommandation : Option B** pour le MVP. Simple, robuste, et le délai de 5 min est invisible pour l'utilisateur (on affiche une notification "Nouveau badge !" au prochain chargement de page, pas en temps réel).

---

## 5. Notifications in-app

Quand un badge est débloqué ou un palier atteint, l'utilisateur doit le savoir. Pas de push notifications (hors scope MVP), mais :

- **Toast** au chargement de la page si un nouveau badge a été attribué depuis la dernière visite
- **Point rouge** sur l'icône profil dans la nav (compteur de badges non vus)
- **Section "Activité récente"** dans les paramètres du profil avec l'historique des points gagnés

Le toast affiche le badge avec une animation subtile (fade-in + léger scale) et un message :

> « Nouveau badge débloqué : Dévoreur III — Tu as lu 50 livres ! »

---

## 6. Séquençage — Ordre d'implémentation

### Phase 1 : Fondations (1 agent Opus, ~2h)

**Objectif : les tables + triggers de points, sans UI.**

1. Migration SQL : créer `point_events`, `user_points`, `badge_definitions`, `user_badges`, `monthly_leaderboard`
2. RLS sur toutes les nouvelles tables
3. Triggers : points sur `reviews` (INSERT/DELETE), `quotes` (INSERT/DELETE), `reading_status` (INSERT)
4. Seed `badge_definitions` avec tous les badges listés ci-dessus
5. `user_points` upsert pour les utilisateurs existants (backfill des points)

**Prompt Opus :** fournir le SQL complet, les triggers, le seed. Un seul fichier de migration.

### Phase 2 : Affichage profil (1 agent Sonnet)

**Objectif : voir ses points, son niveau, et ses badges sur le profil.**

1. Hook `useUserPoints(userId)` — fetch `user_points` + `user_badges`
2. Composant `LevelBadge` (pill discrète sous le nom : "Bibliophile · 412 encre")
3. Section "Badges" sur le profil (grille des badges épinglés, lien "Voir tous")
4. Page `/:username/badges` — collection complète, badges grisés non débloqués

### Phase 3 : Attribution automatique des badges (1 agent Opus)

**Objectif : les badges se débloquent automatiquement.**

1. pg_cron job "check-badges" toutes les 5 min
2. Fonctions de vérification par `condition_type` :
   - `count_read` → `SELECT count(*) FROM reading_status WHERE status = 'read' AND user_id = $1`
   - `count_reviews` → `SELECT count(*) FROM reviews WHERE user_id = $1`
   - `count_long_reviews` → `SELECT count(*) FROM reviews WHERE user_id = $1 AND char_length(body) >= 500`
   - etc.
3. Attribution + log dans `user_badges`

### Phase 4 : Classement + Top Contributeur (1 agent Sonnet)

**Objectif : page classement visible, badge Top Contributeur.**

1. pg_cron jobs mensuels (reset, calcul, attribution)
2. Page `/classement` avec top 10 + rang personnel
3. Badge Top Contributeur avec expiration
4. Intégration du badge dans les critiques/citations (petit badge doré à côté du nom)

### Phase 5 : Triggers complémentaires + polish (1 agent Sonnet)

1. Points sur likes reçus (trigger sur `likes`)
2. Points sur follows reçus (trigger sur `follows`)
3. Points sur listes (trigger sur `lists`)
4. Toast notification nouveau badge
5. Points sur les items de défi (`challenge_submissions`)
6. Récupération de points à la suppression (trigger DELETE)

### Phase 6 : Défis (déjà designé, implémentation séparée)

Les défis sont un chantier à part entière (tables déjà spécifiées dans le backlog). Le système de points s'y branche via les triggers sur `challenge_submissions` et `challenge_badges`.

---

## 7. Ce qu'on ne fait PAS

- **Pas de streaks** — ça crée de l'anxiété et de la culpabilité, l'inverse de l'esprit Reliure
- **Pas de leaderboard temps réel** — mensuel suffit, pas de course permanente
- **Pas de points négatifs** — on ne punit pas, on récompense
- **Pas de marketplace de points** — l'encre n'achète rien (sauf à terme les crédits IA, ce qui est déjà prévu)
- **Pas de niveaux visibles des autres** — chacun voit son propre niveau, les autres voient les badges. Le niveau est un indicateur personnel, pas un outil de comparaison
- **Pas de "daily quests"** — pas de pression de revenir chaque jour

---

## 8. Connexions avec les systèmes existants

| Système existant | Connexion gamification |
|---|---|
| **Défis** (`challenge_*`) | Points encre sur inscription, validation d'item, palier atteint. Badges de défi généraux. |
| **Crédits IA** (`ai_credits`) | Top Contributeurs reçoivent 3 crédits/mois. À terme : échanger de l'encre contre des crédits. |
| **Rôles** (`user_roles`) | Contributeurs avec 50+ corrections acceptées → candidats naturels pour le rôle modérateur. |
| **Contributions fiches** (`book_contributions`) | Points encre sur contribution acceptée. Badge Archiviste. |
| **Bilan annuel** | Le bilan intègre : encre gagnée dans l'année, badges débloqués, rang dans le classement annuel, paliers de défis atteints. |
| **Onboarding** | Badge "Premiers pas" à la complétion. Les premiers points encre arrivent dès le backfill (2 encre × livres marqués lus). |

---

## 9. Évolutions futures (post-MVP gamification)

- **Badges saisonniers** : badges limités dans le temps (ex : "Lecteur d'été 2026" — 5 livres lus en juillet-août)
- **Badges communautaires** : votés par la communauté (ex : "Meilleure critique du mois")
- **Badges secrets** : non listés dans la collection, découverts par surprise (ex : "Polyglotte" — lire des livres en 3+ langues)
- **Échange encre → crédits IA** : 500 encre = 1 crédit d'enrichissement
- **Thèmes de profil débloqués par niveau** : certains thèmes premium accessibles à partir du niveau 5
- **Rang visible dans les critiques** : "Margaux · Critique · ★★★★★" (le niveau comme indicateur de fiabilité)
