# S.D.E. DIGITAL

Application de gestion du **Mouvement Prophético-Apostolique Soldats de l’Éternel** (S.D.E.), Abidjan.
Texte fondateur : Ézéchiel 37.

En ligne :
- **https://mouvement-sde.org** : site vitrine public (www.mouvement-sde.org y renvoie) ;
- **https://app.mouvement-sde.org** : l’application de gestion.

## Comment c’est organisé

| Élément | Où | Rôle |
|---|---|---|
| `public/` | Cloudflare (fichiers statiques) | L’application telle que la voient les utilisateurs |
| `public/vitrine/` | Cloudflare | Le site vitrine (page unique, modifiable directement) |
| `public/og-*.png` | Cloudflare | Vignettes de partage WhatsApp/Facebook (`python3 app/vignettes.py`) |
| `src/worker.js` | Cloudflare Worker | API des données, comptes (e-mail + mot de passe), fichiers, règles d’accès |
| Base `sde-digital` | Cloudflare D1 | Toutes les données (membres, agenda, caisse, projets…) |
| Espace `sde-fichiers` | Cloudflare KV | Photos et fichiers |
| `source/` | Ici | Code source de l’application et ses tests |
| `app/` | Ici | Pont vers le serveur, module de connexion, construction de la version en ligne |

Chaque envoi sur la branche `main` est publié automatiquement par Cloudflare en une à deux minutes.

## Accès

- **Visiteurs** : agenda, annonces, site vitrine.
- **Soldats** : « Créer mon compte » avec adresse e-mail et mot de passe. Le compte s’ouvre aussitôt (rôle *Soldat*), une fiche est ajoutée au registre avec un **matricule aléatoire à 6 chiffres**, et l’espace soldat s’affiche : carte de membre, présences, cotisations, requête de prière. Un ancien membre (matricule SDE-CI-…) crée son compte, puis un administrateur le relie à sa fiche dans « Comptes et accès » : il garde son matricule et la fiche automatique est retirée.
- **Responsables** : un administrateur ajoute leur adresse avec un rôle ; un **code d’activation** (valable 14 jours, à usage unique) s’affiche, à transmettre par WhatsApp. Ils le saisissent dans « J’ai un code » et choisissent leur mot de passe. Mot de passe oublié : « Nouveau code » dans « Comptes et accès ».
  - *Contributeur* : registre, agenda, pointage, Porte-Voix, sans les finances ;
  - *Administrateur* : tout, finances comprises (nommé par le propriétaire) ;
  - *Lecture seule* ; *En attente* (aucun accès interne).
- **Propriétaires** (variable `PROPRIETAIRES` dans `wrangler.toml`) : tous les droits ; leur adresse ne peut pas servir à une inscription libre.
- **Sécurité** : mots de passe hachés (PBKDF2-SHA256, sel propre à chacun), sessions de 30 jours en cookie protégé, 8 essais manqués bloquent l’adresse un quart d’heure. Le résumé de chaque compte (présences, cotisations) est publié par l’application d’un administrateur (`espace_membre/`), lisible seulement par la personne concernée.

Les règles d’accès aux données sont vérifiées par le serveur (`REGLES` dans `src/worker.js`), pas seulement par l’écran.

## Éliézer (assistant IA)

Éliézer passe par le serveur (`/api/ia`), qui garde la clé de l’API Claude : elle n’est jamais envoyée aux téléphones.

- **Activer** : créer une clé sur https://console.anthropic.com (Settings › API keys) et prévoir un crédit, puis dans Cloudflare : *Workers et Pages › sde › Paramètres › Variables et secrets › Ajouter*, type **Secret**, nom `ANTHROPIC_API_KEY`. Le secret est conservé à chaque déploiement.
- **Accès** : contributeurs, administrateurs et propriétaires connectés. Les outils (registre, agenda, finances…) s’exécutent dans l’application avec les droits de la personne : un contributeur ne transmet jamais les finances.
- **Réglages facultatifs** (variables) : `IA_MODELE` (par défaut `claude-sonnet-5-5`), `IA_MODELE_RAPIDE` (`claude-haiku-5-5`, pour les affiches), `IA_LIMITE_JOUR` (300 appels par personne et par jour).

