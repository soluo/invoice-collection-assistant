# Story 1.1: Invoice Detail Drawer with Status Display

Status: done

## Story

As a **user (technician or admin)**,
I want **to open an invoice detail drawer from the invoice list or follow-up page**,
So that **I can quickly see all important invoice information without losing my current context**.

## Acceptance Criteria

1. **Given** I am on the /invoices list page
   **When** I click on an invoice row
   **Then** a drawer opens from the right side showing the invoice details
   **And** I can see the invoice number, client name, and total amount
   **And** I can see the send status as a badge (pending/sent)
   **And** I can see the payment status as a badge (unpaid/partial/pending/paid)
   **And** I can see the reminder status with current step indicator
   **And** I can see days overdue displayed prominently if invoice is past due date
   **And** I can see the PDF preview or a button to view the PDF
   **And** I can see a button "Open full page" that navigates to /invoices/:id

2. **Given** I am on the /follow-up page
   **When** I click on a reminder's invoice reference
   **Then** the same invoice detail drawer opens
   **And** I can see all invoice information as described above

3. **Given** the drawer is open
   **When** I click outside the drawer or press Escape
   **Then** the drawer closes and I return to my previous view

## Tasks / Subtasks

- [x] Task 1: Install and configure Shadcn Sheet component (AC: #1)
  - [x] Run `npx shadcn@latest add sheet` to add the component
  - [x] Verify component works with project's Tailwind v4 setup

- [x] Task 2: Create InvoiceDetailDrawer component (AC: #1, #2, #3)
  - [x] Create `/src/components/InvoiceDetailDrawer.tsx`
  - [x] Use Sheet component with `side="right"`
  - [x] Accept `invoiceId: Id<"invoices"> | null` and `open: boolean` props
  - [x] Implement `onOpenChange` callback for close handling

- [x] Task 3: Build drawer header section (AC: #1)
  - [x] Display invoice number prominently
  - [x] Display client name
  - [x] Add "Open full page" NavLink button to `/invoices/:id`
  - [x] Add close button (X icon)

- [x] Task 4: Implement status badges row (AC: #1)
  - [x] Create send status badge (pending = amber, sent = blue)
  - [x] Create payment status badge (unpaid = red, partial = amber, pending_payment = amber, paid = green)
  - [x] Create reminder status badge with step indicator (reminder_1 through reminder_4, manual_followup)

- [x] Task 5: Implement days overdue indicator (AC: #1)
  - [x] Calculate days overdue from `dueDate` vs today
  - [x] Display prominently with red styling if overdue
  - [x] Hide if invoice is paid or not yet overdue

- [x] Task 6: Build invoice details section (AC: #1)
  - [x] Display total amount (formatted in EUR)
  - [x] Display invoice date
  - [x] Display due date
  - [x] Display contact info (name, email, phone if available)

- [x] Task 7: Implement PDF preview/download (AC: #1)
  - [x] Use existing `api.invoices.getPdfUrl` query
  - [x] Show PDF icon with "View PDF" button
  - [x] Open PDF in new tab on click

- [x] Task 8: Integrate drawer into MainView (AC: #1)
  - [x] Add `selectedInvoiceForDrawer` state
  - [x] Change invoice row click to open drawer (not navigate)
  - [x] Render InvoiceDetailDrawer component

- [x] Task 9: Integrate drawer into FollowUp page (AC: #2)
  - [x] Add `selectedInvoiceForDrawer` state
  - [x] Make invoice reference links open drawer
  - [x] Render InvoiceDetailDrawer component

- [x] Task 10: Test and polish (AC: #1, #2, #3)
  - [x] Test keyboard navigation (Escape to close)
  - [x] Test click outside to close
  - [x] Test mobile responsiveness
  - [x] Verify drawer works on both pages

## Dev Notes

### Architecture Decisions

**Drawer vs Dialog:** Use Shadcn `Sheet` component (which is essentially a drawer) with `side="right"`. This preserves context (user can still see the list behind) unlike a full-screen Dialog.

**State Management Pattern:**
```tsx
// Parent component (MainView or FollowUp)
const [selectedInvoiceId, setSelectedInvoiceId] = useState<Id<"invoices"> | null>(null);

// Drawer is controlled by parent
<InvoiceDetailDrawer
  invoiceId={selectedInvoiceId}
  open={selectedInvoiceId !== null}
  onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
/>
```

**Data Fetching:** Use `useQuery` inside the drawer component with `invoiceId` as dependency. Convex handles caching automatically.

### Existing Patterns to Follow

**Status Badge Pattern (from InvoiceTableRow.tsx):**
```tsx
// Send status
sendStatus === "pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"

// Payment status
paymentStatus === "paid" ? "bg-green-100 text-green-700" :
paymentStatus === "unpaid" ? "bg-red-100 text-red-700" :
"bg-amber-100 text-amber-700"
```

**Currency Formatting:**
```tsx
amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
```

**Days Overdue Calculation:**
```tsx
const today = new Date();
const due = new Date(invoice.dueDate);
const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
```

**NavLink for Navigation (NOT button onClick):**
```tsx
import { NavLink } from "react-router-dom";
<NavLink to={`/invoices/${invoice._id}`} className="...">
  Ouvrir la page complète
</NavLink>
```

### Technical Requirements

**Convex Queries to Use:**
- `api.invoices.getById` - main invoice data
- `api.invoices.getPdfUrl` - PDF download URL

**Shadcn Components Needed:**
- `Sheet` (to install)
- `Badge` (already exists)
- `Button` (already exists)

### File Structure Requirements

```
src/components/
├── InvoiceDetailDrawer.tsx    # NEW: Main drawer component
└── ui/
    └── sheet.tsx              # NEW: Shadcn Sheet component
```

### Project Structure Notes

- All imports use `@/` alias (e.g., `@/components/ui/sheet`)
- Tailwind v4 with `@theme` directive in `src/index.css`
- Brand color: `brand-500` (#f97316 orange)
- Primary breakpoint: `md:` (768px)

### References

- [Source: DESIGN_GUIDELINES.md#shadcn-ui-component-system] - Component patterns
- [Source: docs/architecture.md#Frontend-Architecture] - State management (Convex hooks)
- [Source: docs/data-models.md#Invoices] - Invoice schema with 3D status
- [Source: src/components/mainView/InvoiceTableRow.tsx] - Status badge patterns
- [Source: src/pages/InvoiceDetail.tsx] - Existing detail view to reference

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No issues encountered during implementation.

### Completion Notes List

- Installed Shadcn Sheet component via `npx shadcn@latest add sheet`
- Created `InvoiceDetailDrawer.tsx` component with all required features:
  - Displays invoice number, client name, amount
  - Shows send status badge (A envoyer / Envoyee)
  - Shows payment status badge (Payee / Partielle / En attente / Non payee)
  - Shows reminder status badge (Relance 1-4 / Suivi manuel)
  - Displays days overdue prominently in red if applicable
  - Shows contact information (name, email, phone with clickable links)
  - Includes "View PDF" button that opens in new tab
  - Includes "Page complete" link to full invoice page
- Integrated drawer into MainView:
  - Added `onInvoiceClick` handler to InvoiceTableRow and InvoiceTableCard
  - Invoice number click now opens drawer instead of navigating
  - Full page navigation still available via dropdown menu
- Integrated drawer into FollowUp page:
  - Modified ReminderCard to use button instead of link for invoice reference
  - Modified EventCard in EventTimeline to use button for invoice reference
  - Both reminder cards and event cards now open drawer on click
- Keyboard navigation (Escape) and click-outside-to-close work automatically via Radix Dialog

### File List

- src/components/ui/sheet.tsx (NEW)
- src/components/InvoiceDetailDrawer.tsx (NEW)
- src/components/mainView/InvoiceTableRow.tsx (MODIFIED)
- src/components/mainView/InvoiceTableCard.tsx (MODIFIED)
- src/pages/MainView.tsx (MODIFIED) - Added @convex alias imports, strict typing
- src/pages/FollowUp.tsx (MODIFIED) - Added @convex alias imports, strict typing, removed dead code
- src/index.css (MODIFIED) - Added tailwindcss-animate plugin, excluded BMAD folders from Tailwind scanning
- package.json (MODIFIED) - Added tailwindcss-animate dependency, vite preview script
- vite.config.ts (MODIFIED) - Added @convex alias for cleaner imports

## Change Log

- 2026-01-12: Story implementation completed - All 10 tasks done. Invoice detail drawer now accessible from both /invoices and /follow-up pages.
- 2026-01-12: Code review fixes (round 1) - Fixed amount display (show amountTTC instead of outstandingBalance), added tailwindcss-animate plugin, removed dead code (getDefaultEventDescription), excluded BMAD folders from Tailwind scanning to fix build warning.
- 2026-01-12: Code review fixes (round 2) - Added @convex alias in vite.config.ts, updated all Convex imports to use alias, added strict TypeScript types (UpcomingReminder, Invoice), fixed redundant daysOverdue condition, added fallback for missing invoice amount in ReminderCard.
