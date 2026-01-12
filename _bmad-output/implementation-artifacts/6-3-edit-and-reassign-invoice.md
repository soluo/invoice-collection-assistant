# Story 6.3: Modifier et Ré-associer une Facture

Status: ready-for-dev

## Story

As a **user (technician or admin)**,
I want **to edit invoice details and reassign an invoice to another technician (admin only)**,
So that **I can correct mistakes or transfer responsibility when needed**.

## Acceptance Criteria

### AC1: Edit Button Available for Unpaid Invoices
**Given** I have the invoice detail drawer open
**And** the invoice is NOT marked as paid (paymentStatus !== "paid")
**When** I look at the action buttons
**Then** I see a "Modifier" (Edit) button
**And** clicking it opens the InvoiceEditModal

### AC2: Edit Modal with Invoice Fields
**Given** I am editing an invoice (technician or admin)
**When** the edit modal opens
**Then** I can modify: client name, contact info (name, email, phone), invoice number, amount, invoice date, due date
**And** all fields are pre-filled with current invoice values
**And** validation ensures required fields (clientName, invoiceNumber, amountTTC) are provided

### AC3: Admin-Only Reassignment
**Given** I am an **admin** editing an invoice
**When** I look at the edit options
**Then** I see a dropdown to reassign the invoice to another technician
**And** the dropdown lists all users in my organization with their role indicator
**And** selecting a technician updates the invoice ownership (createdBy and userId)

### AC4: Technician Cannot Reassign
**Given** I am a **technician** editing my invoice
**When** the edit modal opens
**Then** I do NOT see the reassignment dropdown
**And** I can only modify the other invoice fields (client, amount, dates, etc.)

### AC5: No Edit for Paid Invoices
**Given** an invoice is marked as paid (paymentStatus === "paid")
**When** I view the invoice drawer
**Then** I do NOT see the "Modifier" button
**And** I cannot edit the invoice (business rule: paid invoices are locked)

### AC6: Successful Edit with Toast Feedback
**Given** I have edited invoice fields
**When** I click "Sauvegarder" (Save)
**Then** the invoice is updated in the database
**And** a success toast "Facture mise à jour" appears
**And** the modal closes
**And** the drawer refreshes with updated data (automatic via Convex reactivity)

## Tasks / Subtasks

