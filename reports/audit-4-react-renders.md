# Audit #4 — Re-renders React & réactivité

> Date : 1 avril 2026
> Stack : React 19 + Vite 8 + React Router v7, pas de state manager externe
> Context : incident 92K appels Supabase causé par objets dans deps useEffect

---

## 1. Matrice de re-renders par page

### Montage initial (premier chargement)

| Page | Hooks avec fetch | useEffects | setState en cascade | Re-renders estimés au montage |
|------|:----------------:|:----------:|:-------------------:|:-----------------------------:|
| **BookPage** | 8 hooks + 3 useEffect inline | 11 | Oui (3 cascades) | **6-8** |
| **ProfilePage** | 10+ hooks | 12+ | Oui (1 cascade) | **5-7** |
| **ExplorePage** | 6 hooks + 3 useEffect inline | 9 | Non | **4-5** |
| **FeedPage** | 2 hooks + 2 useEffect inline | 4 | Oui (1 cascade) | **4-5** |
| **CitationsPage** | 3 hooks | 4 | Non | **3-4** |
| **Search** | 1 hook + 5 useEffect | 6 | Oui (1 cascade) | **4-6** |

### Détail BookPage — la page la plus complexe

Séquence de re-renders au montage :
```
Render 1 : initial (tous les states à leur valeur par défaut)
Render 2 : useAuth résolu → user disponible
Render 3 : useReadingStatus → status chargé → setSt() + setFinDate() + setNoDate() + setIsReread()
           useUserRating → rating chargé → setUr()
           useBookReviews → reviews chargées → dbReviews change
Render 4 : useLikes(dbReviews.map(r => r.id)) déclenché car dbReviews a changé → idsKey change
           useLikes(dbQuotes.map(q => q.id)) idem
Render 5 : useLikes résolu → likedSet/likedQuotes mis à jour
Render 6 : liveBook useEffect résolu → setLiveBook()
Render 7 : similarBooks useEffect résolu → setSimilarBooks()
```

**Cascade critique** (lignes 235-236) :
```jsx
useLikes(dbReviews.map(r => r.id), "review")
useLikes(dbQuotes.map(q => q.id), "quote")
```
`dbReviews.map(r => r.id)` crée un **nouveau tableau à chaque render**. Dans `useLikes`, `targetIds.join(",")` est recalculé → l'`idsKey` change → `useCallback` invalidé → nouveau fetch.

Problème : quand `dbReviews` passe de `[]` à `[{...}]`, `useLikes` se re-déclenche une fois (normal). Mais si un parent cause un re-render supplémentaire, `dbReviews.map()` recrée un nouveau tableau avec la **même valeur** mais une **nouvelle référence** → `.join(",")` produit la même string → pas de re-fetch. **Le `.join(",")` sauve la mise**, mais la création d'un array intermédiaire à chaque render est du travail gaspillé.

### Détail FeedPage — cascade items → useLikes

```
Render 1 : initial
Render 2 : useFeed résolu → items change
Render 3 : items.filter().map() crée de nouveaux arrays pour useLikes → idsKey recalculé
Render 4 : useLikes résolu → likedReviews/likedQuotes mis à jour
Render 5 : listPreviews useEffect → setListPreviews
```

Lignes 56-59 :
```jsx
const reviewIds = items.filter(i => i.action_type === "review").map(i => i.target_id);
const quoteIds = items.filter(i => i.action_type === "quote").map(i => i.target_id);
```
Recréés à chaque render. Le `.join(",")` dans `useLikes` stabilise, mais c'est du travail inutile.

### Navigation retour (aucun cache)

| Action | Comportement actuel | Re-fetches |
|--------|-------------------|:----------:|
| Explorer → BookPage → retour Explorer | Tout refetch | **9+ requêtes** |
| Profil → BookPage → retour Profil | Tout refetch | **15+ requêtes** |
| Fil → BookPage → retour Fil | Tout refetch | **4+ requêtes** |

