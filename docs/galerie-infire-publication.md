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


## Nouvelle sélection IN FIRE 2026 — intégration via le studio

L'album /album-infire sait désormais afficher les médias publiés par le studio SDE
sur /api/medias, dans l'onglet **IN FIRE 2026**. Cette intégration :

- inclut uniquement les images et vidéos de la catégorie IN FIRE dont le titre,
  la description ou le nom de fichier mentionne **2026** ;
- ne lit aucune publication privée : le serveur conserve ses contrôles de visibilité ;
- conserve les dix photographies de l'album 2025 et leurs fichiers ;
- utilise un chargement progressif pour les photos et la lecture vidéo à la demande.

Pour importer les **quatre photographies et trois clips** fournis pour l'édition 2026,
ouvrir /sde-mediatheque-admin avec un compte autorisé, choisir la catégorie
**IN FIRE**, nommer chaque fichier avec « IN FIRE 2026 », puis choisir
**Public** et confirmer les droits à l'image. Les médias seront ensuite affichés
automatiquement, sans redéploiement.

La photographie de deux participantes présentant les tenues SDE doit être
classée séparément dans **Tenues SDE** (son rattachement à IN FIRE 2026
n'a pas été confirmé).

**Important :** cette modification de code prépare et affiche les médias publiés
sur le serveur ; elle ne prouve pas que les fichiers binaires transmis dans
une conversation ont déjà été téléversés dans le studio.
