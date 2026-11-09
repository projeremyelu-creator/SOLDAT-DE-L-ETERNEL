# Publication des médias SDE 2027 avec un seul ZIP

**Projet :** [Mouvement SDE](https://github.com/projeremyelu-creator/SOLDAT-DE-L-ETERNEL)

## Fichiers attendus
Archive unique **`Medias_SDE_2027_prets_pour_site.zip`** (16 Mo), préparée depuis les 7 photos et 3 vidéos fournies le 9 novembre 2026. SHA-256 : `c039c5a548f1f79ca4d144895c43162ff7e0f0b7c2ca04bc87642adb12ecac38`.

Ce ZIP comprend 7 photos optimisées, 7 miniatures, 3 vidéos MP4, 3 affiches et 2 documents de référence (les documents ne sont pas publiés sur le Web).

## Dernière opération côté administrateur
1. Téléchargez l'archive ZIP depuis cette conversation, **ne la décompressez pas**.
2. Dans le dépôt GitHub officiel, choisissez la branche **main**, puis **Add file → Upload files**.
3. Importez **uniquement le fichier ZIP à la racine du dépôt**, en gardant exactement son nom `Medias_SDE_2027_prets_pour_site.zip`.
4. Validez le commit. L'envoi dans GitHub déclenche automatiquement `.github/workflows/deployer.yml`.

Le pipeline vérifie l'empreinte SHA-256 de l'archive, extrait uniquement les 20 actifs autorisés dans `public/vitrine/media/archives-2027/` et `public/vitrine/media/videos-2027/`, construit le site, publie sur Cloudflare, puis vérifie **HTTP 200 et les MIME images/vidéos** pour les 10 médias principaux sur **les deux domaines**.

## Critères d'acceptation
- `MEDIAS_SDE_INSTALLES` : archive validée et 20 fichiers extraits.
- `PUBLICATION_VERIFIEE` : Worker et pages principales visibles, révision cohérente.
- `MEDIAS_SDE_PUBLICATION_VERIFIEE` : les 7 photos principales et 3 vidéos sont réellement accessibles sur les 2 domaines.
- Si l'archive est absente, la galerie conditionnelle reste invisible et les logs affichent `MEDIAS_SDE_EN_ATTENTE`. Aucune publication factice.
- Si l'archive est modifiée ou corrompue, la construction échoue sans extraction.
- Les droits à l'image et les autorisations de diffusion doivent être respectés avant le commit de publication.

**Attention :** la branche `main` ne contient pas actuellement ce ZIP. Les scripts ne sont pas un substitut à l'envoi de fichiers binaires.
