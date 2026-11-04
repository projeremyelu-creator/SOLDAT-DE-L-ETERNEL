# Corrections intégrales 1 à 7 — conception approuvée

## Objectif

Corriger la vitrine `mouvement-sde.org`, synchroniser les contenus et la PWA, puis valider les parcours publics et privés sans modifier les règles d’autorisation existantes.

## Décisions

- Conserver l’architecture Cloudflare Worker et les pages statiques existantes.
- Maintenir les anciennes URL utiles par des alias contrôlés, mais publier uniquement les URL canoniques.
- Traiter IN FIRE 2026 comme une archive et TPA 2026 comme le prochain programme.
- Ne présenter que le français tant que les traductions anglaise et italienne ne couvrent pas toute la page.
- Étendre la recherche et le répertoire à toutes les rubriques publiques, sans indexer de donnée membre.
- Conserver les contrôles de rôle côté serveur et exécuter une recette authentifiée en lecture seule après publication.

## Risques et garde-fous

- Les routes privées restent `no-store`, `noindex` et protégées par session/rôle.
- Les formulaires, paiements et données pastorales ne sont pas simulés.
- La publication passe par la suite de tests complète et le workflow Cloudflare existant.
