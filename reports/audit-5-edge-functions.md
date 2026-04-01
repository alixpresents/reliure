# Audit #5 — Edge Functions & appels API externes

> Date : 1 avril 2026
> Stack : Supabase Edge Functions (Deno) + Google Books + BnF SRU + Open Library + Anthropic Claude Haiku
> Région : eu-west-3 (Paris)

---

## 1. Inventaire des edge functions

| Fonction | Lignes | Imports externes | Cold start estimé | Appels API externes | Cache | Timeout explicite |
|----------|-------:|------------------|-------------------|---------------------|-------|-------------------|
| **book_import** | 463 | `@supabase/supabase-js` | ~150-250ms | Google Books, Open Library, BnF SRU (×3 parallel) | ❌ Aucun | ✅ 5s par source |
| **smart-search** | 169 | `@supabase/supabase-js` | ~100-200ms | Anthropic API (×1) | ✅ `search_cache` 7j | ❌ **Aucun** |
| **book_ai_enrich** | 263 | `@supabase/supabase-js` | ~100-200ms | Anthropic API, Open Library, BnF couverture, Google Books couverture (séquentiel) | ❌ Aucun | ❌ **Aucun** |
| **find_cover** | 96 | `deno.land/std (serve)` | ~80-150ms | Open Library, BnF couverture, Google Books (×2) (séquentiel) | ❌ Aucun | ✅ 3-4s par source |

### Estimation cold start

Les 4 fonctions importent `@supabase/supabase-js` via `esm.sh`, un CDN qui transpile les packages npm pour Deno. Le premier appel après un cold start doit résoudre et télécharger ce module (~200ms). Les appels suivants (warm) n'ont pas ce coût.

**`find_cover`** utilise `deno.land/std@0.168.0/http/server.ts` (ancien pattern `serve()`) au lieu de `Deno.serve()` (natif). L'import `deno.land/std` ajoute une couche réseau supplémentaire au cold start par rapport au natif.

---

## 2. Pipeline de recherche — bout en bout

### Diagramme séquentiel

```
User tape "victor hugo"
     │
     ├─ 0ms     : keystroke → debounce démarre (400ms)
     │
     ├─ 400ms   : debounce fire → Search.jsx lance en parallèle :
     │            ├── searchBooks(q)
     │            └── fetchUsers(q)
     │
     │  searchBooks(q) interne :
     │  ├─ +0ms   : Supabase RPC search_books_v2           ── ~50-100ms ──┐
     │  │                                                                  │
     │  ├─ +100ms : skip logic évalue dbResults.length                     │
     │  │          SI ≥ 3 résultats DB → SKIP Google (✅ best case)        │
     │  │          SINON → fetchGoogleBooks(q)             ── ~400-800ms ──┤
     │  │                                                                  │
     │  └─ retour résultats dédupliqués                                    │
     │                                                                     │
     ├─ 500ms   : résultats affichés (best case, DB suffit)                │
     │    OU                                                               │
     ├─ 1200ms  : résultats affichés (avec Google)                         │
     │                                                                     │
     │  En parallèle (si aiEnabled) :                                      │
     │  ├─ 0ms   : useSmartSearch debounce démarre (600ms)                 │
     │  ├─ 600ms : debounce fire → supabase.functions.invoke("smart-search")
     │  │          edge function :                                         │
     │  │          ├─ check search_cache                   ── ~30ms ──┐    │
     │  │          │  SI cache hit → retour immédiat                  │    │
     │  │          │  SINON :                                         │    │
     │  │          │  ├─ Anthropic API (Haiku)           ── ~1-3s ──┐ │    │
     │  │          │  └─ upsert search_cache             ── ~20ms   │ │    │
     │  │          └─ retour JSON                                   │ │    │
     │  └─ ~1600-3600ms : résultats IA affichés                     │ │    │
     │                                                              │ │    │
     └──────────────────────────────────────────────────────────────┘ │    │
                                                                     │    │
Timeline totale :                                                    │    │
  Best case  (DB ≥ 3, cache IA hit)  : ~500ms  résultats + ~630ms IA│    │
  Good case  (DB ≥ 3, pas d'IA)      : ~500ms  résultats, IA skip   │    │
  Worst case (DB < 3, Google, IA)     : ~1200ms résultats + ~3600ms IA
```

