# Audit #1 — Bundle & performance de chargement

> Date : 1 avril 2026
> Stack : React 19 + Vite 8 + Tailwind v4 + Supabase + Vercel
> Build tool : Vite 8.0.3 (Rolldown)

---

## 1. Taille du bundle

| Asset | Brut | Gzip | Brotli (est.) |
|-------|-----:|-----:|--------------:|
| **index.js** | **725 KB** | **197 KB** | ~165 KB |
| index.css | 45.5 KB | 9.0 KB | ~7.5 KB |
| **Total** | **770.5 KB** | **206 KB** | ~172 KB |

**Vite émet un warning** : le chunk JS dépasse 500 KB. Tout le code (140 modules) est dans un seul fichier — **aucun code splitting**.

---

## 2. Breakdown par catégorie (minifié, avant gzip)

| Catégorie | Taille | % du JS |
|-----------|-------:|--------:|
| react + react-dom + scheduler | 471 KB | 65% |
| @supabase (auth, postgrest, realtime, storage, phoenix) | 311 KB | 43% |
| react-router | 86 KB | 12% |
| papaparse | 25 KB | 3% |
| App code (pages, composants, hooks, lib, data) | 493 KB | 68% |

> Note : le total dépasse 100% parce que les tailles pre-minification des modules sont mesurées avant les optimisations de scope hoisting. Le fichier final fait 725 KB.

---

## 3. Top 15 des modules les plus lourds

| # | Module | Minifié |
|---|--------|--------:|
| 1 | `react-dom/cjs/react-dom-client.production.js` | 452 KB |
| 2 | `react-router/chunk-UVKPFVEO.mjs` | 86 KB |
| 3 | `@supabase/auth-js/GoTrueClient.js` | 85 KB |
| 4 | **`src/pages/ProfilePage.jsx`** | 69 KB |
| 5 | **`src/pages/BookPage.jsx`** | 61 KB |
| 6 | `@supabase/phoenix/phoenix.mjs` (Realtime WebSocket) | 39 KB |
| 7 | `@supabase/storage-js/index.mjs` | 36 KB |
| 8 | **`src/pages/BackfillPage.jsx`** | 30 KB |
| 9 | **`src/pages/ExplorePage.jsx`** | 26 KB |
| 10 | **`src/components/Search.jsx`** | 25 KB |
| 11 | `papaparse/papaparse.min.js` | 25 KB |
| 12 | **`src/pages/ChallengesPage.jsx`** | 24 KB |
| 13 | `@supabase/postgrest-js/index.mjs` | 24 KB |
| 14 | **`src/pages/OnboardingPage.jsx`** | 20 KB |
| 15 | `src/components/CSVImport.jsx` | 20 KB |

---

## 4. Problèmes identifiés

### P1. Zéro code splitting — CRITIQUE

`App.jsx` importe les 17 pages statiquement. Tout est dans un seul chunk de 725 KB. L'utilisateur qui arrive sur `/explorer` télécharge aussi BackfillPage, ChallengesPage, SettingsPage, OnboardingPage, etc.

**Impact estimé** : 180-250 KB de JS évité au chargement initial (gzip: 50-70 KB).

**Vérification** :
- `React.lazy` : aucune utilisation trouvée (0 occurrences)
- `Suspense` : aucune utilisation trouvée (0 occurrences)
- `import()` dynamique : aucun dans le code applicatif

### P2. PapaParse chargé pour tout le monde — MOYEN

`papaparse` (25 KB minifié) est importé statiquement dans `CSVImport.jsx`, qui est importé dans `BackfillPage.jsx`, qui est importé dans `App.jsx`. Seuls les utilisateurs connectés qui vont sur `/backfill` en ont besoin.

**Impact** : 25 KB minifié, ~7 KB gzip. Résolu par P1 si BackfillPage est lazy-loaded.

### P3. Données mock dans le bundle principal — MOYEN

`src/data/index.js` (10 KB) contient des données mock (B, DIARY, REVIEWS, ACTIVITY, LISTS, QUOTES, JARTICLES, JAGENDA). Parmi les 9 exports :
- **Utilisés** : `FONT_URL` (App.jsx), `B` (OnboardingPage, BackfillPage), `QUOTES` (CitationsPage), `JARTICLES` (ArticlePage, JournalPage), `JAGENDA` (JournalPage)
- **Inutilisés** : `DIARY`, `REVIEWS`, `ACTIVITY`, `LISTS` — 4 exports jamais importés nulle part

Les exports inutilisés **devraient** être tree-shakés par Vite/Rolldown, mais `FONT_URL` est importé dans `App.jsx` ce qui force le module entier dans le chunk principal. L'estimation du renderedLength à 11 KB inclut potentiellement du code mort mal éliminé.

