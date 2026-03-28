# Audit visuel Reliure — 28 mars 2026

Audit complet de l'app Reliure sur `localhost:5173`, desktop (1512px) et mobile (375px).

---

## Résumé

**Pages auditées :** Explorer, Citations, Fil, Profil (tous onglets), La Revue, Fiche livre, Onboarding, Back-fill

**Problèmes trouvés : 12** (4 critiques, 5 moyens, 3 mineurs)


---

## Problèmes critiques

### 1. Terminologie : « PARCOURIR PAR TAG » au lieu de « PARCOURIR PAR THÈME »
- **Page :** Explorer
- **Sévérité :** Critique (incohérence avec le design system)
- **Description :** Le label de la section tags sur Explorer dit « PARCOURIR PAR TAG ». Le CLAUDE.md spécifie que « Thèmes » doit être utilisé pour les tags descriptifs sur les fiches livres, et « Tags » est réservé aux tags personnels de lecture. La section devrait s'appeler « PARCOURIR PAR THÈME ».
- **Screenshot :** ss_89343nks9 (Explorer desktop, haut de page)

### 2. Critiques mélangées sur la fiche livre 2666
- **Page :** Fiche livre (2666)
- **Sévérité :** Critique (bug de données)
- **Description :** La fiche de 2666 affiche des critiques qui appartiennent clairement à d'autres livres. La critique de Camille D. dit « Morrison écrit avec une intensité rare. Lecture indispensable. » (critique de Beloved), et celle de Louise R. dit « 124 pages de pure magie. Rulfo a capturé quelque chose d'éternel. » (critique de Pedro Páramo). Les critiques ne sont pas filtrées par book_id.
- **Screenshot :** ss_7608ncz2g (Fiche livre desktop, section critiques)

### 3. Titre tronqué « Les Détectives sauva... » dans la grille Populaires
- **Page :** Explorer
- **Sévérité :** Critique (contenu coupé)
- **Description :** Le titre « Les Détectives sauvages » est tronqué à « Les Détectives sauva... » dans la section « Populaires cette semaine ». C'est le livre #2 en popularité, son titre devrait être lisible. Le problème est plus visible en desktop (la largeur de colonne est suffisante pour afficher le titre complet sur 2 lignes plutôt que de tronquer).
- **Screenshot :** ss_89343nks9 (Explorer desktop)

### 4. Badges date/coeur illisibles sur le diary (Profil > Journal)
- **Page :** Profil > Journal
- **Sévérité :** Critique (UX)
- **Description :** Les badges en bas des vignettes du diary (date + coeur) se chevauchent et sont difficilement lisibles, surtout sur les petites couvertures. Le problème est particulièrement visible sur la couverture d'Austerlitz (mars 2026) où le texte « 18 », le nom de l'auteur et le coeur se superposent. En mobile, le problème est amplifié car les vignettes sont encore plus petites.
- **Screenshot :** ss_53369a8uy (Profil desktop, diary visible)


---

## Problèmes moyens

### 5. Couvertures fantômes dans les aperçus de listes
- **Page :** Explorer > Listes populaires
- **Sévérité :** Moyen
- **Description :** Certains slots de couvertures dans les aperçus de listes affichent un fond gris clair sans titre de fallback (ex : « Existentialisme français », « Moins de 200 pages, impact max »). Le composant Img est censé afficher le titre en fallback quand l'image ne charge pas, mais ce n'est pas le cas pour les aperçus de listes.
- **Screenshot :** ss_89343nks9, visible en scrollant (listes populaires)

### 6. Nav bar serrée en mobile (375px)
- **Page :** Toutes les pages
- **Sévérité :** Moyen
- **Description :** La barre de navigation affiche 5 éléments + icône recherche + avatar sur 375px. C'est fonctionnel mais très serré. « La Revue » en italic Instrument Serif est particulièrement étroit et peut être difficile à taper. Il faudrait envisager un menu hamburger ou une bottom tab bar pour mobile.
- **Screenshot :** ss_8055sqvdv (Explorer mobile)

