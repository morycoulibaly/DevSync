# Redis et BullMQ dans DevSync

## Objectif

Redis sert de stockage rapide pour les travaux en attente. BullMQ ajoute une couche de gestion : il place les jobs dans une file, suit leur état et remet les jobs au worker. PostgreSQL conserve les données durables de DevSync, notamment les résultats des scans et les résumés.

## Parcours d’un scan

1. La personne clique sur « Lancer l’analyse » dans `frontend/src/app/dependencies/page.tsx`.
2. Le client HTTP de `frontend/src/shared/api/api-client.ts` envoie un `POST` à NestJS avec le contenu du `package.json` et du lockfile éventuel.
3. `backend/src/dependencies/dependencies.controller.ts` protège la route avec `GitHubSessionGuard`, puis délègue au service de file.
4. `backend/src/dependencies/dependency-scan-queue.service.ts` ajoute un job à `dependency-scans`. Les données du job identifient l’utilisateur et contiennent soit les fichiers collés, soit le dépôt et les chemins des fichiers.
5. L’API renvoie HTTP 202 avec l’identifiant du job. 202 signifie que le travail a été accepté, mais pas forcément terminé.
6. Le worker BullMQ, dans le même processus NestJS pour l’instant, récupère le job. Il appelle `DependenciesService`, qui lit les fichiers, consulte npm et OSV, puis enregistre le résultat dans PostgreSQL.
7. Le front appelle `GET /api/dependencies/scans/jobs/:jobId` environ toutes les secondes. À l’état `completed`, il ajoute le résultat à l’historique ; à l’état `failed`, il affiche l’erreur.

## Les pièces BullMQ

- `Queue` est le producteur : il ajoute les tâches dans Redis.
- `Job` est le ticket de travail : il contient les données utiles et son état (`waiting`, `active`, `completed`, `failed`).
- `Worker` est le consommateur : il prend les jobs disponibles et exécute la fonction de traitement.
- `ioredis` est le client Node.js qui ouvre les connexions entre l’application et Redis.

Dans DevSync, ces pièces sont réunies dans `DependencyScanQueueService`. Le worker autorise deux scans simultanés (`concurrency: 2`). La connexion du worker utilise `maxRetriesPerRequest: null` pour lui permettre d’attendre le retour de Redis. La connexion qui ajoute les jobs échoue rapidement si Redis ne répond pas, afin de ne pas laisser une requête HTTP suspendue indéfiniment.

## Pourquoi utiliser une file ?

Le scan dépend de services externes et de requêtes réseau, qui peuvent être lentes. Sans file, la requête HTTP reste ouverte jusqu’à la fin du scan. Avec BullMQ, l’API répond rapidement et le travail peut attendre qu’un worker soit libre. La file permet aussi de suivre et de relancer les tâches selon la politique configurée.

## Durée de conservation

Les jobs terminés restent dans Redis au plus une heure (avec une limite de 100 jobs conservés). Les jobs échoués restent au plus une journée (limite de 500). Les résultats de scan, eux, sont conservés par PostgreSQL dans les tables `DependencyScan` et `DependencyFinding`.

## Configuration locale

Le backend lit `REDIS_HOST` et `REDIS_PORT`, documentés dans `.env.example`. Par défaut, il se connecte à `localhost:6379`. Redis doit être lancé avant de soumettre un scan. Si Redis est indisponible, l’API répond avec une erreur explicite au lieu de prétendre que le scan a commencé.

## Limites actuelles

- L’API et le worker tournent dans le même processus. Ils pourront être séparés lorsque le projet aura besoin de déploiements ou d’une montée en charge indépendants.
- Le navigateur interroge l’API périodiquement (polling) ; aucun WebSocket n’est utilisé.
- Redis ne remplace pas PostgreSQL pour l’historique métier.
- Les scans sont les premiers jobs asynchrones. Le Daily Digest réutilisera cette architecture.

## Petit glossaire

- **Redis** : magasin de données en mémoire, utilisé ici pour conserver rapidement les jobs et leur état.
- **BullMQ** : bibliothèque Node.js qui organise les jobs dans Redis et coordonne les workers.
- **Queue** : file d’attente contenant les jobs à traiter.
- **Worker** : processus ou instance qui exécute réellement le travail.
- **Polling** : le navigateur redemande périodiquement à l’API si le travail est terminé.
- **Idempotence** : rejouer une même opération ne doit pas créer de doublons ou corrompre son résultat.
