# Portail premium SDE Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans.

**Goal:** Simplifier la navigation, mettre en avant IN FIRE et enrichir l'expérience membre.
**Architecture:** Site HTML existant, shell React/Tailwind compilé, mêmes API et sessions ; mur de prière en tables séparées.
**Tech Stack:** React, Tailwind, esbuild, node:test/jsdom, Cloudflare D1.
**Spec:** docs/superpowers/specs/2026-10-28-portail-premium-design.md

## Global Constraints
Un seul site, deux espaces privés ; pas de données confidentielles sur le mur. Aucun média, prix ou paiement inventé.

## Review Focus
Droits et anonymat ; réactions idempotentes ; échéance et fin d'IN FIRE ; navigation clavier et sans JS ; petits écrans et animation réduite.

### Task 1 : navigation et visibilité événement
- [ ] Tests redirection par rôle et compte à rebours à horloge fixe.
- [ ] Menu statique à trois groupes, CTA unique et animation CSS contrôlable.
- [ ] Bandeau IN FIRE, fin automatique et heure officielle.

### Task 2 : expérience privée
- [ ] Shell React/Tailwind : barre mobile, tous les outils, mode Focus et thème lecture.
- [ ] Conserver l'ouverture native des modules et les droits serveur.

### Task 3 : mur de prière
- [ ] Tests authentification, modération, anonymat, unicité des réactions et notifications personnelles.
- [ ] API séparée et UI React de publication, réactions, retrait et modération.

### Task 4 : vérification et publication
- [ ] Suite, build reproductible et contrôle navigateur ; revue indépendante.
- [ ] Enregistrer sur GitHub ; publier si l'accès Cloudflare le permet.

## Décisions et vérification
- Migration progressive : shell React/Tailwind autour des modules natifs, sans recréer les comptes ou les données.
- Teaser de 10 secondes réalisé à partir de l’affiche officielle, sans audio ; maquettes de tenues signalées comme concepts générés.
- Pas d’APK ni de publication Android dans ce lot web. Les notifications web existantes sont conservées ; les notifications du mur sont personnelles, le push exige VAPID configuré.
- Tests : 193 réussis avant les derniers contrôles visuels ; revue indépendante, correction de la transition atomique de modération et du remplacement du bandeau statique.
- L’accès Cloudflare n’est pas connecté ; aucune publication n’est annoncée tant que le déploiement n’est pas confirmé.
