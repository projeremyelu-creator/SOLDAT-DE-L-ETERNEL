# SDE — Activation des alertes vers infosoldat@gmail.com

## Enregistrement et notification
Les formulaires publics, sondages, préinscriptions Soldiers Academy, inscriptions, demandes de prière, absences, modifications des espaces privés, imports et médias finalisés créent une alerte administrative dans la file D1 sde_alertes.
Les alertes conservent le résultat de chaque opération même si le fournisseur e-mail est inactif. Une tâche programmée réessaie leur remise toutes les quinze minutes (par lots de 30).
Les e-mails publics comportent les coordonnées nécessaires au traitement (nom, e-mail, téléphone) ; les dossiers pastoraux, données financières détaillées, dates de naissance, photos, documents, mots de passe et messages confidentiels ne sont jamais expédiés par e-mail. Ils restent consultables dans les espaces sécurisés.

## Activer l'envoi dans Cloudflare
1. Ouvrir Cloudflare Email Routing et valider infosoldat@gmail.com comme adresse de destination.
2. Configurer un domaine d'expédition dans Cloudflare Email Service, avec les contrôles d'identité SPF/DKIM demandés.
3. Dans wrangler.toml, décommenter la variable NOTIFICATION_FROM avec une adresse appartenant au domaine expéditeur vérifié, ainsi que le bloc send_email limité à infosoldat@gmail.com.
4. Déployer le Worker après vérification du domaine et de la destination Gmail.
5. Se connecter comme propriétaire sur https://app.mouvement-sde.org/ ; vérifier GET /api/notifications-status. L'état doit indiquer active = true, puis les alertes en attente pourront être expédiées.

## Règles de sécurité
- Les détails sensibles restent dans la base privée, pas dans Gmail.
- Ne jamais mettre d'identifiant secret ni de mot de passe dans les alertes.
- Le Worker ne doit pas être déployé avec une liaison e-mail dont le destinataire ou le domaine expéditeur n'est pas vérifié.
- La validation du code et les tests simulés ne prouvent pas la livraison effective dans Gmail : confirmer avec un vrai e-mail de test après configuration.
- La sauvegarde de la base demeure programmée une fois par nuit.
