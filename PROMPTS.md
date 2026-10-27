# Prompts réutilisables pour DevSync

Les consignes générales sont dans `AGENTS.md` et l’état durable dans `PROJECT_MEMORY.md`. Demander un agent par son nom lorsqu’une délégation est utile.

## Reprendre le projet

> Lis `AGENTS.md` et `PROJECT_MEMORY.md`, puis vérifie le code concerné. Résume en français ce qui existe réellement, ce qui reste à faire et la prochaine étape la plus petite. Ne modifie aucun fichier avant de m’avoir présenté ce résumé.

## Préparer une fonctionnalité

> Pour [fonctionnalité], utilise `devsync-explorer` pour cartographier les fichiers concernés si c’est utile. Propose le contrat front/API, les données touchées, les étapes, les critères d’acceptation et les risques. Ne commence pas l’implémentation avant mon accord.

## Implémenter une fonctionnalité approuvée

> Implémente [fonctionnalité approuvée] en t’appuyant sur `PROJECT_MEMORY.md` et le code actuel. Délègue au spécialiste concerné uniquement si les tâches sont indépendantes. Explique les changements en français simple, ne touche pas aux secrets et mets à jour la mémoire à la fin si l’état durable change.

## Comprendre une erreur

> Enquête sur [erreur] sans lire de fichier `.env`. Reproduis ou collecte les éléments observables, utilise `devsync-explorer` si l’enquête couvre plusieurs modules, puis explique la cause probable et le correctif minimal avant de modifier le code.

## Revoir un changement

> Examine les changements avec `devsync-security-reviewer` et `devsync-quality-reviewer` en parallèle s’ils peuvent travailler indépendamment. Rapporte d’abord les vrais défauts avec fichier et ligne. Ne modifie rien et ne lance pas les tests sans ma demande.

## Apprendre un outil

> Explique-moi [outil ou concept] comme à un débutant : à quoi il sert dans DevSync, comment le flux de données fonctionne, puis montre le point d’intégration pertinent dans le code. Distingue ce qui est déjà branché de ce qu’il faudrait encore développer.