### Temps total par scénario

| Scénario | Résultats classiques | Résultats IA | Total perçu |
|----------|---------------------:|-------------:|------------:|
| **Best** : DB ≥ 3, IA cache hit | 500ms | 660ms | 660ms |
| **Good** : DB ≥ 3, IA désactivée | 500ms | — | 500ms |
| **Typical** : DB < 3, Google ok, IA miss | 1200ms | 2600ms | 2600ms |
| **Worst** : DB < 3, Google lent, IA lente | 1600ms | 4200ms | 4200ms |

---

## 3. Analyse détaillée par function

### 3.1 book_import — ✅ Bien architecturée

**Flux** :
```
Client → edge function
  ├─ 1. Check ISBN existant en base                    ~30ms
  ├─ 2. Promise.all([Google, OpenLibrary, BnF])        ~max(800, 500, 1400) = ~1400ms
  ├─ 3. Merge des sources (priorité par champ)         ~0ms
  ├─ 4. Anti-doublons findByTitleAuthor                ~50ms
  ├─ 5. generateSlug (1-4 queries séquentielles)       ~30-120ms
  └─ 6. INSERT books + retour                          ~30ms
                                              Total : ~1500-2000ms
```

**Points positifs** :
- ✅ Les 3 sources API sont appelées en `Promise.all` — parallélisation correcte
- ✅ Chaque source a un `AbortSignal.timeout(5000)` — 5s timeout
- ✅ Chaque source a un `.catch()` qui retourne `null` — une failure n'empêche pas les autres
- ✅ Logging structuré `[book_import]` avec indicateurs Google/OL/BnF
- ✅ Anti-doublons avant insertion (ISBN + titre normalisé)

**Problèmes identifiés** :

**P1. `generateSlug` fait 1-4 queries séquentielles** — FAIBLE
Chaque appel `exists(slug)` est un `SELECT id FROM books WHERE slug = $1 LIMIT 1`. En pire cas (4 collisions), c'est 4 queries séquentielles (~30ms chacune). Acceptable pour un import, pas critique.

**P2. `findByTitleAuthor` fait `SELECT * FROM books`** — MOYEN
```typescript:supabase/functions/book_import/index.ts:323-326
const { data: candidates } = await supabase
  .from("books")
  .select("*")     // ← SELECT * alors que seuls title, authors, id sont utiles
  .ilike("title", `%${firstWord}%`)
  .limit(20);
```
Ramène 20 rows avec toutes les colonnes (description, genres, etc.) pour comparer uniquement `title` et `authors`. Gaspillage de bande passante.

**P3. Pas de cache sur les résultats d'import** — INFO
Si un utilisateur importe un livre via Google Results (pas d'ISBN), l'edge function n'est pas appelée. Si l'ISBN existe déjà en base, le check initial court-circuite correctement. Pas de vrai problème ici — c'est un import ponctuel, pas une recherche répétitive.

### 3.2 smart-search — ⚠️ Timeout absent sur Anthropic

**Flux** :
```
Client → edge function
  ├─ 1. Check search_cache                            ~30ms
  │     SI hit → retour immédiat (+ update hit_count fire-and-forget)
  │     SINON :
  ├─ 2. fetch("api.anthropic.com/v1/messages")         ~1000-3000ms ❌ PAS DE TIMEOUT
  ├─ 3. Parse JSON response                            ~0ms
  └─ 4. Upsert search_cache                           ~30ms
                                              Total : ~1100-3100ms (miss), ~30ms (hit)
```

**Problèmes identifiés** :

**P4. AUCUN timeout ni AbortController sur l'appel Anthropic** — CRITIQUE
```typescript:supabase/functions/smart-search/index.ts:112-126
const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
});
// ← Pas de signal: AbortSignal.timeout()
```
Si l'API Anthropic est lente ou en panne, la fonction attend indéfiniment (jusqu'au timeout global Supabase Edge Functions de 150s). L'utilisateur voit "Recherche approfondie…" pendant potentiellement 2 minutes 30.