### 7. Pas d'indicateur actif visible sur la nav principale (desktop)
- **Page :** Toutes
- **Sévérité :** Moyen
- **Description :** L'item de nav actif est en bold, mais il n'y a pas de soulignement ou d'indicateur visuel fort. Sur un fond blanc avec du texte gris/noir, la différence est subtile. Un underline ou un changement de couleur renforcerait la navigation.
- **Screenshot :** ss_89343nks9 (Explorer desktop)

### 8. Section « OÙ LIRE » — label en majuscules incohérent
- **Page :** Fiche livre
- **Sévérité :** Moyen
- **Description :** Le label « OÙ LIRE » est affiché alors que le CLAUDE.md spécifie « Où lire ». Le pattern de labels uppercase (QUATRE FAVORIS, EN COURS DE LECTURE, THÈMES) est utilisé pour les sections structurelles, mais « OÙ LIRE » est un CTA. L'accent sur le Ù est affiché en uppercase ce qui est correct en français, mais le label devrait être cohérent avec les conventions définies.
- **Screenshot :** ss_7608ncz2g (Fiche livre desktop)

### 9. La Revue : layout du premier article versus les suivants
- **Page :** La Revue
- **Sévérité :** Moyen
- **Description :** Le premier article (essai Bolaño) a la couverture à gauche avec le texte qui flotte à droite. Les articles suivants ont la couverture à droite en plus petit. C'est un choix éditorial cohérent (article principal vs secondaires), mais la transition entre les deux layouts est abrupte — il manque un séparateur ou un label « À LIRE AUSSI » pour marquer la différence.
- **Screenshot :** ss_98531v1l0 (La Revue desktop)


---

## Problèmes mineurs

### 10. Onboarding : seulement 1 résultat de recherche pour « Borges »
- **Page :** Onboarding (étape 2)
- **Sévérité :** Mineur
- **Description :** La recherche « Borges » ne retourne qu'un seul résultat (Ficciones). On s'attendrait à voir L'Aleph, Le Livre de sable, etc. C'est probablement lié aux données du prototype, mais si la recherche est connectée à Google Books API, il faudrait s'assurer que les résultats sont suffisants.
- **Screenshot :** ss_9251ti884 (Onboarding recherche)

### 11. Notation demi-étoile (½) affichée en texte brut
- **Page :** Fiche livre, Profil > Mes Critiques
- **Sévérité :** Mineur
- **Description :** Les notes comme « ★★★★½ » utilisent le caractère ½ en texte à côté des étoiles visuelles. C'est fonctionnel mais pas très élégant — une demi-étoile SVG serait plus cohérente avec le design system.
- **Screenshot :** ss_8037983q4 (Profil > Mes Critiques)

### 12. « Votre note » utilise le vouvoiement vs le reste en tutoiement
- **Page :** Fiche livre
- **Sévérité :** Mineur (incohérence de ton)
- **Description :** Sur la fiche livre, le label « Votre note » vouvoie l'utilisateur, alors que tout le reste de l'app tutoie (« Tu as lu d'autres livres ? », « Qu'as-tu lu récemment ? », « Crée ton profil de lecteur »). Devrait être « Ta note ».
- **Screenshot :** ss_7608ncz2g (Fiche livre desktop)


---

## Ce qui fonctionne bien

- **Onboarding** : flow clair en 2 étapes (pseudo → livres), validation en temps réel du pseudo (coche verte), possibilité de passer l'étape livres
- **Back-fill** : page dédiée avec suggestions « Les plus lus » et boutons d'action rapide (Lu / À lire), bonne UX
- **Typographie** : Instrument Serif italic pour les headings éditoriaux donne un ton culturel fort, Geist pour le body est lisible
- **Citations** : la présentation avec barre latérale + italique + guillemets français est très réussie
- **Fil d'activité** : structure claire avec avatar, action, couverture, contenu, et les timestamps en relatif (2h, 5h, 1j)
- **Bilan annuel** : propre, informatif, la chronologie de lecture est un ajout de valeur
- **Fiche livre** : hiérarchie visuelle forte (couverture, notation communautaire, statut, note perso, tags, thèmes, critiques, recommandations)
- **Responsive** : l'app est globalement bien adaptée au mobile, les grilles se réorganisent correctement
- **Design system** : palette cohérente, couvertures avec ombres subtiles, fond #fafaf8 pour les surfaces
