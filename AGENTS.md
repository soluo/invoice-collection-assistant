# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript client; keep shared UI in `src/components`, page-level routes in `src/pages`, and helpers in `src/lib`. Path aliases such as `@components/Button` and `@pages/Invoices` are configured in `tsconfig.app.json`.
- `convex/` contains Convex backend functions (`convex/functions`, `convex/http.ts`, `convex/router.ts`) plus generated API bindings in `convex/_generated`. Regenerate bindings by running any Convex command (`convex dev`).
- Build artifacts live in `dist/` and should never be edited manually.
- Repository configuration is centralized in files like `vite.config.ts`, `eslint.config.js`, and `setup.mjs`; update these before introducing new tooling.

## Build, Test, and Development Commands
- `pnpm install` installs dependencies; run it after pulling changes or updating Convex.
- `pnpm dev` launches both the Vite frontend and Convex backend with hot reload.
- `pnpm build` performs a production build into `dist/`; use it to validate deploy readiness.
- `pnpm lint` type-checks every Convex and client module, runs Convex’s one-off schema generation, then executes a full Vite build. Use this before any pull request.
- For backend-only work, `convex dev --once` is the quickest way to regenerate types and surface schema errors.

## Coding Style & Naming Conventions
- Prettier defaults are enforced via ESLint; keep two-space indentation, double quotes in JSX, and trailing commas where possible.
- Stick to TypeScript strict mode and avoid opting out of types unless absolutely required; annotate new Convex functions and React hooks explicitly.
- Use PascalCase for React components and Convex handlers, camelCase for variables and functions, and kebab-case for new file names (e.g., `invoice-upload.tsx`).
- Favor composable Tailwind utility classes already used across `src/App.tsx` for styling.

## Testing Guidelines
- Automated tests are not yet in place; cover new behavior with targeted manual checks in `pnpm dev`. Capture backend edge cases with scripted calls through the Convex dashboard when feasible.
- When introducing automated tests, colocate client tests next to the component file (`Component.test.tsx`) and document any new tooling in this guide.

## Commit & Pull Request Guidelines
- Follow the existing history: short, present-tense summaries under 72 characters (e.g., `add invoices page filters`). Scope body text only when necessary.
- Each PR should explain the “why”, list key changes, include screenshots for UI updates, and reference Convex functions you touched. Mention how you verified the change (`pnpm lint`, manual flow, etc.).
- Ensure Convex schema changes or seed updates are noted so reviewers can reproduce data locally.