## Site vitrine

`public/vitrine/index.html` est servi sur mouvement-sde.org. La section « Nos prochains rendez-vous » lit en direct les rassemblements de type Culte, Prière et intercession, Formation, Conférence et Évangélisation (route publique `/api/public`, sans données internes) ; elle reste masquée s’il n’y en a aucun.

## Mettre à jour l’application

1. Modifier les sources dans `source/src/` (voir `source/patch_v5.py`, qui assemble les modules).
2. Construire :
   ```bash
   cd source && python3 patch_v5.py && python3 build.py && cp sde-gestion.html version-claude.html && cd ..
   python3 app/build_heberge.py && python3 app/vignettes.py
   ```
3. Tester en local (Node 22 ou plus) :
   ```bash
   node test/serveur.mjs          # http://localhost:8787
   python3 test/essai_heberge.py  # essais automatiques (Playwright)
   python3 test/essai_v2.py       # vitrine, partage, Éliézer (fausse API Claude)
   python3 test/essai_comptes.py  # inscription, matricule, connexion, codes d’activation
   python3 test/essai_medias.py   # médiathèque : envoi, lecture partielle, visibilité
   ```
4. Envoyer sur `main` : Cloudflare publie.

## Médiathèque

Onglet « Médiathèque » : vidéos (MP4, WebM, MOV), audios (MP3, M4A, WAV), photos (JPG, PNG, WebP), PDF, Word, PowerPoint et Excel.

- **Ajout** : contributeurs et administrateurs, plusieurs fichiers à la fois, avec catégorie, description et visibilité (*Public*, *Membres connectés*, *Responsables*). Les fichiers partent par morceaux de 8 Mo (reprise automatique en cas de coupure) ; une miniature est créée pour les photos et les vidéos.
- **Lecture** : vidéo et audio dans l’application avec avance rapide (requêtes partielles), photos en grand avec précédente/suivante, PDF affiché, documents Office téléchargeables. Lien de partage WhatsApp pour les médias publics.
- **Droits** : la visibilité est vérifiée par le serveur à chaque ouverture (`/m/…`) ; l’auteur et les administrateurs modifient ou suppriment.
- **Stockage** : au départ dans l’espace KV (1 Go gratuit, 200 Mo par fichier). Avec R2 relié (`MEDIAS`, voir `wrangler.toml`) : 10 Go gratuits, 2 Go par fichier. Réglages facultatifs : `MEDIA_FICHIER_MAX_MO`, `MEDIA_TOTAL_MO`.
- Les envois abandonnés sont effacés chaque nuit ; la liste des médias figure dans la sauvegarde quotidienne (pas les fichiers eux-mêmes : gardez les originaux).

## Sauvegardes

- **Automatique, chaque nuit à 2 h** (déclencheur planifié du Worker) : toute la base (documents et comptes, sans mots de passe) est copiée dans l’espace `sde-fichiers` sous `sauvegarde:AAAA-MM-JJ` et gardée 35 jours.
- Dans l’application : *Comptes et accès › Sauvegardes automatiques* (administrateurs) pour la liste, « Sauvegarder maintenant » et le téléchargement. Le fichier se restaure avec *Transférer des données* (propriétaire).
- Ces copies ne sont jamais servies par l’adresse publique des fichiers (`/_blob/`).
- En complément : « Sauvegarde Excel » mensuelle dans l’application, et Time Travel de D1 (retour à n’importe quel instant des 7 derniers jours).

## Sécurité

- Règles d’accès vérifiées par le serveur à chaque lecture et écriture (`REGLES`), synchronisation comprise.
- Visiteurs et soldats ne reçoivent jamais la liste des présents d’un rassemblement, ni les noms des comptes.
- En-têtes de sécurité sur toutes les réponses : HSTS, nosniff, interdiction d’intégration dans un autre site, Referrer-Policy.
