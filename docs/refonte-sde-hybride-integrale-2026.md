# SDE OS — Refonte hybride intégrale
**Édition Soldier House Premium · Novembre 2026**

## 1. Choix d'architecture retenu

Un produit unifié sur deux domaines : `mouvement-sde.org` (public) et `app.mouvement-sde.org` (privé), conservant le même Worker Cloudflare, les données D1, la médiathèque KV et les permissions déjà appliquées côté serveur.

Trois univers visuels, une seule identité :
- **Impérial (public)** — bleu nuit #101A2F, or #D7B66C, ivoire #F7F2E8, bordeaux #722C47. Photographies, héritage spirituel, appels à l'action, programmes et témoignages.
- **Lumière (membre)** — fond ivoire #F7F3EB, cartes #FFFEFB, texte #272A31, bordeaux #792F49 et or #B18A48. Accessibilité et parcours direct.
- **Command (administration)** — vert treillis sombre #111E19, surfaces #1E3026, or #E4C780, ivoire #F5F0DF. Tables, métriques, suivi des cinq pôles, contrôles et accès sécurisés.

**Invariant** : ne jamais exposer de donnée privée dans le HTML public ni déléguer une vérification des droits à une simple règle CSS. Les rôles restent contrôlés côté serveur ; les chiffres sont lus à partir des API existantes, jamais simulés.

## 2. Inventaire complet : 32 écrans / vues

### Site public — 17 vues

| # | Vue | Objectif UX | Modules à conserver |
|---|---|---|---|
| 01 | Accueil | Vision, 3 actions principales, événements phares | CTA, brèves, agenda |
| 02 | Mouvement | Présentation, histoire et valeurs | Texte institutionnel |
| 03 | Gouvernance | Direction, organisation, organigramme | Responsables, directoire |
| 04 | Pôles | Vue d'ensemble des 5 pôles | Liens vers fiches |
| 05 | Réveil / Évangélisation | Pôle REV | Missions et engagement |
| 06 | Impact social / Humanitaire | Pôle ISH | Dons et missions |
| 07 | Logistique / Organisation | Pôle LO | Activités et besoins |
| 08 | Communication / Médias | Pôle CMR | Soldiers Voice, médias |
| 09 | Formation / Développement | Pôle FDE | Academy et entrepreneuriat |
| 10 | Programmes & Agenda | Calendrier et inscriptions | IN FIRE, TPA, ALEPH 12 |
| 11 | IN FIRE / Galerie | Albums par édition, visionneuse | 2024, 2025, 2026 |
| 12 | Soldiers Academy | Parcours et inscription | Formations |
| 13 | Médiathèque / Ressources | Livres, audios, vidéos, téléchargements | Recherche et filtres |
| 14 | Prières / Intercession | Intentions et cadre de confidentialité | Mur de prière, demandes |
| 15 | Témoignages / Communauté | Récits et échanges | Publication encadrée |
| 16 | Missions & Soutien | Projets, dons et transparence | Paiements seulement si disponibles |
| 17 | Rejoindre / Portail public | Adhésion et connexion | Formulaires et accès |

### Espace membre — 7 vues

| # | Vue | Action directe |
|---|---|---|
| 18 | Accueil membre | Mes rendez-vous, alertes, statut |
| 19 | Profil | Photo, ville, pays, pôle, compte |
| 20 | Carte et présences QR | Carte personnelle, pointages |
| 21 | Formation et progression | Academy et supports |
| 22 | Agenda et inscriptions | Programmes, confirmation |
| 23 | Intercession personnelle | Sujets de prière et confidentialité |
| 24 | Contributions, ressources et notifications | Historique autorisé, médiathèque, préférences |

### Administration — 8 vues

| # | Vue | Actions / sécurité |
|---|---|---|
| 25 | Poste de commandement | Indicateurs réels et raccourcis |
| 26 | Membres et rôles | Matricules, fiches et permissions |
| 27 | Présences et QR | Scanner et rapports |
| 28 | Agenda / programmes | Calendrier, inscriptions, publications |
| 29 | Pôles / missions / Academy | Coordination et validations |
| 30 | Finances et transparence | Accès admin selon permissions |
| 31 | Communications / médias | Annonces, album, notifications |
| 32 | Gouvernance et dossiers confidentiels | Directoire / Règle des 4 Yeux / propriétaire uniquement |

Ces 32 vues sont un **inventaire fonctionnel** : certaines sont déjà des pages autonomes et d'autres sont des onglets ou des modules existants. Aucune duplication d'API ou de compte n'est nécessaire.

## 3. Navigation proposée

**Public desktop :** logo SDE ; Découvrir, Pôles, Programmes, Grandir, Missions, Galerie, Portail.

**Public et espace privé mobile :** 5 accès maximum par écran, au moins 44 px de cible, navigation sans recouvrement et respect des encoches du téléphone.

**Membre :** Accueil, Agenda, Présences, Academy, Plus.

**Admin :** Vue générale, Membres, Pointages, Finances, Plus ; menu latéral complet sur ordinateur. Les libellés masquent les sections interdites mais les API refusent également tout accès non autorisé.

## 4. Règles visuelles et accessibilité

1. Typographie : Saira Condensed pour les titres ; Atkinson Hyperlegible pour les contenus.
2. Grille : largeur maximale 1280–1360 px ; cartes de rayon 14–20 px ; espacement 8/12/16/24/32 px.
3. Les textes et boutons doivent rester contrastés sur toutes les images, bannières et dégradés.
4. États : focus clavier 3 px, erreurs et validations textuelles non fondées sur la couleur seule, hover discret.
5. Réduction de mouvement : respecter `prefers-reduced-motion` et la pause existante.
6. Toute photo ajoutée : alt fidèle, dimensions, chargement différé hors écran, format optimisé, année attestée quand le classement est public.
7. Les espaces protégés restent `noindex` ; contenu visible seulement après validation de la session.

## 5. Déploiement par lots sans interruption

**Lot A — Design system (présente PR)** : palettes publiques / membre / Command, typographie, cartes, boutons, espacement, navigation et responsive, sans nouvelle logique serveur. 

**Lot B — Parcours publics** : accueil, histoire, cinq pôles, programmes, IN FIRE, missions, galerie, ressources, formulaires.

**Lot C — Parcours membre** : tableau d'accueil, profil, QR, agenda, Academy, prières, contributions, notifications.

**Lot D — Poste de commandement** : tableaux de bord réels, navigation directe, membres, finances, missions, communications, gouvernance.

**Lot E — Recette production** : tests sur largeurs 320/390/768/1366 px ; clavier ; contrastes ; parcours connecté par rôle ; API et permissions ; performance ; PWA ; consultation sans JavaScript sur pages publiques.

### Critères pour considérer la refonte intégrale terminée

- 32 vues couvertes et comparées avec la charte validée.
- Aucune rupture du portail, des comptes, inscriptions, dons, pointages, données privées, prière ou bibliothèque.
- Chaque action navigue vers un écran réellement fonctionnel et autorisé ; pas de bouton décoratif.
- Validation de l'ensemble de `npm test`, de la publication Cloudflare et des scénarios manuels en production.
- Journal de modifications et procédure de retour arrière documentés.

## 6. Limites connues au démarrage

- L'interface native SDE et la vitrine utilisent actuellement plusieurs feuilles successives avec des règles `!important` anciennes. Refonte progressive nécessaire pour éviter les régressions.
- L'album IN FIRE a déjà été ajouté, mais son classement des photos par année est provisoire ; ne pas inventer d'édition.
- Aucun indicateur réel ne doit être remplacé par un chiffre de démonstration.