**Aucun cache** : chaque navigation démonte/remonte le composant. Tous les hooks refont leurs fetches. C'est le problème #1 de réactivité perçue.

---

## 2. Patterns dangereux trouvés

### P1. Zéro `React.memo` dans toute l'app — CRITIQUE

```bash
grep -rn 'React.memo\|memo(' src/ → 0 résultats
```

Aucun composant n'est memoizé. Les composants lourds rendus dans des listes (reviews, quotes, feed items) sont re-rendus à chaque changement de state du parent.

**Impact** : quand `BookPage` fait un `setSt("Lu")`, **tout** le JSX est re-rendu : les reviews, les citations, les tags, les couvertures similaires — même si rien n'a changé dans ces sections.

**Composants prioritaires à memoizer** :
| Composant | Rendus dans | Impact |
|-----------|-------------|--------|
| `LikeButton` | Toutes les listes (reviews, quotes, feed) | Léger (petit composant) |
| `Img` | HScroll (6-8 covers), grilles bibliothèque | **Fort** — inclut un état `imgFailed` |
| `ContentMenu` | Chaque review/quote | Moyen |
| `ReadingItem` | Liste "En cours" dans ProfilePage | Moyen |
| Feed item (inline dans FeedPage) | 20 items max | **Fort** — chaque item est un gros JSX |
| Review card (inline dans BookPage) | N reviews | **Fort** |

### P2. Inline `style={{...}}` omniprésent — MOYEN

| Fichier | Occurrences `style={{` |
|---------|:---------------------:|
| BookPage.jsx | **79** |
| ProfilePage.jsx | ~120 |
| ExplorePage.jsx | ~50 |
| FeedPage.jsx | ~30 |
| CitationsPage.jsx | ~25 |
| Search.jsx | ~40 |

Chaque `style={{...}}` crée un **nouvel objet à chaque render**. En soi, ce n'est pas grave pour le DOM (React fait un diff et ne touche le DOM que si la valeur change). Mais ça empêche `React.memo` de fonctionner sur les composants enfants (shallow comparison échoue).

**Verdict** : pas un problème de performance direct, mais un **bloqueur pour la memoization**. Les styles CSS variables (`var(--text-primary)`) sont nécessaires pour le dark mode, donc `style={{...}}` est difficile à éviter sans refactor Tailwind.

**Mitigation** : pour les composants dans des listes, extraire les styles en constantes hors du composant :
```jsx
// Avant (crée un objet à chaque render)
<div style={{ color: "var(--text-tertiary)" }}>

// Après (référence stable)
const TERTIARY_STYLE = { color: "var(--text-tertiary)" };
<div style={TERTIARY_STYLE}>
```

### P3. `useLikes(reviews.map(r => r.id))` — tableau recréé à chaque render — MOYEN

**Fichiers concernés** :
- `BookPage.jsx:235-236` — `dbReviews.map(r => r.id)` et `dbQuotes.map(q => q.id)`
- `ExplorePage.jsx:54-56` — `reviews.map(r => r.id)`, `quotes.map(q => q.id)`, `lists.map(l => l.id)`
- `FeedPage.jsx:56-59` — `items.filter().map()`
- `CitationsPage.jsx` — même pattern

**Pattern corrigé** :
```jsx
// Avant
const { likedSet } = useLikes(dbReviews.map(r => r.id), "review");

// Après — memoizer les IDs
const reviewIds = useMemo(() => dbReviews.map(r => r.id), [dbReviews]);
const { likedSet } = useLikes(reviewIds, "review");
```

Le `.join(",")` dans `useLikes` rattrape le problème (même string → pas de re-fetch), mais le `useMemo` éviterait le recalcul du join à chaque render.

### P4. `new Date()` et constantes recréées dans le corps du composant — FAIBLE

`BookPage.jsx:364` :
```jsx
const todayISO = new Date().toISOString().split("T")[0];
```
Recréé à chaque render. Devrait être un `useMemo(() => ..., [])` ou extrait hors du composant.

