# Portail complet SDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Terminer et publier les sept améliorations validées du portail SDE.
**Architecture:** Un module API indépendant utilise les documents et comptes existants. Un module visuel enrichit le routeur natif sans seconde application. Les données restent dans D1.
**Tech Stack:** JavaScript natif, Cloudflare Worker/D1, Node 24 SQLite et jsdom pour tests.
**Spec:** docs/superpowers/specs/2026-10-27-portail-complet-design.md

## Global Constraints
- Préserver les comptes, D1 et les permissions serveur existantes.
- Ne pas reconstruire public/index.html depuis les anciennes sources.
- Aucun nouveau service payant, secret, compte ou fournisseur à connecter.
- Boutons tactiles >=44px ; mouvements réduits respectés.
- Pas de promesse de livraison e-mail ou push sans canal réellement configuré.

## Review Focus
- Un compte sans fiche reçoit un accueil utilisable sans données d'autrui.
- Une erreur réseau ne produit pas de fausse confirmation de sauvegarde.
- Un membre ne lit jamais une demande de récupération, un journal admin ou le témoignage d'autrui.
- Une requête confidentielle reste accessible seulement à son auteur et au propriétaire.
- Les préférences enregistrées désactivent effectivement les rappels correspondants.

### Task 1: API et confidentialité
**Files:** src/portal-services.js, src/worker.js, test/portail-services.test.mjs, test/helpers/d1.mjs.
**Interfaces:** /api/portail-resume GET ; /api/mes-preferences GET/PATCH ; /api/mon-parcours-spirituel GET/PATCH ; /api/recuperation POST ; /api/recuperations GET/PATCH ; /api/journal-administratif GET ; /api/temoignages-personnels GET/POST ; /api/temoignages-validation GET/PATCH. Données de compte dérivées de la session seulement.
- [ ] Écrire les tests SQLite de rôles, isolation, validation, rappels et audit ; vérifier leur échec.
- [ ] Implémenter les API avec validation et champs publics explicitement sélectionnés.
- [ ] Enrichir prières avec confidentialité et historique propre ; corriger les appels lireRequete de l'historique.
- [ ] Exécuter node --test test/portail-services.test.mjs ; résultat attendu : zéro échec.
- [ ] Commit API et tests.

### Task 2: Connexion et récupération
**Files:** public/vitrine/connexion-unifiee.html, portail-connexion.js ; test/portail-connexion-ux.test.mjs.
**Interfaces:** POST /api/recuperation avec email ; réponse neutre, aucun code envoyé au navigateur anonyme.
- [ ] Tests UI pour visibilité du mot de passe, erreurs réseau, retour et récupération ; vérifier leur échec.
- [ ] Ajouter les contrôles accessibles, validation locale et récupération assistée.
- [ ] Exécuter node --test test/portail-connexion-ux.test.mjs ; résultat attendu : zéro échec.
- [ ] Commit connexion et tests.

### Task 3: Accueils, vie spirituelle, mobile et rappels
**Files:** public/vitrine/portail-direct.js/.css, portail-plus.js/.css, public/index.html ; test/portail-plus.test.mjs.
**Interfaces:** événement sde:ready avec compte/selectionner ; sde:navigate pour changer la surface active. Consomme les API Task 1 ; les modules natifs conservent leurs droits.
- [ ] Tests UI : accueil réel, recherche, navigation sans page intermédiaire, sauvegardes, erreurs, filtres de rappel, confidentialité et outils admin ; vérifier leur échec.
- [ ] Implémenter les surfaces accueil, parcours et préférences ; intégrer l'administration et les destinataires des prières.
- [ ] Ajouter styles responsive, barre mobile, titre courant, chargement et erreurs accessibles.
- [ ] Exécuter node --test test/portail-plus.test.mjs puis npm test ; résultat attendu : zéro échec.
- [ ] Commit interface et tests.

### Task 4: Validation et publication
**Files:** README.md, package.json, tests associés et correctifs de revue.
**Interfaces:** dépôt main déclenche Cloudflare Builds.
- [ ] Vérifier les parcours connectés localement avec données de test et les pages sans débordement mobile.
- [ ] Revue indépendante du diff complet ; traiter les problèmes importants.
- [ ] Exécuter npm test et git diff --check ; résultat attendu : zéro échec.
- [ ] Publier via mise à jour atomique de main sans force ; attendre Cloudflare et GitHub verts.
- [ ] Vérifier en ligne accueil, connexion et les deux boutons ; signaler les limites de livraison des canaux externes.
