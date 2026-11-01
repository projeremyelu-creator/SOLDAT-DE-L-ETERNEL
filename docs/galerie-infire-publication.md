# Album IN FIRE — 2024, 2025 et 2026

## État technique

- La page `/vitrine/album-infire.html` affiche les trois éditions 2024, 2025 et 2026.
- La navigation vers l'album est intégrée aux pages Programmes et Ressources.
- Les 10 photographies et leurs 10 miniatures WebP sont enregistrées dans `public/vitrine/albums/infire/2025/`.
- Pour la cinquième photographie, le fichier principal utilise la miniature de 650 × 433 px comme solution de secours (la version 1400 px n'a pas pu être importée).
- Le catalogue `public/vitrine/albums/infire/album.json` conserve les légendes et les sources d'origine.
- Le script `node scripts/verifier-galerie-infire.mjs` contrôle l'existence de chacun des 20 fichiers et les liens depuis les deux pages.
- Le workflow `.github/workflows/verifier-album-infire.yml` permet le contrôle automatique sur GitHub.

## Années à vérifier après publication

Les dix photographies restent affectées provisoirement à l'édition 2025, sur la base des noms de fichiers. Cette convention n'est pas une certification de l'année des événements. Les onglets 2024 et 2026 sont déjà disponibles, sans photos attribuées à ce stade.

Pour reclasser une photographie, déplacer les fichiers vers le répertoire de l'année correcte, puis mettre à jour sa référence dans `album-infire.html` et `album.json`.

## Contrôle de publication

Vérifier la réussite de la CI, la fusion dans `main`, le workflow de déploiement Cloudflare, puis ouvrir les URL `/vitrine/album-infire.html`, `/programmes` et `/ressources` sur téléphone et ordinateur.