`ProfilePage` : `useProfileData` utilise `new Date().getFullYear()` dans le useCallback — mais c'est un primitif (number), donc stable. OK.

### P5. AuthContext re-rend tout l'arbre sur chaque changement auth — FAIBLE

`AuthContext.jsx:35-38` :
```jsx
<AuthContext.Provider value={{ user, loading }}>
  {children}
</AuthContext.Provider>
```

Le `value` est un nouvel objet à chaque render de `AuthProvider`. Si `user` ou `loading` changent, tous les composants qui utilisent `useAuth()` sont re-rendus.

**Impact actuel** : faible — `AuthProvider` ne re-rend que sur les événements auth (login, logout, token refresh). Pas à chaque interaction.

**Fix préventif** :
```jsx
const value = useMemo(() => ({ user, loading }), [user, loading]);
<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
```

### P6. NavigationContext recrée `goToBook` à chaque render — FAIBLE

`NavigationContext.jsx:9-13` :
```jsx
const goToBook = (book) => {
  const slug = book.slug || book._supabase?.slug || book.id;
  navigate(`/livre/${slug}`);
};
```

`goToBook` est recréé à chaque render de `NavigationProvider` (chaque changement de route). Tous les composants qui appellent `useNav()` sont potentiellement invalidés.

**Fix** :
```jsx
const goToBook = useCallback((book) => {
  const slug = book.slug || book._supabase?.slug || book.id;
  navigate(`/livre/${slug}`);
}, [navigate]);
```

### P7. Fonctions inline dans les listes — FAIBLE

`BookPage.jsx:744-745` :
```jsx
{l.previewCovers.map((url, i) => (
  <img key={i} src={url} ... />  // key={i} sur des URLs stables
))}
```

`FeedPage.jsx:169-171` :
```jsx
{covers.map((url, i) => (
  <img key={i} src={url} ... />  // key={i} sur des URLs
))}
```

L'usage de `key={i}` est acceptable ici car ce sont des listes de previews statiques sans réordonnement. Pas un bug, mais idéalement `key={url}` serait plus sémantique.

**BookPage.jsx:995-1001** (éditions — données mock) :
```jsx
{[{ l: "Poche", ... }, { l: "Relié", ... }].map((e, i) => (
  <div key={i} ...>
```
Tableau littéral recréé à chaque render + `key={i}`. Mineur car c'est du mock statique, mais devrait être extrait en constante.

---

## 3. Search — analyse détaillée

### Debounce : correct

`Search.jsx:121-148` :
```jsx
timer.current = setTimeout(async () => {
  const [bookRes, users] = await Promise.all([
    searchBooks(q),
    fetchUsers(q, 3),
  ]);
  ...
}, 400);
return () => clearTimeout(timer.current);
```

- Debounce 400ms sur la recherche classique — OK
- `clearTimeout` dans le cleanup — OK, pas de requête orpheline
- `searchBooks` + `fetchUsers` en parallèle — optimal

### Smart Search (IA) : debounce séparé correct

`useSmartSearch.js:21-31` :
```jsx
const timer = setTimeout(async () => {
  if (abortRef.current) abortRef.current.abort();
  const controller = new AbortController();
  abortRef.current = controller;
  ...
}, debounceMs);  // 600ms

return () => {
  clearTimeout(timer);
  if (abortRef.current) abortRef.current.abort();
};
```

- Debounce 600ms (plus long que la recherche classique) — OK
- `AbortController` annule les requêtes précédentes — OK
- Cleanup dans le return du useEffect — OK

**Problème subtil** : l'`AbortController` dans `useSmartSearch` n'annule que l'appel `supabase.functions.invoke`, pas la requête HTTP sous-jacente. Supabase JS ne propage pas le signal abort aux requêtes fetch internes pour les edge functions. L'abort empêche juste la mise à jour du state si le composant a changé de query entre-temps. **Pas un vrai bug, mais l'edge function continue de s'exécuter côté serveur.**

