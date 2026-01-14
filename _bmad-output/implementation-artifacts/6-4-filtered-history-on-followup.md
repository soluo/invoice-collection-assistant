# Story 6.4: Historique Filtré sur /follow-up + Historique Complet sur InvoiceDetails

Status: review

## Story

As a **user (technician or admin)**,
I want **to see only reminder history on the /follow-up page, but full event history on invoice details**,
So that **each view shows contextually relevant information without noise**.

## Context

Currently, the history on /follow-up shows ALL event types (invoice import, due date changes, payments, etc.) which is noisy for a page focused on follow-up actions. Meanwhile, InvoiceDetails should show the complete audit trail for full visibility.

## Acceptance Criteria

### AC1: /follow-up History Shows ONLY Reminder Events
**Given** I am on the /follow-up page in the History tab
**When** I view the history list
**Then** I see ONLY reminder-related events (emails sent, calls made, snoozes)
**And** I do NOT see other event types (invoice_imported, invoice_marked_sent, payment_registered, invoice_marked_paid)
**And** each entry shows date, reminder type, invoice reference, and outcome

### AC2: InvoiceDetails Shows COMPLETE Event History
**Given** I am viewing an invoice in the InvoiceDetailDrawer or InvoiceDetail page
**When** I look at the event history section
**Then** I see ALL events for this invoice in chronological order
**And** events include: invoice import/creation, due date modifications, payment recordings, reminders sent, notes added
**And** each event shows the date, event type, description, and author (who performed the action)

### AC3: Invoice Import Event Visible in Details
**Given** an invoice was imported via AI extraction
**When** I view InvoiceDetails history
**Then** I see an entry "Facture importée" with the import date and the user who uploaded it

### AC4: Payment Events Visible in Details
**Given** a payment was recorded
**When** I view InvoiceDetails history
**Then** I see an entry "Paiement enregistré: [amount]" with timestamp and author

### AC5: Mark as Sent Event Visible in Details
**Given** an invoice was marked as sent
**When** I view InvoiceDetails history
**Then** I see an entry "Facture marquée comme envoyée" with timestamp and author

## Tasks / Subtasks

