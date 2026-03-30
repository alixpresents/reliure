# Reliure - Audit technique complet

> Généré le 30 mars 2026. Couvre `src/`, `supabase/`, `migrations/`.

---

## 1. Bugs critiques

| # | Fichier | Ligne | Description | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 🔴 1 | `seed-journal.sql`, `create-seed-users.cjs` | 1, 16 | **Clés Supabase `service_role` en clair dans le repo.** Deux JWT `service_role` différents sont hardcodés. Quiconque a accès au repo peut contourner toute RLS et lire/écrire toute la base. | Révoquer immédiatement les clés dans le dashboard Supabase, les retirer de l'historique git (`git filter-repo`), utiliser uniquement des variables d'environnement. |
| 🔴 2 | `supabase/config.toml` | 2, 5 | **`verify_jwt = false` sur `book_ai_enrich` et `find_cover`.** Ces edge functions acceptent des requêtes de n'importe quelle source sans authentification. Un bot peut les appeler en boucle, consommant des crédits Anthropic. | Passer `verify_jwt = true` et transmettre le token Bearer depuis le client. |
| 🔴 3 | `migrations/004_search_cache.sql` | 15-16 | **RLS activée sans aucune policy.** `ALTER TABLE search_cache ENABLE ROW LEVEL SECURITY;` bloque tout le monde, y compris `service_role` via PostgREST. La table est inaccessible → `smart-search` ne peut ni lire ni écrire le cache. | Ajouter une policy : `CREATE POLICY "service_access" ON search_cache FOR ALL TO service_role USING (true);` |
| 🔴 4 | `src/hooks/useReadingStatus.js` | 29-51 | **Race condition dans `setStatus`.** L'état local est mis à jour avant la résolution de l'`await`. Si l'utilisateur clique rapidement "Lu" puis "Abandonné", des requêtes concurrentes peuvent écraser les résultats. | Ajouter un verrou (ref `isMutating`) ou annuler la requête précédente. |
| 🔴 5 | `src/hooks/usePublicProfile.js` | 12-23 | **Erreur `.single()` non gérée.** Si le username n'existe pas ou la requête échoue, le rejet de promesse n'est pas capturé → erreur console non catchée + profil undefined. | Destructurer `{ data, error }` et gérer `error` (rediriger vers 404). |
| 🔴 6 | `src/hooks/useBookBySlug.js` | 13-17 | **Même problème** que #5 : `.single()` sans check d'erreur. Slug invalide → crash silencieux. | Ajouter `if (error) { setLoading(false); return; }`. |

---

## 2. Bugs moyens