### Ghost text : pas de re-render de la liste

Le ghost text (`rawGhost`) est un state séparé dans `useSmartSearch`. Quand il change :
- `Search.jsx:81` : `const ghost = rawGhost && !ghostDismissed ? rawGhost : null;`
- Le ghost est affiché dans un overlay invisible aligné sur l'input
- Les `displayResults` sont recalculés via `useMemo` qui dépend de `[results, aiBooks]`, **pas** de `ghost`

**Verdict** : le ghost text ne cause **pas** de re-render de la liste de résultats. Correct.

### Risque mineur : `displayResults` useMemo

`Search.jsx:182-210` : `displayResults` dépend de `[results, aiBooks]`. Quand la recherche classique et l'IA répondent à des moments différents, `displayResults` est recalculé 2 fois. C'est normal et attendu.

---

## 4. Images (couvertures)

### `Img.jsx` — pas de `loading="lazy"` — MOYEN

```jsx
<img src={src} alt="" className="w-full h-full object-cover block absolute inset-0"
     onLoad={e => { if (e.target.naturalWidth < 10) setImgFailed(true); }}
     onError={() => setImgFailed(true)} />
```

- **Pas de `loading="lazy"`** — toutes les images chargent immédiatement. Sur une page Explorer avec 7 populaires + 6 similaires + 3 reviews + 3 quotes = ~20 images simultanées.
- **Pas de `srcset` ni `sizes`** — les URLs Google Books sont servies en taille fixe (pas d'optimisation responsive).
- **Pas de format WebP** — les URLs Google Books (`books.google.com/books/content`) et Open Library (`covers.openlibrary.org`) servent du JPEG. Non contrôlable côté client.

### Fallback — pas de layout shift — OK

```jsx
<div style={{ width: w, height: h, backgroundColor: "var(--cover-fallback)" }}>
  {src && !imgFailed && <img ... className="absolute inset-0" />}
  {showFallback && <div className="absolute inset-0">...</div>}
</div>
```

Le conteneur a des **dimensions fixes** (`w` et `h`). Le fallback et l'image occupent le même espace via `position: absolute`. **Zéro layout shift** quand l'image charge ou échoue. Bien fait.

### HScroll (carousels) — pas de lazy loading — MOYEN

`HScroll.jsx` est un simple wrapper flex avec `overflow-x: auto`. Les images dans un HScroll (populaires, similaires) sont toutes chargées immédiatement, même celles hors viewport (scrollées à droite).

**Fix recommandé** : ajouter `loading="lazy"` au composant `Img` avec une prop `eager` pour le hero.

### Img dans des listes — pas de memoization

`Img` maintient un state `imgFailed`. Si le parent re-rend et passe une **nouvelle référence** de `book` (même valeur), `Img` re-rend et le state `imgFailed` est **préservé** (React conserve le state si le composant reste au même endroit dans l'arbre). Pas de problème visible, mais `React.memo(Img)` éviterait le re-render du JSX interne.

---

## 5. Estimation Core Web Vitals

### LCP (Largest Contentful Paint) — ~2.0-2.5s estimé

**Élément LCP probable** : la plus grosse couverture de livre sur la page (Explorer : 7 populaires, BookPage : hero cover 180×270).

**Chaîne critique** :
```
HTML (index.html) → ~100ms
├─ JS bundle (725 KB, 197 KB gzip) → ~300-500ms (réseau)
├─ Parse + execute JS → ~200-400ms
├─ React mount → ~50-100ms
├─ Supabase fetch (popular_books_week) → ~200-400ms
└─ Image download (Google Books cover) → ~200-500ms
   ──────────────────────────────────
   Total estimé : ~1.5-2.5s
```

**Goulots** :
1. **Single chunk JS** (725 KB) — l'utilisateur attend que tout le JS soit téléchargé et exécuté avant de voir quoi que ce soit (sauf le splash screen HTML).
2. **Pas de preload des images critiques** — la couverture hero n'est découverte qu'après le fetch Supabase.
3. **Splash screen** compense partiellement (contenu visible avant React).

**Après code splitting (audit #1)** : le chunk initial passerait à ~450 KB → LCP ~1.5-2.0s.

### CLS (Cumulative Layout Shift) — ~0.02-0.05 estimé — BON

**Points de stabilité** :
- `Img` : dimensions fixes, fallback en absolute — **0 shift**
- `Skeleton` : même dimensions que le contenu réel — **0 shift** (si bien calibré)
- Header sticky avec hauteur fixe — **0 shift**

**Risques de shift** :
- **Font swap** (`display=swap`) : le texte en Geist peut sauter quand Instrument Serif charge. Impact faible (~0.01-0.02 CLS) car seuls les titres changent de font.
- **Sections conditionnelles** qui apparaissent après fetch : "Les lecteurs ont aussi aimé" (similarBooks), "Dans des listes" (bookLists). Apparaissent sous le fold → CLS faible.
- **Reviews/citations** qui apparaissent après `reviewsLoading` → contenu pousse le reste. Mais c'est sous le fold.

### INP (Interaction to Next Paint) — ~100-200ms estimé — CORRECT

**Interactions testées mentalement** :

| Interaction | Latence estimée | Détail |
|-------------|:--------------:|--------|
| Clic étoile (InteractiveStars) | ~50ms | Optimistic local state (`setUr(r)`) avant le fetch |
| Clic like (LikeButton) | ~50ms | Optimistic via `safeMutation` |
| Clic Pill statut | ~80ms | `setSt(s)` immédiat, DB async |
| Clic Follow | ~80ms | Toggle optimistic |
| Clic couverture (navigation) | ~200ms | Démonte page + remonte nouvelle page + fetches |
| Saisie recherche | ~30ms | Input controlled, debounce 400ms |
| Tab/ArrowRight ghost | ~20ms | `setQ(ghost)` instantané |

**Le point faible** : la navigation entre pages. Cliquer sur une couverture depuis Explorer :
1. React Router démonte ExplorePage (~5ms)
2. Monte BookPageRoute → affiche skeleton (~10ms)
3. `useBookBySlug` fetch → affiche le contenu (~200-400ms)

Le skeleton compense bien, mais il y a un flash blanc pendant le démontage/remontage (~16ms de frame). Pas de transition de page.

---

## 6. BookPage — les 27 états

BookPage déclare **27 variables d'état** (useState + hooks) dans un seul composant :

```
Hooks : dbStatus, statusLoading, alreadyRead, setStatus, removeStatus, updateFields
        dbRating, setRating
        dbReviews, reviewsLoading, refetchReviews
        dbQuotes, quotesLoading, refetchQuotes
        user
        likedReviews, initLikedReviews, toggleReviewLike
        likedQuotes, initLikedQuotes, toggleQuoteLike
        toast, showToast
        bookLists

Local : liveBook, st, ur, bt, showCitationTooltip, showReviewForm,
        reviewText, reviewSpoiler, reviewSaving, showQuoteForm,
        quoteText, quoteSaving, finDate, noDate, dateError, isReread,
        tagInput, tags, loginModal, showEnrichModal, enrichToast,
        similarBooks
```

Chaque `setState` sur n'importe lequel de ces 27 états cause un re-render **complet** du composant (1024 lignes de JSX). C'est le coeur du problème de performance.

**Fix structurel** : découper BookPage en sous-composants :
- `BookHero` (couverture, métadonnées, rating box)
- `BookActions` (pills, date, reread, tags)
- `BookReviews` (liste + formulaire)
- `BookQuotes` (liste + formulaire)
- `BookSidebar` (description, où lire, dans des listes, similaires)

Chaque sous-composant ne re-rend que quand ses props changent (si memoizé).

---

## 7. Actions par priorité

### Quick wins (< 30 min, impact fort)

**1. Ajouter `loading="lazy"` à `Img.jsx`** — 2 min
```jsx
<img src={src} alt="" loading="lazy" ... />
```
Exception : ajouter une prop `eager` pour le hero de BookPage.
Impact : bande passante réseau sur Explorer/Profil.

**2. Memoizer les IDs passés à `useLikes`** — 10 min
```jsx
// Dans chaque page qui utilise useLikes :
const reviewIds = useMemo(() => dbReviews.map(r => r.id), [dbReviews]);
```
Fichiers : BookPage, ExplorePage, FeedPage, CitationsPage.
Impact : évite le recalcul du `.join(",")` à chaque render.

**3. `useCallback` sur `goToBook` dans NavigationContext** — 2 min
Impact : évite l'invalidation de tous les consommateurs de `useNav()` à chaque navigation.

**4. `useMemo` sur `value` dans AuthContext** — 2 min
Impact : préventif — évite les re-renders inutiles de l'arbre si `AuthProvider` re-rend.

**5. Extraire les constantes `style={{...}}` des listes** — 15 min
Les styles récurrents (`{ color: "var(--text-tertiary)" }`, `{ color: "var(--text-primary)" }`) devraient être des constantes module-level. Fichiers prioritaires : BookPage, FeedPage.

### Refactors moyens (1-2h, impact fort)

**6. `React.memo` sur les composants lourds dans les listes** — 1h

Prioriser dans cet ordre :
1. `LikeButton` — rendu dans chaque review/quote/feed item
2. `Img` — rendu dans chaque couverture
3. `ContentMenu` — rendu dans chaque review/quote
4. Extraire le feed item de `FeedPage` en composant `FeedItem` + `React.memo`
5. Extraire la review card de `BookPage` en composant `ReviewCard` + `React.memo`

**7. Découper BookPage en sous-composants** — 2h

27 états dans un composant de 1024 lignes. Chaque `setState` re-rend tout. Découper en :
- `BookHero` (static après chargement)
- `BookActions` (pills, date, tags — interactif)
- `BookReviewsTab` (reviews + formulaire)
- `BookQuotesTab` (quotes + formulaire)

Impact : un `setSt("Lu")` ne re-rend plus les reviews. Un `setReviewText(...)` pendant la saisie ne re-rend plus le hero.

### Refactors structurants (3h+, transforme l'UX)

**8. TanStack Query** — 3h (déjà recommandé dans l'audit #2)

Élimine les re-fetches sur navigation retour. Cache stale-while-revalidate. Dedup automatique. Devtools.

Impact : la navigation retour est **instantanée** (données en cache). Les navigations aller affichent les données stale pendant le refetch.

**9. Code splitting avec React.lazy** — 30 min (déjà recommandé dans l'audit #1)

Réduit le bundle initial de 725 KB à ~450 KB. Le LCP passe de ~2.5s à ~1.8s.

---

## Résumé

| Action | Impact | Effort |
|--------|--------|--------|
| `loading="lazy"` sur Img | Bande passante réseau | 2 min |
| `useMemo` sur les IDs passés à useLikes | -1 recalcul/render | 10 min |
| `useCallback` goToBook + `useMemo` AuthContext | Préventif re-renders | 5 min |
| Extraire styles constants | Prérequis pour memo | 15 min |
| `React.memo` sur composants listes | **-50% re-renders** dans les listes | 1h |
| Découper BookPage | **-70% re-renders** BookPage | 2h |
| TanStack Query | **Navigation retour instantanée** | 3h |
| Code splitting | **-40% LCP** | 30 min |

**Le problème #1 n'est pas les re-renders** — c'est l'**absence de cache client**. Un re-render superflu coûte ~1ms. Un re-fetch Supabase coûte ~200ms. Prioriser TanStack Query (audit #2) avant de chasser les re-renders.

**Le problème #2 est BookPage** — 27 états, 1024 lignes, zéro découpage. Chaque keystroke dans le formulaire de critique re-rend les covers similaires. Le découpage en sous-composants est le fix structurel.
