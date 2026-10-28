# Maquette responsive SDE Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Adapter les trois expériences de la maquette au site existant.
**Architecture:** Hero React existant et accueil privé natif ; enrichissement de l'API administrative par agrégats.
**Tech Stack:** JavaScript, React, Tailwind, D1, node:test/jsdom.
**Spec:** docs/superpowers/specs/2026-10-28-maquette-responsive-design.md

## Global Constraints
Logo officiel, aucun utilisateur fictif, aucun faux code QR ni données inventées. Droits inchangés.

## Review Focus
Absence de pointages, événements futurs, participants retirés, modules supprimés, petits écrans.

- [x] Tester les calculs des agrégats avec fixtures contrôlées et protection des rôles.
- [x] Ajouter l'accueil membre à tuiles et l'accueil direction à indicateurs.
- [x] Adapter le hero à IN FIRE avec retour automatique au mouvement après la fin.
- [ ] Compiler, exécuter la suite, vérifier les rendus et publier le résultat vérifié.

## Vérification effectuée
198 tests réussis et compilation React/Tailwind. Revue indépendante : raccourci Présences corrigé pour cibler la section réellement livrée, avec test d'intégration du focus. Menu latéral aligné en haut et contrôlé visuellement. Contrôle à 320 px sans débordement horizontal ; accueil membre et tableau de bord vérifiés avec données de démonstration non publiées.

La mise en ligne doit être confirmée séparément ; le dernier workflow Cloudflare du dépôt échoue faute d'accès configuré.
