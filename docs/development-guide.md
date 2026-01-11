# Relance Factures - Development Guide

**Generated:** 2026-01-11

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm (package manager)
- Convex account

### Installation

```bash
# Clone repository
git clone <repository-url>
cd invoice-collection-assistant

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | Anthropic API key for PDF extraction |
| `VITE_CONVEX_URL` | Auto | Convex deployment URL |

### Development Server

```bash
# Start both frontend and backend
pnpm dev

# Or run separately
pnpm dev:frontend  # Vite dev server (port 5173)
pnpm dev:backend   # Convex dev server
```

---

## Essential Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start frontend + backend concurrently |
| `pnpm dev:frontend` | Vite dev server only |
| `pnpm dev:backend` | Convex dev server only |
| `pnpm build` | Production build |
| `pnpm lint` | TypeScript + ESLint + Convex validation |

---

## Project Structure

```
invoice-collection-assistant/
├── src/              # Frontend (React)
│   ├── components/   # UI components
│   ├── pages/        # Route components
│   └── lib/          # Utilities
├── convex/           # Backend (Convex)
│   ├── schema.ts     # Database schema
│   └── *.ts          # Functions
├── docs/             # Generated documentation
└── specs/            # Feature specifications
```

---

## Code Conventions

### Imports

**Always use aliases:**

```tsx
// ✅ Correct
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ❌ Incorrect
import { cn } from "../../lib/utils";
```

### Navigation

**Use NavLink for routes:**

```tsx
// ✅ Correct
<NavLink to="/invoices">Factures</NavLink>

// ❌ Incorrect
<button onClick={() => navigate("/invoices")}>Factures</button>
```

### TypeScript

- Strict mode enabled
- Explicit types for Convex functions
- No `any` - use `unknown` if needed

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `InvoiceList` |
| Functions | camelCase | `getUserInvoices` |
| Files | kebab-case | `invoice-upload.tsx` |
| Constants | UPPER_SNAKE | `MAX_RETRIES` |

---

## Convex Development

### After Modifying Backend

**Always validate with:**

```bash
pnpm dev:backend
```

This checks:
- Schema validity
- Function argument validators
- Return type validators
- Index definitions

### Query Pattern

```typescript
export const list = query({
  args: { orgId: v.id("organizations") },
  returns: v.array(v.object({ ... })),
  handler: async (ctx, args) => {
    // Use .withIndex() for performance
    return await ctx.db
      .query("invoices")
      .withIndex("by_organization", q => q.eq("organizationId", args.orgId))
      .collect();
  }
});
```

### Mutation Pattern

```typescript
export const create = mutation({
  args: {
    clientName: v.string(),
    amountTTC: v.number(),
  },
  returns: v.id("invoices"),
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Not authenticated");

    return await ctx.db.insert("invoices", {
      ...args,
      userId: user.tokenIdentifier,
      createdAt: Date.now(),
    });
  }
});
```

### Action Pattern (External APIs)

```typescript
"use node";  // Required for Node.js APIs

export const extractPdf = action({
  args: { pdfUrl: v.string() },
  returns: v.object({ ... }),
  handler: async (ctx, args) => {
    const anthropic = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });
    // ... AI processing
  }
});
```

---

## Tailwind CSS v4

### Theme Configuration

Theme is defined in `src/index.css` using `@theme`:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: #f97316;
  --color-brand-600: #ea580c;
  /* ... */
}
```

**No `tailwind.config.js`** - Tailwind v4 uses CSS-based configuration.

### Using Theme Colors

```tsx
// Brand colors
<button className="bg-brand-500 hover:bg-brand-600 text-white">
  CTA
</button>

// Using CSS variables
<div className="bg-primary text-primary-foreground">
  Primary
</div>
```

---

## Testing

### Manual Testing Checklist

- [ ] Authentication flow (login/signup)
- [ ] Invoice CRUD operations
- [ ] PDF upload and AI extraction
- [ ] Reminder scheduling
- [ ] Payment recording
- [ ] Team invitations
- [ ] Mobile responsiveness

### Development Utilities

```typescript
// convex/dev.ts provides:
dev:clearAllTables     // Reset all data (DANGER!)
dev:cleanOrphanEvents  // Clean orphan events
dev:cleanOrphanFiles   // Clean orphan PDFs
```

Usage via Convex Dashboard or MCP:
```
mcp__convex__run(functionName: "dev:clearAllTables", args: "{}")
```

---

## Git Workflow

### Commit Format

```
feat: add invoice notes system
fix: handle failed email sends
refactor: simplify reminder logic
style: harmonize page layouts
docs: update architecture doc
```

### Workflow

1. Implement feature
2. Test manually
3. Run `pnpm lint`
4. Commit with descriptive message
5. Continue to next feature

---

## Debugging

### Frontend

- React DevTools
- Browser console
- Network tab for Convex WebSocket

### Backend

- Convex Dashboard logs
- `console.log` in handlers (visible in dashboard)
- `mcp__convex__logs` for recent logs

### Common Issues

| Issue | Solution |
|-------|----------|
| TypeScript errors | Run `pnpm lint` |
| Convex validation fails | Check validators match schema |
| Real-time not updating | Check WebSocket connection |
| PDF extraction fails | Verify `CLAUDE_API_KEY` |

---

## Deployment

### Frontend

```bash
pnpm build
# Deploy dist/ to any static host
```

### Backend

Convex deploys automatically on `pnpm dev:backend` changes.

For production:
```bash
npx convex deploy
```

---

## MCP Tools Available

### Convex MCP

- `mcp__convex__status` - Deployment info
- `mcp__convex__tables` - List tables and schema
- `mcp__convex__data` - Read table data
- `mcp__convex__run` - Execute functions
- `mcp__convex__logs` - View recent logs

### Shadcn MCP

- `mcp__shadcn__search_items_in_registries` - Search components
- `mcp__shadcn__get_add_command_for_items` - Get install command
- `mcp__shadcn__view_items_in_registries` - View component details

### Context7 MCP

- `mcp__context7__resolve-library-id` - Find library docs
- `mcp__context7__query-docs` - Query documentation

---

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [React Router v7](https://reactrouter.com)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Shadcn/UI](https://ui.shadcn.com)
- [Lucide Icons](https://lucide.dev)

---

*Generated by BMM document-project workflow.*
