# Procédure SDE — purge Cloudflare et fraîcheur du site

Dernière vérification : 10 novembre 2026.

## Protection mise en œuvre dans le code
- Les pages HTML publiques retournent `Cache-Control: no-cache, must-revalidate`, `CDN-Cache-Control: no-store` et `Cloudflare-CDN-Cache-Control: no-store`.
- Les assets CSS/JS et les médias de la nouvelle version sont distribués par URL versionnée.
- Le déploiement GitHub vérifie la révision du Worker et des ressources sur **mouvement-sde.org** et **app.mouvement-sde.org** avant de déclarer la publication réussie.
- L'absence de purge ne doit jamais être annoncée comme une purge effectuée.

## Opération externe nécessaire pour rétablir la purge totale
Le jeton Cloudflare de publication actuel peut déployer des Workers, mais l'API de purge a renvoyé une erreur d'accès de zone. Cette permission n'est pas conférée par une modification de code.

Le propriétaire doit créer dans le tableau Cloudflare un **API Token distinct**, limité à la zone `mouvement-sde.org`, avec :
- `Zone → Cache Purge → Purge` (ou `Edit` suivant l'interface).
- `Zone → Zone → Read` seulement si la recherche d'ID de zone est souhaitée.

Dans le dépôt GitHub : `Settings → Secrets and variables → Actions → New repository secret` :
- `CLOUDFLARE_CACHE_PURGE_TOKEN` : jeton Cloudflare limité.
- `CLOUDFLARE_ZONE_ID` : identifiant de zone (32 caractères hexadécimaux), optionnel avec permission Zone Read.

Ne jamais publier les valeurs dans une conversation, un commit, une issue ou un journal CI. Une fois configurés, relancer le workflow **Déployer sur Cloudflare** et vérifier la ligne `Cache Cloudflare invalidé pour mouvement-sde.org.`.

## Sécurité et validation
Ne pas réutiliser un mot de passe administrateur ou un jeton de déploiement étendu. En attendant les permissions spécifiques, vérifier les réponses HTML et les URL versionnées : leur fraîcheur est indépendante du succès de la purge complète. Les comptes test de recette privée doivent être séparés des comptes personnels.
