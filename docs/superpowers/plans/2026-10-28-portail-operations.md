# Portail et opérations SDE — Implementation Plan

> Exécution native avec les fonctions existantes du Worker et du routeur ; tests et relecture avant publication.

**Goal:** Appliquer les cinq maquettes fournies au portail existant et rendre le parcours QR opérationnel.
**Architecture:** React/Tailwind pour les nouvelles vues, Worker/D1 pour les contrôles et agrégats. Réutiliser les formulaires natifs des fiches, formations et finances pour conserver leurs règles métier.
**Tech Stack:** React, Tailwind, Chart.js, qrcode-generator, ZXing Browser, Cloudflare Worker/D1.
**Spec:** Maquettes et cahier des charges fournis dans la conversation du 28 octobre 2026.

## Global Constraints
- Même site, session et rôles. Données personnelles propres au compte. Finances réservées au niveau 2.
- Logo réel, photos existantes, marine/bordeaux/or ; aucun profil, QR ou KPI fictif en production.
- Une autorisation caméra est demandée au clic ; fermeture/navigation arrête le flux.
- QR signé, expirant et vérifié côté serveur. Scans répétés idempotents, aucune autre présence écrasée.
- Les validations financières n'initient aucun paiement. Les validations Academy utilisent le formulaire existant.

## Review Focus
- QR altéré/expiré, compte désaffecté ou membre archivé : refus.
- Deux scans ou pointages concurrents : conserver le reste du registre.
- Navigation et erreurs réseau : arrêter caméra, ne pas confirmer une écriture échouée.
- Finances annulées, devises et sources : pas de double comptage caisse/offrandes.
- Absence de données ou médias : états vides explicites, pas de chiffres inventés.

### 1. QR personnel et pointage
- [x] Écrire et exécuter les tests d'accès, signature, expiration, doubles scans et concurrence sur D1.
- [x] Créer `src/member-qr.js`, brancher les trois API carte/scanner/activité dans le Worker et inclure les pointages dans la sauvegarde.
- [x] Ajouter carte QR React et scanner ZXing, avec saisie manuelle et historique.

### 2. Pilotage et navigation
- [x] Tester les API de synthèse Academy/finances et les restrictions de rôle.
- [x] Créer `src/operations.js` pour la progression et les candidats prêts à certifier, le flux mensuel et les budgets de missions.
- [x] Créer `frontend/operations.jsx` : navigation transversale, graphiques Chart.js avec alternative texte, vues de gestion et lecteur de bibliothèque.
- [x] Conserver les fiches natives de l'annuaire et de l'Academy ; ajouter une vue membre accessible sans impersonation.

### 3. Connexion et identité
- [x] Recomposer la connexion avec marque SDE Administration, photographie de l'assemblée, carte en verre et formulaires existants.
- [x] Unifier les styles des modules natifs et des nouvelles vues, avec mode clair, focus clavier et écrans 320/390/900/1440.

### 4. Vérification et publication
- [x] Compiler, exécuter les tests complets et contrôler les rendus responsive.
- [x] Relecture indépendante et correction des anomalies.
- [ ] Publication et contrôle de la version réellement servie.

## Vérifications réalisées
- 226 tests applicatifs et de sécurité réussis avant publication.
- Lecture du QR SVG réellement utilisé validée avec ZXing dans le navigateur.
- Contrôles de la connexion et des vues mobile/desktop sur données de démonstration.
- Arrêt caméra testé pendant import, autorisation et décodage ; une lecture par caméra physique sur téléphone reste à vérifier sur appareil.
- Ajout des RSVP personnels et des urgences modérées ; aucune requête confidentielle migrée vers le mur.
