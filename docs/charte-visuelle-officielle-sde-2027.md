# Charte visuelle officielle — Mouvement S.D.E. 2027

**Date de validation : 10 novembre 2026.**  
**Périmètre :** site public `mouvement-sde.org`, Soldier Quest, Soldiers TV, Soldiers Campus et futurs tableaux de bord. Les espaces privés conservent leurs droits d'accès, données et composants métier pendant la migration.

## 1. Couleurs de référence

| Rôle | Token | Couleur | Usage |
| --- | --- | --- | --- |
| Structure | `--sde-2027-night` | `#0B1730` | En-tête, navigation, pied de page, tableaux de bord |
| Structure secondaire | `--sde-2027-night-soft` | `#142544` | Surfaces de navigation |
| Lecture | `--sde-2027-ivory` | `#F7F2E8` | Fonds de texte, formulaires et contenu long |
| Cartes | `--sde-2027-paper` | `#FFFDF8` | Cartes et zones de lecture |
| Texte | `--sde-2027-ink` | `#202B43` | Titres et texte primaire sur ivoire |
| Texte secondaire | `--sde-2027-muted` | `#566077` | Texte secondaire sur ivoire |
| Prestige | `--sde-2027-gold` | `#D4AF37` | Détails, filet, accents et boutons sur nuit |
| Prestige clair | `--sde-2027-gold-light` | `#EFD487` | Bouton principal avec texte bleu nuit |
| Or de lecture | `--sde-2027-gold-on-light` | `#68400E` | Liens et accents **textuels** sur ivoire |
| Spiritualité | `--sde-2027-violet` | `#694097` | Prière, intercession, enseignement |
| Spirituel sombre | `--sde-2027-violet-dark` | `#3C245D` | En-têtes de rubrique / onglets actifs |
| Missions | `--sde-2027-green` | `#2F684F` | Humanitaire, terrain, impact social |
| Missions sombre | `--sde-2027-green-dark` | `#173E35` | En-têtes de rubrique / onglets actifs |

## 2. Règles d'usage et contrastes

- Pour un texte courant, viser **WCAG AA 4,5:1 minimum** ; pour de grands titres, **3:1** ; les contrôles visibles et contours de focus doivent rester discernables.
- **Interdit :** or clair `#D4AF37` en texte courant sur ivoire `#F7F2E8` (environ **1,9:1**).
- **Autorisé :** or sombre `#68400E` sur ivoire (environ **8,1:1**), encre `#202B43` sur ivoire (environ **12,7:1**), violet `#694097` (environ **6,8:1**) et vert `#2F684F` (environ **5,9:1**).
- Les boutons or clair utilisent du texte **bleu nuit**, jamais du blanc.
- Les fonds sombres spécifiques aux sections de spiritualité ou aux héros préservent du texte clair. Ne jamais imposer un texte sombre à un panneau violet ou bleu nuit.

## 3. Navigation, composants et typographie

- **Un seul en-tête public** : `sde-shell-public.js` et `sde-shell-public.css` sont les composants de référence. Ne pas ajouter un second menu sur les sous-portails. Les pages publiques, **y compris 404**, les utilisent.
- Le pied de page utilise le bleu nuit et les liens clairs. Les parcours authentifiés restent distincts et sécurisés.
- Corps et formulaires : **Atkinson Hyperlegible** (secours système) ; titres de lecture : **Libre Caslon Text** (secours Georgia) ; titres compacts : typographie de corps en graisse forte.
- Cartes : ivoire ou papier, encre sombre, arrondis de 16 px, filet d'accent (violet, vert ou or) ; onglet actif identifiable aussi par fond/contraste, pas seulement par couleur.
- Actions principales : fond or clair, encre bleu nuit, hauteur interactive ≥ 44 px ; liens de lecture soulignés.

## 4. Recette mobile

Vérifier explicitement en **360 px** et **390 px** : pas de défilement horizontal non intentionnel ; en-tête/logo/portail sans chevauchement ; barre mobile à cinq entrées ; cibles interactives ≥ 44 × 44 px ; boutons et formulaires complets ; navigation clavier/focus visible. Les audits automatisés sur site public produisent les captures et mesures.

## 5. Mouvement et chargement

- Animations courtes, sobres et **facultatives**. Favoriser transform et ombres plutôt que déplacement de mise en page.
- Tout texte et lien reste visible dès le chargement HTML, **même sans JavaScript ou pendant le défilement**. Ne pas initialiser un panneau textuel avec `opacity:0`, `visibility:hidden` ou `display:none` pour le révéler ensuite.
- Respecter `prefers-reduced-motion: reduce`, `html[data-motion="reduced"]` et la commande **Mettre les animations en pause**.
- Ne jamais masquer un texte pendant une animation, même lorsqu'une préférence de mouvement a changé.

## Ordre impératif de migration

1. Corriger les contrastes faibles, en premier le texte or sur ivoire.
2. Déployer l'en-tête public commun et préserver la séparation des espaces privés.
3. Harmoniser boutons, cartes, onglets et typographies.
4. Vérifier les versions 360 px et 390 px en navigateur réel.
5. Activer ensuite uniquement les animations non bloquantes et désactivables.

**Garde-fou :** une correction de charte ne modifie jamais paiements, sessions, autorisations, inscriptions, données personnelles, XP ou contenu éditorial sans demande distincte.
