# Audit recall — search_books_v2

> Généré le 2026-03-31 11:41:21 sur une base de 3737 livres.

## Définition SQL testée

```sql
-- search_books_v2(q text, n integer DEFAULT 10)
-- RETURNS SETOF books, LANGUAGE sql, STABLE
-- Logique: unaccent+lower sur q et title, LIKE '%mot%', bool_and sur titre,
-- bool_or sur auteurs (uniquement si ≤2 mots significatifs), ORDER BY rating_count DESC
```

## Inventaire de la base

| Métrique | Valeur |
|---|---|
| Total livres | 3737 |
| Sans couverture | 443 (11.9%) |
| Auteurs null | 0 |
| Auteurs [] vide | 10 |
| Doublons potentiels | 1 groupes |

### Top 20 par rating_count

| # | Titre | Auteur | rc | Couverture |
|---|---|---|---|---|
| 1 | Ficciones | Jorge Luis Borges | 8 | ✅ |
| 2 | L'étranger | Albert Camus | 7 | ✅ |
| 3 | La Peste | Albert Camus | 5 | ✅ |
| 4 | Austerlitz | W.G. Sebald | 5 | ✅ |
| 5 | Pedro Páramo | Juan Rulfo | 5 | ✅ |
| 6 | Beloved | Toni Morrison | 4 | ❌ |
| 7 | 2666 | Roberto Bolaño | 4 | ✅ |
| 8 | Les détectives sauvages | Roberto Bolaño | 4 | ✅ |
| 9 | Si par une nuit d'hiver un voyageur | Italo Calvino | 4 | ✅ |
| 10 | Ulysses | James Joyce | 3 | ✅ |
| 11 | Les Choses | Georges Perec | 3 | ✅ |
| 12 | Molloy | Samuel Beckett | 3 | ✅ |
| 13 | Minnesota Botanical Studies | Conway MacMillan | 1 | ✅ |
| 14 | Corps étranger | Didier van Cauwelaert | 1 | ✅ |
| 15 | L'Adversaire | Emmanuel Carrère | 1 | ✅ |
| 16 | L'Ombre du vent | Carlos Ruiz Zafón | 1 | ✅ |
| 17 | La Vie matérielle | Marguerite Duras | 1 | ✅ |
| 18 | L'ordre du jour | Eric Vuillard | 1 | ✅ |
| 19 | Ok, Ok pas de probl�mes | R. Mach | 1 | ✅ |
| 20 | Le Manuscrit inachevé | Franck Thilliez | 1 | ✅ |

### Doublons potentiels dans la base

- **"les ames mortes"** (2 entrées) :
  - Les Âmes mortes — Nikolai Gogol (cover: oui, rc: 0)
  - Les âmes mortes — Николай Васильевич Гоголь (cover: oui, rc: 0)

---

## Métriques globales

| Métrique | Score |
|---|---|
| **Recall@1** | 53/58 (91.4%) |
| **Recall@3** | 58/58 (100.0%) |
| Absents | 0/58 |
| Rang > 3 | 0/58 |
| Rang moyen (quand trouvé) | 1.09 |
| Tests "vide attendu" corrects | 5/5 |

## Par catégorie

| Catégorie | Recall@1 | Recall@3 | Absents | Tests vides |
|---|---|---|---|---|
| A. Apostrophes | 9/9 (100%) | 9/9 (100%) | 0/9 | — |
| B. Accents | 8/8 (100%) | 8/8 (100%) | 0/8 | — |
| C. Partielles | 7/8 (88%) | 8/8 (100%) | 0/8 | — |
| D. Auteurs | 4/8 (50%) | 8/8 (100%) | 0/8 | — |
| E. Articles | 9/9 (100%) | 9/9 (100%) | 0/9 | — |
| F. Mangas | 6/6 (100%) | 6/6 (100%) | 0/6 | — |
| G. Limites | 4/4 (100%) | 4/4 (100%) | 0/4 | 5/5 |
| H. Multi-mots | 6/6 (100%) | 6/6 (100%) | 0/6 | — |

## Résultats détaillés

### A. Apostrophes

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `L’étranger` | L'étranger | ✅ recall@1 | L'étranger | Corps étranger | En terre étrangère |
| `L'étranger` | L'étranger | ✅ recall@1 | L'étranger | Corps étranger | En terre étrangère |
| `l'etranger` | L'étranger | ✅ recall@1 | L'étranger | Corps étranger | En terre étrangère |
| `l etranger` | L'étranger | ✅ recall@1 | L'étranger | Corps étranger | En terre étrangère |
| `L'Adversaire` | L'Adversaire | ✅ recall@1 | L'Adversaire | — | — |
| `L'Ombre du vent` | L'Ombre du vent | ✅ recall@1 | L'Ombre du vent | — | — |
| `l ordre du jour` | L'ordre du jour | ✅ recall@1 | L'ordre du jour | — | — |
| `Si par une nuit d'hiver` | Si par une nuit d'hiver un voyageur | ✅ recall@1 | Si par une nuit d'hiver un voyageur | — | — |
| `Qu'est-ce que l'intersectionnalité` | Qu'est-ce que l'intersectionnalité ? | ✅ recall@1 | PRISMES FÉMINISTES - Qu'est-ce que l'intersectionnalité ? | Qu'est-ce que l'intersectionnalité ? | — |