**Impact** : ~4-5 KB récupérables en déplaçant `FONT_URL` hors de `data/index.js`.

### P4. Supabase Realtime/Phoenix non utilisé — FAIBLE

`@supabase/phoenix` (39 KB) et `@supabase/realtime-js` (25 KB) sont dans le bundle parce que `@supabase/supabase-js` les importe. L'app n'utilise **aucun** channel, subscription, ou realtime feature (0 occurrence de `.channel(`, `.subscribe()`, `realtime`).

**Impact** : 64 KB minifié, mais non actionnable sans changer de client Supabase. Le `@supabase/supabase-js` ne permet pas d'exclure les sous-modules. Alternative : importer individuellement `@supabase/auth-js` + `@supabase/postgrest-js` + `@supabase/storage-js`, mais c'est un refactoring significatif.

### P5. Supabase Auth modules non utilisés — FAIBLE

- `GoTrueAdminApi.js` (12 KB) : API admin (listUsers, deleteUser, etc.) — **jamais utilisée** dans le code applicatif
- `webauthn.js` (14 KB) + `webauthn.errors.js` (6 KB) : WebAuthn/MFA — **jamais utilisé**

Total : 32 KB de code mort dans auth-js. Même problème que P4 : non actionnable sans import granulaire.

### P6. Aucun `loading="lazy"` sur les images — MOYEN

11 balises `<img>` dans le code n'ont pas `loading="lazy"`. Le composant `Img.jsx` (couvertures de livres) n'ajoute pas non plus cet attribut. Sur une page Explorer ou Profil avec 20-40 couvertures, toutes les images se chargent immédiatement.

**Impact** : LCP non affecté (la première image visible doit charger eagerly), mais bande passante gaspillée sur les images hors viewport. Important surtout sur mobile.

### P7. Fonts non optimisées — FAIBLE

**6 fichiers TTF** chargés depuis Google Fonts (pas de woff2 pour cet user-agent) :
- Geist 400, 500, 600, 700 : 4 × 65 KB = **260 KB**
- Instrument Serif regular + italic : 2 × 63 KB = **126 KB**
- **Total fonts : ~386 KB**