| # | Fichier | Ligne | Description | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 🟡 7 | `src/hooks/useFollow.js` | 12-33 | **Aucun error handling sur follow/unfollow.** Optimistic update mais si la DB échoue, l'UI montre un état faux sans revert. | Wrap dans try-catch, revert le state dans le catch. |
| 🟡 8 | `src/hooks/useLikes.js` | 41-46 | **Idem pour toggle like.** Insert/delete sans catch → UI désynchronisée en cas d'échec réseau. | Try-catch + revert `liked`/`count` dans le catch. |
| 🟡 9 | `src/pages/ProfilePage.jsx` | ~52 | **`console.error` dans `commitEdit` page update** mais pas de feedback utilisateur si la mise à jour de `current_page` échoue. | Afficher un toast d'erreur ou revert la valeur. |
| 🟡 10 | `src/pages/ExplorePage.jsx` | 178, 234 | **`window.location.reload()` comme callback de ContentMenu.** Hard refresh au lieu de state update — la page recharge entièrement pour supprimer un commentaire. | Exposer `refetch` depuis `usePopularReviews`/`usePopularQuotes`, ou remonter l'état. |
| 🟡 11 | `src/pages/FeedPage.jsx` | 80-86 | **`goToBook()` : requête async sans gestion d'erreur ni loading.** Si la requête Supabase échoue, `data` est null → `nav()` ne navigue nulle part, aucun feedback. | Ajouter `if (!data?.slug) return;` et un indicateur de chargement. |
| 🟡 12 | `src/pages/CitationsPage.jsx` | 70-73 | **INSERT quote sans check d'erreur.** Si l'insertion échoue, `logActivity` est appelé avec `data` potentiellement null → crash. | Destructurer `{ data, error }`, return si error. |
| 🟡 13 | `src/components/CreateListModal.jsx` | ~17 | **`await onCreate()` sans try-catch.** Si l'API échoue, le bouton reste bloqué sur "Création..." indéfiniment. | Wrap try-catch, afficher erreur, reset `saving`. |
| 🟡 14 | `src/components/CSVImport.jsx` | 232-250 | **Compteur skipped/imported incohérent** quand un doublon est détecté. La logique de comptage n'est pas symétrique entre le cas succès et le cas erreur 23505. | Restructurer : `if (!rsErr) imported++; else if (rsErr.code === "23505") skipped++;`. |
| 🟡 15 | `src/hooks/useProfileData.js` | 66-80 | **Comparaisons de dates par strings** (`finished_at >= "2026-01-01T00:00:00"`). Fragile — les timezones ne sont pas gérées, une date `2025-12-31T23:00:00Z` peut être comptée dans la mauvaise année. | Utiliser `new Date()` pour la comparaison. |
| 🟡 16 | `src/hooks/useListBySlug.js` | 62-113 | **Mutations de liste sans vérification d'ownership côté client.** Le code vérifie `if (!user)` mais pas `list.user_id !== user.id`. RLS protège, mais un attaquant avec un token peut tenter des mutations sur des listes d'autres users. | Ajouter `if (list.user_id !== user.id) return;`. |
| 🟡 17 | `supabase/functions/smart-search/index.ts` | 104-105 | **Logs de debug exposant la présence et la longueur de l'API key** dans les logs de production. | Supprimer les `console.log("DEBUG: ...")`. |
| 🟡 18 | `supabase/functions/smart-search/index.ts` | 146-151 | **Parse JSON d'une réponse Claude échoue silencieusement.** Retourne des résultats vides sans aucune indication d'erreur — indistinguable d'une vraie absence de résultats. | Logger l'erreur : `console.error("AI response parse failed:", cleaned)`. |
| 🟡 19 | `supabase/functions/book_import/index.ts` | ~348 | **Pas de validation du format ISBN en entrée.** Toute chaîne est acceptée et envoyée aux API externes, gaspillant des requêtes. | Valider : `if (!/^\d{10,13}$/.test(isbn)) return Response(400)`. |
| 🟡 20 | `migrations/004_search_cache.sql` | 18-23 | **Cron de nettoyage du cache commenté.** Les entrées expirées s'accumulent indéfiniment. | Décommenter le cron job ou ajouter un cleanup applicatif. |
| 🟡 21 | `src/components/ProtectedRoute.jsx` | 8 | **Retourne `null` pendant le chargement auth.** Flash blanc/vide avant affichage — mauvais CLS. | Retourner un Skeleton ou spinner centré. |

---

## 3. Performance