### B. Accents

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `etranger camus` | L'étranger | ✅ recall@1 | Albert l'étranger, Camus l'Algérien | L'étranger | — |
| `Emile Zola` | Germinal | ✅ recall@1 | L'assommoir | La Fortune des Rougon (Les Rougon-Macquart, #1) | La conquête de Plassans |
| `Amelie Nothomb` | Stupeur et tremblements | ✅ recall@1 | Stupeur et tremblements | Le Fait du prince | Biographie de la faim |
| `chateau` | Le Château | ✅ recall@1 | Le Château | D'un château à l'autre | Le Château de Hurle |
| `Pedro Paramo` | Pedro Páramo | ✅ recall@1 | Pedro Páramo | — | — |
| `Mikhaïl Boulgakov` | Le Maître et Marguerite | ✅ recall@1 | Le Maître et Marguerite | — | — |
| `maitre marguerite` | Le Maître et Marguerite | ✅ recall@1 | Le Maître et Marguerite | — | — |
| `LETRANGER` | L'étranger | ✅ recall@1 | L'étranger | Albert l'étranger, Camus l'Algérien | — |

### C. Partielles

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `ficc` | Ficciones | ✅ recall@1 | Ficciones | — | — |
| `petit pri` | Le Petit Prince | ✅ recall@1 | Le Petit Prince | Guide des métiers pour les petites filles qui ne veulent pas finir princesses | Hommes grands, femmes petites |
| `miser` | Les Misérables | ✅ recall@3 | Misery | Les Misérables | — |
| `peste` | La Peste | ✅ recall@1 | Peste | La Peste | Revivre |
| `detecti` | Les détectives sauvages | ✅ recall@1 | Les détectives sauvages | — | — |
| `bovary` | Madame Bovary | ✅ recall@1 | Madame Bovary | — | — |
| `germi` | Germinal | ✅ recall@1 | Germinal | — | — |
| `sakamoto` | SAKAMOTO DAYS | ✅ recall@1 | SAKAMOTO DAYS 15 | SAKAMOTO DAYS 24 | SAKAMOTO DAYS 18 |

### D. Auteurs

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `Camus` | L'étranger | ✅ recall@1 | Albert l'étranger, Camus l'Algérien | L'étranger | La Peste |
| `Albert Camus` | L'étranger | ✅ recall@1 | Albert l'étranger, Camus l'Algérien | L'étranger | La Peste |
| `Borges` | Ficciones | ✅ recall@1 | Ficciones | Labyrinths | Fictions |
| `Bolaño` | Les détectives sauvages | ✅ recall@3 | 2666 | Les détectives sauvages | Des putains meurtrières |
| `Bolano` | Les détectives sauvages | ✅ recall@3 | 2666 | Les détectives sauvages | Des putains meurtrières |
| `Perec` | Les Choses | ✅ recall@1 | Les Choses | Things | Life |
| `Victor Hugo` | Les Misérables | ✅ recall@3 | "Notre-Dame de Paris", de Victor Hugo | Les Misérables | L'homme qui rit |
| `Hugo` | Les Misérables | ✅ recall@3 | "Notre-Dame de Paris", de Victor Hugo | Les Misérables | The sorrowof Belgium |

### E. Articles

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `Les Misérables` | Les Misérables | ✅ recall@1 | Les Misérables | — | — |
| `Misérables` | Les Misérables | ✅ recall@1 | Les Misérables | — | — |
| `miserables` | Les Misérables | ✅ recall@1 | Les Misérables | — | — |
| `La Peste` | La Peste | ✅ recall@1 | La Peste | Peste | Revivre |
| `Peste` | La Peste | ✅ recall@1 | Peste | La Peste | Revivre |
| `Du côté de chez Swann` | Du côté de chez Swann | ✅ recall@1 | Du côté de chez Swann | — | — |
| `côté chez Swann` | Du côté de chez Swann | ✅ recall@1 | Du côté de chez Swann | — | — |
| `Le Petit Prince` | Le Petit Prince | ✅ recall@1 | Le Petit Prince | Guide des métiers pour les petites filles qui ne veulent pas finir princesses | — |
| `Les Choses` | Les Choses | ✅ recall@1 | Les Choses | Les mots et les choses | — |

