# Reliure — Parcours utilisateur

## Parcours 1 : Inscription (onboarding)

### Contexte d'arrivée
L'utilisateur découvre Reliure via un lien partagé (profil public, critique, liste) ou par bouche à oreille / réseaux sociaux. Il n'arrive presque jamais depuis une recherche Google (pas de SEO au lancement).

### Flow

1. **Page publique** — L'utilisateur voit un profil, une liste ou une critique sans avoir de compte. Le contenu est entièrement lisible. Un CTA discret "Créer mon profil" est visible sur chaque page publique.

2. **Inscription** — Email (magic link Supabase) ou OAuth Google. Pas de mot de passe. Un clic, un email, un lien, c'est fait.

3. **Pseudo + bio** — L'utilisateur choisit un @pseudo (vérification de disponibilité en temps réel). La bio est optionnelle, un champ texte libre d'une ligne max. Pas d'upload d'avatar à cette étape (on génère des initiales).

4. **« Qu'est-ce que tu lis en ce moment ? »** — Écran central de l'onboarding. Une barre de recherche avec autocomplétion (Google Books API). L'utilisateur peut ajouter 1 à 3 livres. Chaque livre sélectionné apparaît comme une couverture. Possibilité de noter chaque livre en étoiles (optionnel, un tap). Bouton "Continuer" actif dès qu'un livre est ajouté.

5. **Atterrissage → Explorer** — L'utilisateur arrive sur la page Explorer. Son profil existe déjà avec ses 1-3 livres dans le diary. Il n'a jamais vu un profil vide.

### Principes
- Friction minimale : 3 écrans max entre le CTA et l'atterrissage
- Jamais de profil vide : les livres ajoutés à l'onboarding pré-remplissent le diary
- Pas de choix de thèmes/genres/goûts : on déduit les goûts à partir des livres ajoutés (v2)
- Pas de suggestions de profils à suivre à l'inscription (v2, quand il y aura assez d'utilisateurs)

---

## Parcours 2 : Ajouter un livre (boucle quotidienne)

### Objectif
Moins de 10 secondes entre "je veux ajouter ce livre" et "c'est fait".

### Flow

1. **Recherche** — L'utilisateur clique la loupe (header) ou le champ de recherche (Explorer). L'overlay de recherche s'ouvre avec autocomplétion.

2. **Sélection** — Il tape un titre ou un auteur, clique sur un résultat. Il arrive sur la fiche livre.

3. **Statut** — Il choisit un statut : En cours / Lu / À lire / Abandonné. Un tap sur une pill, changement immédiat, pas de confirmation.

4. **Date (optionnelle, pour "Lu" uniquement)** — S'il choisit "Lu", un champ date apparaît, pré-rempli à aujourd'hui. Il peut la modifier ou la supprimer. Si une date est renseignée → le livre apparaît dans le diary à cette date. Si pas de date → le livre est dans la bibliothèque "Lu" mais pas dans le diary. Ça permet le back-fill sans polluer le calendrier.

5. **Note** — Il note en étoiles (optionnel). Un tap, feedback visuel immédiat.

6. **Relecture** — Si le livre est déjà marqué "Lu", proposer "C'est une relecture ?". Si oui, créer une nouvelle entrée diary distincte avec un indicateur relecture. Un lecteur qui relit Ficciones trois fois a trois entrées dans son diary.

7. **Tags personnels (optionnel)** — Champ de tags libres au moment du log : "en vacances", "recommandé par Margaux", "avion CDG-JFK". Les tags sont privés par défaut. Ils transforment le diary en journal intime.

8. **Terminé** — Le livre apparaît dans son diary (si "Lu" avec date), dans "En cours" (si en cours), ou dans sa PAL (si "À lire"). Le profil se met à jour automatiquement.

### Principes
- Pas de page intermédiaire, pas de popup de confirmation
- Le geste doit être aussi rapide que liker un post Instagram
- La notation, la date, les tags sont toujours optionnels
- La distinction "Lu avec date" vs "Lu sans date" évite la confusion watched/logged de Letterboxd

---

## Parcours 2b : Back-fill (remplir sa bibliothèque)

### Le problème
Un nouveau utilisateur a lu des centaines de livres. Le flow d'ajout un par un (recherche → fiche → statut → note) est trop lent pour en ajouter 50. Sans back-fill, le profil reste vide et l'utilisateur ne perçoit pas la valeur de l'app.

### Flow

1. **Accès** — Depuis le profil, un lien "Ajouter des lectures passées" (visible tant que la bibliothèque a moins de 10 livres, discret après).

2. **Mode batch** — Une barre de recherche plein écran. L'utilisateur tape, clique sur un résultat, le livre s'ajoute à une pile en bas de l'écran. Il peut enchaîner sans quitter l'écran. Pas de navigation vers la fiche livre.

3. **Pile de livres** — Les couvertures s'empilent visuellement. Pour chaque livre : notation en étoiles optionnelle (un tap), cœur optionnel (un tap). Pas de date, pas de tags, pas de critique — c'est le geste le plus rapide possible.

