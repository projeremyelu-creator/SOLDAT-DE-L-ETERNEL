# SDE OS v3.1 : intégration et validation

## Accès

Le site mouvement-sde.org expose un lien « SDE OS v3.1 · privé » dans sa barre d’accès rapides et son répertoire de recherche. `/os-v31/` redirige vers app.mouvement-sde.org : la session HttpOnly existante reste limitée au domaine de l’application. Les informations individuelles et le registre ne sont jamais chargés par le site public.

Après connexion, le paramètre `retour` accepte seulement `/os-v31/#` suivi d’un des six modules connus. Les destinations externes sont ignorées. Les navigations internes conservent les entrées de l’historique. Une réponse 401 masque l’espace, vide les données affichées et invalide les réponses tardives.

## Référence et confidentialité

Référence consultée : Présentation institutionnelle 3.0, édition Soldier House, revue et enrichie en octobre 2026, 96 pages. Chapitres 4.1 (quatre fractures), 14 (sept dimensions), 19 (Academy), 24 (Directoire) et partie sur les cinq pôles. Le document intégral et les listes nominatives ne sont pas ajoutés à ce dépôt public.

Le suivi physique, émotionnel et financier est un complément volontaire non clinique. Les bilans sont accessibles uniquement à leur auteur, y compris face à un administrateur. Les tendances administratives ne renvoient que des moyennes mensuelles à partir de cinq participants ; ce seuil réduit l’exposition mais ne garantit pas un anonymat absolu, notamment dans un petit groupe connu. Aucun bilan n’est envoyé par e-mail. Les intérêts Academy ne valent ni admission ni certification.

Les propositions requièrent un administrateur distinct pour leur approbation ou rejet. La condition SQL protège contre l’auto-approbation et la réécriture d’une décision déjà examinée. Aucun paiement n’est déclenché.

Les réponses OS portent `Cache-Control: no-store`, une politique CSP et les protections du Worker. Le service worker privé exclut toutes les routes OS ; sa nouvelle version retire les anciens caches.

## Validation avant fusion

Exécuter `npm ci --ignore-scripts` puis `npm test` avec Node 22 ou supérieur. Les tests d’intégration utilisent SQLite en mémoire et des identités fictives : isolation, consentement, seuil collectif, double validation, Academy, routage, session expirée, erreurs serveur, cache, parcours et accès public.

Ne fusionner que si les contrôles GitHub et Cloudflare du dernier commit sont réussis et si une personne distincte a examiné la PR. Ne pas contourner un contrôle échoué ou une approbation manquante.

Après fusion, vérifier le déploiement Cloudflare du commit fusionné, le type HTML de `/os-v31/`, les types CSS/JS, les réponses 401 sans session et la redirection depuis le domaine public. Vérifier ensuite avec deux comptes habilités distincts le parcours de connexion, la création d’un bilan de test et une décision de test. Ne pas utiliser de données personnelles réelles pour ces essais.
