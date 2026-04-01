# Rapport de bêta test - Reliure

**Date** : 30 mars 2026
**Testeur** : Claude (session automatisée)
**Environnement** : localhost:5173, compte @alix connecté
**Navigateur** : Chrome, viewport 1492x808

---

## Bugs bloquants

| # | Page / Feature | Description | Détail |
|---|---|---|---|
| 1 | **Fiche livre > Citations** | La publication d'une citation ne s'affiche pas sur la fiche livre | J'ai tapé une citation sur la fiche de L'Étranger (onglet Citations), cliqué "Publier", le formulaire s'est fermé mais la page affiche toujours "Aucune citation pour ce livre". La citation **a été enregistrée en base** (elle apparaît dans le Fil d'activité "il y a 5 min" et sur la page /citations communautaire), mais la fiche livre ne se rafraîchit pas après publication. L'onglet "Mes citations" du profil affiche aussi "Tu n'as pas encore sauvegardé de citation" — incohérent avec le Fil. |
| 2 | **Profil > Mes listes > Nouvelle liste** | Le bouton "+ Nouvelle liste" ne fonctionne pas | Cliquer sur "+ Nouvelle liste" dans l'onglet "Mes listes" du profil scrolle en haut de la page au lieu d'ouvrir un modal de création. Aucun modal n'apparaît. La création de liste est impossible depuis le profil. |

---

## Bugs mineurs

| # | Page / Feature | Description | Détail |
|---|---|---|---|
| 3 | **Profil** | Bouton "Ok" flottant parasite | Un petit bouton "Ok" apparaît de manière persistante sur la page profil, flottant entre les couvertures des favoris (sous "OK Corral"). Il semble lié au nom de la liste "Ok" mais s'affiche en dehors de tout contexte logique. Il reste visible même en dehors de l'onglet "Mes listes". |
| 4 | **Page Explorer > Thèmes** | Certaines couvertures manquantes dans le thème Manga | Sur /explorer/theme/Manga : Sakamoto Days 23, 15, 24, 18 affichent le fallback texte (pas de cover_url). Le fallback fonctionne mais l'expérience est dégradée. |
| 5 | **Page Explorer > Thèmes > Manga** | Image polluée pour Naruto Vol. 07 | La couverture de "Naruto Vol. 07: The Path Yo..." est une capture d'écran d'une page e-commerce (avec prix, boutons "Add to cart", bannière promo 11.11) plutôt qu'une vraie couverture. Problème de qualité de données Google Books. |
| 6 | **Recherche** | Doublon possible dans les résultats | La recherche "L'etranger" retourne 3 résultats dont le 3e est "L'Étranger" sans auteur affiché ni couverture — potentiel doublon non dédupliqué. |
| 7 | **Bilan** | Compteur "Listes" à 0 alors que des listes existent | Le Bilan 2026 affiche "0 Listes" alors que l'onglet "Mes listes" montre au moins 2 listes. Le compteur est peut-être basé sur une activité différente (création dans l'année vs. existence) mais c'est confus pour l'utilisateur. |

---

## Friction UX

| # | Page / Feature | Description | Détail |
|---|---|---|---|
| 8 | **Page Citations** | Titres de livres non cliquables | Sur /citations, le titre du livre ("L'Étranger", "La Peste"...) et la couverture ne sont pas cliquables. On s'attend à pouvoir naviguer vers la fiche du livre depuis une citation. La couverture cliquable serait le minimum. |
| 9 | **Explorer > Barre de recherche** | La barre de recherche n'est pas un vrai input | La barre sur la page Explorer ressemble à un champ de saisie mais c'est un bouton qui ouvre un overlay. Taper directement dedans ne fait rien — il faut cliquer dessus d'abord. Peu intuitif (on s'attend à un focus auto ou à pouvoir taper directement). |
| 10 | **Profil > Chargement** | Fade-in très lent au chargement des pages | Le profil et le fil d'activité passent par un état "fantôme" (contenu très pâle) pendant 2-3 secondes avant d'être lisibles. Le skeleton loading existe mais le fade-in final est trop lent. |
| 11 | **Fiche livre > Section Thèmes** | Section "Thèmes" vide sans indication | Sur les fiches de L'Étranger et Ficciones, la section "THÈMES" est affichée mais vide — pas de tag, pas de message "Aucun thème", juste un espace blanc. Soit masquer la section si vide, soit ajouter un CTA "Suggérer des thèmes". |
| 12 | **Fiche livre > Résumé** | Section "+ Suggérer un résumé" sans description | Le lien "+ Suggérer un résumé" est visible mais le livre n'a aucune description affichée. L'absence de résumé/description sur une fiche aussi importante que L'Étranger est notable — un fallback IA ou un message d'encouragement aiderait. |