### F. Mangas

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `Naruto` | Naruto | ✅ recall@1 | Naruto, Vol. 14: Hokage vs. Hokage!! (Naruto #14) | Naruto, Vol. 18: Tsunade's Choice (Naruto, #18) | Naruto, Vol. 07: The Path You Should Tread (Naruto, #7) |
| `Naruto 7` | Naruto | ✅ recall@1 | Naruto, Vol. 14: Hokage vs. Hokage!! (Naruto #14) | Naruto, Vol. 18: Tsunade's Choice (Naruto, #18) | Naruto, Vol. 07: The Path You Should Tread (Naruto, #7) |
| `Sakamoto Days 15` | SAKAMOTO DAYS 15 | ✅ recall@1 | SAKAMOTO DAYS 15 | SAKAMOTO DAYS 24 | SAKAMOTO DAYS 22 |
| `Sakamoto Days 23` | SAKAMOTO DAYS 23 | ✅ recall@1 | SAKAMOTO DAYS 23 | SAKAMOTO DAYS 24 | SAKAMOTO DAYS 22 |
| `Harry Potter` | Harry Potter | ✅ recall@1 | Harry Potter y la piedra filosofal | — | — |
| `Madame Bovary Flaubert` | Madame Bovary | ✅ recall@1 | Madame Bovary | — | — |

### G. Limites

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `""` | (vide attendu) | ✅ vide (attendu) | — | — | — |
| `a` | (vide attendu) | ✅ vide (attendu) | — | — | — |
| `le` | (vide attendu) | ✅ vide (attendu) | — | — | — |
| `la` | (vide attendu) | ✅ vide (attendu) | — | — | — |
| `1984` | 1984 | ✅ recall@1 | 1984 | — | — |
| `2666` | 2666 | ✅ recall@1 | 2666 | — | — |
| `9782070306022` | L'étranger | ✅ recall@1 | L'étranger | — | — |
| `l'étranger #1` | L'étranger | ✅ recall@1 | L'étranger | Corps étranger | En terre étrangère |
| `un très très très très très très long titre de livre qui ne correspond à rien dans la base` | (vide attendu) | ✅ vide (attendu) | — | — | — |

### H. Multi-mots

| Query | Attendu | Score | Résultat #1 | #2 | #3 |
|---|---|---|---|---|---|
| `camus etranger` | L'étranger | ✅ recall@1 | Albert l'étranger, Camus l'Algérien | L'étranger | — |
| `camus peste` | La Peste | ✅ recall@1 | La Peste | — | — |
| `borges ficciones` | Ficciones | ✅ recall@1 | Ficciones | — | — |
| `Victor Hugo Les Misérables` | Les Misérables | ✅ recall@1 | Les Misérables | — | — |
| `Flaubert Bovary` | Madame Bovary | ✅ recall@1 | Madame Bovary | — | — |
| `Sebald Austerlitz` | Austerlitz | ✅ recall@1 | Austerlitz | — | — |

## Pires résultats

Aucun — tous les résultats sont dans le top 3. 🎉

## Bugs connus confirmés par l'audit

1. **>2 mots significatifs → branche auteurs désactivée** : la condition `(SELECT count(*) FROM significant) <= 2` empêche le matching auteur dès que la query a 3+ tokens (ex: "camus etranger" = 2 mots OK, "Victor Hugo Les Misérables" = 4 mots KO).
2. **Mots courts ignorés** : les tokens ≤2 caractères sont filtrés par `length(w) > 2`. Les queries comme "le", "la", "du" produisent 0 mots significatifs → `bool_and(NULL)` = rien.
3. **Pas de scoring de pertinence** : tri uniquement par `rating_count DESC`, pas de pondération titre exact vs partiel.
4. **ISBN non recherché** : la RPC ne cherche que dans title et authors, pas dans isbn_13.

## Recommandations

### Priorité haute

1. **Supprimer la limite ≤2 mots sur la branche auteurs** — ou mieux, utiliser un scoring combiné :
   - Score titre = nombre de mots matchés / nombre de mots significatifs
   - Score auteur = idem
   - Score total = max(score_titre, score_auteur * 0.8)
   - Permettrait "camus etranger", "Victor Hugo Les Misérables", "Flaubert Bovary"

2. **Abaisser le seuil de mots significatifs** à `length(w) > 1` au lieu de `> 2` :
   - Permettrait de trouver "Du côté de chez Swann" avec la query "du cote"
   - Garder `> 2` exclut des tokens comme "vu", "lu", "un" qui sont du bruit, mais aussi des tokens utiles

3. **Scoring hybride titre × auteur** (cross-field) pour ne pas exiger que TOUS les mots soient dans le même champ.

### Priorité moyenne

4. **Ajouter un fallback ISBN** : `OR b.isbn_13 = q` (si la query ressemble à un ISBN)
5. **Trigrams** (`pg_trgm`) pour le matching fuzzy et le scoring de pertinence
6. **Boost exact match** : si le titre normalisé = query normalisée, score maximal

### Priorité basse

7. **ts_vector / FTS** PostgreSQL pour un vrai scoring BM25-like (long terme)
8. **Recherche partielle sur slug** : `b.slug LIKE '%' || slugify(q) || '%'`
