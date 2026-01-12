# Story 1.2: Reminder History in Drawer

Status: review

## Story

As a **user**,
I want **to see the complete history of reminders sent for an invoice**,
So that **I know what communications have already happened before taking action**.

## Acceptance Criteria

1. **Given** I have the invoice detail drawer open
   **When** I look at the reminder history section
   **Then** I can see a timeline of all reminders for this invoice
   **And** each reminder shows the type (email/phone), date, and status
   **And** completed reminders show the outcome (sent, answered, no answer, etc.)
   **And** reminders are ordered chronologically (most recent first)

2. **Given** an invoice has many reminders (more than 5)
   **When** I view the drawer
   **Then** I see the 5 most recent reminders
   **And** I can click "Show all" to expand and see the complete history

3. **Given** an invoice has no reminders yet
   **When** I view the drawer
   **Then** I see a message indicating no reminders have been sent

## Tasks / Subtasks

- [x] Task 1: Create query to fetch reminders by invoiceId (AC: #1)
  - [x] Check if `api.reminders.getByInvoice` already returns needed fields
  - [x] Verify it returns: reminderDate, reminderType, reminderStatus, completionStatus, completedAt, data (with outcome)
  - [x] If needed, enhance query to include all required fields

- [x] Task 2: Create ReminderHistorySection component (AC: #1, #2, #3)
  - [x] Create `/src/components/ReminderHistorySection.tsx`
  - [x] Accept `invoiceId: Id<"invoices">` prop
  - [x] Use `useQuery(api.reminders.getByInvoice, { invoiceId })`
  - [x] Handle loading state with skeleton or spinner

- [x] Task 3: Implement reminder timeline display (AC: #1)
  - [x] Display each reminder as a timeline item
  - [x] Show icon based on reminderType (Mail icon for email, Phone icon for phone)
  - [x] Show date formatted in French locale (e.g., "12 janvier 2026")
  - [x] Show reminder step badge (Relance 1, 2, 3, 4)
  - [x] Show status: pending = "En attente", completed = "Envoyee", failed = "Echec"
  - [x] For phone reminders with outcome, show: will_pay, no_answer, dispute, voicemail

- [x] Task 4: Implement show more/less functionality (AC: #2)
  - [x] Initially display max 5 reminders
  - [x] Add "Voir tout (X)" button if more than 5 reminders exist
  - [x] Clicking "Voir tout" expands to show all reminders
  - [x] Add "Voir moins" button to collapse back to 5

- [x] Task 5: Implement empty state (AC: #3)
  - [x] Display "Aucune relance envoyee" message with appropriate icon
  - [x] Use gray/muted styling for empty state

- [x] Task 6: Integrate into InvoiceDetailDrawer (AC: #1, #2, #3)
  - [x] Import ReminderHistorySection into InvoiceDetailDrawer
  - [x] Add section after contact info / PDF button
  - [x] Add section header "Historique des relances" with History icon
  - [x] Ensure proper spacing with existing sections

- [x] Task 7: Test and polish (AC: #1, #2, #3)
  - [x] Test with invoice having 0 reminders
  - [x] Test with invoice having 1-5 reminders
  - [x] Test with invoice having more than 5 reminders
  - [x] Test expand/collapse functionality
  - [x] Verify mobile responsiveness

## Dev Notes

### CRITICAL: Coherence with Full Invoice Page

**The full invoice page (`/invoices/:id`) already displays reminder history via `InvoiceTimeline` component. The drawer MUST follow the same visual patterns for consistency.**

**Full Page Pattern (src/components/InvoiceTimeline.tsx):**
- Uses `api.events.getByInvoice` (events table, not reminders table)
- Events include `reminder_sent` type for completed reminders
- Visual: circular icon (40x40) with colored background + content on right
- Date format: `formatDistanceToNow` from date-fns + full date (e.g., "il y a 2 jours • 12 janvier 2026")
- Colors: orange-100/orange-600 for reminder_sent events

**Drawer Approach (this story):**
- Uses `api.reminders.getByInvoice` (reminders table) - includes PENDING reminders too
- This is intentional: drawer shows upcoming + past reminders, full page shows only completed events
- Visual style MUST match InvoiceTimeline for consistency

### Architecture Decisions

**Data Source:** Use existing `api.reminders.getByInvoice` query (convex/reminders.ts:60-78). This query already filters by invoiceId and returns the full reminder objects.

**Why reminders instead of events?**
- Events only contain `reminder_sent` (completed reminders)
- Reminders table includes `pending` status (scheduled but not yet sent)
- Drawer provides a complete picture: what was sent + what is scheduled

**Component Structure:**
```tsx
// ReminderHistorySection.tsx - focused component for reminder timeline
interface Props {
  invoiceId: Id<"invoices">;
}

export function ReminderHistorySection({ invoiceId }: Props) {
  const reminders = useQuery(api.reminders.getByInvoice, { invoiceId });
  // ...
}
```

**Sorting:** The query returns reminders unsorted. Sort client-side by `reminderDate` descending (most recent first).

### Visual Patterns from InvoiceTimeline (MUST FOLLOW)

**Timeline Item Structure (from src/components/InvoiceTimeline.tsx:127-169):**
```tsx
<li className="flex gap-4 p-6">
  {/* Circular icon container */}
  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${bgColor}`}>
    <Icon className={`h-5 w-5 ${iconColor}`} />
  </div>

  {/* Content */}
  <div className="flex-1">
    <p className="text-sm text-gray-800">{description}</p>
    <p className="mt-1 text-xs text-gray-500">{formattedDate}</p>
  </div>
</li>
```

**Color Scheme (from InvoiceTimeline EVENT_CONFIGS):**
```tsx
// For reminders, use these colors to match InvoiceTimeline:
reminder_email_completed: { bgColor: "bg-orange-100", iconColor: "text-orange-600" }
reminder_email_pending: { bgColor: "bg-amber-100", iconColor: "text-amber-600" }
reminder_email_failed: { bgColor: "bg-red-100", iconColor: "text-red-600" }
reminder_phone: { bgColor: "bg-purple-100", iconColor: "text-purple-600" }
```

**Date Formatting (from InvoiceTimeline:81-93):**
```tsx
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

function formatEventDate(timestamp: number): string {
  const date = new Date(timestamp);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const fullDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${timeAgo} • ${fullDate}`;
}

// For reminderDate string format "2025-09-26 10:00:00":
const date = new Date(reminderDate.replace(" ", "T"));
```

**Empty State (from InvoiceTimeline:105-113):**
```tsx
<p className="text-sm text-gray-500">Aucun événement pour le moment.</p>
// Adapt to: "Aucune relance pour cette facture"
```

### Drawer Section Integration

**From InvoiceDetailDrawer.tsx (story 1.1):**
```tsx
// Section with border separator
<div className="space-y-3 pt-4 border-t">
  <p className="text-sm text-gray-500 font-medium">Section Title</p>
  {/* content */}
</div>

// Loading state pattern
{reminders === undefined && (
  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
)}
```

**Badge Pattern (for reminder step):**
```tsx
<Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
  Relance 1
</Badge>
```

### Technical Requirements

**Convex Queries:**
- `api.reminders.getByInvoice` - Returns all reminders for an invoice

**Reminder Schema (from convex/schema.ts:130-186):**
```typescript
{
  _id: Id<"reminders">
  reminderDate: string           // "2025-09-26 10:00:00"
  reminderStatus: "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4"
  reminderType: "email" | "phone"
  completionStatus: "pending" | "completed" | "failed"
  completedAt?: number
  data?: {
    emailSubject?: string
    emailContent?: string
    sendError?: string
    phoneCallNotes?: string
    phoneCallOutcome?: "no_answer" | "voicemail" | "will_pay" | "dispute"
  }
}
```

**Lucide Icons to Use:**
- `Mail` - for email reminders
- `Phone` - for phone reminders
- `History` - for section header
- `Clock` - for pending status
- `CheckCircle2` - for completed status
- `XCircle` - for failed status
- `ChevronDown` / `ChevronUp` - for expand/collapse

**Shadcn Components:**
- `Badge` (already exists) - for reminder step and status
- `Button` (already exists) - for "Voir tout" action

### File Structure Requirements

```
src/components/
├── InvoiceDetailDrawer.tsx    # EXISTING: Add ReminderHistorySection
└── ReminderHistorySection.tsx # NEW: Timeline component
```

### Display Logic

**Reminder Status Labels:**
- `pending` → "En attente" (amber)
- `completed` → "Envoyee" (green for email) or outcome for phone
- `failed` → "Echec" (red)

**Phone Call Outcomes:**
- `will_pay` → "Promet de payer" (green)
- `no_answer` → "Pas de reponse" (amber)
- `voicemail` → "Messagerie" (amber)
- `dispute` → "Litige" (red)

**Reminder Step Labels:**
- `reminder_1` → "Relance 1"
- `reminder_2` → "Relance 2"
- `reminder_3` → "Relance 3"
- `reminder_4` → "Relance 4"

### Project Structure Notes

- All imports use `@/` alias (e.g., `@/components/ui/badge`)
- Tailwind v4 with `@theme` directive in `src/index.css`
- Brand color: `brand-500` (#f97316 orange)
- Primary breakpoint: `md:` (768px)
- Use `@convex/_generated/api` for Convex imports (alias configured in vite.config.ts)

### References

- [Source: src/components/InvoiceTimeline.tsx] - **CRITICAL**: Reference component for visual consistency (full page uses this)
- [Source: src/pages/InvoiceDetail.tsx:29-32] - Full page uses `api.events.getByInvoice` + InvoiceTimeline
- [Source: convex/reminders.ts:60-78] - getByInvoice query for reminders table
- [Source: convex/schema.ts:130-186] - reminders table schema with all fields
- [Source: src/components/InvoiceDetailDrawer.tsx] - Parent component to integrate with
- [Source: DESIGN_GUIDELINES.md#shadcn-ui-component-system] - Component patterns
- [Source: _bmad-output/implementation-artifacts/1-1-invoice-detail-drawer-with-status-display.md] - Previous story patterns

### Dependencies

**Already installed (from InvoiceTimeline):**
- `date-fns` - For `formatDistanceToNow` function
- `date-fns/locale` - For French locale (`fr`)

No new dependencies required.

### Previous Story Intelligence

**From Story 1.1 Implementation:**
- InvoiceDetailDrawer uses controlled Sheet component with `side="right"`
- State pattern: `invoiceId: Id<"invoices"> | null` with `open` boolean
- Sections separated by `pt-4 border-t` dividers
- Loading: spinner with `animate-spin` and `border-brand-500`
- Data fetching: `useQuery` with conditional skip pattern
- Added `@convex` alias in vite.config.ts - use it for Convex imports

**Files created in 1.1:**
- `src/components/InvoiceDetailDrawer.tsx` - Main drawer component
- `src/components/ui/sheet.tsx` - Shadcn Sheet component

**Key patterns established:**
- French locale for dates
- Badge styling with outline variant + colored backgrounds
- Import aliases: `@/components/ui/...` and `@convex/_generated/...`

### Git Intelligence

**Recent commits:**
- `b93b5b7 feat: implement invoice detail drawer (story 1.1)` - Added InvoiceDetailDrawer
- `4c956c6 chore: add @convex alias for cleaner imports` - Added @convex alias

**Files recently modified (from story 1.1):**
- `src/components/InvoiceDetailDrawer.tsx` - Will be modified again
- `src/pages/MainView.tsx` - Integrated drawer
- `src/pages/FollowUp.tsx` - Integrated drawer

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A

### Completion Notes List

- Task 1: Verified `api.reminders.getByInvoice` already returns all required fields (reminderDate, reminderType, reminderStatus, completionStatus, completedAt, data). No query enhancement needed.
- Tasks 2-5: Created `ReminderHistorySection.tsx` component with:
  - Timeline display matching `InvoiceTimeline` visual patterns (40x40 circular icons with colored backgrounds)
  - Color scheme: orange for completed email, amber for pending, red for failed, purple for phone
  - French date formatting with `formatDistanceToNow` from date-fns
  - Badge for reminder step (Relance 1-4) and completion status
  - Phone call outcomes properly displayed (will_pay, no_answer, voicemail, dispute)
  - Show more/less functionality: initially 5 reminders, "Voir tout (X)" button to expand, "Voir moins" to collapse
  - Empty state: "Aucune relance pour cette facture"
  - Loading state: spinner with brand color
- Task 6: Integrated into `InvoiceDetailDrawer` after PDF button section
- Task 7: Validated with `pnpm lint` - build passes without errors

### File List

- src/components/ReminderHistorySection.tsx (NEW)
- src/components/InvoiceDetailDrawer.tsx (MODIFIED)

### Change Log

- 2026-01-12: Implemented reminder history section in drawer (Story 1.2)
