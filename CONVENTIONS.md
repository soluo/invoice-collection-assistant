# Conventions de Code

Ce document définit les bonnes pratiques et conventions spécifiques à ce projet.

## Navigation Best Practices

### Utiliser NavLink pour la Navigation

**Toujours préférer `<NavLink>` de React Router plutôt que `<button onClick>` pour la navigation.**

**Avantages de NavLink** :
- Aperçu de l'URL au survol
- Menu contextuel clic-droit (ouvrir dans nouvel onglet, etc.)
- Meilleure sémantique HTML
- État actif automatique
- Meilleure accessibilité

### Utilisation de la prop `end`

Utiliser la prop `end` sur le chemin racine pour éviter qu'il ne corresponde à toutes les routes :

```tsx
<NavLink to="/" end>Dashboard</NavLink>
```

### État Actif

NavLink fournit automatiquement `isActive` dans sa fonction `className` :

```tsx
<NavLink
  to="/invoices"
  className={({ isActive }) => cn(
    "base-classes",
    isActive ? "active-classes" : "inactive-classes"
  )}
>
  Invoices
</NavLink>
```

## Styling

### Tailwind CSS v4

Ce projet utilise **Tailwind CSS v4** avec des changements importants par rapport à v3 :

**Configuration** :
- ❌ Pas de `tailwind.config.js`
- ✅ Configuration via directive `@theme` dans `src/index.css`
- ✅ Import : `@import "tailwindcss"` (remplace `@tailwind base/components/utilities`)
- ✅ Plugin Vite : `@tailwindcss/vite` dans `vite.config.ts`

**Variables personnalisées** :
Le projet définit des variables CSS personnalisées dans le bloc `@theme` :
- Couleurs : `--color-primary`, `--color-primary-hover`, `--color-secondary`
- Spacing : `--spacing-section`, `--spacing-container`
- Border radius : `--radius-container`
- Ombres : `--shadow-sm`, `--shadow`

**Utilisation dans les classes Tailwind** :
```tsx
<div className="bg-primary rounded-container shadow-sm">
  {/* Contenu */}
</div>
```

**Important** : Pour ajouter des personnalisations de thème, les ajouter dans le bloc `@theme` de `src/index.css`, pas dans un fichier de config.

**Skill disponible** : Utiliser le skill `tailwindcss` pour obtenir de l'aide sur la configuration et le setup.

## Style de Code

### TypeScript

- **Mode strict** : TypeScript strict activé
- **Types explicites** : Typer explicitement les fonctions Convex et les hooks React
- **Pas d'any** : Éviter `any`, utiliser `unknown` si nécessaire

### Imports

**Toujours utiliser les alias** au lieu des chemins relatifs :

```tsx
// ✅ Correct
import { cn } from "@/lib/utils";

// ❌ Incorrect
import { cn } from "../../lib/utils";
```

### Naming Conventions

- **Composants React** : PascalCase (`InvoiceList`, `ReminderModal`)
- **Fonctions/variables** : camelCase (`getUserInvoices`, `invoiceCount`)
- **Nouveaux fichiers** : kebab-case (`invoice-upload.tsx`, `reminder-settings.tsx`)
- **Constantes** : UPPER_SNAKE_CASE (`MAX_RETRIES`, `API_ENDPOINT`)

### Code Formatting

- **Indentation** : 2 espaces
- **JSX** : Double quotes
- **Trailing commas** : Toujours quand possible
- **ESLint + Prettier** : Respecter la config du projet

## Convex Best Practices

### Syntaxe des Fonctions

Toujours utiliser la syntaxe explicite avec `args`, `returns`, et `handler` :

```typescript
export const myQuery = query({
  args: { id: v.id("invoices") },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    // Implementation
  }
});
```

### Validateurs

- Tous les arguments doivent avoir un validateur (`v.*`)
- Tous les returns doivent avoir un validateur
- Utiliser `v.null()` pour les fonctions qui ne retournent rien

### Queries avec Index

**Toujours préférer `.withIndex()` plutôt que `.filter()`** pour les performances :

```typescript
// ✅ Correct - Utilise un index
const invoices = await ctx.db
  .query("invoices")
  .withIndex("by_user", (q) => q.eq("userId", userId))
  .collect();

// ❌ Incorrect - Scan complet de la table
const invoices = await ctx.db
  .query("invoices")
  .filter((q) => q.eq(q.field("userId"), userId))
  .collect();
```

### Fonctions Internes

Pour les fonctions serveur uniquement, utiliser `internalQuery`, `internalMutation`, `internalAction` :

```typescript
export const getOrganization = internalQuery({
  args: { orgId: v.id("organizations") },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    // Accessible uniquement via internal.xxx
  }
});
```

### Validation Obligatoire

**Après toute modification de fichiers Convex** : exécuter `pnpm dev:backend` pour valider.

Voir `CONVEX_GUIDELINES.md` pour les détails de la procédure de validation.

## Git Workflow

Voir la section "Git Workflow & Commits" dans `CLAUDE.md` pour les conventions de commit et le workflow de développement.

## Ressources

- `ARCHITECTURE.md` - Structure détaillée du projet
- `CONVEX_GUIDELINES.md` - Procédure de validation Convex
- `convex_rules.txt` - Règles officielles Convex
- `CLAUDE.md` - Vue d'ensemble et commandes essentielles
