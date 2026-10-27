# Agents Codex du projet

Les fichiers TOML de ce dossier définissent des agents spécialisés pour Codex. Demande explicitement leur utilisation quand cela apporte un vrai gain. Ils partagent le dépôt et héritent des permissions de la conversation ; les consignes « lecture seule » ne remplacent pas les permissions du workspace.

## Rôles

| Agent | Usage |
| --- | --- |
| `devsync-lead` | Décomposer une tâche importante, coordonner les spécialistes et garder l’architecture cohérente. |
| `devsync-explorer` | Lire le code et tracer un flux ou une erreur avant une modification. |
| `frontend-developer` | Construire ou améliorer les écrans Next.js/React et leurs états. |
| `backend-developer` | Travailler sur les contrôleurs, DTO, services et l’API NestJS. |
| `database-engineer` | Examiner Prisma, PostgreSQL et les migrations. |
| `integrations-engineer` | Concevoir les intégrations GitHub, webhooks, BullMQ/Redis et LLM. |
| `security-reviewer` | Rechercher les failles liées aux autorisations, sessions et secrets sans modifier le code. |
| `quality-reviewer` | Rechercher les bugs, régressions et lacunes de validation sans modifier le code. |
| `docs-mentor` | Expliquer le code et les outils, et garder la mémoire du projet concise et exacte. |

## Exemples d’utilisation

- « Utilise `devsync-explorer` pour suivre cette erreur depuis le front jusqu’au service NestJS, puis explique la cause avant de toucher au code. »
- « Utilise `frontend-developer` pour rendre ce parcours plus clair, puis demande à `quality-reviewer` une revue indépendante. »
- « Fais examiner ces changements en parallèle par `security-reviewer` et `quality-reviewer`, sans modifier les fichiers. »
- « Utilise `database-engineer` pour proposer une migration Prisma ; explique son impact avant de l’exécuter. »

Les agents ne doivent pas travailler en parallèle sur les mêmes fichiers. Pour une petite tâche, demande directement à Codex de la faire sans délégation.
