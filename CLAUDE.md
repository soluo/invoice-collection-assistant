# CLAUDE.md

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

## MCP Servers Disponibles

**Context7** - Documentation des packages
→ Utiliser automatiquement pour obtenir la doc des librairies (React, TypeScript, etc.)

**Convex MCP** - Interaction directe avec le backend
→ Tables, fonctions, data, logs, environment variables

**Shadcn MCP** - Composants UI
→ Recherche et ajout de composants Shadcn/ui

## Skills Globaux

**convex-app** - Scaffolding d'applications Convex

**tailwindcss** - Configuration Tailwind CSS
→ Note : Ce projet utilise Tailwind v4 (config dans `src/index.css` via `@theme`)

## Règles Importantes

### Convex (Backend)
- **Validation obligatoire** : `pnpm dev:backend` après toute modification Convex
- **Documentation complète** : voir `CONVEX_GUIDELINES.md` et `convex_rules.txt`
- **Interaction backend** : Utiliser le Convex MCP (tables, fonctions, data, logs)

### Code
- **Imports avec alias** : `@/lib/utils` (jamais de chemins relatifs `../../`)
- **Navigation** : `<NavLink>` (pas `<button onClick>`) - voir `CONVENTIONS.md`

## context7

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.