**P5. Le `abortRef` côté client ne tue pas la requête HTTP** — MOYEN
```javascript:src/hooks/useSmartSearch.js:60-62
const { data, error } = await supabase.functions.invoke(
  "smart-search",
  { body: { query } },
);
```
`supabase.functions.invoke()` ne supporte pas la propagation de l'`AbortController` comme signal HTTP. Le `controller.signal.aborted` check à la ligne 66 empêche juste la mise à jour du state React — la requête HTTP et l'appel Anthropic continuent à tourner côté serveur, gaspillant des tokens et du temps de compute.

**P6. `hit_count` update est fire-and-forget sans error handling** — COSMÉTIQUE
```typescript:supabase/functions/smart-search/index.ts:93-97
supabase
  .from("search_cache")
  .update({ hit_count: (cached.hit_count || 0) + 1 })
  .eq("query_normalized", normalizedQuery)
  .then(() => {});
```
Le `.then(() => {})` avale les erreurs silencieusement. Pas critique puisque c'est un compteur analytics, mais un `.catch(console.error)` serait mieux.

**Point positif** :
- ✅ Le cache `search_cache` fonctionne correctement (7 jours, upsert, clé normalisée)
- ✅ Retourne toujours 200 même en erreur (ne casse jamais la recherche)
- ✅ Check `ANTHROPIC_API_KEY` avant appel, graceful degradation

### 3.3 book_ai_enrich — ⚠️ Cascade séquentielle lente

**Flux** :
```
Client → edge function
  ├─ A. fetchFromHaiku(title, author)                  ~1000-3000ms ❌ PAS DE TIMEOUT
  │     (séquentiel — attend que Haiku finisse)
  ├─ B. fetchOpenLibrary(olTitle, olAuthor)             ~300-800ms   ❌ PAS DE TIMEOUT
  │     (séquentiel — attend les résultats IA pour le titre canonique)
  ├─ C. findCover(isbn, coverId, title, author)         ~800-3000ms  ❌ PARTIELLEMENT
  │     └─ cascade de 4-5 sources, SÉQUENTIELLE (HEAD request par candidat)
  └─ D. Fusion + retour                               ~0ms
                                              Total : ~2100-6800ms
```

**Problèmes identifiés** :

**P7. Aucun timeout sur les appels Anthropic et Open Library** — CRITIQUE
```typescript:supabase/functions/book_ai_enrich/index.ts:43-56
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
});
// ← Pas de AbortSignal.timeout()
```
Même problème que smart-search. L'appel Haiku peut prendre indéfiniment.

```typescript:supabase/functions/book_ai_enrich/index.ts:94-95
const res = await fetch(url);  // Open Library search
// ← Pas de timeout du tout
```

**P8. `findCover` teste les URLs séquentiellement** — MOYEN
```typescript:supabase/functions/book_ai_enrich/index.ts:171-182
for (const url of candidates) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    // ← Chaque HEAD request attend la précédente
    // ← Pas de timeout sur les HEAD requests
```
4-5 candidats testés un par un. Si chaque HEAD prend 500ms et qu'aucun ne marche, c'est 2-3s gaspillées. Le `for` séquentiel est correct en logique (on veut la première qui marche par ordre de priorité), mais les HEAD requests n'ont aucun timeout.

