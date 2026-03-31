# Benchmark sources alternatives — Open Library & BnF SRU

> Généré le 2026-03-31. 30 queries identiques testées sur les 3 sources.

## Tableau comparatif

| Critère | Google Books | Open Library | BnF SRU |
|---|---|---|---|
| **Recall@3 global** | **24/30 (80%)** | 16/30 (53%) | 21/30 (70%) |
| Temps P50 | **828ms** | 4104ms | 1365ms |
| Temps P90 | **1343ms** | 10003ms | 2126ms |
| Temps moyen | **939ms** | 5274ms | 1354ms |
| Couvertures disponibles | **83%** | 42% | ~0% |
| Qualité métadonnées | **85%** | 0%* | 78% |
| Coût | 1000 req/jour | Illimité gratuit | Illimité gratuit |
| Éditions françaises | Bonne | Faible (67% FR) | **Exhaustive** |

*\* Open Library retourne les métadonnées mais le script mesure publisher+year+pageCount dans le top 3 — résultats très incomplets pour les éditions FR.*

## Recall@3 par catégorie

| Catégorie | Google Books | Open Library | BnF SRU |
|---|---|---|---|
| Titres populaires FR (10) | **9/10** | 1/10 | **9/10** |
| Auteurs seuls (5) | 2/5 | **5/5** | 2/5 |
| Queries partielles (5) | 4/5 | **4/5** | 3/5 |
| Mangas/BD (5) | **5/5** | 4/5 | 3/5 |
| Obscurs/Récents (5) | **4/5** | 2/5 | **4/5** |

## Analyse détaillée

### Google Books — le champion actuel
- **Forces** : meilleur recall sur les titres FR (9/10), rapide (~940ms), couvertures omniprésentes, métadonnées complètes
- **Faiblesses** : quota 1000 req/jour, échoue sur les recherches par auteur seul (2/5), échoue sur "1984" (retourne des livres *sur* 1984 avant le roman)
- **Verdicts** : reste la meilleure source pour la découverte en temps réel

### Open Library — décevante pour le catalogue FR
- **Forces** : excellent sur les auteurs (5/5 — Borges, Proust, Hugo, Zola, Camus), illimité
- **Faiblesses critiques** :
  - **1/10 sur les titres populaires FR** — catastrophique. Le filtre `language=fre` est ignoré : "L'étranger" retourne "The Stranger" en anglais, "Les Misérables" retourne l'édition anglaise, etc.
  - Temps de réponse excessifs : P50 à 4.1s, nombreux timeouts (10s)
  - Couvertures rares pour les éditions FR (42% global, mais surtout des éditions EN)
  - Métadonnées très pauvres pour les éditions françaises
- **Verdict** : **inutilisable comme source primaire pour les titres FR**. Potentiellement utile comme fallback pour les recherches par auteur.

### BnF SRU — excellente pour les métadonnées, trop lente en temps réel
- **Forces** :
  - **9/10 sur les titres populaires FR** — à égalité avec Google
  - Métadonnées excellentes (78%) : éditeur, date exacte, nombre de pages, ISBN
  - Catalogue exhaustif (dépôt légal français)
  - Illimité et gratuit
- **Faiblesses** :
  - Temps de réponse élevés : P50 1.4s, P90 2.1s — trop lent pour l'UX
  - **Pas de couvertures** (0/5 testées via le service ARK)
  - Faible sur les auteurs seuls (2/5) — retourne des biographies/études plutôt que les œuvres
  - Faible sur les queries partielles (3/5) — pas de matching fuzzy
  - Mangas récents absents ("Sakamoto Days" → 0 résultats)
- **Verdict** : **excellente comme source d'enrichissement asynchrone, pas pour le temps réel**

## Échecs notables

| Query | Google | Open Library | BnF | Commentaire |
|---|---|---|---|---|
| 1984 | ❌ | ❌ | ✅ | Google/OL retournent des livres *sur* l'année 1984 |
| Victor Hugo | ❌ | ✅ | ✅ | Google filtre `langRestrict=fr` mais priorise les biographies |
| Marcel Proust | ❌ | ✅ | ❌ | OL seule à trouver "Du côté de chez Swann" pour "Marcel Proust" |
| Je rouille | ❌ | ❌ | ✅ | Livre récent, seule la BnF (dépôt légal) le connaît |
| Sakamoto Days | ✅ | ❌ | ❌ | Manga récent, seul Google le trouve |

## Scénarios d'architecture

### Scénario A — Open Library remplace Google ❌ REJETÉ

OL a un recall@3 de **1/10 sur les titres FR** et des temps de 5s+. Inutilisable comme source primaire.

### Scénario B — BnF en enrichissement asynchrone ✅ RECOMMANDÉ

La BnF a un excellent recall sur les titres FR (9/10) et des métadonnées de qualité (éditeur, date, pages, ISBN). Mais elle est trop lente (1.4s P50) et n'a pas de couvertures.

**Architecture proposée :**
```
1. DB locale (search_books_v2) → ≥ 3 résultats ? → STOP
2. Google Books → afficher les résultats (pipeline actuel)
3. BnF SRU → background (après la réponse) :
   - Pour chaque livre importé via Google, requête BnF par ISBN
   - Si BnF retourne des métadonnées manquantes → UPDATE en base
   - Enrichit : éditeur (BnF > Google), date exacte, nombre de pages
```

**Impact estimé :**
- Zéro changement UX (BnF en background uniquement)
- Qualité des fiches livres améliorée (éditeur français, date exacte)
- Pas de surcharge quota Google (BnF complète, pas remplace)
- Déjà partiellement implémenté dans `book_import` (BnF par ISBN)

### Scénario C — Cascade à 3 niveaux ❌ REJETÉ

OL est trop faible pour servir de couche intermédiaire. La cascade DB → OL → Google ne ferait que ralentir l'UX sans réduire significativement les appels Google (OL ne trouve pas les titres FR).

### Scénario D — Google reste primaire ✅ RECOMMANDÉ (en complément du B)

Google reste la meilleure source de découverte en temps réel pour le catalogue FR. Le pipeline actuel (DB → Google avec skip logic) est déjà optimisé par l'Agent 2.

## Recommandation finale

**Scénario D + B : Google primaire + BnF enrichissement asynchrone.**

1. **Garder le pipeline actuel** : DB locale → Google Books (avec skip logic Agent 2)
2. **Ajouter un enrichissement BnF asynchrone** dans `book_import` :
   - Quand un livre est importé via Google, la BnF est déjà interrogée par ISBN (c'est déjà le cas !)
   - Vérifier que la priorité de fusion `mergeSources()` est optimale (BnF > Google pour éditeur/date — c'est déjà le cas)
   - Optionnel : job pg_cron qui enrichit les livres avec `publisher IS NULL` via BnF SRU par titre
3. **Investir dans l'Agent 5** (enrichissement proactif de la DB) pour réduire mécaniquement la dépendance Google
4. **Open Library** : ne pas investir de temps d'intégration. Le rapport qualité/temps est trop faible pour le catalogue FR.

**Complexité estimée :** Aucune modification de code immédiate nécessaire — le pipeline actuel est déjà optimal. L'enrichissement BnF fonctionne déjà dans `book_import`. Le ROI d'un investissement supplémentaire sur OL/BnF en recherche libre est faible comparé à l'enrichissement proactif de la DB locale.

**Fichiers concernés (si enrichissement pg_cron BnF) :**
- `migrations/xxx_bnf_enrichment_cron.sql` — nouveau job pg_cron
- `supabase/functions/bnf_enrich/index.ts` — nouvelle edge function (optionnel)