4. **Validation** — Bouton "Ajouter X livres". Tous les livres sont marqués "Lu" sans date (pas d'entrée diary). Ils apparaissent dans la bibliothèque du profil, comptent dans les stats, mais ne polluent pas le diary.

### En v2 : Import CSV
- Import depuis Babelio (export via leur interface)
- Import depuis Goodreads (format CSV standard)
- Import depuis Booknode
- Mapping automatique par ISBN, fallback par titre+auteur
- C'est le levier d'acquisition #1 pour les migrants des plateformes concurrentes

---

## Parcours 3 : Mise à jour de progression (boucle quotidienne)

### Pourquoi c'est le geste le plus important
Un film se log une fois en 5 secondes. Un livre se lit sur des jours ou des semaines. La mise à jour de progression est un geste que ni Letterboxd ni StoryGraph ne peuvent offrir avec cette fréquence. C'est potentiellement le hook de rétention #1 de Reliure.

### Flow

1. **Accès** — Depuis le profil, section "En cours de lecture". Le numéro de page est affiché à côté de chaque livre : "p. 142/898".

2. **Mise à jour** — Un tap sur le numéro de page ouvre un petit input inline. L'utilisateur tape le nouveau numéro. Sauvegarde automatique au blur ou à la touche Entrée.

3. **Feedback** — La barre de progression se met à jour avec une animation fluide. Le pourcentage change. C'est satisfaisant visuellement.

4. **Fin de lecture** — Quand l'utilisateur met la dernière page (898/898), proposer automatiquement : "Tu l'as terminé ? Marquer comme Lu ?" avec la date d'aujourd'hui pré-remplie et les étoiles de notation. Transition directe vers le diary.

### Principes
- Zéro navigation : tout se passe inline sur le profil
- Zéro friction : tap, tape le numéro, c'est fait
- Le geste de fin de lecture est le moment où capturer la note et la critique (le sentiment est frais)

---

## Parcours 4 : Rétention (pourquoi revenir)

### Leviers de rétention, par ordre de priorité

1. **Mettre à jour sa progression de lecture** (boucle personnelle, quotidienne)
   - L'utilisateur revient pour avancer la page de son livre en cours
   - Le diary qui se remplit au fil du temps crée un effet de collection
   - Le bilan annuel récompense la régularité
   - C'est le même mécanisme que Letterboxd : le journal est la raison de revenir

2. **Le fil d'activité** (boucle sociale, quotidienne)
   - Voir ce que ses amis lisent, notent, critiquent
   - Découvrir des livres par les goûts de gens qu'on suit
   - Liker et répondre aux critiques crée de l'engagement réciproque

3. **Le journal éditorial** (boucle contenu, hebdomadaire)
   - Nouveaux essais, entretiens, sélections chaque semaine
   - Agenda littéraire (rencontres, salons, lectures)
   - Le journal donne une raison de revenir même quand on ne lit pas activement
   - Ni Letterboxd ni StoryGraph n'ont ça — c'est un différenciateur unique

4. **Les citations** (boucle communautaire, opportuniste)
   - Découvrir des citations populaires
   - Sauvegarder des phrases qui marquent
   - Partager ses propres extraits
   - Contenu viral natif (partage facile sur Instagram/Twitter)

### Seuil de déblocage du bilan annuel
Le bilan annuel se débloque à partir de **5 livres lus dans l'année**. En dessous, l'onglet Bilan affiche un message d'encouragement avec la progression : "Encore 2 livres pour débloquer ton bilan 2026". C'est un levier de gamification discret mais efficace — Letterboxd fait pareil avec 10 films.

### Principe fondamental
La boucle personnelle (mon journal de lecture) prime sur la boucle sociale (le feed). Les gens reviennent d'abord pour eux-mêmes, pas pour les autres. Le social amplifie mais ne porte pas à lui seul la rétention.

---

## Données à ajouter au schéma

D'après ces parcours, les ajouts suivants sont nécessaires dans l'architecture de données :

- `reading_status.finished_date` — nullable, si renseigné → entrée diary, sinon → bibliothèque seulement
- `reading_status.is_reread` — booléen, pour distinguer les relectures dans le diary
- `reading_log_tags` — table séparée (user_id, reading_status_id, tag_text), tags personnels libres au moment du log
- Seuil bilan : logique côté frontend, pas besoin de table (count des reading_status avec status="read" et finished_date dans l'année courante)

---

## Priorité d'implémentation backend

1. Auth (magic link + Google OAuth) — nécessaire pour tout
2. Recherche de livres (Google Books API → import dans notre base) — nécessaire pour l'onboarding et l'ajout
3. Reading status + progression (marquer lu / en cours / à lire + page courante + date optionnelle + relecture) — la boucle de rétention #1
4. Profil public (diary, favoris, en cours) — le hook d'acquisition
5. Back-fill batch (ajout rapide de lectures passées) — réduire le cold start
6. Critiques et citations — l'engagement
7. Follow + fil d'activité — la boucle sociale
8. Listes — le contenu partageable
9. Explorer (trending, tags) — la découverte
10. Import CSV Babelio/Goodreads (v2) — l'acquisition par migration