**P9. Dépendance séquentielle B→A non justifiée à 100%** — MOYEN
`fetchOpenLibrary` utilise `aiData?.title || title` pour la requête. L'idée est que Haiku canonicalise le titre. En pratique, le titre fourni par l'utilisateur est souvent suffisant. On pourrait lancer A et B en parallèle, puis utiliser le titre IA pour un fallback OL si le premier OL n'a rien trouvé.

**P10. Pas de cache** — MOYEN
Si un utilisateur lance un enrichissement IA sur un livre, puis annule et réessaie, tous les appels API sont refaits. Pas de cache côté function ni côté client. C'est un enrichissement batch (BackfillPage) donc le volume est limité, mais le coût est réel ($0.0005/livre × tokens Haiku + latence).

### 3.4 find_cover — ⚠️ Pattern ancien + cascade séquentielle

**Flux** :
```
Client → edge function
  ├─ 1. Open Library cover par ISBN (HEAD)             ~200-500ms
  ├─ 2. BnF cover par ISBN (HEAD)                      ~300-800ms
  ├─ 3. Open Library search titre+auteur               ~300-800ms  ✅ timeout 3s
  ├─ 4. Google Books par ISBN                          ~400-800ms  ✅ timeout 3s
  ├─ 5. Google Books search titre+auteur               ~400-800ms  ✅ timeout 3s
  └─ isValidImageUrl pour chaque candidat (GET)         ~200-500ms  ✅ timeout 4s
                                              Total : ~600-4000ms
```

**Problèmes identifiés** :

**P11. Ancien pattern `serve()` au lieu de `Deno.serve()`** — FAIBLE
```typescript:supabase/functions/find_cover/index.ts:1
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
```
Le `deno.land/std@0.168.0` est une ancienne version (les 3 autres fonctions utilisent `Deno.serve()` natif). Cold start légèrement plus lent à cause de l'import réseau.

