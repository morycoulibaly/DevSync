# Mémoire du projet DevSync

Dernière mise à jour : 2026-10-27

Ce document conserve les informations durables nécessaires pour reprendre le projet dans une nouvelle conversation. Le code, les manifests et `schema.prisma` restent la source de vérité.

## Objectif

DevSync est un SaaS open source de veille technique : activité GitHub, suivi de dépendances, résumés quotidiens de releases et notifications. Le MVP est destiné à plusieurs comptes utilisateurs. Pour le moment, les dépôts sont ajoutés et les webhooks GitHub configurés manuellement.

## Architecture actuelle

- Dépôt monorepo : `frontend/`, `backend/`, `schema.prisma` et `migrations/`.
- Front : Next.js App Router 15, React, Tailwind CSS 4, TanStack Query et Lucide.
- Back : NestJS 11, API REST modulaire, Prisma 6 et PostgreSQL.
- Le schéma Prisma canonique est le fichier racine `schema.prisma`. Le client est généré dans `backend/generated/prisma/`.
- La base décrit `User`, `Repository`, `Event`, `DependencyScan`, `DependencyFinding`, `Digest` et `NotificationChannel`. Le modèle `Repository` appartient à un utilisateur ; il n’existe pas encore de modèle d’équipe ou d’espace partagé.

## Fonctions implémentées dans le code

- Connexion GitHub OAuth, cookie de session HTTP-only signé, profil utilisateur stocké et déconnexion. La session applicative dure 7 jours. Le jeton OAuth sert à récupérer le profil et n’est pas conservé.
- Ajout manuel d’un dépôt GitHub existant et liste des dépôts appartenant à l’utilisateur.
- Génération d’un token opaque dans l’URL du webhook et d’un secret aléatoire. Le secret est chiffré au repos et n’est renvoyé qu’à la création ou à son renouvellement.
- Renouvellement du secret du webhook sur la page des dépôts.
- Réception des webhooks GitHub par `POST /api/webhooks/github/:webhookToken`, vérification HMAC sur le corps brut, normalisation puis stockage des événements `push`, `pull_request` et `issues`. Les livraisons dupliquées sont ignorées.
- Le front fournit la connexion/session, la page de gestion des dépôts, les étapes d’installation et l’état d’accueil. La navigation mobile est disponible.
- La page d’accueil peut indiquer le nombre de dépôts. Le statut réel de configuration d’un webhook n’est pas vérifié par DevSync.

## Fonctions implémentées

- API authentifiée `GET /api/events` : événements des dépôts appartenant à l'utilisateur connecté, triés du plus récent au plus ancien, avec pagination (`page`, `limit`, maximum 50) et filtre optionnel `repositoryId`. La réponse expose les champs utiles à l'affichage et omet le payload brut.
- Le tableau de bord affiche le fil d'activité avec pagination, actualisation et états de chargement, erreur et liste vide.

## Fonctions prévues, pas encore implémentées

- Filtres du fil d'activité par type ou contributeur (seule la pagination et le filtre par dépôt sont disponibles côté API pour l'instant).
- Vérification des dépendances et vulnérabilités, notamment à partir d’un `package.json`.
- File BullMQ, connexion Redis et jobs planifiés. `bullmq` et `ioredis` figurent dans les dépendances du backend, mais ne sont pas encore câblés.
- Résumé quotidien avec Gemini ou un autre fournisseur LLM.
- Notifications Slack, Discord ou email.
- GraphQL n’est pas intégré ; l’API actuelle est REST. L’utilisateur souhaite une explication pédagogique avant d’adopter de nouveaux outils comme GraphQL ou BullMQ.

## Environnement local

- Front : `npm run dev:frontend` à la racine ou `npm run dev` depuis `frontend/`.
- Back : `npm run dev:backend` à la racine ou `npm run start:dev` depuis `backend/`.
- Prisma : `npm run prisma:generate` et `npm run prisma:validate` à la racine.
- Ports de développement déjà utilisés : front `3000`, API `4000`, PostgreSQL `5432`.
- Ubuntu 24.04 a été observé sur la machine de l’utilisateur. Un Quick Tunnel Cloudflare peut exposer temporairement l’API pour tester GitHub ; son hostname change et ne doit jamais être enregistré ici. L’utilisateur doit garder le tunnel actif pendant le test.
- Si Next.js signale un décalage de chunks/runtime en développement : arrêter le serveur front, supprimer le cache généré `frontend/.next`, puis redémarrer `npm run dev` depuis `frontend/`.

## État de reprise et précautions

- Git signalait les principaux fichiers applicatifs comme non suivis dans l’état observé le 2026-10-27. Vérifier `git status` avant toute opération Git ; ne pas supposer que ces fichiers peuvent être supprimés ou réinitialisés.
- L’utilisateur préfère des explications en français, concrètes, séquentielles et accessibles à un débutant. Éviter de multiplier les étapes à la fois.
- Ne pas lire ni copier les secrets de `backend/.env`. Ce fichier est ignoré par Git. Utiliser `.env.example` uniquement pour expliquer les noms de variables.
- Ne pas faire apparaître dans une capture ou réponse le secret de webhook ; s’il a été partagé, renouveler le secret avant de le configurer dans GitHub.

## Prochaine étape recommandée

Faire un premier essai réel : configurer un webhook sur un dépôt de test, déclencher un push ou une issue, puis vérifier que l'événement apparaît sur le tableau de bord. Ensuite, ajouter des filtres par type/contributeur si le fil de base fonctionne bien.

## Journal de décisions

- Webhooks GitHub manuels pour le MVP ; une GitHub App pourra venir plus tard.
- Plusieurs utilisateurs sont pris en charge par l’association `Repository.userId`. Les organisations, équipes et rôles partagés ne sont pas encore modélisés.
- Les jobs asynchrones BullMQ/Redis et le digest IA sont prévus, pas actifs aujourd’hui.