- [x] Task 1: Create filtered query for /follow-up history (AC: #1)
  - [x] 1.1 Create new query `followUp.getReminderHistoryFiltered` that filters events by type
  - [x] 1.2 Filter to ONLY include `reminder_sent` events
  - [x] 1.3 Update `FollowUp.tsx` to use the new filtered query instead of `getReminderHistory`
  - [x] 1.4 Run `pnpm dev:backend` to validate Convex changes

- [x] Task 2: Add EventHistorySection component for InvoiceDetails (AC: #2, #3, #4, #5)
  - [x] 2.1 Create new component `src/components/EventHistorySection.tsx`
  - [x] 2.2 Use `api.events.getByInvoice` query (already exists)
  - [x] 2.3 Display all event types with appropriate icons and labels
  - [x] 2.4 Show author name/email and formatted timestamp for each event

- [x] Task 3: Integrate EventHistorySection in InvoiceDetailDrawer (AC: #2)
  - [x] 3.1 Add EventHistorySection below ReminderHistorySection in InvoiceDetailDrawer
  - [x] 3.2 Rename section header: "Historique des relances" → keep, add "Historique complet" section below
  - [x] 3.3 Verify proper loading and empty states

- [x] Task 4: Integrate EventHistorySection in InvoiceDetail page (AC: #2)
  - [x] 4.1 Add EventHistorySection to the InvoiceDetail.tsx page (Already implemented via InvoiceTimeline)
  - [x] 4.2 Ensure consistent UI with drawer version (InvoiceTimeline provides full history on detail page)

- [x] Task 5: Run linting and validate (AC: all)
  - [x] 5.1 Run `pnpm lint` to ensure no errors
  - [x] 5.2 Manual test: /follow-up History only shows reminder events
  - [x] 5.3 Manual test: InvoiceDetails shows all events

## Dev Notes

### Current State Analysis

**The Problem:**
- `followUp.getReminderHistory` (lines 138-221 in `convex/followUp.ts`) returns ALL events from the `events` table
- No filtering is applied, so invoice_imported, invoice_marked_sent, payment_registered, etc. all appear
- This creates noise on /follow-up where users only want to see reminder activity

**The Solution:**
1. Create a filtered version of `getReminderHistory` that only returns `reminder_sent` events
2. Use the existing `events.getByInvoice` query (lines 302-380 in `convex/events.ts`) for InvoiceDetails

### Event Types Currently Tracked

| Event Type | Description | Visible on /follow-up? | Visible on InvoiceDetails? |
|------------|-------------|------------------------|---------------------------|
| `invoice_imported` | Invoice created/uploaded | ❌ No | ✅ Yes |
| `invoice_marked_sent` | Invoice manually marked sent | ❌ No | ✅ Yes |
| `invoice_sent` | Invoice sent by email | ❌ No | ✅ Yes |
| `payment_registered` | Payment recorded | ❌ No | ✅ Yes |
| `invoice_marked_paid` | Invoice marked as paid | ❌ No | ✅ Yes |
| `reminder_sent` | Reminder email/phone completed | ✅ Yes | ✅ Yes |

### Backend Query Changes

**File: `convex/followUp.ts`**

Create new filtered query (simplified):

```typescript
/**
 * Query pour l'historique des relances UNIQUEMENT (filtered)
 * Used on /follow-up History tab
 */
export const getReminderHistoryFiltered = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Get all events for org
    const events = await ctx.db
      .query("events")
      .withIndex("by_organization_and_date", (q) =>
        q.eq("organizationId", user.organizationId)
      )
      .order("desc")
      .collect();

    // Filter to ONLY reminder_sent events
    const reminderEvents = events.filter(e => e.eventType === "reminder_sent");

    // Apply limit
    const limitedEvents = reminderEvents.slice(0, args.limit || 1000);

    // Enrich with invoice and user data...
    // (same enrichment as existing getReminderHistory)
  },
});
```

### Frontend Component: EventHistorySection

**File: `src/components/EventHistorySection.tsx`**

```tsx
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  FileUp, Mail, Phone, Check, CreditCard, Bell, History
} from "lucide-react";

interface EventHistorySectionProps {
  invoiceId: Id<"invoices">;
}

// Event type to icon/label mapping
const EVENT_CONFIG = {
  invoice_imported: { icon: FileUp, label: "Facture importée", color: "text-blue-600 bg-blue-100" },
  invoice_marked_sent: { icon: Mail, label: "Facture marquée envoyée", color: "text-gray-600 bg-gray-100" },
  invoice_sent: { icon: Mail, label: "Facture envoyée", color: "text-green-600 bg-green-100" },
  payment_registered: { icon: CreditCard, label: "Paiement enregistré", color: "text-green-600 bg-green-100" },
  invoice_marked_paid: { icon: Check, label: "Facture payée", color: "text-green-600 bg-green-100" },
  reminder_sent: { icon: Bell, label: "Relance envoyée", color: "text-orange-600 bg-orange-100" },
} as const;

export function EventHistorySection({ invoiceId }: EventHistorySectionProps) {
  const events = useQuery(api.events.getByInvoice, { invoiceId });

  // ... loading/empty states ...
  // ... render event list with icons, labels, dates, authors ...
}
```

### Existing Code to Leverage

**Backend:**
- `events.getByInvoice` query (convex/events.ts:302-380) - Already exists and works correctly
- `followUp.getReminderHistory` query (convex/followUp.ts:138-221) - Needs filtering

**Frontend:**
- `ReminderHistorySection.tsx` - Reference for styling and structure
- `FollowUp.tsx:652-678 (EventTimeline)` - Currently renders events, will use filtered data

### Architecture Pattern

```
/follow-up (History tab)
└── Uses followUp.getReminderHistoryFiltered (NEW)
    └── Returns ONLY reminder_sent events

InvoiceDetailDrawer + InvoiceDetail page
├── ReminderHistorySection (existing - uses reminders.getByInvoice)
└── EventHistorySection (NEW - uses events.getByInvoice)
    └── Returns ALL events for the invoice
```

### UI/UX Notes

- Event icons should use Lucide icons consistent with the rest of the app
- Use same color coding as existing EventCard in FollowUp.tsx (green for payments, gray for others)
- Author display: show user name if available, else email prefix, else "Système"
- Dates: format consistently with `date-fns` and `fr` locale

### File Structure Notes

| File | Purpose | Changes Needed |
|------|---------|----------------|
| `convex/followUp.ts` | Follow-up queries | Add `getReminderHistoryFiltered` query |
| `src/pages/FollowUp.tsx` | Follow-up page | Change query to use filtered version |
| `src/components/EventHistorySection.tsx` | **NEW** | Full event history for invoice details |
| `src/components/InvoiceDetailDrawer.tsx` | Invoice drawer | Add EventHistorySection |
| `src/pages/InvoiceDetail.tsx` | Invoice detail page | Add EventHistorySection |

### References

- [Source: convex/followUp.ts:138-221] - `getReminderHistory` query (to be filtered)
- [Source: convex/events.ts:302-380] - `getByInvoice` query (ready to use)
- [Source: src/pages/FollowUp.tsx:652-678] - EventTimeline component (reference)
- [Source: src/components/ReminderHistorySection.tsx] - Similar component structure
- [Source: src/components/InvoiceDetailDrawer.tsx:363] - ReminderHistorySection integration point
- [Source: convex/schema.ts:189-223] - Events table schema with eventType union
- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.4] - Original story definition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Convex backend validation passed successfully
- Frontend build and lint passed with no errors

### Completion Notes List

- Created `getReminderHistoryFiltered` query in `convex/followUp.ts` to filter events to only `reminder_sent` type
- Updated `/follow-up` page to use the filtered query for the History tab
- Created new `EventHistorySection` component for displaying complete event history in invoice details
- Integrated `EventHistorySection` in `InvoiceDetailDrawer` below `ReminderHistorySection`
- Verified `InvoiceDetail.tsx` already shows complete history via `InvoiceTimeline` component using `events.getByInvoice`
- All acceptance criteria satisfied:
  - AC1: /follow-up History now shows ONLY reminder events
  - AC2: InvoiceDetailDrawer shows complete event history via new EventHistorySection
  - AC3-5: Invoice import, payment, and mark-as-sent events visible in EventHistorySection

### File List

- `convex/followUp.ts` - Added `getReminderHistoryFiltered` query
- `src/pages/FollowUp.tsx` - Updated to use filtered query
- `src/components/EventHistorySection.tsx` - NEW: Complete event history component
- `src/components/InvoiceDetailDrawer.tsx` - Integrated EventHistorySection
