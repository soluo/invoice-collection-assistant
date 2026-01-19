# Story 1.6: Invoice Notes + Drawer Compact

Status: ready-for-dev

## Story

As a **user (technician or admin)**,
I want **to see and add notes from the invoice drawer, while keeping the drawer compact and actionable**,
So that **I can quickly capture context without navigating away, while having access to full details on the dedicated page**.

## Context

Cette story fait partie d'une refonte du Drawer pour le rendre **compact et actionnable** :
- **Drawer** = Aperçu rapide pour agir (notes rapides, actions, statut relances)
- **Page Détail** = Vue complète pour analyser (historique complet, toutes les notes)

## Acceptance Criteria

### Notes dans le Drawer
1. **Given** I have the invoice detail drawer open
   **When** I look at the notes section
   **Then** I see only the **most recent note** (if exists) with author and relative time
   **And** I see a compact input field to add a quick note

2. **Given** I want to add a note from the drawer
   **When** I type in the input and submit
   **Then** the note is saved with my name and timestamp
   **And** a success toast appears
   **And** the input clears
   **And** the new note becomes the displayed "dernière note"

3. **Given** an invoice has no notes
   **When** I view the drawer
   **Then** I see only the note input field (no empty state message)

### Résumé Relances (compact)
4. **Given** I have the invoice detail drawer open
   **When** I look at the reminders summary section
   **Then** I see up to 2 lines:
   - **Dernière relance** : type (Email/Appel) + temps relatif + statut (✓ ou outcome)
   - **Prochaine relance** : type + date prévue (si pending existe)

5. **Given** an invoice has no completed reminders
   **When** I view the drawer
   **Then** the "Dernière relance" line is not displayed

6. **Given** an invoice has no pending reminders
   **When** I view the drawer
   **Then** the "Prochaine relance" line is not displayed

7. **Given** an invoice has no reminders at all
   **When** I view the drawer
   **Then** the entire reminders summary section is not displayed

### Drawer Compact
8. **Given** I open the invoice drawer
   **When** I look at the content
   **Then** I do NOT see the full "Historique des relances" list (ReminderHistorySection)
   **And** I do NOT see the full "Historique complet" list (EventHistorySection)
   **And** I see only the compact reminders summary (2 lines max)

9. **Given** the invoice has payments
   **When** I view the drawer
   **Then** the PaymentHistorySection is **collapsed by default**
   **And** shows only "Paiements (N) - Total €X" in the header

10. **Given** I want to see full history or all notes
    **When** I look at the drawer footer
    **Then** I see a prominent link "Voir historique complet →"
    **And** clicking it navigates to /invoices/:id

### Page Détail (inchangée)
11. **Given** I am on the invoice detail page
    **When** I view the Notes tab
    **Then** I see ALL notes with full input form (existing functionality)

## Tasks / Subtasks

