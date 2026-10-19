# S.D.E. DIGITAL

Application de gestion du **Mouvement Prophético-Apostolique Soldats de l’Éternel** (S.D.E.), Abidjan.
Texte fondateur : Ézéchiel 37.

En ligne : **https://app.mouvement-sde.org**

## Comment c’est organisé

| Élément | Où | Rôle |
|---|---|---|
| `public/` | Cloudflare (fichiers statiques) | L’application telle que la voient les utilisateurs |
| `src/worker.js` | Cloudflare Worker | API des données, connexion Google, fichiers, règles d’accès |
| Base `sde-digital` | Cloudflare D1 | Toutes les données (membres, agenda, caisse, projets…) |
| Espace `sde-fichiers` | Cloudflare KV | Photos et fichiers |
| `source/` | Ici | Code source de l’application et ses tests |
| `app/` | Ici | Pont vers le serveur, module de connexion, construction de la version en ligne |

Chaque envoi sur la branche `main` est publié automatiquement par Cloudflare en une à deux minutes.

## Accès

- **Visiteurs et soldats** : agenda, annonces, et « Mon espace » avec leur code personnel. Aucun compte nécessaire.
- **Responsables** : bouton « Se connecter avec Google ». Le rôle est donné par un administrateur dans « Mon compte › Comptes et accès » :
  - *Contributeur* : registre, agenda, pointage, Porte-Voix, sans les finances ;
  - *Administrateur* : tout, finances comprises ;
  - *Lecture seule* ; *En attente* (aucun accès interne).
- **Propriétaires** (variable `PROPRIETAIRES` dans `wrangler.toml`) : tous les droits.

Les règles d’accès aux données sont vérifiées par le serveur (`REGLES` dans `src/worker.js`), pas seulement par l’écran.

## Mettre à jour l’application

1. Modifier les sources dans `source/src/` (voir `source/patch_v5.py`, qui assemble les modules).
2. Construire :
   ```bash
   cd source && python3 patch_v5.py && python3 build.py && cp sde-gestion.html version-claude.html && cd ..
   python3 app/build_heberge.py
   ```
3. Tester en local (Node 22 ou plus) :
   ```bash
   node test/serveur.mjs          # http://localhost:8787
   python3 test/essai_heberge.py  # essais automatiques (Playwright)
   ```
4. Envoyer sur `main` : Cloudflare publie.

## Sauvegardes

- Dans l’application : « Sauvegarde Excel » (Espace direction) chaque mois.
- Base complète : Cloudflare › D1 › `sde-digital` › Time Travel permet de revenir à n’importe quel instant des 7 derniers jours (offre gratuite).
