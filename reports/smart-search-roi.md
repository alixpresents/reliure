# Audit ROI smart-search (Haiku)

> Généré le 2026-03-31 11:59:14. Analyse de la table `search_cache`.

## 1. Métriques d'utilisation

| Métrique | Valeur |
|---|---|
| Total entrées cache | 55 |
| Actives (non expirées) | 55 |
| Expirées | 0 |
| Appels Haiku (misses) | 55 |
| Lectures cache (hits) | 37 |
| **Taux de cache hit** | **40.2%** |
| Entrées < 24h | 23 |
| Entrées < 7 jours | 55 |

### Distribution hit_count

> hit_count=1 signifie 0 relectures du cache (Haiku appelé puis jamais relu).

| Bucket | Entrées | % |
|---|---|---|
| 1 (jamais relu) | 47 | 85.5% |
| 2-3 | 5 | 9.1% |
| 4-10 | 1 | 1.8% |
| 11+ | 2 | 3.6% |

### Distribution nombre de livres par réponse

| Livres retournés | Entrées |
|---|---|
| 0 | 15 |
| 1 | 18 |
| 2 | 13 |
| 3 | 6 |
| 4 | 3 |

### Top 20 queries

| # | Query | Hits | Livres | Ghost |
|---|---|---|---|---|
| 1 | `l'etranger` | 14 | 1 | — |
| 2 | `ceux que l'on oublie difficilement` | 14 | 3 | — |
| 3 | `je rouille` | 5 | 2 | ✅ |
| 4 | `la religieuse` | 3 | 1 | — |
| 5 | `rapide` | 3 | 2 | — |
| 6 | `http://localhost:5173/livre/une-poignee-de-sable` | 2 | 0 | — |
| 7 | `religieuse` | 2 | 3 | ✅ |
| 8 | `maitre` | 2 | 3 | ✅ |
| 9 | `weulersse aghami` | 1 | 1 | — |
| 10 | `weulersse aghali` | 1 | 2 | — |
| 11 | `persona non` | 1 | 2 | ✅ |
| 12 | `⏺ la cause racine : pour un livre db sans slug, le code appelait importbook → findexistingbook → pouvait matcher un autre livre du meme auteur par coincidence. le fix evite completement ce detour : les resultats db sont deja en base, on navigue directement avec gb.slug ?? gb.dbid. si le slug est null, usebookbyslug fait un fallback .eq("id", uuid) qui existait deja.` | 1 | 0 | — |
| 13 | `ceux que l'on oublie difficilementa` | 1 | 1 | — |
| 14 | `les techniciens du sacre` | 1 | 1 | — |
| 15 | `les techniciens du sac` | 1 | 1 | — |
| 16 | `je rouill` | 1 | 1 | ✅ |
| 17 | `gioconda` | 1 | 2 | — |
| 18 | `andre gide` | 1 | 4 | — |
| 19 | `l'immoraliste` | 1 | 1 | — |
| 20 | `notre dame` | 1 | 2 | — |

### Coût estimé

| Métrique | Valeur |
|---|---|
| Coût/appel Haiku (est.) | $0.0012 |
| Coût total (55 appels) | $0.07 |
| Coût/1000 requêtes effectives | $0.72 |
| Requêtes effectives totales | 92 |

## 2. Qualité des résultats IA

Analyse des 52 livres suggérés par Haiku sur les 30 queries les plus fréquentes.

| Métrique | Valeur |
|---|---|
| Réponses vides (0 livre) | 15/55 (27.3%) |
| Avec ghost text | 16/55 (29.1%) |
| **Redondants avec DB** | **28/52 (53.8%)** |
| **Uniques (valeur ajoutée)** | **24/52 (46.2%)** |

### Exemples redondants

Livres suggérés par Haiku qui sont déjà en base (l'IA n'apporte rien) :

- `ceux que l'on oublie difficilement` → IA: "Ceux que l'on oublie difficilement" = DB: "Ceux que l'on oublie difficilement"
- `ceux que l'on oublie difficilement` → IA: "L'Oubli" = DB: "L'Oubli"
- `je rouille` → IA: "Je rouille" = DB: "Je rouille"
- `la religieuse` → IA: "La Religieuse" = DB: "La Religieuse"
- `religieuse` → IA: "La Religieuse" = DB: "La Religieuse"
- `persona non` → IA: "Persona Non Grata" = DB: "Persona non grata"
- `persona non` → IA: "Persona" = DB: "Persona non grata"
- `ceux que l'on oublie difficilementa` → IA: "Ceux que l'on oublie difficilement" = DB: "Ceux que l'on oublie difficilement"
- `les techniciens du sac` → IA: "Les Techniciens du sac" = DB: "Les Techniciens du sacré"
- `je rouill` → IA: "Je Rouille" = DB: "Je rouille"

### Exemples uniques

Livres suggérés par Haiku qui ne sont PAS en base (valeur ajoutée) :

- `l'etranger` → IA: "L'Étranger" par Albert Camus
- `ceux que l'on oublie difficilement` → IA: "Ceux qui restent" par Olivier Douzou
- `je rouille` → IA: "Changer l'eau des fleurs" par Valérie Perrin
- `rapide` → IA: "Rapide" par Franck Thilliez
- `rapide` → IA: "La Fille qui rêvait d'un petit bidon d'essence et d'une allumette" par David Lagercrantz
- `religieuse` → IA: "Suzanne Simonin, la Religieuse" par Denis Diderot
- `religieuse` → IA: "Les Religieuses de Loudun" par Michelet
- `maitre` → IA: "Maître et Marguerite" par Mikhaïl Boulgakov
- `maitre` → IA: "Le Maître du Monde" par Jules Verne
- `maitre` → IA: "Le Maître de Ballantrae" par Robert Louis Stevenson

### Ghost text (exemples)

- `je rouille` → ` — valérie perrin`
- `religieuse` → ` — denis diderot`
- `maitre` → `et Marguerite — mikhaïl boulgakov`
- `persona non` → ` Grata — jorge semprún`
- `je rouill` → `e — valérie perrin`

## 3. Recommandations

### ⚠️ Cache modéré (40.2% hit rate)

Le cache a un taux de hit moyen. Les queries sont variées et rarement répétées. Considérer allonger le TTL de 7 à 30 jours pour les entrées populaires (hit_count > 3).

### ⚠️ Redondance modérée IA/DB (53.8%)

Environ un tiers des suggestions IA sont redondantes. C'est normal — Haiku recommande les classiques qui sont aussi les plus présents en base. La skip logic devrait aider.

### ✅ Peu de réponses vides (27.3%)

Haiku retourne presque toujours des résultats pertinents. Le filtre d'activation fonctionne.

### Actions concrètes

2. **Allonger le TTL** pour les queries populaires : les entrées avec hit_count ≥ 5 pourraient avoir un TTL de 30 jours
3. **Mesurer l'impact Agent 2** : dans 7 jours, relancer cet audit et comparer le volume de nouvelles entrées
4. **Pré-filtre titre exact** : si la query matche exactement un titre en base, ne pas appeler Haiku
5. **Dashboard** : si le volume augmente, créer une vue Supabase pour monitorer le cache en continu