| # | Fichier | Ligne | Description | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 🟡 22 | `src/hooks/useExplore.js` | 146-156 | **`useAvailableGenres()` fetch ALL books sans LIMIT** pour extraire les genres. Sur une base de 10K+ livres, c'est une requête massive. | Agréger les genres côté serveur (RPC ou view materialisée). |
| 🟡 23 | `src/hooks/useReviews.js` | 35-40 | **`useMyReviews()` sans LIMIT.** Un utilisateur avec 200 critiques charge tout d'un coup. | Ajouter `.limit(50)` et implémenter la pagination. |
| 🟡 24 | `src/hooks/useLists.js` | 13-26 | **`useMyLists()` sans LIMIT ni pagination.** | `.limit(30)` |
| 🟡 25 | `src/pages/ProfilePage.jsx` | 584-596 | **`diaryMonths` recalculé à chaque render.** Map/filter/sort complexe sur les lectures terminées, non memoized. | Wrapper dans `useMemo(() => ..., [profileData.diaryBooks])`. |
| 🟡 26 | `src/pages/ListPage.jsx` | 75-91 | **Tri des items de liste recalculé à chaque render** avec `localeCompare`. | `useMemo(() => ..., [rawItems, sortBy])`. |
| 🟡 27 | `src/pages/ExplorePage.jsx` | 40-42 | **Trois hooks `useLikes` séparés** pour reviews, quotes et listes. Trois requêtes Supabase distinctes au lieu d'une seule. | Combiner les IDs dans un seul appel `useLikes([...ids], "mixed")` ou batcher. |
| 🟡 28 | `src/lib/googleBooks.js` | 35-45 | **Cache en mémoire avec éviction partielle.** Supprime UN SEUL entry expiré par insertion — si le cache grossit plus vite, il ne se vide jamais. | Supprimer TOUTES les entrées expirées lors de chaque insertion. |
| 🟡 29 | `supabase/functions/book_import/index.ts` | 15, 51, 105 | **Fetch Google/Open Library/BnF sans timeout** dans `book_import` (contrairement à `find_cover` qui utilise `AbortSignal.timeout`). | Ajouter `{ signal: AbortSignal.timeout(5000) }` à chaque `fetch()`. |
| 🟡 30 | `migrations/003_public_read_policies.sql` | 130-161 | **RLS policy `list_items` avec sous-requête `EXISTS` exécutée par ligne.** | Ajouter un index : `CREATE INDEX idx_lists_access ON lists(id, is_public, user_id);`. |
| 🟢 31 | `supabase/functions/book_import/index.ts` | 173-207 | **Boucle slug jusqu'à 100 requêtes séquentielles** pour trouver un slug unique. | Utiliser un pattern SQL atomique avec `ON CONFLICT` ou un `SELECT max(slug)`. |

---

## 4. Sécurité

