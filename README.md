# DevSync

Monorepo initial du MVP DevSync : tableau de bord Next.js et API NestJS, avec le schéma Prisma conservé à la racine.

## Prérequis

- Node.js 20.19 ou supérieur
- npm
- PostgreSQL (pour les prochaines étapes d’intégration Prisma)
- Redis (réservé aux traitements BullMQ à venir)

L’environnement de création actuel utilise Node.js 18 ; les dépendances ne peuvent donc pas encore être installées ni les applications lancées ici. Installe Node.js 20.19+ avant de continuer.

## Dossiers

- `frontend/` : application Next.js et navigation partagée.
- `frontend/src/features/` : interface rangée par fonction (dashboard, activité, onboarding).
- `frontend/src/shared/` : composants visuels et éléments de mise en page réutilisables.
- `backend/src/health/` : endpoint de santé de l’API.
- `backend/src/database/` : service Prisma partagé par les futurs modules métier.
- `backend/src/config/` : validation des variables d’environnement au démarrage.
- `schema.prisma` : schéma Prisma utilisé par l’API.

## Démarrage

Après installation de Node.js 20.19+, depuis la racine du dépôt :

```sh
npm install
```

Dans deux terminaux :

```sh
npm run dev:frontend
```

```sh
npm run dev:backend
```

L’interface sera disponible sur `http://localhost:3000` et l’endpoint de santé sur `http://localhost:4000/api/health`.

Copier `.env.example` vers `backend/.env`, puis renseigner `DATABASE_URL`. Le backend et Prisma lisent ce fichier. Après chaque changement du schéma, générer le client avec `npm run prisma:generate` à la racine.

## Organisation du code

Le frontend garde les routes Next.js dans `src/app`, et place l’interface propre à une fonctionnalité dans `src/features`. Le backend suit l’organisation NestJS par modules : chaque fonctionnalité disposera de son module, contrôleur et service. Les accès à la base passent par `PrismaService`.

## Réception des webhooks GitHub

L’endpoint `POST /api/webhooks/github/:webhookToken` attend les en-têtes `X-GitHub-Event`, `X-GitHub-Delivery` et `X-Hub-Signature-256`. `main.ts` active `rawBody` pour conserver le contenu exact signé par GitHub. Le service retrouve ensuite le dépôt avec le token, vérifie la signature HMAC, transforme les événements `push`, `pull_request` et `issues`, puis enregistre l’événement. Un rejeu du même `X-GitHub-Delivery` est accepté sans créer de doublon.

Le dépôt et son secret doivent exister dans la base pour que le webhook soit accepté. La page `/repositories` permet maintenant de les créer après connexion GitHub.

## Connexion GitHub et ajout d’un dépôt

La page `/repositories` propose la connexion OAuth GitHub puis l’ajout d’un dépôt existant. Crée une OAuth App GitHub avec `http://localhost:3000` comme homepage et `http://localhost:4000/api/auth/github/callback` comme callback. Renseigne son Client ID et son secret dans `backend/.env`, ainsi que `GITHUB_CALLBACK_URL`. Génère deux clés indépendantes avec `openssl rand -hex 32` pour `APP_SESSION_SECRET` et `APP_ENCRYPTION_KEY`.

Après connexion, le formulaire enregistre le dépôt pour l’utilisateur courant. DevSync génère l’URL et le secret du webhook ; le secret est chiffré en base et affiché une seule fois à l’utilisateur. Pour recevoir les événements depuis GitHub, `API_PUBLIC_URL` doit être accessible depuis Internet (un tunnel local convient pour le développement).
