# Accueil et parcours SDE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clarifier l'accueil des nouveaux et rendre le prochain rendez-vous visible.
**Architecture:** HTML/CSS du portail existant et lecture de /api/public ; aucune modification de la base ou des permissions.
**Tech Stack:** HTML, CSS, JavaScript navigateur, node:test/jsdom, Cloudflare Worker.
**Spec:** docs/superpowers/specs/2026-10-28-accueil-parcours-design.md

## Global Constraints
Un seul site, deux espaces privés, identité SDE conservée, aucune donnée privée publique.

## Review Focus
Dates périmées ou invalides ; titre HTML ; API indisponible ; navigation sans JavaScript ; petits écrans et thème clair.

### Task 1: Accueil et agenda
Files: public/vitrine/portail.html, portail-unifie.css, portail-unifie.js ; test/accueil-parcours.test.mjs ; package.json.
- [x] Écrire et exécuter les tests de comportement d'agenda avant son implémentation.
- [x] Modifier les appels à l'action, déplacer les cartes privées, ajouter parcours et FAQ.
- [x] Alimenter la carte par l'API publique, filtrer les dates et conserver le repli vers les programmes.
- [x] Vérifier la suite complète et le rendu responsive ; relire le diff.
- [ ] Enregistrer la modification sur une branche, ouvrir la proposition et vérifier les contrôles avant publication.

Validation : 183 tests réussis ; aperçu desktop vérifié, revue indépendante sans blocage. Le contrôle à 320 px a révélé un lien éditorial existant empêchant le retour à la ligne ; correction limitée à l’accueil.
