# Accueil et parcours SDE — première étape

L'utilisateur demande de débuter les améliorations proposées après comparaison avec Eklesia. Cette livraison rend l'accueil plus utile aux nouveaux visiteurs, en préservant le site unifié, son identité et exactement deux espaces privés.

## Approche
Améliorer les documents et scripts existants sans framework ni nouvelle application. Une refonte complète ferait doublon avec le portail récemment unifié ; un nouvel outil de gestion n'est pas nécessaire pour ce premier lot.

## Résultat
- Bouton principal « Rejoindre le mouvement » vers le formulaire existant ; programmes en second accès et vision en lien discret.
- Supprimer les accès privés répétés dans le hero ; garder les deux liens d'en-tête et déplacer les deux cartes explicatives après les parcours publics.
- Carte événement avec photo réelle, titre, date, heure et lieu tirés uniquement de l'API publique. Ne montrer aucun événement passé ou date invalide ; conserver un accès à l'agenda en cas d'absence ou d'échec. IN FIRE 2026 renvoie à sa section uniquement si sa date correspond à l'édition.
- Trois étapes pour découvrir, rencontrer l'équipe et trouver sa place, liées aux pages existantes ; FAQ accessible sans script.
- Présenter profil/carte, formations et activités dans l'espace membre sans afficher de données personnelles.

## Contraintes
Conserver comptes, routes et permissions ; ne pas inventer de témoignages, chiffres ou fonctionnement de paiement. FCFA et gestion privée inchangés. Navigation clavier, mobile et thèmes clair/sombre. Le suivi administratif complet des nouveaux et les tableaux de bord métiers appartiennent aux prochains lots.

## Vérification
Tests JS DOM sur événement futur, passé, réponse vide, date invalide, titre HTML traité comme texte et panne réseau. Suite existante ; contrôle visuel desktop/mobile si aperçu disponible. Publication par le workflow GitHub/Cloudflare existant et vérification de son résultat.
