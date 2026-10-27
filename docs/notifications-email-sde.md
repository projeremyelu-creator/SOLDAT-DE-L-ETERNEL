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

## Notifications sur téléphone
La connexion est vérifiée par `/api/moi` : le cookie de session HttpOnly ne doit pas être lu par JavaScript. L'activation utilise la clé publique du serveur et enregistre les clés de l'abonnement au format Web Push. Un abonnement existant est rattaché au compte actuellement connecté, sans doublon entre comptes. Le remplacement d'une ancienne clé exige un clic de l'utilisateur.

Pour activer la livraison, configurer une paire correspondante `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` dans les secrets du Worker Cloudflare, avec `VAPID_SUBJECT`. Ne jamais publier la clé privée. Si `/api/vapid-public-key` renvoie `null`, le service n'est pas configuré et l'interface le signale sans demander la permission du navigateur. Les tests automatisés valident le parcours et l'enregistrement ; une livraison réelle sur téléphone reste à vérifier après configuration.
