# Instructions pour les agents DevSync

## Avant de travailler

1. Lire `PROJECT_MEMORY.md` pour connaître l’état vérifié du projet et les décisions déjà prises.
2. Lire les instructions plus proches du dossier concerné, s’il y en a.
3. Vérifier le code et les manifests actuels avant de supposer qu’une fonction existe.
4. Ne jamais lire, imprimer, copier ou résumer le contenu d’un fichier `.env`. Les secrets et valeurs locales n’appartiennent pas à la mémoire du projet.

Les rôles des agents disponibles se trouvent dans `.codex/README.md` et les exemples de demandes dans `PROMPTS.md`.

## À propos du produit

DevSync est un SaaS open source de veille technique et de suivi de dépôts GitHub. Le MVP vise plusieurs comptes utilisateurs, avec ajout manuel de dépôts et configuration manuelle de webhooks GitHub. Voir `PROJECT_MEMORY.md` pour distinguer les fonctions présentes des fonctions prévues.

## Manière de travailler

- Expliquer les changements et les étapes en français simple. L’utilisateur apprend NestJS, Prisma, GraphQL et BullMQ : expliquer ces outils lorsqu’ils sont concernés, sans supposer qu’ils sont déjà intégrés.
- Garder les changements lisibles pour un développeur débutant : noms explicites, petites fonctions et commentaires quand ils expliquent une décision non évidente.
- Lire le schéma Prisma racine `schema.prisma` avant toute modification de données. Les migrations sont dans `migrations/` et le client généré dans `backend/generated/prisma/`.
- Respecter l’architecture modulaire du front Next.js et du back NestJS. Ne pas ajouter de dépendance sans besoin concret.
- Les secrets de webhook sont affichés une seule fois. Ne jamais les faire apparaître dans les logs, les réponses d’erreur ou la mémoire.
- Ne jamais lancer `prisma migrate reset`, supprimer des données ou effectuer une opération externe sans demande explicite.
- Ne pas ajouter ni exécuter de tests sauf demande de l’utilisateur. Si une validation non destructive est utile, privilégier diagnostics, lint ou build. Ne pas lancer `next build` simultanément avec `next dev`, car les deux partagent `frontend/.next`.
- N’effectuer ni commit, push, publication, déploiement ou envoi de message externe sans demande explicite.

## Délégation

- Utiliser les agents spécialisés définis dans `.codex/agents/` lorsque leurs périmètres sont indépendants et utiles.
- Pour les changements simultanés, attribuer des fichiers différents. Ne pas laisser plusieurs agents modifier le même écran ou le même module.
- Utiliser `devsync-explorer` pour une enquête avant une modification risquée, `devsync-security-reviewer` pour une revue sécurité, et `devsync-quality-reviewer` pour une revue de changements.
- Ne pas déléguer les petites demandes qui sont plus rapides à résoudre directement.

## Mémoire de projet

Mettre à jour `PROJECT_MEMORY.md` à la fin d’un travail significatif lorsque l’architecture, l’état d’une fonction, une décision durable ou la prochaine étape a changé.

- Garder uniquement les faits utiles aux prochaines sessions, les limites actuelles et les décisions confirmées.
- Distinguer clairement le code implémenté, ce qui est seulement prévu et les hypothèses non vérifiées.
- Ne jamais enregistrer de secret, contenu `.env`, jeton, URL Cloudflare temporaire, donnée personnelle ou sortie contenant des identifiants.
- Ne pas recopier les échanges complets. Un court résumé daté suffit.
