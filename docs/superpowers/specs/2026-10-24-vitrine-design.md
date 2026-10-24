# Vitrine SDE : design, menu et animations

Poursuite du lot demandé et approuvé le 23 octobre, reprise le 24 octobre : améliorer la vitrine existante pour ordinateur et téléphone. Conserver la palette harmonisée actuellement en production, les photos, les textes, les formulaires, les liens privés et l’API publique.

Approche retenue : amélioration progressive du HTML/CSS/JS existant. Une réécriture ou une migration multipage déplacerait inutilement les routes et les intégrations de ce lot. Les pages distinctes restent une évolution ultérieure.

Navigation : Accueil, Le mouvement, Programmes, Ressources, S’engager. Regrouper les accès existants, conserver Contact et l’Espace membre dans les destinations disponibles. Panneau mobile sous l’en-tête, défilement interne, verrouillage de l’arrière-plan, focus contenu et fermeture cohérente. Sous-menus au clic, clavier et touche Échap ; liens ordinaires de navigation plutôt que faux rôles de menu d’application.

Design : rythme des titres et sections, grilles sans débordement à 320 px, menus lisibles en clair et sombre, soulignement actif et focus visibles, interactions discrètes sur les cartes. Images existantes uniquement.

Animations : bouton pause/reprise conservé localement, priorité à prefers-reduced-motion, arrêt du canvas et du défilement automatique des versets en pause et lorsque l’onglet est masqué ; révélations de contenu toujours lisibles en mode réduit.

Validation : tests DOM des interactions et préférences, vérification JavaScript existante, revue visuelle ordinateur/mobile si l’aperçu le permet. Livrer une branche et une PR. La production, les DNS, les données et l’application privée ne sont pas modifiés.
