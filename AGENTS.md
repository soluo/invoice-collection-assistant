# AGENTS.md

Guide de référence pour les agents de code (Codex, GitHub Copilot, etc.) qui travaillent sur ce dépôt.

## Aperçu du projet

Application française de gestion du recouvrement de factures. Stack : Convex pour le backend temps réel et React 19 + TypeScript + Vite pour le frontend. Les utilisateurs importent des PDF, l’IA extrait automatiquement les données, puis l’outil orchestre le suivi des paiements et les relances.

## Gestionnaire de paquets

Le projet utilise **pnpm**. Toujours privilégier les commandes `pnpm ...`.

## Commandes de développement

- **Lancer frontend + backend :** `pnpm dev`
- **Frontend seul :** `pnpm dev:frontend`
- **Backend Convex seul :** `pnpm dev:backend`
- **Build production :** `pnpm build`
- **Lint complet + typecheck + build :** `pnpm lint` (inclut un `convex dev --once`)

## Architecture

### Backend (Convex)
- Répertoire : `convex/`
- Fichiers clés : `schema.ts`, `invoices.ts`, `reminderSettings.ts`, `reminders.ts`, `pdfExtractionAI.ts`, `dashboard.ts`, `auth.ts`, `auth.config.ts`, `router.ts`, `http.ts`
- Tables principales : `invoices`, `reminderSettings`, `reminders` (+ tables d’auth Convex)
- Toujours régénérer les bindings en lançant une commande Convex après modification (ex. `convex dev --once`)

### Frontend (React)
- Répertoire : `src/`
- `src/App.tsx` : shell principal + React Router
- Layout : `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Topbar.tsx`
- Pages/clés : `src/pages`, `src/components/Dashboard.tsx`, `InvoiceList.tsx`, `InvoiceUpload.tsx`, `ReminderSettings.tsx`, etc.
- State : hooks Convex (`useQuery`, `useMutation`)
- Navigation : React Router v7, préférer `<NavLink>` avec prop `end` si nécessaire

### Organisation des fichiers
- UI partagée : `src/components`
- Pages : `src/pages`
- Helpers : `src/lib`
- Backend : `convex/functions`, `convex/http.ts`, `convex/router.ts`
- Artifacts : `dist/` (ne jamais éditer)
- Config : `vite.config.ts`, `eslint.config.js`, `setup.mjs`, `tsconfig*.json`

## Tailwind CSS v4

- Plus de `tailwind.config.js` : toute la config se fait via `@theme` dans `src/index.css`
- Import : `@import "tailwindcss"`
- Variables personnalisées (couleurs, spacing, radius, ombres) définies dans `@theme` et appelées via utilitaires (ex. `bg-primary`, `rounded-container`)
- Vite plugin : `@tailwindcss/vite` dans `vite.config.ts`
- Lors d’un ajout de thèmes, modifier `src/index.css`

## Style de code & conventions

- TypeScript strict : conserver les types explicites, en particulier pour les fonctions Convex et hooks React
- Nommer : PascalCase pour composants/handlers, camelCase pour variables/fonctions, kebab-case pour nouveaux fichiers (`invoice-upload.tsx`)
- ESLint + Prettier : indentation 2 espaces, JSX en double quotes, trailing commas quand possible
- Utiliser les utilitaires Tailwind existants (voir `src/App.tsx`) pour rester cohérent

## Schéma et logique métier

- **Invoices** : suivi du statut, informations client, montants, dates, PDF optionnel. Index `by_user`, `by_user_and_status`, `by_due_date`
- **ReminderSettings** : configuration des délais et modèles d’emails par utilisateur (index `by_user`)
- **Reminders** : historique des relances (index `by_invoice`, `by_user`)
- Flow des statuts : `sent` → `overdue` → `first_reminder` → `second_reminder` → `third_reminder` → `litigation` → `paid`
- La requête `invoices.list` calcule `daysOverdue` et trie par priorité

## Fonctionnalités clés

1. Extraction automatique de PDF via Claude 3.5 Haiku (`@anthropic-ai/sdk`) – nécessite `CLAUDE_API_KEY`
2. Gestion des statuts et relances planifiées
3. Synchronisation temps réel (Convex)
4. Authentification avec `@convex-dev/auth` (anonymous auth)
5. Tableau de bord multi-vues et filtres

## Directives Convex importantes

- Se référer à `convex_rules.txt` et `CONVEX_GUIDELINES.md`
- Toujours définir `args`, `returns`, `handler` dans les fonctions (`query`, `mutation`, `action`, `internal*`)
- Ajouter des validateurs (`v.*`) pour tous les arguments/retours
- Utiliser les indexes avec `.withIndex()` plutôt que `.filter()` pour les requêtes
- Pour les actions Node.js, ajouter `"use node";` en tête du fichier
- Après toute modification Convex, exécuter `pnpm dev:backend` (ou `convex dev --once`) pour régénérer les bindings

## Tests et validation

- Pas de tests automatisés à ce jour : effectuer des vérifications manuelles ciblées via `pnpm dev`
- Pour les scénarios backend, utiliser le dashboard Convex ou des scripts
- Avant PR, lancer `pnpm lint` pour vérifier types + build

## Bonnes pratiques de navigation

- Toujours utiliser `<NavLink>` pour les liens de navigation (meilleur UX/accessibilité, états actifs)
- Exemple :
  ```tsx
  <NavLink to="/" end>Dashboard</NavLink>
  <NavLink
    to="/invoices"
    className={({ isActive }) =>
      cn("base-classes", isActive ? "active" : "inactive")
    }
  >
    Invoices
  </NavLink>
  ```

## Ligne de commande & opérations

- `pnpm install` après un pull ou modification Convex
- `convex dev --once` pour la validation la plus rapide côté backend
- Éviter toute modification manuelle dans `dist/`

## Commits & PR

- Messages courts, temps présent, ≤72 caractères (`add invoices page filters`)
- PR : expliquer le “pourquoi”, lister les changements majeurs, joindre des captures si UI, préciser les fonctions Convex modifiées et la méthode de validation (`pnpm lint`, tests manuels…)
- Documenter toute modification du schéma Convex ou des données seed pour faciliter la reproduction locale

## Ressources utiles

- `convex_rules.txt` : syntaxe et conventions officielles Convex
- `CONVEX_GUIDELINES.md` : étapes de validation obligatoires
- `src/index.css` : configuration Tailwind v4 via `@theme`
- `vite.config.ts` : plugin Tailwind et configuration Vite
- `README.md` : vue d’ensemble utilisateur
