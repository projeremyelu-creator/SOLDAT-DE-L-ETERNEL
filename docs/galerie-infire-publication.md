# Album photo IN FIRE — 2024, 2025 et 2026

## Fonctionnalités préparées

- Page `public/vitrine/album-infire.html` : onglets par année (2024, 2025, 2026), grilles responsives et visionneuse clavier.
- Liens depuis `public/vitrine/programmes.html` et `public/vitrine/ressources.html`.
- Dix photographies fournies par le responsable et traitées dans l'archive à installer `Album_photo_IN_FIRE_SDE_2024-2026.zip`.

## Publication — étape obligatoire avant fusion

Les fichiers binaires des photos **ne sont pas encore sur la branche GitHub**. Ne fusionner cette PR qu'après avoir téléversé dans le dépôt le dossier `vitrine/albums/infire/2025/` de l'archive, sous `public/`. La page sait signaler un fichier absent, mais l'album n'est pas complet avant ce transfert.

L'archive comporte les 10 images WebP grand format et leur miniature, ainsi que la version complète de la page.

## Classement provisoire — vérifier les années

La page classe pour l'instant les dix photos dans IN FIRE 2025 sur la base des noms de fichiers qui contiennent 2025 ; il ne s'agit **pas d'une preuve de l'année de l'événement**. Les éditions 2024 et 2026 sont disponibles sous forme d'onglets en attente d'images vérifiées.

Pour reclasser, déplacer les fichiers dans le dossier de l'année appropriée et modifier les objets de la constante `photos` dans `album-infire.html`, puis vérifier leur chargement sur les trois onglets.

## Recette avant publication

1. Vérifier que les 20 fichiers WebP sont présents et que toutes les images se chargent.
2. Vérifier le menu et les liens depuis les pages Programmes et Ressources.
3. Vérifier l'affichage mobile à 320 px et 390 px, la visionneuse, la fermeture par Échap et le focus.
4. Confirmer avec le responsable du mouvement l'attribution des années pour chaque photo.
5. Fusionner la PR et contrôler la mise en ligne Cloudflare de `https://mouvement-sde.org/vitrine/album-infire.html`.

Aucune altération des visages, physionomies ou expressions naturelles n'a été effectuée pendant la conversion ; seuls format, dimensions et compression ont été modifiés.
