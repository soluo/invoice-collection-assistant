# Story 1.4: Edit Due Date Action

Status: review

## Story

As a **user (technician or admin)**,
I want **to edit the due date of an invoice from the drawer**,
So that **I can adjust payment terms based on client agreements or corrections**.

## Acceptance Criteria

1. **Given** I have the invoice detail drawer open
   **When** I click on the "Reporter l'échéance" action
   **Then** a modal appears with a date picker for the new due date
   **And** I can see the current due date displayed
   **And** I can optionally add a reason for the change

2. **Given** the date picker modal is open
   **When** I select a new date and confirm
   **Then** the due date is updated
   **And** the days overdue indicator recalculates accordingly
   **And** reminder scheduling adjusts to the new due date
   **And** a success toast notification appears

3. **Given** I change the due date to a future date
   **When** the invoice was previously overdue
   **Then** the days overdue indicator disappears or shows the new remaining days

4. **Given** the drawer is open
   **When** I view the action buttons
   **Then** I see contextual primary actions based on invoice state
   **And** secondary actions are grouped in a "Plus" dropdown menu

## Tasks / Subtasks

- [x] Task 1: Refactor action buttons with state-based logic (AC: #4)
  - [x] Create helper function `getPrimaryActions(invoice)` returning action config
  - [x] Create helper function `getSecondaryActions(invoice)` for dropdown items
  - [x] Implement state-based logic (see Dev Notes for matrix)
  - [x] Add `isInvoiceOlderThanDays(invoice, days)` utility function (not needed - logic integrated directly)

- [x] Task 2: Add DropdownMenu for secondary actions (AC: #4)
  - [x] Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem` from Shadcn
  - [x] Add "Plus" button with `MoreHorizontal` icon as trigger
  - [x] Render secondary actions as menu items
  - [x] Handle click events to open respective modals

- [x] Task 3: Integrate SnoozeInvoiceModal in drawer (AC: #1, #2, #3)
  - [x] Import existing `SnoozeInvoiceModal` component
  - [x] Add state: `showSnoozeModal: boolean`
  - [x] Wire up modal open/close
  - [x] Modal handles mutation and toast (already implemented)

- [x] Task 4: Test all invoice states (AC: #1-4)
  - [x] Test pending invoice < 7 days old
  - [x] Test pending invoice >= 7 days old
  - [x] Test sent but unpaid invoice
  - [x] Test paid invoice
  - [x] Verify dropdown shows correct secondary actions per state
  - [x] Run `pnpm lint` to validate

## Dev Notes

### CRITICAL: SnoozeInvoiceModal Already Exists

**This is primarily a UI REFACTORING task.** The heavy lifting is done:

1. **Backend mutation exists:** `api.invoices.snooze` (convex/invoices.ts:638-684)
   - Takes `invoiceId`, `newDueDate` (YYYY-MM-DD), optional `reason`
   - Updates `dueDate` field
   - Creates a note with the reschedule reason automatically
   - Handles permissions via `assertCanModifyInvoice`

2. **Modal component exists:** `src/components/SnoozeInvoiceModal.tsx`
   - Props: `invoiceId`, `invoiceNumber`, `currentDueDate`, `onClose`
   - Validates date is in future
   - Shows current due date for reference
   - Optional reason textarea
   - Toast notifications on success/error

3. **Usage in InvoiceDetail.tsx:** Lines 224-231, 426-432
   - Button "Reporter l'échéance" with Calendar icon
   - State `isSnoozeModalOpen`
   - Already working pattern to replicate

### State-Based Action Matrix

```typescript
// Primary actions (visible buttons)
// Secondary actions (in dropdown)

interface ActionConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: "default" | "outline";
}

const getActionsForState = (invoice: Invoice) => {
  const primary: ActionConfig[] = [];
  const secondary: ActionConfig[] = [];

  // Determine invoice age
  const invoiceAgeInDays = Math.floor(
    (Date.now() - new Date(invoice.invoiceDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const isOlderThan7Days = invoiceAgeInDays >= 7;

  if (invoice.paymentStatus === "paid") {
    // PAID: Primary = View PDF
    if (pdfUrl) primary.push({ key: "pdf", label: "Voir le PDF", icon: FileText, ... });
    secondary.push({ key: "edit", label: "Modifier", icon: Pencil, ... });

  } else if (invoice.sendStatus === "sent") {
    // SENT BUT UNPAID: Primary = Record Payment + Snooze
    primary.push({ key: "payment", label: "Enregistrer paiement", icon: CreditCard, ... }); // Story 1.5
    primary.push({ key: "snooze", label: "Reporter échéance", icon: Calendar, ... });
    secondary.push({ key: "edit", label: "Modifier", icon: Pencil, ... });
    if (pdfUrl) secondary.push({ key: "pdf", label: "Voir le PDF", icon: FileText, ... });
    if (!invoice.pdfStorageId) secondary.push({ key: "attachPdf", label: "Ajouter PDF", icon: Upload, ... });

  } else {
    // NOT SENT: Primary = Mark as sent (or Send if < 7 days - Story 7.1)
    // For now, always "Marquer comme envoyée" until Story 7.1 implements "Envoyer"
    primary.push({ key: "markSent", label: "Marquer envoyée", icon: Send, ... });
    secondary.push({ key: "edit", label: "Modifier", icon: Pencil, ... });
    if (!invoice.pdfStorageId) secondary.push({ key: "attachPdf", label: "Ajouter PDF", icon: Upload, ... });
  }

  return { primary, secondary };
};
```

### Visual Layout in Drawer

**Before (current):**
```
[Marquer envoyée] [Voir PDF] [Modifier] [Ajouter PDF]
```

**After (new):**
```
// Paid invoice:
[Voir le PDF] [⋮]
              └─ Modifier

// Sent, unpaid invoice:
[Enregistrer paiement*] [Reporter échéance] [⋮]
                                            ├─ Modifier
                                            ├─ Voir le PDF
                                            └─ Ajouter PDF

// Not sent invoice:
[Marquer envoyée] [⋮]
                  ├─ Modifier
                  └─ Ajouter PDF

* "Enregistrer paiement" will be added in Story 1.5
```

### Implementation Pattern for Dropdown

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

// In JSX:
{secondaryActions.length > 0 && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">Plus d'actions</span>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {secondaryActions.map((action) => (
        <DropdownMenuItem key={action.key} onClick={action.onClick}>
          <action.icon className="h-4 w-4 mr-2" />
          {action.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

### Files to Modify

- `src/components/InvoiceDetailDrawer.tsx` - Refactor actions, add dropdown, add snooze modal

### Files to Import (existing)

- `src/components/SnoozeInvoiceModal.tsx` - Existing modal
- `src/components/ui/dropdown-menu.tsx` - Shadcn dropdown (already installed)
- `lucide-react` - `MoreHorizontal`, `Calendar`, `CreditCard` icons

### No New Files Required

### Project Structure Notes

- All imports use `@/` alias
- Convex imports use `@convex/_generated/api`
- Toast notifications use `sonner` library
- Tailwind v4 with brand color `brand-500` (#f97316)
- DropdownMenu component already available in `src/components/ui/dropdown-menu.tsx`

### References

- [Source: convex/invoices.ts:638-684] - `snooze` mutation
- [Source: src/components/SnoozeInvoiceModal.tsx] - Complete modal component
- [Source: src/pages/InvoiceDetail.tsx:224-231] - Button usage pattern
- [Source: src/pages/InvoiceDetail.tsx:426-432] - Modal integration pattern
- [Source: src/components/InvoiceDetailDrawer.tsx:219-271] - Current action buttons section
- [Source: src/components/ui/dropdown-menu.tsx] - Shadcn dropdown component

### Dependencies

**Already installed:**
- `sonner` - Toast notifications
- `lucide-react` - Icons (MoreHorizontal, Calendar, CreditCard)
- Shadcn `DropdownMenu` component
- Shadcn `Button` component

No new dependencies required.

### Previous Story Intelligence

**From Story 1.3 Implementation:**
- Drawer uses conditional rendering based on invoice state
- Modals rendered outside Sheet for proper z-index
- Toast pattern: `toast.success()` / `toast.error()`
- Real-time updates via Convex - no manual refresh needed

**From Story 6.3 Implementation:**
- InvoiceEditModal already integrated in drawer
- State pattern: `showEditModal` boolean
- Button placement in action bar section

### Git Intelligence

**Recent commits:**
- `b3fc918 refactor: code review fixes + add edit action to invoice list menu`
- `6a45f2a feat: implement filtered history on follow-up page (story 6.4)`
- `63c0418 feat: implement invoice edit and PDF attachment (story 6.3)`

**Patterns established:**
- Action buttons use `variant="outline" size="sm"`
- Icons with `className="h-4 w-4 mr-2"`
- Modals use controlled open state

### Future Story Considerations

- **Story 1.5 (Record Payment):** Will add "Enregistrer paiement" button - this story prepares the structure
- **Story 7.1 (Send Invoice):** Will add "Envoyer" action for invoices < 7 days - placeholder logic ready

### Testing Checklist

1. [ ] Open drawer for **paid** invoice → "Voir le PDF" primary, "Modifier" in dropdown
2. [ ] Open drawer for **sent, unpaid** invoice → "Reporter échéance" primary, others in dropdown
3. [ ] Open drawer for **not sent** invoice → "Marquer envoyée" primary, others in dropdown
4. [ ] Click "Reporter échéance" → SnoozeInvoiceModal opens
5. [ ] Select future date, confirm → Due date updates, toast appears
6. [ ] Select past date → Error toast "La nouvelle échéance doit être dans le futur"
7. [ ] Verify days overdue recalculates after due date change
8. [ ] Dropdown menu opens/closes correctly
9. [ ] All dropdown actions work (Modifier, Voir PDF, Ajouter PDF)
10. [ ] Run `pnpm lint` - No errors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None required - implementation was straightforward.

### Completion Notes List

- Refactored action buttons in `InvoiceDetailDrawer.tsx` to use state-based logic
- Created `ActionConfig` interface for type-safe action configuration
- Implemented `getPrimaryActions()` and `getSecondaryActions()` helper functions
- Added DropdownMenu for secondary actions with proper Shadcn components
- Integrated existing `SnoozeInvoiceModal` component for due date editing
- All acceptance criteria satisfied:
  - AC#1: "Reporter échéance" action opens modal with date picker and optional reason ✓
  - AC#2: Due date update triggers recalculation (handled by Convex reactivity) ✓
  - AC#3: Days overdue indicator updates automatically via Convex real-time ✓
  - AC#4: State-based primary/secondary actions with dropdown menu ✓
- Added 16 unit tests in `convex/snooze.test.ts`:
  - Permission tests via canModifyInvoice (6 tests)
  - Days overdue calculation tests (5 tests)
  - State-based action visibility tests (4 tests)
- All 53 project tests pass
- `pnpm lint` passes successfully

### Change Log

- 2026-01-15: Implemented story 1.4 - Edit Due Date Action with state-based action buttons and dropdown menu
- 2026-01-15: Added unit tests for snooze permissions, days overdue calculation, and action visibility
- 2026-01-15: Fixed nested modal issue - Refactored SnoozeInvoiceModal to use Shadcn Dialog component (proper portaling and event isolation)

### File List

- `src/components/InvoiceDetailDrawer.tsx` - Modified: refactored action buttons, added DropdownMenu, integrated SnoozeInvoiceModal
- `src/components/SnoozeInvoiceModal.tsx` - Modified: refactored to use Shadcn Dialog for proper nested modal handling
- `convex/snooze.test.ts` - Created: 16 unit tests for snooze functionality
