# SDE OS — Refonte intégrale hybride (novembre 2026)

## Décision de design
Une seule identité de marque, trois espaces différenciés :

| Espace | Direction visuelle | Principaux usages |
| --- | --- | --- |
| Site public | **Impérial** : bleu nuit, or, ivoire, bordeaux | Accueil, Mouvement, IN FIRE, programmes, pôles, formation, missions, dons, médias, témoignages |
| Tableau membre | **Lumière** : papier ivoire, navigation vert profond, touches bordeaux et or | Profil, présence, prière, Academy, notifications, cotisations |
| Tableau administrateur | **Command** : vert treillis et graphite, cartes ivoire, accents or | Registre, pointages, budget, communications, pilotage des pôles, dossiers protégés |
| Application métier | Palette cohérente avec SDE OS, choix ivoire/militaire préservé | Modules historiques, tableaux, formulaires, outils administratifs |

## Fichiers
- `public/vitrine/sde-premium-public.css` : design public transversal.
- `public/vitrine/sde-premium-dashboards.css` : espaces membre et administration, styles scindés selon `data-dashboard`.
- `public/vitrine/sde-premium-app.css` : application de gestion, sélection par `data-sde-palette`.
- 38 fichiers `public/vitrine/*.html` chargent la charte correspondant à leur rôle.
- `public/index.html` charge la charte de l'application privée.

## Portée et sécurité
Il s'agit d'une **première livraison transversale de l'interface** ; elle n'est pas une reconstruction des 38 pages ni une réécriture du moteur applicatif. Les modules et données existants sont conservés, sans modification des API Cloudflare, tables D1, sessions, règles de sécurité ou logique de calcul. Les statistiques réelles ne sont jamais remplacées par des chiffres fictifs.

Les affichages de données sensibles restent sous la responsabilité des routes serveur et des contrôles de rôles préexistants. Les nouveaux thèmes ne peuvent pas conférer des permissions.

## Accessibilité et responsive
- Boutons, champs et liens : focus visible renforcé.
- Cartes responsives, typographies lisibles, débordement de texte contrôlé.
- Contraste élevé entre texte et fonds, notamment pour les rubriques d'administration.
- Les animations sont réduites si `prefers-reduced-motion: reduce` est activé.
- Les menus mobiles et formulaires existants sont conservés.

## Recette de publication
1. `node --test test/refonte-sde-hybride.test.mjs`
2. `npm run build:experience` et `npm test` (workflow Vérifier les scripts).
3. Contrôle visuel à 360 px, 768 px et 1440 px : accueil, programmes/TPA, IN FIRE, cinq pôles, galerie, connexion, tableau membre, admin, formulaire et financements.
4. Vérifier l'ouverture des menus, tous les liens vers l'espace privé, le clavier, les modales et l'état hors connexion.
5. Fusionner seulement lorsque les tests sont verts, puis vérifier le workflow Cloudflare et les nouvelles feuilles de style en production.

## Prochaines phases fonctionnelles
La charte est la **phase 1**. Les travaux de conception et de recette complémentaires portent sur la navigation complète de 25–35 parcours métiers, l'unification des cartes et tableaux, la refonte des formulaires, la simplification des accès directs et des tests E2E sur authentification. Les données confidentielles et paiements nécessitent leur propre validation et ne sont pas considérés refondus par un changement de CSS.
