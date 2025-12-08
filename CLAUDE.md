# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a French invoice collection management application built with Convex as the backend and React/TypeScript as the frontend. The application allows users to upload PDF invoices, automatically extract invoice data using AI, track payment status, and manage automated reminder workflows for overdue payments.

## Package Manager

This project uses **pnpm** as its package manager. All commands should use pnpm instead of npm.

## Development Commands

**Start development servers (frontend + backend):**
```bash
pnpm dev
```

**Start frontend only:**
```bash
pnpm dev:frontend
```

**Start Convex backend only:**
```bash
pnpm dev:backend
```

**Build for production:**
```bash
pnpm build
```

**Lint and typecheck (comprehensive):**
```bash
pnpm lint
```

This command runs TypeScript compilation check for both convex and frontend code, runs convex dev once, and builds with vite.

## Git Workflow & Commits

**IMPORTANT: TOUJOURS créer un commit après chaque fonctionnalité ou grosse modification.**

### Workflow de développement
1. Implémenter une fonctionnalité complète
2. Tester manuellement (vérifier que ça fonctionne)
3. Lancer `pnpm lint` pour vérifier qu'il n'y a pas d'erreurs
4. **Créer un commit Git** avec un message descriptif
5. Passer à la fonctionnalité suivante

### Format des commits
Utiliser des messages de commit clairs et concis :
- `feat: description courte` - Nouvelle fonctionnalité
- `fix: description courte` - Correction de bug
- `refactor: description courte` - Refactoring sans changement de comportement
- `style: description courte` - Changements de style/formatage
- `docs: description courte` - Documentation uniquement

**Exemples:**
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

## Architecture

### Backend Structure (Convex)
The backend is built with **Convex**, providing real-time database with automatic APIs in `/convex/`:

**Core Backend Files:**
- `convex/schema.ts`: Database schema with three main tables (invoices, reminderSettings, reminders)
- `convex/invoices.ts`: Invoice CRUD operations, status management, and business logic
- `convex/reminderSettings.ts`: User reminder configuration management (delays, email templates)
- `convex/reminders.ts`: Reminder history tracking
- `convex/pdfExtractionAI.ts`: AI-powered PDF invoice data extraction using Claude (Anthropic)
- `convex/dashboard.ts`: Dashboard statistics and metrics
- `convex/auth.ts` & `convex/auth.config.ts`: Authentication configuration
- `convex/router.ts` & `convex/http.ts`: HTTP API route definitions

**Authentication:** Uses `@convex-dev/auth` with anonymous auth

### Frontend Structure (React)
Built with **React 19 + TypeScript + Vite** in `/src/`:

**Routing & Layout:**
- `src/App.tsx`: Main app layout, authentication handling, and React Router setup
- `src/components/layout/AppLayout.tsx`: Main layout wrapper with sidebar and topbar
- `src/components/layout/Sidebar.tsx`: Left sidebar navigation (responsive, mobile overlay)
- `src/components/layout/Topbar.tsx`: Top bar with user menu and mobile hamburger
- Routes: `/` (dashboard), `/invoices`, `/clients`, `/upload`, `/settings`, `/team`, etc.

**Key Components:**
- `src/components/Dashboard.tsx`: Main dashboard with overdue/upcoming invoice stats
- `src/components/InvoiceList.tsx`: Invoice listing with status badges and actions
- `src/components/OngoingInvoices.tsx`: List of sent invoices not yet due
- `src/components/PaidInvoices.tsx`: Archive of paid invoices
- `src/components/InvoiceUpload.tsx`: PDF upload with AI extraction preview
- `src/components/InvoiceEditModal.tsx`: Edit invoice details
- `src/components/ReminderSettings.tsx`: Configure reminder delays and email templates
- `src/components/ReminderModal.tsx`: Send reminders with preview
- `src/components/StatsNavigation.tsx`: Navigation tabs for different views

**Styling:** Tailwind CSS v4 with utility classes and component-based architecture

### Tailwind CSS v4 Configuration
This project uses **Tailwind CSS v4**, which has significant changes from v3:

**Configuration Location:**
- **No tailwind.config.js**: Configuration is now defined directly in CSS using the `@theme` directive
- All theme customization is in `src/index.css` using CSS variables

**Key v4 Syntax:**
- `@import "tailwindcss"` at the top of `src/index.css` (replaces `@tailwind base/components/utilities`)
- `@theme { }` block for custom theme configuration (replaces tailwind.config.js theme section)
- Vite plugin: `@tailwindcss/vite` imported in `vite.config.ts`

**Custom Theme Variables:**
The project defines custom CSS variables in the `@theme` block:
- Colors: `--color-primary`, `--color-primary-hover`, `--color-secondary`
- Spacing: `--spacing-section`, `--spacing-container`
- Border radius: `--radius-container`
- Shadows: `--shadow-sm`, `--shadow`