| # | Fichier | Ligne | Description | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 🔴 32 | `seed-journal.sql`, `create-seed-users.cjs` | — | **Clés `service_role` exposées en clair** (détail en §1 #1). | Révoquer + variables d'env. |
| 🔴 33 | `supabase/config.toml` | 2, 5 | **Edge functions sans auth** (détail en §1 #2). | `verify_jwt = true`. |
| 🟡 34 | Toutes les edge functions | Headers | **CORS `Access-Control-Allow-Origin: *`** sur les 4 fonctions. Un site tiers peut appeler ces endpoints. | Restreindre au domaine de production : `https://reliure.app`. |
| 🟡 35 | `src/hooks/useActivity.js` | 5-13 | **`logActivity(userId, ...)` accepte n'importe quel userId.** Pas de vérification côté client que `userId === user.id`. RLS protège, mais défense en profondeur manquante. | Vérifier `userId === user.id` dans `logActivity`. |
| 🟡 36 | `src/components/Skeleton.jsx` | 2-14 | **Injection de styles dans le DOM via `document.head.appendChild`.** Pas de nonce CSP. | Déplacer les styles dans un fichier CSS ou utiliser un nonce si CSP est activé. |

---

## 5. Code mort et dette technique

| # | Fichier | Ligne | Description | Sévérité |
|---|---------|-------|-------------|----------|
| 🟡 37 | `src/pages/BookPage.jsx` | 104, 111, 114, 133 | `console.log` de debug (cover upload EnrichModal) laissés dans le code. | 🟡 |
| 🟡 38 | `src/pages/BackfillPage.jsx` | 74, 100, 282, 287, 295 | Multiples `console.log` de debug (enrichissement, cover repair, CSV). | 🟡 |
| 🟢 39 | `src/components/CSVImport.jsx` | 238, 256 | `console.warn` dans le flow d'import CSV — spam les logs en production. | 🟢 |
| 🟢 40 | `src/lib/importBook.js` | 26, 28 | `console.warn` pour les fallbacks d'import. | 🟢 |
| 🟢 41 | `src/hooks/useReadingStatus.js` | ~105 | `console.error` laissé dans le code. | 🟢 |
| 🟢 42 | `supabase/functions/smart-search/index.ts` | 104-105, 129-131 | `console.log("DEBUG: ...")` avec info API key — à supprimer impérativement. | 🟡 |
| 🟢 43 | `src/data/index.js` | 3-16 | Données mock (`BOOKS`, `QUOTES`) avec clés abrégées (t, a, c, y...) — utilisées en fallback quand la DB est vide. Pas vraiment "mort" mais dette. | 🟢 |
| 🟢 44 | `src/components/Search.jsx` | 118-125, 160-167, 254 | Logique de normalisation d'auteur dupliquée 3 fois dans le même fichier. | 🟢 |

---

## 6. Chargement et UX

| # | Fichier | Ligne | Description | Fix suggéré |
|---|---------|-------|-------------|-------------|
| 🟡 45 | `src/components/ProtectedRoute.jsx` | 8 | **Flash blanc pendant le chargement auth.** `return null` pendant `loading` → layout shift. | Retourner `<Skeleton.Card />` ou un spinner centré. |
| 🟡 46 | `src/pages/FeedPage.jsx` | 80-86 | **Pas d'indicateur de chargement dans `goToBook`.** L'utilisateur clique sur un titre, rien ne se passe pendant la requête slug. | Ajouter un état loading ou `cursor-wait`. |
| 🟡 47 | `src/pages/CitationsPage.jsx` | 67-86 | **Pas de feedback si la publication d'une citation échoue.** Le modal se ferme dans tous les cas (succès ou échec). | Afficher un toast d'erreur, ne fermer que si `data` est valide. |
| 🟡 48 | `src/components/Tag.jsx` | 3 | **`<span onClick>` sans `role="button"` ni `tabIndex`.** Inaccessible au clavier. | Ajouter `role="button" tabIndex={0} onKeyDown={...}`. |
| 🟡 49 | `src/components/InteractiveStars.jsx` | 12 | **`setTimeout` sans cleanup** : `setTimeout(() => setPop(0), 200)` peut fire après unmount. | Utiliser un `useEffect` cleanup ou un ref pour annuler. |
| 🟡 50 | `src/components/LikeButton.jsx` | 21 | **Même problème** : `setTimeout` sans cleanup sur l'animation pop. | Idem. |
| 🟢 51 | `src/components/Header.jsx` | 30 | **`z-100` n'existe pas dans Tailwind standard** (max `z-50`). Fonctionne si défini dans la config. | Vérifier `tailwind.config.js` ou utiliser `z-50`. |
| 🟢 52 | `src/pages/ArticlePage.jsx` | ~13 | **Fallback silencieux sur `JARTICLES[0]`** si le slug ne matche aucun article. L'utilisateur voit un autre article au lieu d'une 404. | Retourner un composant 404 si `!article`. |
| 🟢 53 | `src/lib/NavigationContext.jsx` | 9-11 | **`goToBook` peut naviguer vers `/livre/undefined`** si `book.slug`, `book._supabase?.slug` et `book.id` sont tous falsy. | Ajouter un guard : `if (!slug && !book.id) return;`. |
| 🟢 54 | `src/pages/TagPage.jsx` | ~49 | **`book.a.split(" ").pop()`** crash si `book.a` est null/undefined. | `(book.a || "").split(" ").pop()`. |

---

## Résumé

| Sévérité | Nombre |
|----------|--------|
| 🔴 Critique | 8 |
| 🟡 Moyen | 30 |
| 🟢 Mineur | 16 |
| **Total** | **54** |

### Top 5 actions immédiates

1. **Révoquer les clés `service_role` exposées** et les retirer de l'historique git (#1)
2. **Activer `verify_jwt = true`** sur les edge functions `book_ai_enrich` et `find_cover` (#2)
3. **Ajouter une RLS policy sur `search_cache`** pour que le cache IA fonctionne (#3)
4. **Ajouter error handling** sur les `.single()` dans `usePublicProfile` et `useBookBySlug` (#5, #6)
5. **Supprimer les `console.log("DEBUG: ...")`** de `smart-search` qui loggent des infos sensibles (#17)
