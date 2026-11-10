# Studio de publication SDE — ajouter des fichiers directement depuis son appareil

## Accès

1. Ouvrir `https://mouvement-sde.org/administration/medias` (ou le même chemin depuis `app.mouvement-sde.org`).
2. Se connecter avec un **compte administrateur** (ou propriétaire). Les membres et enseignants ordinaires n'accèdent pas à cette interface.
3. Sélectionner les fichiers depuis un téléphone ou ordinateur, choisir la rubrique, la visibilité et ajouter une description.
4. Pour une **publication publique**, cocher la confirmation des autorisations de diffusion avant d'envoyer.
5. Cliquer sur « Envoyer les fichiers » et suivre la progression. Ne pas fermer la page avant la confirmation finale. Les envois par morceaux réduisent le risque d'interruption sur mobile.
6. Pour changer de rubrique/visibilité ou supprimer un média, utiliser « Mes fichiers et publications ».

Le studio s'appuie sur `/api/medias` et `/m/:id/:nom` déjà utilisés par SDE OS : aucune clé de stockage n'est placée dans le navigateur.

## Emplacements et destinations

| Rubrique choisie | Page publique correspondante |
|---|---|
| Soldiers TV | `/soldiers-tv` |
| Prières et intercession | `/priere` |
| Missions humanitaires | `/missions-humanitaires` |
| Tenues SDE | `/boutique` |
| Enseignements et documents | `/enseignements` |
| IN FIRE | `/album-infire` |
| Soldiers Voice | `/soldiers-voice` |
| Témoignages | `/temoignages` |
| Toutes les publications publiques | `/mediatheque` |

**Visibilité par défaut : membres privés.** Seul un compte au niveau administrateur peut créer ou rendre un média public. Les nouveaux fichiers privés ne sont pas affichés sur le site vitrine. Les dossiers pastoraux et le matériel d'enseignement restreint conservent leurs contrôles d'accès indépendants.

## Types, stockage et limites

- Photos : JPG, PNG, WebP, GIF, HEIC (certaines anciennes versions de navigateurs ne prévisualisent pas HEIC).
- Vidéos : MP4, MOV, WebM, M4V ; MP4 H.264/AAC recommandé pour la compatibilité mobile.
- Audio : MP3, M4A, AAC, WAV, OGG.
- Documents : PDF, Word, Excel et PowerPoint.
- Taille maximale affichée par le studio depuis la configuration serveur : **KV par défaut jusqu'à 200 Mo/fichier**, quota total par défaut 900 Mo ; **R2 uniquement si activé sur Cloudflare**, capacité configurée distinctement. Les chiffres affichés sont lus en direct et ne garantissent pas le quota gratuit d'un plan. L'envoi s'effectue par blocs de 8 Mo.
- Pour une bibliothèque vidéo à grand volume, activer préalablement le compartiment `sde-medias` et la liaison `MEDIAS` R2 de `wrangler.toml` ; le fait de créer l'interface n'active pas R2.

## Vérifications et limitations opérationnelles

- Test automatisé : refus des comptes non administrateurs, API de médias inchangée pour les membres autorisés et accès public réservé aux ressources rendues publiques.
- Les pages vitrine interrogent en lecture seule `GET /api/medias`, affichent uniquement `visibilite=public` et ne révèlent aucune donnée privée.
- Un fichier est disponible uniquement après l'envoi et la confirmation `/fin`. Les échecs suppriment le transfert incomplet.
- Les changements de visibilité sont appliqués côté serveur ; une publication publique devient visible aux visiteurs sans nouveau déploiement GitHub. Les navigateurs peuvent mettre brièvement en cache les fichiers publics.
- La réussite de la CI ne démontre pas à elle seule un téléversement authentifié réel : la recette avec comptes membre et administrateur nécessite des comptes QA dédiés et quatre secrets GitHub `SDE_QA_MEMBER_LOGIN`, `SDE_QA_MEMBER_PASSWORD`, `SDE_QA_ADMIN_LOGIN`, `SDE_QA_ADMIN_PASSWORD`.

## Confidentialité

Ne publiez pas une photo identifiable, un document financier, une liste de contacts, un dossier pastoral ou une vidéo d'autrui sans vérifier les permissions, le droit à l'image et la finalité de diffusion. Préférer `responsables` ou `membres` pour tout document interne.
