# Vitrine SDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Améliorer la navigation, la présentation et le contrôle du mouvement sur la vitrine actuelle.
**Architecture:** HTML conservé ; petits scripts de navigation et de préférences indépendants, CSS de présentation limité à la vitrine. Brancher la préférence sur les animations existantes.
**Tech Stack:** HTML, CSS, JavaScript natif, Node test runner et jsdom pour les tests DOM.
**Spec:** docs/superpowers/specs/2026-10-24-vitrine-design.md

## Global Constraints
- Conserver contenus, médias, API et liens existants.
- Ne modifier ni production, DNS, backend, base ou espace privé.
- Respecter la réduction de mouvement du système.

## Review Focus
- Petit écran : menu défilable et bouton de fermeture accessible.
- Clavier : focus rendu au déclencheur et absence de fuite sous le panneau.
- Redimensionnement : arrière-plan déverrouillé au passage ordinateur.
- Stockage indisponible : commandes utilisables sans erreur.
- Préférence système changée en direct : mouvement immédiatement réduit.

### Task 1: Navigation, présentation et mouvement
**Files:** public/vitrine/index.html, public/vitrine/navigation.js, public/vitrine/motion.js, public/vitrine/experience.css, test/vitrine-navigation.test.mjs.
**Interfaces:** navigation.js utilise #entete, #burger, #nav-principal et [data-rubrique] ; motion.js publie data-motion et sde-motion-change avec detail.reduced ; le script existant consomme ces états.
- [x] Écrire puis exécuter les tests de fermeture, focus, verrouillage, redimensionnement et préférences. Constater les échecs de comportement avant modification.
- [x] Regrouper les destinations, rendre la navigation accessible, ajouter le style adaptatif et la commande de pause ; relier canvas/versets à la préférence.
- [x] Exécuter node --test test/vitrine-navigation.test.mjs et node test/verifier.mjs ; attendu : succès.
- [x] Contrôler la présentation via l’aperçu Sites et documenter les limites.
- [x] Branche distante créée ; correctif synchronisé avec la base actuelle et prêt à proposer en PR.

## Vérification réalisée
- npm ci --ignore-scripts : dépendances installées depuis le fichier verrouillé.
- npm test : vérification de tous les scripts et 10 tests DOM réussis lors du premier lot ; 11 tests réussis après intégration de la page Academy.
- Relecture indépendante : lien du logo mobile conservant le panneau ouvert repéré ; correction vérifiée par un test en échec puis réussi.
- Aperçu Chrome : ordinateur et cadres de 320 et 390 px, thèmes clair/sombre et sous-menus.
- Limite : pas de test sur téléphone physique et API distante non exercée depuis l’aperçu statique. Les scénarios backend Python historiques dépendent de fichiers absolus externes ; ils ne sont pas inclus dans ce lot de vitrine.
- Choix d’exécution : amélioration progressive de la palette actuelle et des sections existantes ; migration multipage reportée. Impact si ce choix doit évoluer : travail supplémentaire de routage, aucun changement de données.

## Reprise après reconnexion GitHub
- Accès GitHub vérifié ; dépôt 1419676424 renommé SOLDAT-DE-L-ETERNEL.
- Base actualisée : 0b312f947b10b350f27dbdba9ee53f1acfd71f26.
- Conflit de navigation résolu en conservant la nouvelle page /vitrine/academy.html et ses trois accès : menu Ressources, programme et parcours de formation.
- Nouveau test de non-régression Academy ajouté après échec constaté.