**P12. `isValidImageUrl` fait un GET au lieu d'un HEAD** — MOYEN
```typescript:supabase/functions/find_cover/index.ts:17
const res = await fetch(url, {
  method: 'GET',           // ← Télécharge l'image entière
  signal: AbortSignal.timeout(4000),
  redirect: 'follow'
})
```
Fait un GET complet (télécharge l'image) juste pour vérifier que c'est bien une image. Un HEAD suffirait, comme dans `book_ai_enrich.findCover`. Pour une image de 200 KB, c'est 200 KB de bande passante gaspillée par candidat.

**P13. Double appel Google Books (par ISBN puis par titre)** — MOYEN
Les étapes 4 et 5 font chacune un appel Google Books API. C'est 2 appels quota sur les 1000/jour. Si l'étape 4 (par ISBN) échoue, l'étape 5 (par titre) est un fallback raisonnable, mais les deux comptent sur le quota.

**P14. `GOOGLE_BOOKS_API_KEY` vs `GOOGLE_BOOKS_KEY`** — BUG POTENTIEL
```typescript:supabase/functions/find_cover/index.ts:51
`&key=${Deno.env.get('GOOGLE_BOOKS_API_KEY')}`
```
```typescript:supabase/functions/book_import/index.ts:14
const key = Deno.env.get("GOOGLE_BOOKS_KEY");
```
Deux noms d'env var différents pour la même clé API Google Books ! `find_cover` utilise `GOOGLE_BOOKS_API_KEY`, `book_import` utilise `GOOGLE_BOOKS_KEY`. Si l'une est définie et pas l'autre, une des deux fonctions perd l'accès à Google Books silencieusement (pas de clé → requêtes anonymes → quota plus restrictif).

---

## 4. Gestion du quota Google Books (1000 req/jour)

### 4.1 Points de consommation

| Appelant | Quand | Req/appel | Conditionnel ? |
|----------|-------|----------:|---------------|
| `searchBooks()` client | Chaque recherche (si DB < 3) | 1 | ✅ Skip logic |
| `book_import` edge fn | Chaque import par ISBN | 1 | ❌ Toujours |
| `find_cover` edge fn | Enrichissement couverture | 1-2 | ❌ Toujours |
| `fetchGoogleBooks` client VITE_KEY | Recherche directe | 1 | ✅ Skip logic |

### 4.2 Skip logic — analyse

```javascript:src/lib/googleBooks.js:209-213
const dbSufficient = dbResults.length >= 3;
const isbnFound = isISBN && dbResults.length >= 1;
const skipGoogle = dbSufficient || isbnFound;
```

**Verdict : correctement implémentée.**

- ✅ Le seuil de 3 résultats DB est raisonnable (avec 3830+ livres en base, les requêtes courantes sont couvertes)
- ✅ ISBN trouvé en DB → skip (pas besoin de Google pour confirmer)
- ✅ Le logging structuré `[search-analytics]` trace chaque décision de skip avec `query`, `skipped`, `skipReason`
- ✅ Le cache in-memory client (5 min, max 50) évite les requêtes répétées pour la même query

### 4.3 Estimation de consommation quotidienne

Avec 3830+ livres en base et la skip logic :
- **Recherches** : ~60% skippées (estimation CLAUDE.md). Sur 100 recherches/jour → ~40 appels Google.
- **Imports** : les imports sont rares en usage normal (~5-10/jour). 1 appel Google chacun.
- **find_cover** : enrichissement batch uniquement, pas d'usage quotidien normal.

**Estimation : ~50 appels/jour en usage normal → bien en dessous du quota de 1000.**

### 4.4 Problèmes quota

**P15. Aucun fallback si quota atteint (429)** — MOYEN

Côté client :
```javascript:src/lib/googleBooks.js:127-128
const res = await fetch(url);
if (!res.ok) return [];  // ← 429 retourne [] silencieusement
```
Côté edge function :
```typescript:supabase/functions/book_import/index.ts:15
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
if (!res.ok) return null;  // ← 429 retourne null silencieusement
```

Les 429 sont gérés gracieusement (pas de crash), mais :
- Aucun log spécifique "quota exceeded" → difficile de détecter le problème
- Aucun circuit breaker → les 960 appels suivants vont aussi échouer en 429
- Le client continue d'appeler Google Books même après un 429

**P16. Le logging analytics ne distingue pas "Google a retourné 0 résultats" de "Google a retourné une erreur"** — FAIBLE
`googleRaw: 0` peut signifier "pas de résultats" ou "erreur 429/500". Pas de champ `googleError` dans les logs.

### 4.5 Exploitabilité des analytics

```javascript:src/lib/googleBooks.js:236-247
console.log("[search-analytics]", JSON.stringify({
  query, ts, db, googleCalled, googleRaw, googleFiltered,
  googleDeduped, googleUseful, skipped, skipReason,
}));
```

✅ **Bien structuré** : JSON parseable, préfixe greppable `[search-analytics]`.
✅ **Champs utiles** : `skipped`, `skipReason` permettent de calculer le taux de skip.
⚠️ **Uniquement côté client** : ces logs sont dans la console navigateur, pas dans les logs Vercel. Pour analyser le taux de skip en production, il faudrait soit :
- Un endpoint analytics serveur
- Vercel Web Analytics custom events (mais c'est Pro)
- Extraire les logs navigateur via un outil de monitoring type Sentry/LogRocket

---

## 5. CORS et sécurité

### 5.1 Headers CORS

Les 4 fonctions utilisent le même pattern :
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://reliure.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Problèmes** :

**P17. Origin hardcodée — ne supporte pas le domaine custom** — MOYEN
Le `TODO` dans chaque fichier le confirme :
```
// TODO: ajouter https://reliure.app quand le domaine custom sera configuré
```
Quand le domaine custom sera ajouté, il faudra modifier les 4 fonctions. Une solution serait de vérifier l'origin dynamiquement :
```typescript
const ALLOWED = ["https://reliure.vercel.app", "https://reliure.app"];
const origin = req.headers.get("origin") || "";
const corsOrigin = ALLOWED.includes(origin) ? origin : ALLOWED[0];
```

**P18. Pas de `Access-Control-Allow-Methods`** — COSMÉTIQUE
Les fonctions répondent à `OPTIONS` mais ne spécifient pas les méthodes autorisées. Les navigateurs modernes sont tolérants mais c'est hors spec.

**P19. Pas de `Vary: Origin`** — COSMÉTIQUE
Si un CDN ou proxy cache la réponse, l'absence de `Vary: Origin` pourrait servir la mauvaise origin à un autre domaine.

### 5.2 JWT / Auth

| Fonction | `verify_jwt` | Risque |
|----------|:------------:|--------|
| book_import | non spécifié (défaut: true sur Supabase) | ✅ OK |
| smart-search | non spécifié (défaut: true) | ✅ OK |
| book_ai_enrich | `true` (config.toml) | ✅ OK |
| find_cover | `true` (config.toml) | ✅ OK |

`smart-search` et `book_import` ne sont pas dans `config.toml`. Le défaut Supabase Edge Functions est `verify_jwt = true`, donc elles sont protégées. Mais c'est implicite — il serait plus sûr de le rendre explicite dans `config.toml`.

---

## 6. Pipeline d'import — analyse complète

### Flux d'import d'un livre depuis la recherche

```
User clique sur un résultat Google dans Search.jsx
  │
  ├─ importBook(googleBook)                                    src/lib/importBook.js
  │   ├─ findExistingBook(isbn13, title, authors)              ~50ms (2 queries)
  │   │   SI trouvé → retour immédiat (pas d'import)
  │   │
  │   ├─ SI isbn13 disponible :
  │   │   └─ supabase.functions.invoke("book_import")
  │   │       ├─ Check ISBN existant                           ~30ms
  │   │       ├─ Promise.all([Google, OL, BnF])               ~1400ms (3 API parallel)
  │   │       ├─ findByTitleAuthor (anti-doublons)             ~50ms
  │   │       ├─ generateSlug (1-4 queries)                   ~30-120ms
  │   │       └─ INSERT books                                 ~30ms
  │   │                                          Total edge : ~1500-2000ms
  │   │
  │   ├─ SI pas d'isbn13 OU edge function échoue :
  │   │   └─ Client-side import (Google Books data only)
  │   │       ├─ generateBookSlug                              ~30-120ms
  │   │       └─ INSERT books                                 ~30ms
  │   │                                       Total fallback : ~60-200ms
  │   │
  │   └─ Retour du livre (DB row)
  │
  └─ Navigation vers /livre/:slug
```

**Observation** : le double anti-doublons (client-side `findExistingBook` + server-side `findByTitleAuthor` + check ISBN) est redondant mais sûr. Le coût est ~50ms client + ~80ms serveur = 130ms de vérification. Acceptable pour un import ponctuel.

---

## 7. Optimisations recommandées (par priorité)

### Priorité 1 — Ajouter `AbortSignal.timeout()` sur les appels Anthropic (~0 effort, impact critique)

**Fonctions** : `smart-search`, `book_ai_enrich`

```typescript
// smart-search/index.ts:112
const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  signal: AbortSignal.timeout(8000),  // ← AJOUTER : 8s max
});

// book_ai_enrich/index.ts:43
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { ... },
  body: JSON.stringify({ ... }),
  signal: AbortSignal.timeout(8000),  // ← AJOUTER : 8s max
});
```

8s est raisonnable : Haiku répond en 1-3s normalement, 8s couvre les pics de latence sans bloquer indéfiniment.

**Ajouter aussi sur Open Library dans `book_ai_enrich`** :
```typescript
// book_ai_enrich/index.ts:94-95
const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
```

Et sur les HEAD requests dans `book_ai_enrich.findCover` :
```typescript
// book_ai_enrich/index.ts:173
const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) });
```

**Impact** : empêche une edge function de tourner 150s (et de coûter en compute) si Anthropic est lent.

### Priorité 2 — Circuit breaker Google Books (quota 429) (~30 min, impact moyen)

Ajouter un circuit breaker côté client pour arrêter d'appeler Google Books après un 429 :

```javascript
// src/lib/googleBooks.js
let googleDisabledUntil = 0;

async function fetchGoogleBooks(query) {
  if (Date.now() < googleDisabledUntil) {
    console.log("[search-analytics] Google Books circuit breaker active");
    return [];
  }
  // ... fetch existant ...
  const res = await fetch(url);
  if (res.status === 429) {
    googleDisabledUntil = Date.now() + 60 * 60 * 1000; // Désactiver 1h
    console.warn("[search-analytics] Google Books quota exceeded — disabled for 1h");
    return [];
  }
  // ...
}
```

**Impact** : évite ~960 requêtes 429 inutiles après un dépassement de quota. Améliore la latence (pas d'attente Google) et les logs (signal clair).

### Priorité 3 — Normaliser la variable d'env Google Books API key (~2 min, évite un bug silencieux)

| Fonction | Variable actuelle |
|----------|-------------------|
| `book_import` | `GOOGLE_BOOKS_KEY` |
| `find_cover` | `GOOGLE_BOOKS_API_KEY` |
| `googleBooks.js` client | `VITE_GOOGLE_BOOKS_KEY` |

Choisir un nom unique (ex: `GOOGLE_BOOKS_KEY` partout) et mettre à jour `find_cover`.

### Priorité 4 — `find_cover` : GET → HEAD pour validation d'images (~5 min, économie bande passante)

```typescript
// find_cover/index.ts:17 — changer GET en HEAD
const res = await fetch(url, {
  method: 'HEAD',           // ← HEAD au lieu de GET
  signal: AbortSignal.timeout(4000),
  redirect: 'follow'
})
```

**Impact** : économise ~200 KB par candidat testé (5 candidats = ~1 MB par appel find_cover).

### Priorité 5 — Paralléliser A+B dans `book_ai_enrich` (~15 min, -500ms latence)

Lancer Haiku et Open Library en parallèle, puis utiliser le résultat IA pour un fallback OL si nécessaire :

```typescript
const [aiData, olDataDirect] = await Promise.all([
  fetchFromHaiku(title, authorStr, isbn13 || null),
  fetchOpenLibrary(title, authorStr),  // Avec le titre original
]);
// Si OL direct n'a rien trouvé ET Haiku a un titre canonique différent → retry OL
let olData = olDataDirect;
if (!olData && aiData?.title && aiData.title !== title) {
  olData = await fetchOpenLibrary(aiData.title, aiData.author || authorStr);
}
```

**Impact** : réduit la latence de ~500-800ms (le temps d'Open Library n'est plus bloqué par Haiku).

### Priorité 6 — CORS dynamique pour le domaine custom (~10 min)

Remplacer l'origin hardcodée dans les 4 fonctions :
```typescript
const ALLOWED_ORIGINS = [
  "https://reliure.vercel.app",
  "https://reliure.app",
  "http://localhost:5173",  // dev local
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
```

### Priorité 7 — Migrer `find_cover` vers `Deno.serve()` (~5 min)

Remplacer `import { serve } from "https://deno.land/std@0.168.0/http/server.ts"` + `serve(async (req) => {` par `Deno.serve(async (req) => {`. Supprime l'import réseau, cold start légèrement plus rapide.

### Priorité 8 (optionnelle) — Ajouter `find_cover` et `smart-search` dans config.toml

Rendre le `verify_jwt` explicite pour toutes les fonctions :
```toml
[functions.book_import]
verify_jwt = true

[functions.smart-search]
verify_jwt = true

[functions.book_ai_enrich]
verify_jwt = true

[functions.find_cover]
verify_jwt = true
```

---

## 8. Risques identifiés

### R1. Anthropic API down → smart-search bloquée 150s (CRITIQUE)

**Probabilité** : faible (Anthropic a un SLA élevé), mais quand ça arrive l'impact est sévère.
**Impact** : l'edge function tourne 150s (timeout Supabase), l'utilisateur voit "Recherche approfondie…" pendant tout ce temps, les tokens de compute Supabase sont consommés.
**Mitigation** : Priorité 1 (AbortSignal.timeout 8s).

### R2. Quota Google Books épuisé → dégradation silencieuse (MOYEN)

**Probabilité** : faible en usage normal (~50 req/jour sur 1000), mais possible en batch import ou si un scraper cible l'API.
**Impact** : toutes les recherches avec < 3 résultats DB retournent 0 résultat Google, sans indication à l'utilisateur.
**Mitigation** : Priorité 2 (circuit breaker + logging distinct).

### R3. BnF SRU instable → latence import augmentée (FAIBLE)

Le catalogue BnF a des périodes de maintenance et de lenteur. La BnF est la source la plus lente (~1400ms en moyenne).
**Impact** : dans `book_import`, BnF est dans le `Promise.all` donc son timeout 5s ne bloque pas si Google/OL répondent plus vite. Risque acceptable.

### R4. Variable d'env Google Books incohérente (MOYEN)

`GOOGLE_BOOKS_KEY` vs `GOOGLE_BOOKS_API_KEY` → si seule l'une est définie, `find_cover` fait des requêtes Google anonymes (quota plus restrictif, pas de clé API dans l'URL). Pas de log d'erreur — l'absence de clé est silencieuse.

### R5. Pas de rate limiting sur les edge functions (FAIBLE)

Supabase Edge Functions n'ont pas de rate limiting natif par défaut. Un utilisateur malveillant pourrait spammer `smart-search` et consommer du quota Anthropic.
**Mitigation actuelle** : `verify_jwt = true` limite aux utilisateurs authentifiés. Le cache `search_cache` amortit les requêtes répétées. Le risque est faible mais réel pour les tokens Anthropic ($).

---

## 9. Ce qui est déjà bien

- ✅ **`book_import` parallélise correctement** les 3 sources avec `Promise.all` + `.catch()` individuel
- ✅ **Timeouts sur `book_import`** : 5s par source externe, correctement implémenté
- ✅ **Cache `search_cache`** : 7 jours, upsert, clé normalisée — pattern correct
- ✅ **Skip logic Google Books** : bien calibrée, réduit ~60% des appels Google
- ✅ **Graceful degradation** : `smart-search` retourne toujours 200 même en erreur
- ✅ **Anti-doublons multicouche** : ISBN exact + titre normalisé, côté client ET serveur
- ✅ **Logging structuré** : `[book_import]`, `[search-analytics]` sont greppables
- ✅ **find_cover a des timeouts** : 3-4s sur les sources externes

---

## Résumé

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| P1 | Timeout Anthropic (`smart-search` + `book_ai_enrich`) | Critique — empêche 150s de blocage | 5 min |
| P2 | Circuit breaker Google Books (429) | Moyen — économise ~960 appels post-quota | 30 min |
| P3 | Normaliser `GOOGLE_BOOKS_KEY` / `GOOGLE_BOOKS_API_KEY` | Bug fix — évite perte silencieuse de clé | 2 min |
| P4 | `find_cover` GET → HEAD | Moyen — économise ~1 MB/appel | 5 min |
| P5 | Paralléliser Haiku + OL dans `book_ai_enrich` | Moyen — -500ms latence | 15 min |
| P6 | CORS dynamique multi-origin | Moyen — prépare le domaine custom | 10 min |
| P7 | Migrer `find_cover` vers `Deno.serve()` | Faible — cold start | 5 min |
| P8 | Expliciter `verify_jwt` dans config.toml | Cosmétique — lisibilité | 2 min |

**Quick win critique** : P1 (5 min) élimine le risque de blocage 150s sur les 2 fonctions qui appellent Anthropic.