These can be used in Tailwind classes (e.g., `bg-primary`, `rounded-container`, `shadow-sm`)

**Important:** When adding new theme customizations, add them to the `@theme` block in `src/index.css`, not in a config file.

### Database Schema
- **invoices**: User invoices with status tracking, client info (name, email), amounts, dates (invoice, due, paid), and optional PDF storage
  - Indexes: `by_user`, `by_user_and_status`, `by_due_date`
- **reminderSettings**: Per-user configuration for reminder delays (days after due date) and customizable email templates
  - Index: `by_user`
- **reminders**: Historical record of sent reminders with email content and dates
  - Indexes: `by_invoice`, `by_user`
- **Auth tables**: Built-in Convex Auth tables for user management

### Invoice Status Flow
Invoices progress through these statuses:
- `sent` → invoice sent to client
- `overdue` → past due date
- `first_reminder` → first reminder sent
- `second_reminder` → second reminder sent
- `third_reminder` → third reminder sent
- `litigation` → escalated to legal action
- `paid` → payment received (terminal state)

The `invoices.list` query automatically calculates `daysOverdue` and sorts by priority (litigation → third_reminder → ... → sent → paid).

## Key Features

1. **AI-Powered PDF Extraction**: Upload PDF invoices and automatically extract client name, email, invoice number, amounts, and dates using Claude 3.5 Haiku via Anthropic API
2. **Status Management**: Track invoice payment status with manual status updates and reminder tracking
3. **Real-time Updates**: Convex provides automatic real-time data synchronization across all clients
4. **Authentication**: Secure user sessions with Convex Auth (anonymous auth)
5. **Reminder System**: Configurable email templates and delay settings per user, with reminder history
6. **Dashboard Views**: Multiple filtered views (overdue, ongoing, paid) with statistics

## Important Convex Guidelines

**Documentation References:**
- `convex_rules.txt` - Règles officielles Convex (syntaxe, schémas, validateurs, etc.)
- `CONVEX_GUIDELINES.md` - **Procédure de validation obligatoire : TOUJOURS lancer `pnpm dev:backend` après modification des fichiers Convex**

This project follows the Convex function syntax defined in `convex_rules.txt` at the project root. Key conventions:

**Function Syntax:**
- Always use explicit `args`, `returns`, and `handler` properties
- All functions must have validators for arguments and return values
- Use `v.null()` for functions that don't return values
- Example:
  ```typescript
  export const myQuery = query({
    args: { id: v.id("invoices") },
    returns: v.object({ ... }),
    handler: async (ctx, args) => { ... }
  });
  ```

**Function Visibility:**
- Public functions: `query`, `mutation`, `action` (exposed to clients)
- Internal functions: `internalQuery`, `internalMutation`, `internalAction` (server-only)
- Call internal functions via `internal` object from `_generated/api`

**Database Queries:**
- Always use indexes with `.withIndex()` instead of `.filter()` for performance
- Use `.unique()` for single results (throws if multiple matches)
- Order results with `.order('asc')` or `.order('desc')`
- The `invoices` table uses indexes for efficient filtering by user and status

**HTTP Endpoints:**
- Defined in `convex/router.ts` using `httpAction`
- Currently minimal (auth routes managed by Convex Auth)

**Node.js Actions:**
- Add `"use node";` at top of files using Node.js built-in modules
- `pdfExtractionAI.ts` uses Node.js runtime for Anthropic SDK

## AI Integration

**PDF Extraction:**
- Uses Claude 3.5 Haiku (Anthropic) via `@anthropic-ai/sdk`
- Requires `CLAUDE_API_KEY` environment variable
- Directly analyzes PDF documents using Claude's document understanding
- Extracts: clientName, clientEmail, invoiceNumber, amountTTC, invoiceDate, dueDate
- Returns confidence score based on extraction quality
- Fallback behavior: Returns partial data with 0% confidence on errors

## Development Notes

- Connected to Convex deployment: `fabulous-dachshund-120`
- Frontend uses React 19 with modern hooks and TypeScript strict mode
- State management via Convex React hooks (`useQuery`, `useMutation`)
- Navigation handled by React Router v7
- Toast notifications via `sonner`
- Icons from `lucide-react`
- **Styling uses Tailwind CSS v4** with CSS-based configuration (no config file)

## Navigation Best Practices

**Use NavLink for Navigation Links:**
- **Always prefer `<NavLink>` over `<button onClick>` for navigation** to provide better UX and accessibility
- NavLink provides: URL preview on hover, right-click context menu, better semantics, and automatic active state
- Use the `end` prop on the root path to prevent it from matching all routes:
  ```tsx
  <NavLink to="/" end>Dashboard</NavLink>
  ```
- NavLink automatically provides `isActive` in its className function:
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
## context7

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.
