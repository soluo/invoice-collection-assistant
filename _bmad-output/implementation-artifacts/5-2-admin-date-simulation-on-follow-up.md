# Story 5.2: Admin Date Simulation on /follow-up

Status: ready-for-dev

## Story

As an **admin**,
I want **to select a simulation date on /follow-up and see what reminders would be generated**,
So that **I can demonstrate the system behavior to clients without affecting real data**.

## Acceptance Criteria

1. **Given** I am an admin on /follow-up
   **When** I view the page
   **Then** I see a date picker allowing me to select a simulation date
   **And** the date picker defaults to "today" (real mode)

2. **Given** I select a future or different date
   **When** I confirm the selection
   **Then** the system generates simulated reminders for that date
   **And** the reminders are flagged as `isSimulation: true`
   **And** I see these simulated reminders in the same list format as real reminders
   **And** simulated reminders are visually distinguished (badge or color)

3. **Given** I am viewing simulated reminders
   **When** I click on an email reminder
   **Then** I can preview the email content (reusing Epic 2 preview component)

4. **Given** I am a technician (not admin)
   **When** I view /follow-up
   **Then** I do not see the date simulation picker
   **And** I only see real reminders

## Tasks / Subtasks

- [ ] Task 1: Create backend simulation query (AC: #2, #3)
  - [ ] Create `generateSimulatedReminders` query in `convex/followUp.ts`
  - [ ] Accept parameter: `{ targetDate: string }` (YYYY-MM-DD format)
  - [ ] Verify user is admin (use existing `isAdmin(user)` helper)
  - [ ] Find all invoices that would trigger reminders for that date:
    - Sent invoices (`sendStatus === "sent"`)
    - Unpaid (`paymentStatus !== "paid"`)
    - Due date + configured delay matches target date
  - [ ] Generate simulated reminder objects with `isSimulation: true` flag
  - [ ] Return same shape as `getUpcomingReminders` for UI reuse
  - [ ] Run `pnpm dev:backend` to validate

- [ ] Task 2: Add date picker to FollowUp page header (AC: #1, #4)
  - [ ] Import `useQuery(api.users.getCurrentUser)` to get user role
  - [ ] Add state: `simulationDate: Date | null` (null = real mode/today)
  - [ ] Conditionally render date picker only if `user?.role === "admin"`
  - [ ] Use Shadcn `Popover` + `Calendar` components (existing in project)
  - [ ] Date picker label: "Simuler une date" with CalendarDays icon
  - [ ] Add "Aujourd'hui" button to reset to real mode

- [ ] Task 3: Switch between real and simulated data (AC: #1, #2)
  - [ ] When `simulationDate` is null: use existing `getUpcomingReminders` query
  - [ ] When `simulationDate` is set: use new `generateSimulatedReminders` query
  - [ ] Pass `targetDate` formatted as YYYY-MM-DD string
  - [ ] Conditional query pattern: `useQuery(..., simulationDate ? { targetDate } : "skip")`

- [ ] Task 4: Visual distinction for simulated reminders (AC: #2)
  - [ ] Add purple/violet badge "Simulation" on simulated reminder cards
  - [ ] Add subtle background tint to simulated cards (e.g., `bg-purple-50/50`)
  - [ ] Show banner at top when in simulation mode: "Mode simulation - Date: {date}"
  - [ ] Banner should have "Quitter simulation" button to reset

- [ ] Task 5: Email preview for simulated reminders (AC: #3)
  - [ ] Reuse existing `EmailPreviewModalFollowUp` component
  - [ ] Simulated reminders already have `data.emailSubject` and `data.emailContent`
  - [ ] No changes needed to preview modal (same data shape)

- [ ] Task 6: Test and validate (AC: #1-4)
  - [ ] Test as admin: date picker visible, simulation works
  - [ ] Test as technician: date picker NOT visible
  - [ ] Test simulation generates correct reminders for selected date
  - [ ] Test email preview works for simulated reminders
  - [ ] Test "Quitter simulation" returns to real mode
  - [ ] Run `pnpm lint` to verify no errors

## Dev Notes

### Architecture Decision

This feature adds **read-only simulation** capability to the existing /follow-up page. No data is written to the database - simulated reminders are generated on-the-fly based on invoice data and organization's reminder configuration.

**Key Design Choices:**
1. **No schema changes** - Simulated reminders are not persisted, just returned with `isSimulation: true` flag
2. **Reuse existing components** - Same `ReminderCard` and `EmailPreviewModalFollowUp` with conditional styling
3. **Admin-only** - Date picker only rendered for admin users (frontend + backend verification)

### Backend Implementation

**New Query: `convex/followUp.ts` - `generateSimulatedReminders`**

```typescript
export const generateSimulatedReminders = query({
  args: { targetDate: v.string() }, // YYYY-MM-DD
  returns: v.array(/* same shape as getUpcomingReminders + isSimulation */),
  handler: async (ctx, { targetDate }) => {
    const user = await getUserWithOrg(ctx);

    // Admin-only access
    if (!isAdmin(user)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    // Get organization's reminder steps configuration
    const org = await ctx.db.get(user.organizationId);
    const reminderSteps = org?.reminderSteps || [];

    // Find invoices that would trigger reminders on targetDate
    const targetDateObj = new Date(targetDate);
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .filter((q) =>
        q.and(
          q.eq(q.field("sendStatus"), "sent"),
          q.neq(q.field("paymentStatus"), "paid")
        )
      )
      .collect();

    // Generate simulated reminders based on due date + delay
    const simulatedReminders = [];
    for (const invoice of invoices) {
      const dueDate = new Date(invoice.dueDate);

      for (const step of reminderSteps) {
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() + step.delay);

        // Check if this step falls on target date
        if (reminderDate.toISOString().split('T')[0] === targetDate) {
          simulatedReminders.push({
            _id: `sim-${invoice._id}-${step.id}` as Id<"reminders">,
            reminderDate: `${targetDate} 10:00:00`,
            reminderStatus: `reminder_${reminderSteps.indexOf(step) + 1}`,
            reminderType: step.type,
            completionStatus: "pending",
            isSimulation: true,
            data: {
              emailSubject: step.emailSubject?.replace("{{clientName}}", invoice.clientName) || "",
              emailContent: step.emailTemplate?.replace("{{clientName}}", invoice.clientName) || "",
            },
            invoice: {
              _id: invoice._id,
              invoiceNumber: invoice.invoiceNumber,
              clientName: invoice.clientName,
              contactEmail: invoice.contactEmail,
              contactPhone: invoice.contactPhone,
              amountTTC: invoice.amountTTC,
              dueDate: invoice.dueDate,
              sendStatus: invoice.sendStatus,
              paymentStatus: invoice.paymentStatus,
              reminderStatus: invoice.reminderStatus,
            },
            daysOverdue: Math.max(0, Math.floor((targetDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))),
          });
        }
      }
    }

    return simulatedReminders;
  },
});
```

### Frontend Implementation

**Modified: `src/pages/FollowUp.tsx`**

```tsx
// New imports
import { CalendarDays, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Inside FollowUp component:
const currentUser = useQuery(api.users.getCurrentUser);
const [simulationDate, setSimulationDate] = useState<Date | null>(null);

// Format date for backend
const simulationDateString = simulationDate
  ? format(simulationDate, "yyyy-MM-dd")
  : null;

// Conditional query - real vs simulated
const upcomingReminders = useQuery(
  simulationDateString ? api.followUp.generateSimulatedReminders : api.followUp.getUpcomingReminders,
  simulationDateString ? { targetDate: simulationDateString } : {}
);

// In JSX header, after title:
{currentUser?.role === "admin" && (
  <div className="flex items-center gap-2">
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarDays className="h-4 w-4 mr-2" />
          {simulationDate ? format(simulationDate, "d MMM yyyy", { locale: fr }) : "Simuler une date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={simulationDate ?? undefined}
          onSelect={(date) => setSimulationDate(date ?? null)}
          locale={fr}
        />
      </PopoverContent>
    </Popover>
    {simulationDate && (
      <Button variant="ghost" size="sm" onClick={() => setSimulationDate(null)}>
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
)}

// Simulation mode banner (after header, before tabs):
{simulationDate && (
  <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
    <div className="flex items-center gap-2 text-purple-700">
      <CalendarDays className="h-4 w-4" />
      <span className="font-medium">Mode simulation</span>
      <span className="text-purple-600">
        Relances prévues pour le {format(simulationDate, "d MMMM yyyy", { locale: fr })}
      </span>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setSimulationDate(null)}
      className="text-purple-700 hover:text-purple-900"
    >
      Quitter simulation
    </Button>
  </div>
)}
```

**Modified: `ReminderCard` component styling for simulation**

```tsx
// Add isSimulation prop to ReminderCard
interface ReminderCardProps {
  reminder: UpcomingReminder & { isSimulation?: boolean };
  // ... other props
}

// In ReminderCard JSX:
<div
  className={cn(
    "rounded-lg border bg-white p-4 hover:border-gray-300 transition-colors cursor-pointer",
    reminder.isSimulation
      ? "border-purple-200 bg-purple-50/30"
      : "border-gray-200"
  )}
>
  {/* Add simulation badge */}
  {reminder.isSimulation && (
    <Badge className="bg-purple-100 text-purple-700 border-purple-200 mb-2">
      Simulation
    </Badge>
  )}
  {/* ... rest of card */}
</div>
```

### Existing Code References

- [Source: convex/followUp.ts:10-131] - `getUpcomingReminders` query - pattern to follow
- [Source: convex/followUp.ts:4] - `getUserWithOrg`, `isAdmin` imports from permissions
- [Source: convex/schema.ts:8-51] - Organization schema with `reminderSteps` config
- [Source: src/pages/FollowUp.tsx:30-42] - Current state and query setup
- [Source: src/pages/FollowUp.tsx:280-315] - `ReminderGroup` component
- [Source: src/pages/FollowUp.tsx:317-506] - `ReminderCard` component
- [Source: src/components/EmailPreviewModalFollowUp.tsx] - Existing preview modal

### UI Patterns (from existing code)

```tsx
// Date picker with Popover (from MarkAsSentModal pattern)
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">
      <CalendarDays className="h-4 w-4 mr-2" />
      {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner"}
    </Button>
  </PopoverTrigger>
  <PopoverContent className="w-auto p-0">
    <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} />
  </PopoverContent>
</Popover>

// Banner pattern (from story 5.1)
<div className="flex items-center justify-between bg-{color}-50 border border-{color}-200 rounded-lg px-4 py-2">
  <span>{message}</span>
  <Button variant="ghost" size="sm">{action}</Button>
</div>
```

### Technical Requirements

**Convex Dependencies:**
- Use `query` (not `action`) - no external API calls needed
- Use existing `getUserWithOrg` and `isAdmin` from `permissions.ts`
- Access organization's `reminderSteps` for delay configuration

**Frontend Dependencies (already installed):**
- `date-fns` - date formatting and manipulation
- Shadcn `Calendar`, `Popover`, `Button`, `Badge` components
- `lucide-react` icons: `CalendarDays`, `X`

**Type Updates:**

```typescript
// Extend UpcomingReminder type to include simulation flag
type UpcomingReminder = {
  // ... existing fields
  isSimulation?: boolean;
};
```

### Security Considerations

- Admin role verification in backend query (throws error for non-admins)
- Admin role check in frontend (date picker only rendered for admins)
- Simulated reminders are read-only - no database writes
- No real emails sent from simulation mode (that's Story 5.3)

### Edge Cases to Handle

1. **No invoices** → Empty simulation results, show "Aucune relance simulée pour cette date"
2. **No reminder steps configured** → Show message "Configurez vos étapes de relance dans les paramètres"
3. **Date in the past** → Allow (useful for demos showing "what would have happened")
4. **Same date as today** → Show simulation results (not real reminders)

### File Structure

```
convex/
└── followUp.ts           # MODIFY: Add generateSimulatedReminders query

src/pages/
└── FollowUp.tsx          # MODIFY: Add date picker, simulation mode banner, conditional query
```

### Dependencies

No new dependencies required. Uses existing:
- `date-fns` (already in project)
- Shadcn Calendar, Popover (already in project)
- `lucide-react` CalendarDays icon (already in project)

### Previous Story Intelligence

**From Story 5.1 Implementation:**
- Admin role check pattern: `user.role === "admin"`
- Backend admin check: `if (!isAdmin(user)) throw new Error(...)`
- Toast notification patterns for success/error
- Card styling patterns from OrganizationSettings

**Key Learning:** The project uses Convex real-time queries - when `simulationDate` changes, the query automatically re-fetches with new parameters.

### Git Intelligence

**Recent commits:**
- `5bc389f feat: add send test email to custom address (story 5.1)`
- `6dfc143 review: complete story 1.3 code review`

**Pattern:** Stories are implemented with feat: prefix, reviews with review: prefix.

### Testing Checklist

1. [ ] As admin, date picker is visible in /follow-up header
2. [ ] As technician, date picker is NOT visible
3. [ ] Click date picker → calendar opens
4. [ ] Select future date → simulation mode activates, banner appears
5. [ ] Simulated reminders show with purple styling and "Simulation" badge
6. [ ] Click "Quitter simulation" → returns to real reminders
7. [ ] Click on simulated email reminder → preview modal opens
8. [ ] Select date with no due reminders → empty state message
9. [ ] Run `pnpm lint` - no errors

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled after implementation)

### File List

(To be filled after implementation - expected: convex/followUp.ts, src/pages/FollowUp.tsx)
