# SDE Digital Universe 2027 — référentiel technique et éditorial

Édition : novembre 2026. Périmètre : Citadelle SDE, Soldier Quest, Soldiers Campus, Soldiers TV.

## Architecture en production et principe de migration

La plateforme actuellement déployée sur mouvement-sde.org et app.mouvement-sde.org repose sur Cloudflare Workers, Cloudflare D1 et les ressources Web du dépôt. Tailwind est déjà utilisé dans le système d'expérience. Il ne s'agit **pas** actuellement d'une application Next.js/Supabase.

Les projets Supabase intitulés « SDE-Project » et « SDE App » ont été observés comme INACTIVE le 9 novembre 2026. Une éventuelle migration vers Next.js + Supabase exigerait donc un inventaire des données, des rôles, des secrets, des routes et des sauvegardes ; une stratégie de double lecture ou de bascule contrôlée ; puis des recettes d'authentification, de sécurité et de retour arrière. **Aucun changement de base, de schéma Supabase ou de fournisseur d'authentification n'est inclus dans cette refonte.**

## Références éditoriales immuables

- REV : Réveil et Évangélisation.
- ISH : Impact Social et Humanitaire.
- LO : Logistique et Organisation.
- CMR : Communication, Médias et Relations Extérieures.
- FDE : Formation, Développement et Entrepreneuriat.
- TPA 2026 : vendredi 18 décembre 2026 à 20 h, heure d'Abidjan (GMT), sur Google Meet.
- Couleurs de référence : bleu nuit #071225, or #e2c26a, ivoire #f8f5ed, violet #7853b6, vert militaire #234c35 ; copyright © 2026–2027.
- Canaux de contribution envisagés dans cet ordre : Wave, Orange Money, MTN MoMo, Moov Money. Aucune transaction active sans prestataire et bénéficiaire vérifiés.
- Domaine institutionnel souhaité : contact@mouvement-sde.org ; conserver l'adresse de contact actuelle infosoldat@gmail.com tant que la boîte institutionnelle, SPF, DKIM, DMARC, l'envoi et la réception n'ont pas été vérifiés.

## Navigation et interactions 2027

La navigation partagée est définie en un seul endroit : public/vitrine/sde-universe-navigation.js. Elle rassemble la vue globale, les activités Quest, les formations et évaluations Campus, Love School, la prière, la communauté et les médias. Elle ne confère jamais de permissions : le Worker vérifie toutes les routes authentifiées.

Le tableau membre conserve sa navigation privée existante et propose un répertoire dépliable des univers. Soldiers Campus conserve son espace pédagogique avec un répertoire dépliable et une barre mobile de cinq icônes (Accueil, Quest, Campus, Prière, TV). La page publique Quest conserve la barre PWA publique, mais masque sa sidebar sur les téléphones. Soldiers TV conserve le menu public et ajoute un sous-menu médias distinct avec retour à l'accueil.

Les grilles Quest et TV basculent sur smartphone en carrousels horizontaux CSS à défilement tactile et snap. Les contrôles sont atteignables au clavier, les animations respectent prefers-reduced-motion et la taille des zones tactiles reste supérieure à 44 px.

## Gamification Soldier Quest : activation conditionnelle

Les exemples illustrés (3 240 XP, série de 21 jours, 5/7 missions, badges N1 à N7, 1 287 intercesseurs et classement mensuel) ne constituent **pas** des données réelles. Les pages publiques ne les affichent donc pas.

Avant toute activation, concevoir et valider un registre d'activités et de points, avec mission/version, membre, date, statut, validateur et justification. Les actions ne peuvent être comptabilisées qu'après validation par un responsable habilité. Pour les séries de jours, compter une seule participation par jour civil et par mission. Les badges N1 à N7 doivent être attribués selon des critères publiés, vérifiables, non discriminatoires et révocables en cas d'erreur.

Les classements sont facultatifs et fondés sur le consentement explicite de membres adultes, avec pseudonymisation et retrait possible. La participation spirituelle, les sujets de prière, les informations pastorales, les finances et la santé ne doivent jamais alimenter le classement. Prévoir tests d'abus, idempotence, contrôle du fuseau horaire et restrictions serveur avant publication.

Dans l'architecture actuelle, des tables D1 peuvent servir de modèle si le projet est autorisé. Pour une éventuelle migration vers Supabase, utiliser RLS sur chaque table exposée, des politiques de propriété, le service role uniquement côté serveur, et ne jamais utiliser user_metadata pour des décisions d'autorisation.

## Soldiers TV et agenda

Le lecteur actuel utilise des fichiers vidéo SDE existants avec contrôles natifs. Les filtres, le retour vers l'accueil, Soldiers Voice et le sous-menu dédié sont intégrés. Aucun bandeau « EN DIRECT », compteur de vues ou statut de diffusion n'est simulé.

Un futur direct YouTube ou HLS exige l'URL réelle d'un diffuseur autorisé, la vérification de ses droits de diffusion, un mode de repli et des métadonnées exactes. L'agenda des événements du mouvement propose dès maintenant une exportation .ics depuis l'API déjà publiée. Une future notification requiert le consentement explicite, une inscription et un événement réellement confirmé.

## Soldiers Campus

Les indicateurs du cursus existant sont issus de l'API authentifiée de Soldiers Academy : cours validés, progression, attestations, exercices et évaluations. Aucun pourcentage, notes de formateur ou état de mentor inventé. La validation du coach/enseignant et les règles d'accès existantes demeurent obligatoires.

## Contrôles avant publication

Vérifier à chaque livraison la cohérence éditoriale, les routes et permissions, l'accessibilité tactile/clavier, les grilles mobiles, l'absence de faux contenus, les formulaires, l'agenda et les ressources vidéo. L'outil de déploiement contrôle les deux domaines et la révision des assets ; la recette privée authentifiée et l'audit navigateur public couvrent leurs périmètres respectifs.

**Éléments non activés** : paiement financier réel, boîte e-mail contact@mouvement-sde.org non vérifiée, scoring XP persistant, classements publics, badges automatiques, streaming en direct, migration Next.js/Supabase.