---

## Ce qui fonctionne bien

| # | Feature | Commentaire |
|---|---|---|
| 1 | **Recherche de livres** | La recherche est rapide, le debounce fonctionne bien, les résultats sont pertinents avec couvertures. La suggestion "L'etranger" → "L'Étranger" avec l'accent est correcte. |
| 2 | **Pills de statut (Lu/En cours/A lire/Abandonné)** | Changement de statut fluide, immédiat, avec apparition/disparition contextuelle de la date et du toggle "Relecture". |
| 3 | **Notation interactive (étoiles)** | Les étoiles sont réactives, la note communautaire se met à jour en temps réel après un changement de note personnelle. Animation pop satisfaisante. |
| 4 | **Publication de critiques** | La critique se publie correctement, apparaît dans la liste des critiques de la fiche livre, dans l'onglet "Mes critiques" du profil, et dans le Fil d'activité. |
| 5 | **Mode Étagère (bibliothèque)** | L'affichage en étagère bois avec les livres légèrement inclinés est visuellement très réussi. C'est un vrai différenciateur par rapport aux concurrents. |
| 6 | **Quatre favoris** | La section est bien mise en valeur, les couvertures sont grandes, les métadonnées (auteur, année) lisibles. Le bouton "Modifier" est visible et accessible. |
| 7 | **Bilan annuel** | Présentation claire et attractive : stats en gros, chronologie en histogramme, top noté avec couvertures. |
| 8 | **Page Citations** | Design éditorial très réussi : guillemets français « », italique serif, barre latérale de citation, couverture + auteur. L'ambiance "cahiers littéraires" est là. |
| 9 | **Fil d'activité** | Types d'activité variés (citation, lecture terminée, critique) avec timestamps relatifs et couvertures. Bien structuré. |
| 10 | **Page Défis** | Les cercles de progression SVG sont jolis, la distinction "Mes challenges" / "Découvrir" est claire. |
| 11 | **Profil tiers** | La distinction isOwnProfile fonctionne bien : "Ses critiques" vs "Mes critiques", pas de bouton d'édition, bouton "Abonné·e" visible. L'écriture inclusive sur le bouton est un bon détail. |
| 12 | **Édition inline (nom et bio)** | L'édition inline est fluide : clic sur le nom ouvre un input, clic sur la bio ouvre un textarea avec compteur /160. Escape annule correctement. |
| 13 | **Navigation et routing** | Le routage est cohérent, les URLs sont propres (/:username, /livre/:slug, /explorer/theme/:tag). Le bouton "Retour" fonctionne sur les fiches. |
| 14 | **Identité visuelle** | Instrument Serif italic pour les titres, Geist pour le body, palette retenue — l'ensemble est sobre, éditorial, et se distingue nettement de Babelio ou Booknode. C'est un vrai "objet culturel". |

---

## Suggestions

1. **Rafraîchissement post-publication** : Après l'ajout d'une citation ou critique sur une fiche livre, déclencher un refetch des données de l'onglet actif pour que le contenu apparaisse immédiatement sans rechargement de page. C'est le bug le plus impactant pour l'expérience utilisateur actuelle.

2. **Rendre les couvertures/titres cliquables partout** : Sur la page Citations, le Fil d'activité, et dans les listes — chaque mention d'un livre devrait être un lien vers sa fiche. C'est le geste le plus naturel pour un utilisateur qui découvre un livre via une citation ou une critique.

3. **Enrichir les fiches vides** : Les fiches sans description, sans thème, et sans couverture (fallback texte) sont fréquentes. Un programme d'enrichissement prioritaire sur les ~500 livres les plus actifs (ceux avec le plus de statuts/critiques) améliorerait considérablement la première impression.