- [ ] Task 1: Create ReminderStatusCompact component (AC: #4, #5, #6, #7)
  - [ ] Create `src/components/ReminderStatusCompact.tsx`
  - [ ] Query reminders with `api.reminders.getByInvoice`
  - [ ] Extract last completed reminder (completionStatus="completed", most recent)
  - [ ] Extract next pending reminder (completionStatus="pending", earliest date)
  - [ ] Display 2 lines max with icons and relative/absolute dates
  - [ ] Handle all empty states (no section if no reminders)

- [ ] Task 2: Create InvoiceNotesCompact component (AC: #1, #2, #3)
  - [ ] Create `src/components/InvoiceNotesCompact.tsx`
  - [ ] Query notes with `api.invoiceNotes.listForInvoice`
  - [ ] Display only `notes[0]` (most recent) if exists
  - [ ] Compact input: single line with inline send button
  - [ ] Handle submit with mutation and toast

- [ ] Task 3: Update PaymentHistorySection for compact mode (AC: #9)
  - [ ] Add prop `defaultExpanded?: boolean` (default: true for backward compat)
  - [ ] In Drawer, pass `defaultExpanded={false}`
  - [ ] Keep existing behavior on Detail page

- [ ] Task 4: Simplify InvoiceDetailDrawer (AC: #8, #10)
  - [ ] Remove `<ReminderHistorySection>` import and usage
  - [ ] Remove `<EventHistorySection>` import and usage
  - [ ] Add `<ReminderStatusCompact>` after Contact section
  - [ ] Add `<InvoiceNotesCompact>` after PaymentHistorySection
  - [ ] Pass `defaultExpanded={false}` to PaymentHistorySection
  - [ ] Make "Voir la page complète" link more prominent

- [ ] Task 5: Validate and test
  - [ ] Drawer: verify compact layout, no full historique sections
  - [ ] Drawer: verify reminder status compact (dernière + prochaine)
  - [ ] Drawer: verify notes compact works (add, display latest)
  - [ ] Drawer: verify payments collapsed by default
  - [ ] Page: verify full notes tab still works
  - [ ] Run `pnpm lint`

## Dev Notes

### Architecture Decision: Drawer vs Page

| Aspect | Drawer (Compact) | Page (Complète) |
|--------|------------------|-----------------|
| **Relances** | 2 lignes max (dernière + prochaine) | Liste complète (tab Historique) |
| **Notes** | Dernière note + input rapide | Toutes les notes + form complet |
| **Paiements** | Collapsé, header only | Expanded par défaut |
| **Historique Events** | ❌ Supprimé | ✅ Tab Historique |
| **Use case** | Agir vite | Analyser en détail |

### Backend Already Exists

**DO NOT modify backend code.** Use existing APIs:

```typescript
// Reminders
const reminders = useQuery(api.reminders.getByInvoice, { invoiceId });
// Returns all reminders for the invoice, we filter client-side

// Notes
const notes = useQuery(api.invoiceNotes.listForInvoice, { invoiceId });
const createNote = useMutation(api.invoiceNotes.create);
```

### ReminderStatusCompact Component

```tsx
// src/components/ReminderStatusCompact.tsx
interface ReminderStatusCompactProps {
  invoiceId: Id<"invoices">;
}

export function ReminderStatusCompact({ invoiceId }: ReminderStatusCompactProps) {
  const reminders = useQuery(api.reminders.getByInvoice, { invoiceId });

  if (reminders === undefined) {
    return null; // Loading - don't show skeleton for compact section
  }

  // Find last completed reminder (most recent by completedAt or reminderDate)
  const completedReminders = reminders
    .filter(r => r.completionStatus === "completed")
    .sort((a, b) => {
      const dateA = a.completedAt || new Date(a.reminderDate.replace(" ", "T")).getTime();
      const dateB = b.completedAt || new Date(b.reminderDate.replace(" ", "T")).getTime();
      return dateB - dateA; // DESC
    });
  const lastCompleted = completedReminders[0];

  // Find next pending reminder (earliest by reminderDate)
  const pendingReminders = reminders
    .filter(r => r.completionStatus === "pending")
    .sort((a, b) => {
      const dateA = new Date(a.reminderDate.replace(" ", "T")).getTime();
      const dateB = new Date(b.reminderDate.replace(" ", "T")).getTime();
      return dateA - dateB; // ASC
    });
  const nextPending = pendingReminders[0];

  // If no reminders at all, don't show section
  if (!lastCompleted && !nextPending) {
    return null;
  }

  return (
    <div className="space-y-1.5 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
        <Bell className="h-4 w-4" />
        Relances
      </p>

      {lastCompleted && (
        <LastReminderLine reminder={lastCompleted} />
      )}

      {nextPending && (
        <NextReminderLine reminder={nextPending} />
      )}
    </div>
  );
}
```

### Reminder Line Display

```tsx
// Last completed reminder line
function LastReminderLine({ reminder }: { reminder: Reminder }) {
  const Icon = reminder.reminderType === "email" ? Mail : Phone;
  const typeLabel = reminder.reminderType === "email" ? "Email" : "Appel";

  // Get outcome text
  let outcome = "✓";
  if (reminder.reminderType === "phone" && reminder.data?.phoneCallOutcome) {
    const outcomes: Record<string, string> = {
      will_pay: "✓ Promet paiement",
      no_answer: "Pas de réponse",
      voicemail: "Messagerie",
      dispute: "Litige",
    };
    outcome = outcomes[reminder.data.phoneCallOutcome] || "✓";
  }

  const date = reminder.completedAt
    ? new Date(reminder.completedAt)
    : new Date(reminder.reminderDate.replace(" ", "T"));

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-gray-600">Dernière :</span>
      <span className="text-gray-900">{typeLabel}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">
        {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
      </span>
      <span className={cn(
        "text-xs",
        outcome.startsWith("✓") ? "text-green-600" : "text-gray-500"
      )}>
        {outcome}
      </span>
    </div>
  );
}

// Next pending reminder line
function NextReminderLine({ reminder }: { reminder: Reminder }) {
  const Icon = reminder.reminderType === "email" ? Mail : Phone;
  const typeLabel = reminder.reminderType === "email" ? "Email" : "Appel";
  const date = new Date(reminder.reminderDate.replace(" ", "T"));

  // Check if it's in the past (overdue)
  const isOverdue = date < new Date();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-gray-600">Prochaine :</span>
      <span className="text-gray-900">{typeLabel}</span>
      <span className="text-gray-400">·</span>
      <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
        {isOverdue
          ? `En retard (${formatDistanceToNow(date, { locale: fr })})`
          : format(date, "d MMM", { locale: fr })
        }
      </span>
    </div>
  );
}
```

### InvoiceNotesCompact Component

```tsx
// src/components/InvoiceNotesCompact.tsx
interface InvoiceNotesCompactProps {
  invoiceId: Id<"invoices">;
}

export function InvoiceNotesCompact({ invoiceId }: InvoiceNotesCompactProps) {
  const notes = useQuery(api.invoiceNotes.listForInvoice, { invoiceId });
  const createNote = useMutation(api.invoiceNotes.create);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const latestNote = notes?.[0]; // Most recent

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createNote({ invoiceId, content: newNote.trim() });
      setNewNote("");
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-2 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4" />
        Notes
      </p>

      {/* Latest note (if exists) */}
      {latestNote && (
        <div className="p-2 bg-gray-50 rounded text-sm">
          <p className="text-gray-700 line-clamp-2">{latestNote.content}</p>
          <p className="text-xs text-gray-400 mt-1">
            {latestNote.createdByName} · {formatDistanceToNow(latestNote._creationTime, { addSuffix: true, locale: fr })}
          </p>
        </div>
      )}

      {/* Compact input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Ajouter une note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1 h-9 text-sm"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newNote.trim() || isSubmitting}
          className="h-9 px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
```

### PaymentHistorySection Update

```tsx
// Add prop
interface PaymentHistorySectionProps {
  invoiceId: Id<"invoices">;
  defaultExpanded?: boolean; // NEW: default true for backward compat
}

export function PaymentHistorySection({
  invoiceId,
  defaultExpanded = true  // Backward compatible
}: PaymentHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // ... rest unchanged
}
```

### Drawer Changes

```tsx
// InvoiceDetailDrawer.tsx

// REMOVE these imports:
// import { ReminderHistorySection } from "@/components/ReminderHistorySection";
// import { EventHistorySection } from "@/components/EventHistorySection";

// ADD these imports:
import { ReminderStatusCompact } from "@/components/ReminderStatusCompact";
import { InvoiceNotesCompact } from "@/components/InvoiceNotesCompact";

// In render section, NEW ORDER:
// 1. Amount
// 2. Dates
// 3. Contact
// 4. ReminderStatusCompact (NEW - compact 2 lines)
// 5. PaymentHistorySection (collapsed)
// 6. InvoiceNotesCompact (NEW)
// 7. Prominent link

// REMOVE:
// <ReminderHistorySection invoiceId={invoice._id} />
// <EventHistorySection invoiceId={invoice._id} />

// ADD after Contact section:
<ReminderStatusCompact invoiceId={invoice._id} />

// CHANGE PaymentHistorySection:
<PaymentHistorySection invoiceId={invoice._id} defaultExpanded={false} />

// ADD after PaymentHistorySection:
<InvoiceNotesCompact invoiceId={invoice._id} />

// UPDATE footer link:
<div className="pt-4 border-t">
  <NavLink
    to={`/invoices/${invoice._id}`}
    className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
  >
    Voir historique complet
    <ExternalLink className="h-4 w-4" />
  </NavLink>
</div>
```

### Files to Create

1. `src/components/ReminderStatusCompact.tsx` - Compact reminder status (2 lines)
2. `src/components/InvoiceNotesCompact.tsx` - Compact notes for drawer

### Files to Modify

1. `src/components/PaymentHistorySection.tsx` - Add `defaultExpanded` prop
2. `src/components/InvoiceDetailDrawer.tsx` - Remove full historiques, add compact components

### Files NOT to Modify

- `convex/invoiceNotes.ts` - Backend already complete
- `convex/reminders.ts` - Backend already complete
- `src/pages/InvoiceDetail.tsx` - Page stays as reference complète
- `src/components/ReminderHistorySection.tsx` - Keep file, just remove from drawer
- `src/components/EventHistorySection.tsx` - Keep file, just remove from drawer

### Dependencies (Already Installed)

- `sonner` - Toast notifications
- `date-fns` - `formatDistanceToNow`, `format` with `fr` locale
- `lucide-react` - Bell, Mail, Phone, MessageSquare, Send, ExternalLink
- Shadcn: Input, Button

### Drawer Structure After Changes

```
┌─────────────────────────────────────┐
│ #FAC-2024-001                   [X] │
│ Client Dupont                       │
│ [À envoyer] [Relance 2] [Non payée] │
│                                     │
│ 1 250,00 €                          │
│ Solde: 500,00 €  •  15j de retard   │
├─────────────────────────────────────┤
│ [Enregistrer paiement] [Reporter]   │
│ [⋯]                                 │
├─────────────────────────────────────┤
│ 📅 Facture: 22 déc 2025             │
│ 📅 Échéance: 5 jan 2026             │
│ 📅 Envoi: 23 déc 2025               │
├─────────────────────────────────────┤
│ 👤 Jean Contact                     │
│ 📧 contact@client.fr                │
├─────────────────────────────────────┤
│ 🔔 Relances                         │
│ 📧 Dernière : Email · il y a 5j ✓   │
│ 📞 Prochaine : Appel · 22 jan       │
├─────────────────────────────────────┤
│ 💳 Paiements (2) - 750,00 €    [v]  │  ← Collapsed
├─────────────────────────────────────┤
│ 📝 Notes                            │
│ ┌─────────────────────────────────┐ │
│ │ "Client a promis paiement..."   │ │
│ │ Marie · il y a 2h               │ │
│ └─────────────────────────────────┘ │
│ [Ajouter une note...        ] [➤]   │
├─────────────────────────────────────┤
│      → Voir historique complet      │
└─────────────────────────────────────┘
```

### Testing Checklist

1. [ ] **Reminder compact:** Shows "Dernière" line when completed exists
2. [ ] **Reminder compact:** Shows "Prochaine" line when pending exists
3. [ ] **Reminder compact:** Shows overdue styling for past pending reminders
4. [ ] **Reminder compact:** Hidden when no reminders at all
5. [ ] **Drawer compact:** No full ReminderHistorySection visible
6. [ ] **Drawer compact:** No full EventHistorySection visible
7. [ ] **Payments collapsed:** Section shows header only by default
8. [ ] **Notes compact:** Latest note displayed with author/time
9. [ ] **Notes compact:** Input works, toast shows, clears after submit
10. [ ] **Notes compact:** New note becomes the displayed one
11. [ ] **No notes:** Only input shown, no empty state text
12. [ ] **Link:** "Voir historique complet" navigates to page
13. [ ] **Page unchanged:** Full notes tab still works
14. [ ] **Run `pnpm lint`** - No errors

### References

- [Source: src/components/InvoiceDetailDrawer.tsx:519-523] - Where historiques are now
- [Source: src/components/ReminderHistorySection.tsx:94-132] - Reminder data structure
- [Source: src/components/PaymentHistorySection.tsx:15-16] - Where to add prop
- [Source: convex/invoiceNotes.ts:9-38] - listForInvoice query (DO NOT MODIFY)
- [Source: convex/reminders.ts] - getByInvoice query (DO NOT MODIFY)

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

### File List
