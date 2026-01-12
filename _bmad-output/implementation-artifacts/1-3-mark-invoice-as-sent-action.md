# Story 1.3: Mark Invoice as Sent Action

Status: ready-for-dev

## Story

As a **user (technician or admin)**,
I want **to mark an unsent invoice as sent with a specific date**,
So that **I can track when the invoice was delivered to the client and start the payment due period**.

## Acceptance Criteria

1. **Given** I have the invoice detail drawer open
   **And** the invoice send status is "pending"
   **When** I click the "Mark as sent" action button
   **Then** a popover or modal appears asking for the sent date
   **And** the date defaults to today

2. **Given** the mark as sent dialog is open
   **When** I select a date and confirm
   **Then** the invoice send status updates to "sent"
   **And** the sent date is recorded
   **And** the drawer refreshes to show the updated status
   **And** a success toast notification appears

3. **Given** the invoice is already marked as sent
   **When** I view the drawer
   **Then** the "Mark as sent" action is not visible
   **And** I can see the sent date in the invoice details

## Tasks / Subtasks

- [ ] Task 1: Add "Mark as sent" action button in drawer (AC: #1, #3)
  - [ ] Add button below PDF section, inside a new "Actions" section
  - [ ] Conditionally render only when `invoice.sendStatus === "pending"`
  - [ ] Use Lucide `Send` icon with "Marquer comme envoyee" label
  - [ ] Style: `variant="outline"` with full width like PDF button

- [ ] Task 2: Integrate MarkAsSentModal into drawer (AC: #1, #2)
  - [ ] Import existing `MarkAsSentModal` component
  - [ ] Add state: `showMarkAsSentModal: boolean`
  - [ ] On button click, open modal with `defaultDate={invoice.invoiceDate}`
  - [ ] Handle confirm: call `markAsSent` mutation with invoiceId and selected date

- [ ] Task 3: Handle mutation and feedback (AC: #2)
  - [ ] Use `useMutation(api.invoices.markAsSent)`
  - [ ] On success: close modal, show toast "Facture marquee comme envoyee"
  - [ ] On error: show toast with error message
  - [ ] Drawer auto-refreshes via Convex real-time (no manual refresh needed)

- [ ] Task 4: Display sent date when invoice is sent (AC: #3)
  - [ ] Add conditional display of "Date d'envoi" after invoice date
  - [ ] Show `formatDate(invoice.sentDate)` when sendStatus is "sent"
  - [ ] Use same date format as other dates in drawer

- [ ] Task 5: Test and polish (AC: #1, #2, #3)
  - [ ] Test with pending invoice - button should appear
  - [ ] Test with sent invoice - button should NOT appear
  - [ ] Test modal date selection and confirmation
  - [ ] Verify real-time update after marking as sent
  - [ ] Run `pnpm lint` to validate

## Dev Notes

### CRITICAL: Backend and Modal Already Exist

**This story is an INTEGRATION task, not a creation task. All heavy lifting is already done:**

1. **Backend mutation exists:** `api.invoices.markAsSent` (convex/invoices.ts:345-377)
   - Takes `invoiceId` and optional `sentDate` (YYYY-MM-DD format)
   - Updates `sendStatus` to "sent" and records `sentDate`
   - Creates `invoice_marked_sent` event automatically
   - Handles permissions via `assertCanUpdateInvoiceStatus`

2. **Modal component exists:** `src/components/MarkAsSentModal.tsx`
   - Props: `isOpen`, `onClose`, `onConfirm(date: string)`, `defaultDate`
   - Shows calendar picker with date constraints
   - Min date = invoice date, Max date = today
   - Returns YYYY-MM-DD format string

3. **Usage pattern exists:** `src/components/InvoicesList.tsx:47-106`
   - Example of mutation usage with modal
   - Toast notifications pattern
   - State management pattern

### Implementation Approach

**DO NOT reinvent the wheel.** Simply:
1. Import existing `MarkAsSentModal`
2. Add state and button in drawer
3. Wire up the existing mutation
4. Handle success/error toasts

### Visual Placement in Drawer

```
[Header: Invoice #, Client, Badges]
[Days Overdue Alert if applicable]
[Amount Section]
[Dates Section]
[Contact Section]
[PDF Button]

=== NEW ACTIONS SECTION ===
[Mark as Sent Button] <-- Only if sendStatus === "pending"
===========================

[Reminder History]
[Full Page Link]
```

### Conditional Button Logic

```tsx
// Button should only appear when:
// 1. Invoice is loaded (invoice !== null && invoice !== undefined)
// 2. Send status is "pending"
{invoice.sendStatus === "pending" && (
  <Button
    variant="outline"
    className="w-full"
    onClick={() => setShowMarkAsSentModal(true)}
  >
    <Send className="h-4 w-4 mr-2" />
    Marquer comme envoyee
  </Button>
)}
```

### Sent Date Display

```tsx
// Show sent date when invoice has been sent
{invoice.sendStatus === "sent" && invoice.sentDate && (
  <div className="space-y-1">
    <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
      <Send className="h-4 w-4" />
      Date d'envoi
    </p>
    <p className="text-gray-900">{formatDate(invoice.sentDate)}</p>
  </div>
)}
```

### Architecture Alignment

**Files to modify:**
- `src/components/InvoiceDetailDrawer.tsx` - Add button, modal state, mutation

**Files to import (existing):**
- `src/components/MarkAsSentModal.tsx` - Existing modal component
- `@convex/_generated/api` - For `api.invoices.markAsSent`
- `lucide-react` - For `Send` icon

**No new files required.**

### Code Patterns from Previous Stories

**From InvoiceDetailDrawer.tsx:**
```tsx
// Date formatting (reuse existing formatDate function)
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// Section styling pattern
<div className="pt-4 border-t">
  <Button variant="outline" className="w-full">...</Button>
</div>
```

**From InvoicesList.tsx (modal usage pattern):**
```tsx
const markAsSent = useMutation(api.invoices.markAsSent);
const [markAsSentModal, setMarkAsSentModal] = useState<boolean>(false);

const handleConfirmMarkAsSent = async (sentDate: string) => {
  try {
    await markAsSent({
      invoiceId: invoice._id,
      sentDate
    });
    toast.success("Facture marquee comme envoyee");
    setMarkAsSentModal(false);
  } catch (error: any) {
    toast.error(error.message || "Erreur lors de la mise a jour");
  }
};
```

### Technical Requirements

**Imports needed:**
```tsx
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { MarkAsSentModal } from "@/components/MarkAsSentModal";
```

**State to add:**
```tsx
const [showMarkAsSentModal, setShowMarkAsSentModal] = useState(false);
```

**Mutation setup:**
```tsx
const markAsSent = useMutation(api.invoices.markAsSent);
```

### Project Structure Notes

- All imports use `@/` alias (e.g., `@/components/MarkAsSentModal`)
- Convex imports use `@convex/_generated/api` (alias configured in vite.config.ts)
- Toast notifications use `sonner` library (already installed)
- Tailwind v4 with brand color `brand-500` (#f97316 orange)

### References

- [Source: convex/invoices.ts:345-377] - `markAsSent` mutation
- [Source: src/components/MarkAsSentModal.tsx] - Complete modal component
- [Source: src/components/InvoicesList.tsx:47-106] - Usage pattern with toast
- [Source: src/components/InvoiceDetailDrawer.tsx] - Target file for modification
- [Source: convex/schema.ts:94-98] - sendStatus field definition
- [Source: DESIGN_GUIDELINES.md#component-patterns] - Button styling

### Dependencies

**Already installed:**
- `sonner` - For toast notifications
- `lucide-react` - For icons
- Shadcn `Button` component
- Shadcn `Dialog` component (used by MarkAsSentModal)
- Shadcn `Calendar` component (used by MarkAsSentModal)

No new dependencies required.

### Previous Story Intelligence

**From Story 1.2 Implementation:**
- Drawer uses `useQuery` with conditional skip pattern
- Loading state: spinner with `animate-spin border-brand-500`
- Sections separated by `pt-4 border-t`
- Full-width buttons use `className="w-full"`
- ReminderHistorySection placed after PDF button

**Key learning:** Convex real-time handles drawer refresh automatically when invoice is updated - no manual refetch needed.

### Git Intelligence

**Recent commits:**
- `b5bb2d7 review: complete story 1.2 code review`
- `82cef9e feat: add reminder history section in invoice drawer (story 1.2)`
- `b93b5b7 feat: implement invoice detail drawer (story 1.1)`

**Files recently modified:**
- `src/components/InvoiceDetailDrawer.tsx` - Will be modified again
- `src/components/ReminderHistorySection.tsx` - Created in 1.2

### Testing Checklist

1. [ ] Open drawer for invoice with `sendStatus: "pending"` - "Marquer comme envoyee" button visible
2. [ ] Open drawer for invoice with `sendStatus: "sent"` - Button NOT visible, sent date shown
3. [ ] Click button - Modal opens with calendar
4. [ ] Select date and confirm - Invoice status updates, toast appears
5. [ ] Drawer automatically shows updated status (no refresh needed)
6. [ ] Cancel modal - No changes made
7. [ ] Run `pnpm lint` - No errors

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