- [ ] Task 1: Update backend permissions (AC: #1, #4, #5)
  - [ ] 1.1 Modify `canModifyInvoice()` in `convex/permissions.ts` to allow technicians on their own unpaid invoices
  - [ ] 1.2 Add `paymentStatus` check: if invoice is "paid", no one can modify
  - [ ] 1.3 Run `pnpm dev:backend` to validate Convex changes

- [ ] Task 2: Integrate InvoiceEditModal in InvoiceDetailDrawer (AC: #1, #5)
  - [ ] 2.1 Import InvoiceEditModal in InvoiceDetailDrawer.tsx
  - [ ] 2.2 Add state `showEditModal` to control modal visibility
  - [ ] 2.3 Add "Modifier" button in action buttons section (only if invoice.paymentStatus !== "paid")
  - [ ] 2.4 Render InvoiceEditModal when showEditModal is true

- [ ] Task 3: Verify modal behavior per role (AC: #2, #3, #4, #6)
  - [ ] 3.1 Verify InvoiceEditModal opens with pre-filled values
  - [ ] 3.2 Verify admin sees technician dropdown (already implemented in modal)
  - [ ] 3.3 Verify technician does NOT see technician dropdown (already implemented)
  - [ ] 3.4 Verify save triggers mutation and shows success toast
  - [ ] 3.5 Verify modal closes on successful save

- [ ] Task 4: UI/UX improvements (optional but recommended)
  - [ ] 4.1 Replace custom modal styling with Shadcn Dialog (consistency)
  - [ ] 4.2 Add Pencil icon to "Modifier" button for clarity
  - [ ] 4.3 Ensure modal uses Shadcn Button styles (not raw tailwind buttons)
  - [ ] 4.4 Fix import path: use `@convex/_generated/api` instead of relative path

- [ ] Task 5: Run linting and validate (AC: all)
  - [ ] 5.1 Run `pnpm lint` to ensure no errors
  - [ ] 5.2 Manual test: technician can edit unpaid invoice
  - [ ] 5.3 Manual test: technician cannot reassign
  - [ ] 5.4 Manual test: admin can edit and reassign
  - [ ] 5.5 Manual test: no one can edit paid invoice

## Dev Notes

### Business Rules Summary

| Role | Can Edit Unpaid Invoice? | Can Reassign? | Can Edit Paid Invoice? |
|------|--------------------------|---------------|------------------------|
| Admin | ✅ All invoices in org | ✅ Yes | ❌ No |
| Technician | ✅ Own invoices only | ❌ No | ❌ No |

**Key Rule:** Once an invoice is `paymentStatus === "paid"`, it becomes immutable (no edits allowed).

### Existing Code to Leverage

**The InvoiceEditModal already exists but is NOT integrated!**

- **Modal Component:** `src/components/InvoiceEditModal.tsx` (220 lines)
  - Already has all form fields: clientName, contactName, contactEmail, contactPhone, invoiceNumber, amountTTC, invoiceDate, dueDate
  - Already has technician dropdown for admins only (line 180: `{isAdmin && users && ...}`)
  - Already calls `api.invoices.update` mutation
  - Already shows success toast on save

- **Backend Mutation:** `convex/invoices.ts:474-520`
  - `invoices.update` mutation exists and supports all fields including `assignToUserId`
  - Uses `assertCanModifyInvoice` → **NEEDS UPDATE**

### Backend Changes Required

**File: `convex/permissions.ts:105-116`**

Current implementation (WRONG):
```typescript
export function canModifyInvoice(user: UserWithOrg, invoice: Doc<"invoices">): boolean {
  if (invoice.organizationId !== user.organizationId) return false;
  return isAdmin(user);  // ❌ Only admins can edit
}
```

Required implementation (CORRECT):
```typescript
export function canModifyInvoice(user: UserWithOrg, invoice: Doc<"invoices">): boolean {
  // Check organization membership
  if (invoice.organizationId !== user.organizationId) return false;

  // ❌ No one can modify paid invoices
  if (invoice.paymentStatus === "paid") return false;

  // ✅ Admin can modify any unpaid invoice in org
  if (isAdmin(user)) return true;

  // ✅ Technician can modify their own unpaid invoices
  return invoice.createdBy === user.userId || invoice.userId === user.userId;
}
```

### Architecture Pattern

```
InvoiceDetailDrawer.tsx
├── Import InvoiceEditModal
├── State: showEditModal
├── Condition: invoice.paymentStatus !== "paid"
├── Button "Modifier" (if unpaid) → setShowEditModal(true)
└── <InvoiceEditModal invoice={invoice} onClose={() => setShowEditModal(false)} />

InvoiceEditModal.tsx (already correct)
├── Shows all fields for both roles
├── Shows technician dropdown ONLY for admins (line 180)
└── Calls api.invoices.update with assignToUserId only if admin changed it
```

### Integration Code (reference for developer)

```tsx
// In InvoiceDetailDrawer.tsx - add imports
import { InvoiceEditModal } from "@/components/InvoiceEditModal";
import { Pencil } from "lucide-react";

// Add state
const [showEditModal, setShowEditModal] = useState(false);

// Check if invoice can be edited (not paid)
const canEdit = invoice?.paymentStatus !== "paid";

// Add button in action buttons section (after "Marquer comme envoyée")
{canEdit && (
  <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)}>
    <Pencil className="h-4 w-4 mr-2" />
    Modifier
  </Button>
)}

// Render modal at the end (outside Sheet for proper z-index)
{invoice && showEditModal && (
  <InvoiceEditModal
    invoice={invoice}
    onClose={() => setShowEditModal(false)}
  />
)}
```

### Known Issues with InvoiceEditModal

1. **Styling inconsistency:** Uses raw div/button instead of Shadcn Dialog/Button
   - Recommend converting to Shadcn Dialog for consistency
2. **Import path:** Uses relative import `../../convex/_generated/api`
   - Should use alias `@convex/_generated/api` per project conventions

### File Structure Notes

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `convex/permissions.ts` | Permission logic | **REQUIRED:** Update `canModifyInvoice()` for technician access |
| `src/components/InvoiceDetailDrawer.tsx` | Invoice drawer (main target) | Add edit button + modal integration |
| `src/components/InvoiceEditModal.tsx` | Edit modal (exists, unused) | Optional: upgrade to Shadcn Dialog, fix import alias |
| `convex/invoices.ts` | Backend mutation | None - already complete |

### References

- [Source: convex/permissions.ts:105-116] - `canModifyInvoice()` - **MUST UPDATE** for new business rules
- [Source: src/components/InvoiceEditModal.tsx] - Existing modal component (unused but ready)
- [Source: src/components/InvoiceEditModal.tsx:180] - Admin-only technician dropdown
- [Source: src/components/InvoiceDetailDrawer.tsx:215-244] - Action buttons section to modify
- [Source: convex/invoices.ts:474-520] - `invoices.update` mutation (ready)
- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.3] - Original story definition

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

