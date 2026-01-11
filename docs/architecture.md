# Relance Factures - Architecture Document

**Generated:** 2026-01-11
**Version:** Consolidated from existing documentation

---

## 1. System Overview

Application française de gestion de recouvrement de factures avec architecture full-stack serverless.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   React 19  │  │  Tailwind   │  │ React Router│              │
│  │ Components  │  │    CSS v4   │  │     v7      │              │
│  └──────┬──────┘  └─────────────┘  └─────────────┘              │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Convex React Hooks                          │    │
│  │         useQuery() | useMutation() | useAction()         │    │
│  └──────────────────────────┬──────────────────────────────┘    │
└─────────────────────────────┼───────────────────────────────────┘
                              │ WebSocket (Real-time)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      CONVEX BACKEND                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Functions Layer                        │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐      │   │
│  │  │ Queries │  │Mutations│  │ Actions │  │  Crons  │      │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘      │   │
│  └───────┼────────────┼────────────┼────────────┼───────────┘   │
│          │            │            │            │                │
│          ▼            ▼            ▼            ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 Database (Document Store)                 │   │
│  │  organizations | users | invoices | reminders | payments │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    File Storage                           │   │
│  │                    (PDF uploads)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ External APIs
┌─────────────────────────────────────────────────────────────────┐
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Anthropic  │  │  Microsoft  │  │   Google    │              │
│  │  Claude AI  │  │  Graph API  │  │  OAuth API  │              │
│  │ (PDF Parse) │  │  (Email)    │  │  (Email)    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### 2.1 Directory Structure

```
src/
├── App.tsx                    # Root component, routing, auth flow
├── main.tsx                   # Entry point
├── index.css                  # Tailwind v4 theme (@theme directive)
├── components/
│   ├── ui/                    # Shadcn UI components (25+)
│   ├── layout/                # AppLayout, Sidebar, Topbar
│   ├── landing/               # Landing page components
│   ├── auth/                  # Auth layouts
│   ├── modals/                # Modal dialogs
│   └── mainView/              # Main invoice view components
├── pages/                     # Route components (18 pages)
└── lib/                       # Utilities and helpers
```

### 2.2 Routing Structure

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `Home` (unauthenticated) | Landing page |
| `/login` | `SignInForm` | Authentication |
| `/signup` | `SignupForm` | Registration with org creation |
| `/invoices` | `MainView` | Main invoice list (authenticated home) |
| `/invoices/:id` | `InvoiceDetail` | Invoice detail view |
| `/upload` | `InvoiceUpload` | PDF upload with AI extraction |
| `/settings` | `OrganizationSettings` | Organization settings |
| `/team` | `TeamManagement` | Team member management |
| `/follow-up` | `FollowUp` | Follow-up management |
| `/call-plan` | `CallPlan` | Phone call planning |

### 2.3 State Management

- **Server State:** Convex real-time queries (`useQuery`)
- **Mutations:** Convex mutations (`useMutation`)
- **Local State:** React `useState` for UI state
- **Session:** `sessionStorage` for pending org/invitation data
- **No Redux/Zustand:** Convex handles all persistent state

### 2.4 UI Component System

Based on **Shadcn/UI** with Radix UI primitives:

- Button, Input, Label, Textarea, Select
- Dialog, Popover, Dropdown Menu
- Card, Badge, Avatar, Tabs
- Calendar, Pagination, Tooltip
- Sidebar, Collapsible

**Theme Configuration:** `src/index.css` with `@theme` directive (Tailwind v4)

---

## 3. Backend Architecture (Convex)

### 3.1 Directory Structure

```
convex/
├── schema.ts              # Database schema definition
├── auth.ts                # Authentication functions
├── auth.config.ts         # Auth providers configuration
├── invoices.ts            # Invoice CRUD and business logic
├── organizations.ts       # Organization management
├── followUp.ts            # Reminder scheduling and execution
├── reminders.ts           # Reminder records
├── payments.ts            # Payment tracking
├── events.ts              # Activity timeline
├── invoiceNotes.ts        # Invoice notes
├── pdfExtractionAI.ts     # AI-powered PDF parsing
├── oauth.ts               # OAuth token management
├── permissions.ts         # Permission helpers
├── crons.ts               # Scheduled jobs
├── dev.ts                 # Development utilities
└── _generated/            # Auto-generated types
```

### 3.2 Function Types

| Type | Purpose | Example |
|------|---------|---------|
| **query** | Read data (real-time) | `invoices.list` |
| **mutation** | Write data | `invoices.create` |
| **action** | External API calls | `pdfExtractionAI.extract` |
| **internalQuery** | Server-only reads | `permissions.checkAccess` |
| **internalMutation** | Server-only writes | `followUp.processReminders` |

### 3.3 Key Backend Files

| File | Responsibility | Lines |
|------|----------------|-------|
| `invoices.ts` | Invoice CRUD, status management, listing with filters | ~1200 |
| `organizations.ts` | Org CRUD, invitations, settings, OAuth | ~900 |
| `followUp.ts` | Reminder scheduling, email sending, cron processing | ~600 |
| `events.ts` | Activity timeline, event logging | ~350 |
| `pdfExtractionAI.ts` | Claude AI integration for PDF parsing | ~300 |

