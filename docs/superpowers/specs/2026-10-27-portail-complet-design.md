# Portail SDE : sept améliorations autorisées

L'utilisateur a demandé « Débuter et terminer tout » après les sept propositions du 27 octobre. Conserver Cloudflare, D1, les comptes, les permissions et le moteur natif. Réaliser et publier dans cette session.

## Approche
Enrichir le portail existant avec un module client autonome et des API bornées. Une refonte séparée ou un second moteur créerait des divergences de comptes et de données ; ils sont écartés. Le menu natif reste le routeur des outils existants.

## Périmètre
- Connexion : visibilité des mots de passe, erreurs accessibles, récupération assistée par demande au secrétariat ; aucun envoi e-mail automatique promis car le canal n'est pas configuré.
- Accueils : cartes réelles de rencontres, annonces, formations personnelles ; compteurs administratifs sans dossiers pastoraux ; recherche des rubriques, accueil direct et navigation mobile persistante.
- Vie spirituelle : parcours de lecture hebdomadaire personnel, plan de prière, progression des formations existantes, demandes publiques à l'équipe ou confidentielles au leader, historique personnel et témoignages soumis à validation.
- Rappels : préférences enregistrées par compte, liste calculée automatiquement depuis les dates, ajout au calendrier avec alarme ; pas de notification système imposée ni d'envoi externe déclenché par l'agent.
- Confidentialité : destinataires explicites, autorisations côté serveur, journal administratif sans contenu sensible, demandes de récupération réservées aux administrateurs (comptes propriétaires au propriétaire).
- Présentation : boutons tactiles >=44px, rubrique active et titre visibles, états de chargement/erreur/vide, réduction des animations et mode compact sur mobile.

## Critères
Aucun chiffre fictif ni copie locale de données sensibles. Isolation de compte prouvée par SQLite réel. Aucun nouveau service payant, secret, compte ou fournisseur à connecter. Les tests UI et serveur doivent couvrir les erreurs, les rôles et la navigation. Publication après revue et suite complète verte ; vérifier les accès publics en ligne. Les parcours connectés seront vérifiés localement avec des comptes de test, sans utiliser les identifiants de l'utilisateur.
