# SDE — Courriels automatiques (Resend)

Trois scénarios, tous **désactivés par défaut** et pilotés depuis `/courriels` (administrateurs) :

| Scénario | Quand | Destinataires |
|---|---|---|
| Lettre hebdomadaire | le lundi à partir de 7 h (heure d'Abidjan = UTC), une fois par semaine, seulement s'il y a un rassemblement public dans les 7 jours ou une annonce récente | abonnés ayant choisi « lettre hebdomadaire » |
| Nouveaux cultes et rassemblements | dans les 15 minutes qui suivent la création d'un rassemblement public | abonnés ayant choisi « nouveaux rassemblements » |
| Alertes d'agenda | 3 jours avant et la veille, à partir de 8 h | abonnés ayant choisi « alertes d'agenda » |

Les rassemblements marqués privés ne sont jamais annoncés. Aucune donnée de fiche membre n'est utilisée : les destinataires sont uniquement les personnes inscrites sur `/newsletter`, après confirmation de leur adresse (double confirmation) ; chaque message contient un lien de désinscription en un clic et les en-têtes `List-Unsubscribe`.

## Mise en service
1. Créer un compte sur https://resend.com et **vérifier le domaine d'expédition** (enregistrements SPF et DKIM à ajouter dans la zone DNS Cloudflare de mouvement-sde.org).
2. Créer une clé d'API Resend limitée à l'envoi.
3. Dans Cloudflare (Workers → sde → Settings → Variables and Secrets), ajouter trois **secrets** :
   - `RESEND_API_KEY` : la clé Resend ;
   - `COURRIEL_FROM` : l'expéditeur, par exemple `Mouvement SDE <lettre@mouvement-sde.org>` (adresse du domaine vérifié) ;
   - `COURRIEL_SECRET` : une longue chaîne aléatoire (32 caractères au moins) qui signe les liens de confirmation et de désinscription.
4. Ouvrir `/courriels` : l'état doit indiquer « L'envoi est configuré ». Cliquer **« M'envoyer un test »**, vérifier la réception (et le dossier spam).
5. Activer les scénarios un par un. À l'activation de « nouveaux rassemblements », l'agenda existant est mémorisé comme déjà annoncé : seuls les rassemblements créés ensuite sont envoyés.

## Scénarios avec Make, Zapier ou n8n (facultatif)
Ajouter le secret `COURRIEL_WEBHOOK_SECRET` (24 caractères au moins), puis appeler :

```
POST https://mouvement-sde.org/api/courriels/declencher
Authorization: Bearer <COURRIEL_WEBHOOK_SECRET>
{"scenario":"hebdo" | "nouveau" | "agenda","forcer":false}
```
Le déclenchement respecte les réglages et ne renvoie jamais deux fois le même message (clé de réservation par semaine, par rassemblement et par échéance).

## Règles
- Aucun mot de passe, ni donnée financière ou pastorale dans ces messages.
- Un échec d'envoi libère la réservation : le prochain passage (toutes les 15 minutes) réessaie.
- La validation par les tests prouve la logique, pas la livraison : confirmer avec le message de test.