---

## 4. Data Architecture

### 4.1 Database Schema

See [Data Models](./data-models.md) for complete schema.

**Core Tables:**
- `organizations` - Companies with reminder configuration
- `users` - Team members with roles (admin/technicien)
- `invoices` - Invoices with 3-dimensional status
- `reminders` - Scheduled follow-up actions
- `payments` - Payment records
- `events` - Activity audit log
- `invoiceNotes` - Notes on invoices
- `invitations` - Pending team invitations

### 4.2 Index Strategy

All tables use Convex indexes for efficient queries:

```typescript
// Example: invoices table indexes
.index("by_organization", ["organizationId"])
.index("by_organization_and_creator", ["organizationId", "createdBy"])
.index("by_organization_and_payment", ["organizationId", "paymentStatus"])
.index("by_organization_and_reminder", ["organizationId", "reminderStatus"])
```

### 4.3 Real-time Synchronization

Convex provides automatic real-time updates:
- All `useQuery` hooks re-render on data changes
- No manual cache invalidation needed
- WebSocket connection for instant updates

---

## 5. Authentication & Authorization

### 5.1 Authentication Flow

1. **Email/Password:** Primary auth method via `@convex-dev/auth`
2. **OAuth:** Microsoft and Google for email sending (not login)
3. **Invitations:** Token-based team member invitations

### 5.2 Authorization Model

| Role | Permissions |
|------|-------------|
| **admin** | Full access to organization data, settings, team management |
| **technicien** | Access to own invoices only, no settings access |

### 5.3 Multi-tenancy

- **Organization-scoped data:** All queries filter by `organizationId`
- **User-to-org binding:** Each user belongs to one organization
- **Cascading deletes:** Invoice deletion removes associated reminders, events, files

---

## 6. External Integrations

### 6.1 Anthropic Claude (AI)

- **Model:** Claude 3.5 Haiku
- **Use Case:** PDF invoice data extraction
- **SDK:** `@anthropic-ai/sdk`
- **Runtime:** Node.js action (`"use node"`)
- **Env Variable:** `CLAUDE_API_KEY`

### 6.2 OAuth Email Providers

| Provider | Status | Use Case |
|----------|--------|----------|
| Microsoft | Implemented | Send reminders via Outlook |
| Google | Planned | Send reminders via Gmail |
| Infomaniak | Schema ready | Swiss email provider |

### 6.3 Cron Jobs

```typescript
// convex/crons.ts
crons.daily("process-reminders", { hourUTC: 9 }, "...");
```

- **Daily reminder processing:** Checks for due reminders
- **Overdue detection:** Updates invoice statuses

---

## 7. Key Patterns & Conventions

### 7.1 Convex Best Practices

```typescript
// Always use validators
export const myQuery = query({
  args: { id: v.id("invoices") },
  returns: v.object({ ... }),
  handler: async (ctx, args) => { ... }
});

// Prefer .withIndex() over .filter()
const invoices = await ctx.db
  .query("invoices")
  .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
  .collect();
```

### 7.2 Frontend Conventions

- **Navigation:** Use `<NavLink>` not `<button onClick>` for routes
- **Imports:** Use aliases `@/lib/utils` not relative paths
- **Styling:** Tailwind v4 with `@theme` in `src/index.css`
- **Components:** Shadcn/UI for base, extend with brand classes

### 7.3 TypeScript

- Strict mode enabled
- Explicit types for Convex functions
- No `any` - use `unknown` if needed

---

## 8. Development & Deployment

### 8.1 Development Commands

```bash
pnpm dev              # Frontend + Backend concurrent
pnpm dev:frontend     # Vite dev server only
pnpm dev:backend      # Convex dev only
pnpm build            # Production build
pnpm lint             # TypeScript + ESLint + Convex validation
```

### 8.2 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `CLAUDE_API_KEY` | Yes | Anthropic API key for PDF extraction |
| `CONVEX_DEPLOYMENT` | Auto | Convex deployment identifier |

### 8.3 Deployment

- **Frontend:** Static build via Vite → Any static host
- **Backend:** Convex Cloud (automatic deployment)

---

## 9. Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **Convex over Firebase** | Real-time by default, TypeScript-first, simpler API |
| **React 19** | Latest features, improved performance |
| **Tailwind v4** | CSS-first config, better DX |
| **Shadcn over MUI** | Accessible, customizable, no runtime overhead |
| **Claude over GPT** | Better document understanding for French invoices |

---

## 10. Known Limitations & Tech Debt

1. **Some V2 Indigo references** remain in V2_TRACKING.md (obsolete)
2. **Legacy routes** like `/dashboard`, `/ongoing`, `/paid` redirect to `/invoices`
3. **AGENTS.md duplicate** for other AI assistants (to be removed)
4. **Some components** reference old file paths

---

*Consolidated from ARCHITECTURE.md, CONVENTIONS.md, and codebase analysis.*
