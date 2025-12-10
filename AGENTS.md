# AGENTS.md

Guide de référence pour les agents de code (Codex, GitHub Copilot, etc.) qui travaillent sur ce dépôt.

Application française de gestion de recouvrement de factures avec Convex (backend) et React 19 + TypeScript + Vite (frontend).

## Package Manager

**pnpm** - Utiliser `pnpm` pour toutes les commandes.

## Commandes Essentielles

```bash
pnpm dev              # Frontend + Backend
pnpm dev:frontend     # Frontend seul
pnpm dev:backend      # Backend Convex seul (validation après modif Convex)
pnpm build            # Build production
pnpm lint             # Lint + typecheck complet
```

## Git Workflow & Commits

**IMPORTANT : si on te l'as demandé tu DOIS créer un commit après chaque fonctionnalité ou grosse modification.**

### Workflow
1. Implémenter une fonctionnalité complète
2. Tester manuellement (vérifier que ça fonctionne)
3. Lancer `pnpm lint` pour vérifier qu'il n'y a pas d'erreurs
4. **Créer un commit Git** avec un message descriptif (si on te l'a demandé)
5. Passer à la fonctionnalité suivante

### Format des commits
Utiliser des messages de commit clairs et concis :
- `feat: description courte` - Nouvelle fonctionnalité
- `fix: description courte` - Correction de bug
- `refactor: description courte` - Refactoring sans changement de comportement
- `style: description courte` - Changements de style/formatage
- `docs: description courte` - Documentation uniquement

**Exemples :**
```bash
git add .
git commit -m "feat: add invoice notes system with timeline"
git commit -m "feat: add email preview before sending reminders"
git commit -m "fix: handle failed email sends with retry button"
```

### Pourquoi commiter régulièrement ?
- Permet de revenir en arrière facilement si besoin
- Facilite le suivi des changements
- Permet de déployer par étapes
- Évite de perdre du travail

## Documentation (Lazy Loading)

**Consulter selon besoin :**
- `ARCHITECTURE.md` - Structure détaillée backend/frontend/DB/features
- `CONVEX_GUIDELINES.md` - Validation obligatoire après modification Convex
- `convex_rules.txt` - Règles officielles Convex (syntaxe, validateurs)
- `CONVENTIONS.md` - Best practices (Navigation NavLink, Tailwind, style de code)

## Règles Importantes

### Convex (Backend)
- **Validation obligatoire** : `pnpm dev:backend` après toute modification Convex
- **Documentation complète** : voir `CONVEX_GUIDELINES.md` et `convex_rules.txt`
- Toujours définir `args`, `returns`, `handler` dans les fonctions Convex
- Utiliser les indexes avec `.withIndex()` plutôt que `.filter()` pour les performances
- Pour les actions Node.js, ajouter `"use node";` en tête du fichier

### Code
- **Imports avec alias** : `@/lib/utils` (jamais de chemins relatifs `../../`)
- **Navigation** : `<NavLink>` (pas `<button onClick>`) - voir `CONVENTIONS.md`
- TypeScript strict : conserver les types explicites
- Nommage : PascalCase pour composants, camelCase pour variables/fonctions

## Tests et Validation

- Pas de tests automatisés : effectuer des vérifications manuelles via `pnpm dev`
- Avant PR, lancer `pnpm lint` pour vérifier types + build
- Après modification Convex : `pnpm dev:backend` pour valider

## Ressources Utiles

- `ARCHITECTURE.md` - Vue détaillée de l'architecture
- `CONVEX_GUIDELINES.md` - Étapes de validation obligatoires Convex
- `CONVENTIONS.md` - Conventions de code et best practices
- `convex_rules.txt` - Syntaxe et conventions officielles Convex
- `src/index.css` - Configuration Tailwind v4 via `@theme`
