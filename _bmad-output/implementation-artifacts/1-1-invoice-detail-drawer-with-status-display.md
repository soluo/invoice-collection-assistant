# Story 1.1: Invoice Detail Drawer with Status Display

Status: ready-for-dev

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

- [ ] Task 1: Install and configure Shadcn Sheet component (AC: #1)
  - [ ] Run `npx shadcn@latest add sheet` to add the component
  - [ ] Verify component works with project's Tailwind v4 setup

- [ ] Task 2: Create InvoiceDetailDrawer component (AC: #1, #2, #3)
  - [ ] Create `/src/components/InvoiceDetailDrawer.tsx`
  - [ ] Use Sheet component with `side="right"`
  - [ ] Accept `invoiceId: Id<"invoices"> | null` and `open: boolean` props
  - [ ] Implement `onOpenChange` callback for close handling

- [ ] Task 3: Build drawer header section (AC: #1)
  - [ ] Display invoice number prominently
  - [ ] Display client name
  - [ ] Add "Open full page" NavLink button to `/invoices/:id`
  - [ ] Add close button (X icon)

- [ ] Task 4: Implement status badges row (AC: #1)
  - [ ] Create send status badge (pending = amber, sent = blue)
  - [ ] Create payment status badge (unpaid = red, partial = amber, pending_payment = amber, paid = green)
  - [ ] Create reminder status badge with step indicator (reminder_1 through reminder_4, manual_followup)

- [ ] Task 5: Implement days overdue indicator (AC: #1)
  - [ ] Calculate days overdue from `dueDate` vs today
  - [ ] Display prominently with red styling if overdue
  - [ ] Hide if invoice is paid or not yet overdue

- [ ] Task 6: Build invoice details section (AC: #1)
  - [ ] Display total amount (formatted in EUR)
  - [ ] Display invoice date
  - [ ] Display due date
  - [ ] Display contact info (name, email, phone if available)

- [ ] Task 7: Implement PDF preview/download (AC: #1)
  - [ ] Use existing `api.invoices.getPdfUrl` query
  - [ ] Show PDF icon with "View PDF" button
  - [ ] Open PDF in new tab on click

- [ ] Task 8: Integrate drawer into MainView (AC: #1)
  - [ ] Add `selectedInvoiceForDrawer` state
  - [ ] Change invoice row click to open drawer (not navigate)
  - [ ] Render InvoiceDetailDrawer component

- [ ] Task 9: Integrate drawer into FollowUp page (AC: #2)
  - [ ] Add `selectedInvoiceForDrawer` state
  - [ ] Make invoice reference links open drawer
  - [ ] Render InvoiceDetailDrawer component

- [ ] Task 10: Test and polish (AC: #1, #2, #3)
  - [ ] Test keyboard navigation (Escape to close)
  - [ ] Test click outside to close
  - [ ] Test mobile responsiveness
  - [ ] Verify drawer works on both pages

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

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

