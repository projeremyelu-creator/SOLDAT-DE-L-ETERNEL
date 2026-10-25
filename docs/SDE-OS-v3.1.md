# SDE OS v3.1 — Architecture Ultra-Hybride

Référence : document institutionnel « SDE DOCUMENT PRESENTATION OFFICIELLE.pdf », Édition Soldier House, version 3.0, octobre 2026.

## Accès et architecture
- Application privée autonome : https://app.mouvement-sde.org/os/ ; l'ancienne application demeure à https://app.mouvement-sde.org/.
- Site public : https://mouvement-sde.org/ ; aucune API sensible SDE OS n'est autorisée sur le domaine public.
- Authentification et permissions réutilisées depuis le Worker SDE ; données applicatives nouvelles enregistrées dans Cloudflare D1.
- API : /api/os/bootstrap, /api/os/evaluation, /api/os/barometre, /api/os/parcours, /api/os/actions, /api/os/finances.
- PWA installable sur le périmètre /os/ et cache statique exclusivement : ni API, ni bilans, ni jetons de session hors ligne.

## Fidélité institutionnelle
- Chapitre 14, pages 37–38 : les SEPT dimensions originelles sont spirituelle, identitaire et personnelle, familiale et relationnelle, professionnelle, économique, sociale et missionnaire. Auto-évaluation personnelle annuelle recommandée, sans contrôle institutionnel.
- Quatre indicateurs supplémentaires demandés pour SDE OS (ressenti spirituel, physique, émotionnel et financier) : complémentaires et FACULTATIFS ; ni diagnostics, ni scores de conformité, ni évaluations par un responsable.
- Chapitre 4, page 22 : les QUATRE fractures institutionnelles sont (1) spiritualité sans transformation du caractère, (2) connaissance biblique sans service, (3) foi dissociée de la vie familiale/professionnelle/économique et (4) autorité sans redevabilité/protection.
- L'indicateur « préjugés perçus » est une extension demandée pour v3.1 et n'est pas une cinquième fracture institutionnelle du document ; les notes sont des perceptions volontaires et ne mesurent pas des traits d'individus.
- Chapitre 19, page 46 : Soldiers Academy comprend Fondations, Maturité, Service & Leadership, Mission & Influence ; la progression est auto-déclarée, aucune certification n'est produite.
- Chapitre 32, page 67 : cinq pôles fidèlement nommés et leurs mandats.
- Chapitres 24 et 30, pages 54–55 et 62–63 : organigramme et séparation des fonctions financières ; aucun montant-seuil n'est inventé, toutes les demandes dans ce registre suivent l'approbation croisée.

## Gouvernance et limites d'intégration
- Les comptes connectés peuvent enregistrer et supprimer leurs propres bilans. Les gestionnaires niveau 2 ou supérieur (permissions existantes) peuvent écrire des plans de pôles et suivre le nouveau registre financier.
- Toute demande du registre quatre yeux doit être autorisée par une autre identité ; l'exécution est déclarée avec référence documentaire par une identité différente de l'autorisateur ; le contrôle est effectué par une autre identité que l'exécutant.
- Le registre ne verse pas d'argent et n'exécute aucune opération bancaire. Les flux financiers historiques de l'ancienne application ne sont pas automatiquement soumis à ce nouveau workflow ; cela nécessiterait une intégration spécifique validée par le Directoire.
- Chaque étape garde un journal d'audit D1.
- Le baromètre utilise l'identifiant de compte dans D1 uniquement pour éviter les votes multiples par mois. La restitution aux utilisateurs ne livre aucun score individuel ni identifiant et masque toute période comptant moins de 5 contributions. Un contributeur peut remplacer ou retirer sa contribution mensuelle.
- La plateforme ne collecte aucun historique médical détaillé ; les quatre ressentis personnels sont facultatifs, stockés uniquement dans le compte privé et exclus des notifications par e-mail.
- Le texte institutionnel mentionne l'adoption du règlement du Directoire, des seuils financiers et du référentiel pédagogique ; ces éléments restent à formaliser officiellement.

## Quatre paradigmes visuels et cinq navigations
1. Paradigmes : Commandement institutionnel, Bento interactif, Clarté & concentration, Immersion & mission.
2. Modes de navigation : méga-menu de bureau, barre latérale repliable, tuiles Bento contextuelles, palette de commandes Ctrl/⌘+K, barre inférieure mobile + tiroir Plus.
3. Accessibilité : contraste, focus clavier, réglages de thème, comportement responsive et réduction des animations.

## Validation
- npm test : tests d'API, isolation des comptes, permissions administratives, baromètre N=5, consentement et retrait, matrice de séparation des rôles financiers, interface et PWA.
- Contrôle de livraison requis : connexion réelle avec comptes distincts, consultation des bilans, approbation par deux responsables différents, vérification mobile, et réconciliation avec les anciens dossiers avant activation opérationnelle généralisée.
