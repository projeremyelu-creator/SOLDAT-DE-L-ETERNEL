# Mise en ligne des dix médias déposés dans GitHub

Le 9 novembre 2026 à 20 h 13 GMT, dix médias ont été envoyés individuellement à la racine de la branche main (7 images, 3 MP4). **Ne pas réimporter le ZIP : les originaux sont déjà disponibles dans ce dépôt.**

Le pipeline officiel identifie automatiquement les sept photos par leur empreinte perceptuelle (sans supposer que le nom WhatsApp indique le contenu), et les trois vidéos par leur durée. En cas d'ambiguïté ou de fichier différent, la livraison est bloquée plutôt que de publier une image sous un titre incorrect.

Le traitement est lancé en CI par `scripts/installer-medias-sde.py` et `scripts/importer-medias-sde-originaux.py` et effectue :
- 7 photographies en WebP et 7 miniatures, EXIF supprimés
- 3 vidéos MP4 H.264/AAC et 3 affiches JPEG
- classement dans `public/vitrine/media/archives-2027/` et `public/vitrine/media/videos-2027/`
- vérification de 10 chemins publics et du type MIME sur les deux domaines après déploiement

Les 10 fichiers téléversés restent à la racine en tant que sources pour les prochaines constructions. **Les images et vidéos réelles restent publiées exclusivement dans leurs sections prévues**, et aucune donnée d'identité ou de date non vérifiée n'est ajoutée. Les maquettes de polos ne constituent pas une preuve de stock.

N'annoncer la publication terminée que lorsque la phase `MEDIAS_SDE_PUBLICATION_VERIFIEE` et la phase `PUBLICATION_VERIFIEE` sont toutes deux enregistrées dans les journaux du workflow Cloudflare.
