# Story 1.5: Record Payment Actions

Status: ready-for-dev

## Story

As a **user (technician or admin)**,
I want **to record one or more payments (bank transfer or checks) for an invoice**,
So that **I can track payments received and the system stops unnecessary reminders**.

## Acceptance Criteria

1. **Given** I am viewing an unpaid invoice (drawer, detail page, or invoice list)
   **When** I click "Enregistrer paiement"
   **Then** a dialog opens with payment type options (Virement bancaire / Chèque)

2. **Given** I select "Virement bancaire"
   **When** the dialog form appears
   **Then** the payment date is pre-filled with today's date (modifiable)
   **And** the amount is pre-filled with the remaining balance
   **And** I can modify the amount if needed (partial payment)

3. **Given** I confirm a bank transfer payment
   **When** the payment is saved
   **Then** the payment is recorded with status "received"
   **And** the invoice payment status updates (partial if remaining > 0, paid if remaining = 0)
   **And** reminders stop if fully paid
   **And** a success toast notification appears

4. **Given** I select "Chèque"
   **When** the dialog form appears
   **Then** I must enter the check amount
   **And** I must enter the check issue date (date d'émission)
   **And** I must enter the expected deposit date (date d'encaissement souhaitée)
   **And** the expiration date is displayed (issue date + 1 year + 8 days)

5. **Given** I confirm a check payment
   **When** the payment is saved
   **Then** the check is recorded with status "received" (payment considered complete)
   **And** the invoice payment status updates accordingly (partial or paid)
   **And** the check issue date is stored for expiration tracking

6. **Given** I have recorded a payment and there is still a remaining balance
   **When** the success state appears
   **Then** I am offered to add another payment immediately
   **And** I can add multiple payments in sequence

7. **Given** payments exist for an invoice
   **When** I view the drawer or detail page
   **Then** I see the remaining balance clearly displayed
   **And** I see a summary of recorded payments

8. **Given** the action is triggered from the invoice list
   **When** I click the quick action button
   **Then** the same RecordPaymentModal opens
   **And** the flow is identical to drawer/detail page

## Tasks / Subtasks

- [ ] Task 1: Update payments schema for check handling
  - [ ] Add `checkIssueDate: v.optional(v.string())` to payments table
  - [ ] Update `recordPayment` mutation to accept and store check issue date
  - [ ] Remove "pending" status logic for checks (always "received")

- [ ] Task 2: Create RecordPaymentModal component (AC: #1, #2, #4)
  - [ ] Create new file `src/components/RecordPaymentModal.tsx`
  - [ ] Implement Dialog with payment type selection (virement/chèque)
  - [ ] Implement bank transfer form with pre-filled date and amount
  - [ ] Implement check form with amount, issue date, and expected deposit date
  - [ ] Display calculated expiration date (issue date + 1 year + 8 days)

- [ ] Task 3: Handle multi-payment workflow (AC: #6)
  - [ ] After saving a payment, show remaining balance
  - [ ] Offer "Ajouter un autre paiement" button if balance > 0
  - [ ] Allow sequential payment addition

- [ ] Task 4: Integrate modal in InvoiceDetailDrawer (AC: #1, #7)
  - [ ] Add state: `showRecordPaymentModal: boolean`
  - [ ] Add "Enregistrer paiement" button to primary actions
  - [ ] Pass remaining balance to modal

- [ ] Task 5: Integrate modal in InvoiceDetails page (AC: #1)
  - [ ] Add "Enregistrer paiement" button in actions section
  - [ ] Reuse same RecordPaymentModal component

- [ ] Task 6: Add quick action in invoice list (AC: #8)
  - [ ] Add payment action button/icon in InvoicesTable row actions
  - [ ] Open RecordPaymentModal with invoice context

- [ ] Task 7: Display payment history (AC: #7)
  - [ ] Create PaymentHistorySection component (or add to existing sections)
  - [ ] Show list of payments with type, amount, date
  - [ ] For checks: show issue date, expected deposit date, and expiration date

- [ ] Task 8: Validate and test (AC: #3, #5)
  - [ ] Test bank transfer flow - verify status updates
  - [ ] Test check flow - verify issue date stored, status = "received"
  - [ ] Test multiple payments - verify totals
  - [ ] Test from all 3 entry points (drawer, detail, list)
  - [ ] Run `pnpm lint` to validate

## Dev Notes

### CRITICAL: Business Logic for Checks

**Chèque = paiement effectué immédiatement** (pas "en attente")

Raison métier : Si on présente un chèque à l'encaissement et qu'il est refusé, le client final risque une interdiction bancaire. On préfère donc considérer le chèque comme paiement reçu et gérer l'expiration séparément.

**Règles chèques :**
- Chèque reçu → status = "received" (pas "pending")
- Stocker `checkIssueDate` (date d'émission)
- Stocker `expectedDepositDate` (date d'encaissement souhaitée)
- Expiration = date d'émission + 1 an + 8 jours
- Relance 3 mois avant expiration (Epic 8 - story séparée)

### Schema Update Required

Add to `convex/schema.ts` payments table:

```typescript
payments: defineTable({
  // ... existing fields ...

  // Check-specific fields
  checkIssueDate: v.optional(v.string()), // Date d'émission du chèque (YYYY-MM-DD)
  // Note: expectedDepositDate already exists in schema - keep it for checks
})
```

**Note:** `expectedDepositDate` exists already in schema - use it for the desired deposit date.

### Backend Mutation Update

Update `convex/payments.ts` recordPayment mutation args:

```typescript
payments: v.array(
  v.object({
    type: v.union(v.literal("bank_transfer"), v.literal("check")),
    amount: v.number(),
    receivedDate: v.optional(v.string()), // For bank_transfer
    checkIssueDate: v.optional(v.string()), // For checks: date d'émission
    expectedDepositDate: v.optional(v.string()), // For checks: date d'encaissement souhaitée
    notes: v.optional(v.string()),
  })
),
```

**Key change:** Remove all "pending" status logic for checks. All payments are "received".

### Three Entry Points

| Location | File | Where to Add |
|----------|------|--------------|
| InvoiceDetailDrawer | `src/components/InvoiceDetailDrawer.tsx` | getPrimaryActions() |
| InvoiceDetails page | `src/pages/InvoiceDetails.tsx` | Actions section |
| InvoicesTable list | `src/components/InvoicesTable.tsx` | Row actions dropdown |

### Query for Remaining Balance

The `api.invoices.getById` query already returns `outstandingBalance` and `hasPartialPayment`:

```typescript
// Already displayed in InvoiceDetailDrawer.tsx:428-432
{invoice.hasPartialPayment && invoice.outstandingBalance > 0 && (
  <p className="text-sm text-amber-600 font-medium">
    Solde restant : {formatCurrency(invoice.outstandingBalance)}
  </p>
)}
```

### UI Pattern from Story 1.4

Follow the established pattern from SnoozeInvoiceModal:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

### RecordPaymentModal Props Interface

```typescript
interface RecordPaymentModalProps {
  invoiceId: Id<"invoices">;
  invoiceNumber: string;
  amountTTC: number;
  outstandingBalance: number;
  onClose: () => void;
}
```

### Check Expiration Display

```tsx
// Calculate expiration: issue date + 1 year + 8 days
const checkExpirationDate = checkIssueDate
  ? addDays(addYears(new Date(checkIssueDate), 1), 8)
  : null;

{checkIssueDate && (
  <p className="text-sm text-gray-500">
    Expire le : {format(checkExpirationDate, "d MMMM yyyy", { locale: fr })}
  </p>
)}
```

Import: `import { addYears, addDays, format } from "date-fns";`

### Multi-Payment Flow

After successful payment, if remaining balance > 0:

```tsx
{showSuccessState && remainingBalance > 0 && (
  <div className="space-y-4 text-center py-4">
    <div className="text-green-600">
      <CheckCircle className="h-12 w-12 mx-auto mb-2" />
      <p className="font-medium">Paiement enregistré !</p>
    </div>
    <p className="text-gray-600">
      Solde restant : {formatCurrency(remainingBalance)}
    </p>
    <div className="flex gap-2 justify-center">
      <Button variant="outline" onClick={handleAddAnother}>
        Ajouter un autre paiement
      </Button>
      <Button onClick={onClose}>
        Terminé
      </Button>
    </div>
  </div>
)}
```

### Payment Type Selection UI

```tsx
<RadioGroup value={paymentType} onValueChange={setPaymentType} className="space-y-3">
  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
    <RadioGroupItem value="bank_transfer" id="bank_transfer" />
    <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
      <span className="font-medium">Virement bancaire</span>
      <span className="block text-sm text-gray-500">Paiement reçu sur le compte</span>
    </Label>
  </div>
  <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
    <RadioGroupItem value="check" id="check" />
    <Label htmlFor="check" className="flex-1 cursor-pointer">
      <span className="font-medium">Chèque</span>
      <span className="block text-sm text-gray-500">Chèque reçu (validité 1 an)</span>
    </Label>
  </div>
</RadioGroup>
```

### Files to Create

1. `src/components/RecordPaymentModal.tsx` - Full payment recording modal

### Files to Modify

1. `convex/schema.ts` - Add `checkIssueDate` to payments table
2. `convex/payments.ts` - Update mutation args and remove pending logic
3. `src/components/InvoiceDetailDrawer.tsx` - Add button + modal
4. `src/pages/InvoiceDetails.tsx` - Add button + modal
5. `src/components/InvoicesTable.tsx` - Add quick action

### Files to Reference

- `src/components/SnoozeInvoiceModal.tsx` - Dialog pattern, Calendar, form structure
- `convex/payments.ts` - Current mutation (to update)
- `convex/schema.ts:226-251` - Payments table schema

### Dependencies (All Already Installed)

- `sonner` - Toast notifications
- `date-fns` - Date formatting with `fr` locale, `addYears`, `addDays` functions
- `lucide-react` - CreditCard, Calendar, CheckCircle icons
- Shadcn: Dialog, RadioGroup, Input, Label, Button, Calendar, Popover

### Previous Story Intelligence

**From Story 1.4 Implementation:**
- Drawer uses conditional rendering based on invoice state
- Modals rendered outside Sheet for proper z-index
- Toast pattern: `toast.success()` / `toast.error()`
- Real-time updates via Convex - no manual refresh needed
- State-based action buttons with getPrimaryActions/getSecondaryActions pattern

### Note on Check Expiration Reminders

The automatic reminder system for checks approaching expiration (3 months before) is planned for **Epic 8: Gestion Chèques Avancée** (story 8-2-relance-peremption-cheques). This story only handles:
- Recording the check with its issue date
- Displaying the expiration date in the UI

### Testing Checklist

1. [ ] **Schema:** `checkIssueDate` field added to payments table
2. [ ] **Mutation:** recordPayment accepts checkIssueDate, always sets status="received"
3. [ ] **Drawer:** "Enregistrer paiement" button visible for unpaid sent invoices
4. [ ] **Detail page:** Same button available
5. [ ] **List:** Quick action available in row dropdown
6. [ ] **Bank transfer:** Date pre-filled, amount = remaining, submit works
7. [ ] **Check:** Issue date required, expiration displayed, submit works
8. [ ] **Partial payment:** Status = "partial", remaining balance shown
9. [ ] **Full payment:** Status = "paid", reminders stop
10. [ ] **Multi-payment:** "Ajouter un autre" flow works
11. [ ] **Run `pnpm lint`** - No errors

### References

- [Source: convex/payments.ts:123-252] - `recordPayment` mutation (to update)
- [Source: convex/schema.ts:226-251] - Payments table schema (to update)
- [Source: src/components/InvoiceDetailDrawer.tsx:127-135] - Where to add button
- [Source: src/components/SnoozeInvoiceModal.tsx] - Modal pattern to follow
- [Source: convex/invoices.ts:getById] - Returns outstandingBalance

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