Problèmes :
- **Pas de `preconnect` vers `fonts.gstatic.com`** — seul `fonts.googleapis.com` a un preconnect
- **4 poids de Geist chargés** : 400+500+600+700. Vérifier si 500 et 700 sont réellement utilisés (le design system mentionne 400, 500, 600, 700 mais 500 semble rare dans l'UI)
- **`display=swap`** est correct (pas de FOIT)
- **Pas de subset** : les fichiers incluent tous les glyphes Latin Extended, pas seulement le jeu FR

### P8. Aucun header Cache-Control sur les assets — FAIBLE

`vercel.json` ne contient qu'une rewrite SPA. Pas de headers pour les assets statiques. Vercel ajoute par défaut `Cache-Control: public, max-age=0, must-revalidate` pour `index.html` et des hashes dans les noms d'assets (donc le cache immutable est implicite pour les `.js` et `.css`). Mais les images de couvertures (URLs externes Google Books, Open Library) n'ont aucun contrôle côté Reliure.

### P9. `iceberg-js` dans le bundle — COSMÉTIQUE

`iceberg-js` (8 KB) — un client Apache Iceberg REST Catalog — est bundlé via une dépendance transitive de Supabase. Non utilisé directement. Non actionnable.

---

## 5. Optimisations recommandées (par priorité)

### Priorité 1 — Code splitting avec React.lazy (~200 KB gzip évités)

Transformer les imports statiques de `App.jsx` en imports dynamiques. Les pages rarement visitées ne sont plus dans le bundle initial.

**Pages à lazy-loader** (toutes sauf ExplorePage, la route par défaut) :

```jsx
// App.jsx — remplacer les imports statiques par :
import { lazy, Suspense } from "react";

// Chargement eager (route par défaut + composants layout)
import ExplorePage from "./pages/ExplorePage";
import Header from "./components/Header";
// ... autres composants layout

// Chargement lazy
const BookPageRoute = lazy(() => import("./pages/BookPageRoute"));
const ProfilePageRoute = lazy(() => import("./pages/ProfilePageRoute"));
const FeedPage = lazy(() => import("./pages/FeedPage"));
const CitationsPage = lazy(() => import("./pages/CitationsPage"));
const ListPage = lazy(() => import("./pages/ListPage"));
const TagPage = lazy(() => import("./pages/TagPage"));
const BackfillPage = lazy(() => import("./pages/BackfillPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChallengesPage = lazy(() => import("./pages/ChallengesPage"));
const JournalPage = lazy(() => import("./pages/JournalPage"));
const ArticlePage = lazy(() => import("./pages/ArticlePage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Dans le JSX, wrapper les <Routes> :
<Suspense fallback={null}>
  <Routes>
    {/* ... même structure */}
  </Routes>
</Suspense>
```

**Impact estimé** :
- Chunk initial : ~450 KB → ~197 KB gzip (au lieu de 725 KB → 197 KB gzip)
- BackfillPage + PapaParse + CSVImport dans un chunk séparé : ~75 KB
- ProfilePage dans un chunk séparé : ~69 KB
- BookPage dans un chunk séparé : ~61 KB
- ChallengesPage : ~24 KB
- OnboardingPage : ~20 KB

### Priorité 2 — `loading="lazy"` sur les images hors viewport (~0 KB JS, bande passante réseau)

Ajouter `loading="lazy"` au composant `Img.jsx` et aux `<img>` directement dans les pages.

```jsx
// src/components/Img.jsx, ligne 22 — ajouter loading="lazy" :
<img
  src={src}
  alt=""
  loading="lazy"
  className="w-full h-full object-cover block absolute inset-0"
  ...
/>
```

Exception : la couverture hero de BookPage (au-dessus du fold) devrait garder `loading="eager"` ou rien (défaut). On peut ajouter une prop `eager` au composant Img.

**Impact** : pas de réduction du bundle, mais réduction significative du temps de chargement perçu et de la bande passante sur les pages avec de nombreuses couvertures (Explorer, Profil bibliothèque).

### Priorité 3 — Ajouter `preconnect` vers `fonts.gstatic.com` (~100-200ms au FCP)

```html
<!-- index.html, après le preconnect existant -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

Le preconnect vers `fonts.googleapis.com` existe déjà, mais les fichiers de fonts sont servis depuis `fonts.gstatic.com` (domaine différent). Sans preconnect, le navigateur découvre ce domaine seulement après avoir parsé le CSS de Google Fonts.

### Priorité 4 — Déplacer `FONT_URL` hors de `data/index.js` (~4-5 KB)

`App.jsx` importe `FONT_URL` depuis `data/index.js`, ce qui force potentiellement tout le module mock data dans le chunk principal. Déplacer `FONT_URL` dans un fichier séparé ou directement dans `App.jsx`.

```jsx
// Option simple : inline dans App.jsx
const FONT_URL = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600;700&display=swap";
```

Et supprimer les 4 exports inutilisés de `data/index.js` (`DIARY`, `REVIEWS`, `ACTIVITY`, `LISTS`).

### Priorité 5 — Réduire les poids de Geist à 3 (~65 KB fonts)

Si le poids 500 (medium) n'est pas utilisé dans l'UI, le retirer de l'URL Google Fonts :

```
Avant : family=Geist:wght@400;500;600;700
Après : family=Geist:wght@400;600;700
```

Vérifier avec `grep -rn "font-weight.*500\|fontWeight.*500\|font-medium" src/` avant de supprimer.

### Priorité 6 (optionnelle) — Self-host les fonts avec subset (~200 KB fonts)

Télécharger les fonts, les convertir en woff2, et les subsetter pour le jeu Latin de base (couvre le français). Évite la requête réseau vers Google Fonts et réduit la taille de ~386 KB à ~120 KB.

Outil : `glyphhanger` ou `fonttools`.

---

## 6. Ce qui est déjà bien

- **Dépendances minimales** : seulement 4 dépendances runtime (react, react-dom, react-router-dom, @supabase/supabase-js + papaparse). Pas de lodash, moment, date-fns, axios, etc.
- **Pas d'imports barrel problématiques** : les imports sont directs et spécifiques
- **CSS compact** : 45 KB de CSS pour toute l'app, c'est excellent avec Tailwind v4
- **`display=swap`** sur les fonts : pas de FOIT
- **Assets hashés** par Vite : cache immutable implicite
- **Splash screen HTML** : le contenu apparaît avant que React ne se charge

---

## 7. Fichiers générés

- `reports/bundle-stats.html` — treemap interactif du bundle (ouvrir dans un navigateur)
- Ce fichier (`reports/audit-1-bundle.md`)

---

## Résumé

| Action | Impact gzip estimé | Effort |
|--------|-------------------:|--------|
| Code splitting (React.lazy) | **-50 à -70 KB** initial | 30 min |
| loading="lazy" images | bande passante | 5 min |
| preconnect fonts.gstatic.com | -100-200ms FCP | 1 min |
| Déplacer FONT_URL + supprimer exports morts | -1 à -2 KB | 5 min |
| Réduire poids Geist | -65 KB fonts | 2 min |
| Self-host fonts subsetées | -200 KB fonts | 1h |

**Quick win immédiat** : les priorités 1 à 3 se font en 35 minutes et réduisent le chargement initial de ~70 KB gzip JS + 200ms FCP fonts.
