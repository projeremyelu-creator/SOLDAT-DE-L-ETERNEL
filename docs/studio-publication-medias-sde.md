# SDE 2027 — Ajouter photos, vidéos et documents depuis son appareil

## Accès rapide
Le **Studio de publication** est disponible à l'adresse :
- `https://mouvement-sde.org/administration/medias`
- `https://app.mouvement-sde.org/administration/medias`

Se connecter avec son compte **administrateur ou propriétaire SDE**. Les visiteurs, membres ordinaires, enseignants et responsables non administrateurs ne peuvent pas ouvrir ce studio.

## Utilisation depuis Android, iPhone ou ordinateur
1. Ouvrir **Poste de commandement → Médiathèque** (ou directement `/administration/medias`).
2. Appuyer sur **Parcourir mon appareil** et choisir une ou plusieurs photos, vidéos ou documents.
3. Vérifier le titre de chaque fichier et la **rubrique de publication** : Soldiers TV, Prières, Missions humanitaires, Boutique, Enseignements et documents, IN FIRE, Soldiers Voice ou Témoignages.
4. Choisir la **visibilité** :
   - **Membres** : seuls les comptes connectés voient le fichier.
   - **Responsables** : accès limité aux responsables.
   - **Public** : visible sur `/mediatheque` et sur la page de la rubrique choisie. Réservé aux administrateurs SDE.
5. Pour une publication publique, confirmer disposer des **autorisations de diffusion nécessaires**, notamment pour les personnes photographiées.
6. Cliquer sur **Envoyer les fichiers**. Suivre le pourcentage. L'envoi est automatiquement fractionné en morceaux de 8 Mo, avec nouvelle tentative en cas de réseau instable.
7. Une fois le fichier complet, il est enregistré dans la médiathèque. Pas de GitHub et pas de nouveau déploiement nécessaire.

## Rubriques du site public
| Rubrique sélectionnée | URL publique |
| --- | --- |
| Soldiers TV | `/soldiers-tv` |
| Prières et intercession | `/priere` |
| Missions humanitaires | `/missions-humanitaires` |
| Tenues SDE | `/boutique` |
| Enseignements et documents | `/enseignements` |
| IN FIRE | `/album-infire` |
| Soldiers Voice | `/soldiers-voice` |
| Témoignages | `/temoignages` |

Toutes les publications publiques figurent aussi sur `/mediatheque`. Les anciens contenus statiques restent inchangés.

## Sécurité et stockage
- **Cloudflare D1** : métadonnées et visibilité des fichiers ; **KV FICHIERS** : morceaux des fichiers (liaison déjà configurée).
- **Cloudflare R2** est optionnel pour de longues vidéos : activer le compartiment `sde-medias` puis la liaison `MEDIAS` dans `wrangler.toml`. Le studio affiche la limite de taille réellement disponible.
- L'API `/api/medias` permet l'upload authentifié et gère les requêtes Range pour les vidéos. L'API n'accepte pas de publication publique par un rôle inférieur à administrateur.
- Les fichiers privés restent servis par `/m/<id>/...` avec contrôles de session et droits de la Soldiers Academy et de Love School, sans copie vers les dossiers publics statiques.
- Les médias ajoutés depuis le studio ne sont **pas** sauvegardés dans GitHub : ils sont stockés dans le compte Cloudflare du mouvement. Une sauvegarde D1 des métadonnées ne remplace **pas** une sauvegarde des fichiers binaires ; prévoir une stratégie R2 et sauvegarde avant exploitation intensive.
- Les fichiers sont supprimables depuis le studio ; une suppression est définitive.
- Limites, permissions et quotas sont contrôlés par le serveur. Une publication ne remplace pas une validation pédagogique dans Soldiers Academy.

## Recette indispensable
- Vérifier qu'un visiteur ne peut pas ouvrir `/administration/medias`.
- Vérifier qu'un membre ordinaire ne peut pas publier en public.
- Se connecter avec un compte administrateur de test et téléverser une petite image, puis la publier dans la rubrique ciblée ; s'assurer de sa présence sur `/mediatheque` et dans la rubrique.
- Déposer un document privé, vérifier qu'un visiteur anonyme ne peut ni le lister ni le consulter.
- Vérifier la lecture mobile d'une vidéo MP4 et le téléchargement d'un document.
- Supprimer les fichiers d'essai après contrôle.

**Important :** la mise en production du code ne prouve pas à elle seule qu'un fichier a été téléversé avec un compte administrateur réel. Ne pas confondre validation des routes automatisées et recette privée authentifiée.
