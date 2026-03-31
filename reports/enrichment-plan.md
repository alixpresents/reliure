# Plan d'enrichissement — Base Reliure

> Généré le 2026-03-31. Basé sur l'analyse de ~200 livres curatés + cache smart-search.

## 1. Inventaire des manquants

| Métrique | Valeur |
|---|---|
| Total manquants identifiés | 118 |
| Priorité haute (cherchés + curatés) | 6 |
| Priorité moyenne (ISBN connu) | 93 |
| Priorité basse (pas d'ISBN) | 19 |
| Avec ISBN (importables directement) | 95 |
| Sans ISBN (recherche Google nécessaire) | 23 |

### Par catégorie

| Catégorie | Manquants |
|---|---|
| mangas_bd | 29 |
| contemporain_fr | 26 |
| cache_only | 21 |
| francophonie | 19 |
| essais | 11 |
| classiques_fr | 7 |
| international_traduit | 5 |

### Top 20 manquants

| # | Titre | Auteur | ISBN | Priorité | Catégorie |
|---|---|---|---|---|---|
| 1 | Ceux qui restent | Olivier Douzou | 9782330089558 | high | cache_only |
| 2 | Changer l'eau des fleurs | Valérie Perrin | 9782253068556 | high | cache_only |
| 3 | Rapide | Franck Thilliez | 9782253069522 | high | cache_only |
| 4 | La Fille qui rêvait d'un petit bidon d'essence et d'une allumette | David Lagercrantz | 9782253190357 | high | cache_only |
| 5 | Ru | Kim Thúy | — | high | francophonie |
| 6 | Guerre et Paix | Léon Tolstoï | 9782253098348 | high | international_traduit |
| 7 | Les Religieuses de Loudun | Michelet | — | medium | cache_only |
| 8 | Le Maître du Monde | Jules Verne | 9782253048770 | medium | cache_only |
| 9 | Le Maître de Ballantrae | Robert Louis Stevenson | 9782253048770 | medium | cache_only |
| 10 | Aghami | Odette Weulersse | 9782253048749 | medium | cache_only |
| 11 | Le Chemin de Kandahar | Franck Weulersse | 9782253045632 | medium | cache_only |
| 12 | La Fille du Nil | Franck Weulersse | 9782253048749 | medium | cache_only |
| 13 | La Joconde | E. L. James | — | medium | cache_only |
| 14 | Mona Lisa Overdrive | William Gibson | 9782253048749 | medium | cache_only |
| 15 | La Porte étroite | André Gide | 9782070360505 | medium | cache_only |
| 16 | Si le grain ne meurt | André Gide | 9782070360536 | medium | cache_only |
| 17 | Hamlet, prince de Danemark | William Shakespeare | 9782070360529 | medium | cache_only |
| 18 | Dadok | Éric Reinhardt | 9782072797032 | medium | cache_only |
| 19 | Un homme qui dort | Georges Perec | 9782070360505 | medium | cache_only |
| 20 | Trois hommes dans un bateau | Jérôme K. Jérôme | 9782253048749 | medium | cache_only |

## 2. Plan d'import

### Option A : Via edge function `book_import` (recommandé)
- **95 livres** importables directement par ISBN
- Consomme ~95 appels Google Books (1 par livre)
- Enrichissement automatique BnF + Open Library
- Qualité maximale (fusion 3 sources)
- Commande : `node scripts/batch-import-missing.mjs --apply --source edge --limit 50`

### Option B : Via BnF + Open Library (0 Google)
- **95 livres** importables sans Google
- Métadonnées BnF excellentes (éditeur, date, pages)
- Couvertures via Open Library (variable)
- Commande : `node scripts/batch-import-missing.mjs --apply --source direct --limit 50`

### Option C : Import complet (avec recherche Google pour les sans-ISBN)
- **118 livres** total
- Consomme ~118 appels Google
- Commande : `node scripts/batch-import-missing.mjs --apply --source google`

## 3. Projection d'impact

| Scénario | Livres en base | Skip logic estimé | Google calls/jour |
|---|---|---|---|
| Actuel | ~3737 | ~60% | ~400 |
| +95 (ISBN connus) | ~3832 | ~70% | ~300 |
| +118 (tous) | ~3855 | ~75-80% | ~200-250 |

### ROI par catégorie

Les classiques français et la littérature contemporaine offrent le meilleur ROI : ce sont les livres les plus recherchés sur une app francophone, et chaque ajout élimine potentiellement des dizaines de futures requêtes Google.

Les mangas offrent un ROI modéré : chaque tome est un livre distinct, donc le ratio livres-ajoutés/queries-économisées est plus faible.

## 4. Recommandation

**Phase 1** (immédiat) : Importer les 95 livres avec ISBN via `--source direct` (0 appel Google).
```
node scripts/batch-import-missing.mjs --apply --source direct --limit 50
```

**Phase 2** (si phase 1 OK) : Importer les restants via edge function (consomme Google).
```
node scripts/batch-import-missing.mjs --apply --source edge
```

**Phase 3** : Relancer `identify-missing-books.mjs` dans 2 semaines pour mesurer l'impact sur le cache et la skip logic.
