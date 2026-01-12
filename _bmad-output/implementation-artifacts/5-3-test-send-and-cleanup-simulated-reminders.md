# Story 5.3: Test Send and Cleanup Simulated Reminders

Status: review

## Story

As an **admin**,
I want **to send test emails from simulated reminders and clean up all simulations when done**,
So that **I can demonstrate real emails to clients and leave no simulation data behind**.

## Acceptance Criteria

1. **Given** I am viewing simulated email reminders
   **When** I click "Send as test" on a reminder
   **Then** I can enter a test email address
   **And** the email is sent to that address (not the real client)
   **And** the reminder is marked as "test sent"

2. **Given** I have simulated reminders in the system
   **When** I click "Clear all simulations" button
   **Then** all reminders with `isSimulation: true` are deleted
   **And** I see a confirmation message
   **And** the view returns to showing only real reminders

3. **Given** I change the date picker back to "today"
   **When** the view refreshes
   **Then** I see only real reminders (simulations are hidden but not deleted until cleanup)

## Tasks / Subtasks

- [x] Task 1: Create sendSimulatedTestEmail action (AC: #1)
  - [x] Create new action `sendSimulatedTestEmail` in `convex/emails.ts`
  - [x] Accept parameters: `{ recipientEmail: string, invoiceId: Id<"invoices">, reminderStepIndex: number }`
  - [x] Verify user is admin (reuse pattern from `sendTestEmail`)
  - [x] Get invoice data and organization's reminder step template
  - [x] Generate email content with template placeholders filled
  - [x] Send via Microsoft Graph API (reuse existing pattern)
  - [x] Return `{ success: true, emailSubject: string }`
  - [x] Run `pnpm dev:backend` to validate

- [x] Task 2: Add "Envoyer en test" button to EmailPreviewModalFollowUp (AC: #1)
  - [x] Modify `EmailPreviewModalFollowUp.tsx`
  - [x] For simulated reminders only: show "Envoyer en test" button (not "Envoyer")
  - [x] Button opens a dialog to enter test email address
  - [x] Pre-fill with admin's email or last used test email
  - [x] Show loading state while sending

- [x] Task 3: Create TestEmailDialog component (AC: #1)
  - [x] Integrated dialog directly in `EmailPreviewModalFollowUp.tsx` (cleaner architecture)
  - [x] Dialog with email input field
  - [x] "Envoyer" and "Annuler" buttons
  - [x] Email validation (basic format check)
  - [x] Call `sendSimulatedTestEmail` action on confirm
  - [x] Show success toast and close dialog
  - [x] Handle errors with toast

- [x] Task 4: Track "test sent" status in UI (AC: #1)
  - [x] Add local state in FollowUp.tsx: `testSentIds: Set<string>`
  - [x] After successful test send, add simulated reminder ID to set
  - [x] Pass `testSentIds` to ReminderCard components
  - [x] Show "Test envoyé" badge on cards that have been test-sent
  - [x] Reset `testSentIds` when exiting simulation mode

- [x] Task 5: Enhance "Quitter simulation" to clear all (AC: #2, #3)
  - [x] Button "Quitter simulation" (already exists from 5.2)
  - [x] When clicked: reset `simulationDate` to null AND `testSentIds` to empty
  - [x] View automatically returns to real reminders (existing behavior)

- [x] Task 6: Test and validate (AC: #1-3)
  - [x] Run `pnpm lint` to verify no errors - PASSED

## Dev Notes

### Architecture Decision

This story completes the admin simulation feature by adding the ability to **actually send** simulated emails to a test address (not the real client). Key architectural choices:

1. **Simulated reminders are NOT persisted** (from Story 5.2) - they're generated on-the-fly
2. **"Test sent" status is UI-only** - tracked in React state, not database
3. **Reuse existing email sending infrastructure** from `convex/emails.ts`
4. **"Clear all simulations"** simply exits simulation mode - no DB cleanup needed

### Critical Understanding from Story 5.2

From Story 5.2's implementation:
- Simulated reminders are **computed on-the-fly** by `generateSimulatedReminders` query
- They have `isSimulation: true` flag but are NOT stored in the `reminders` table
- Exiting simulation mode (setting `simulationDate` to null) automatically hides them
- Therefore, AC #2 "delete all reminders with isSimulation" just means **exit simulation mode**

### Backend Implementation

**Modified File: `convex/emails.ts` - Add `sendSimulatedTestEmail` action**

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const sendSimulatedTestEmail = action({
  args: {
    recipientEmail: v.string(),
    invoiceId: v.id("invoices"),
    reminderStepIndex: v.number(), // 0-indexed step in reminderSteps array
  },
  handler: async (ctx, { recipientEmail, invoiceId, reminderStepIndex }) => {
    // 1. Get authenticated user and verify admin
    const user = await ctx.runQuery(api.auth.loggedInUser);
    if (!user || user.role !== "admin") {
      throw new Error("Accès refusé: réservé aux administrateurs");
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Format d'email invalide");
    }

    // 3. Get invoice data
    const invoice = await ctx.runQuery(internal.invoices.getInvoiceInternal, {
      invoiceId,
    });
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // 4. Get organization with OAuth tokens and reminder config
    const org = await ctx.runQuery(internal.organizations.getOrgWithTokens, {
      organizationId: user.organizationId,
    });

    if (!org.emailAccessToken || !org.emailRefreshToken) {
      throw new Error("Compte email non connecté. Connectez votre compte Microsoft dans les paramètres.");
    }

    // 5. Get reminder step template
    const reminderSteps = org.reminderSteps || [];
    if (reminderStepIndex < 0 || reminderStepIndex >= reminderSteps.length) {
      throw new Error("Étape de relance invalide");
    }
    const step = reminderSteps[reminderStepIndex];

    // 6. Generate email content from template
    const emailSubject = (step.emailSubject || "Relance facture {{invoiceNumber}}")
      .replace(/\{\{clientName\}\}/g, invoice.clientName)
      .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNumber)
      .replace(/\{\{amount\}\}/g, `${invoice.amountTTC.toFixed(2)} €`)
      .replace(/\{\{dueDate\}\}/g, invoice.dueDate);

    const emailContent = (step.emailTemplate || "Bonjour {{clientName}},\n\nCeci est un rappel pour la facture {{invoiceNumber}}.")
      .replace(/\{\{clientName\}\}/g, invoice.clientName)
      .replace(/\{\{invoiceNumber\}\}/g, invoice.invoiceNumber)
      .replace(/\{\{amount\}\}/g, `${invoice.amountTTC.toFixed(2)} €`)
      .replace(/\{\{dueDate\}\}/g, invoice.dueDate);

    // 7. Refresh token if needed
    let accessToken = org.emailAccessToken;
    if (org.emailTokenExpiresAt && org.emailTokenExpiresAt < Date.now() + 10 * 60 * 1000) {
      accessToken = await ctx.runAction(internal.oauth.performTokenRefresh, {
        organizationId: user.organizationId,
      });
    }

    // 8. Send via Microsoft Graph API
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: `[TEST] ${emailSubject}`,
          body: {
            contentType: "Text",
            content: `--- EMAIL DE TEST (SIMULATION) ---\n\nDestinataire réel: ${invoice.contactEmail}\n\n--- CONTENU DE L'EMAIL ---\n\n${emailContent}`,
          },
          toRecipients: [{ emailAddress: { address: recipientEmail } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Échec de l'envoi: ${response.status} - ${errorText}`);
    }

    return { success: true, emailSubject };
  },
});
```

**Note:** Need to create `internal.invoices.getInvoiceInternal` if not exists, or reuse existing internal query.

### Frontend Implementation

**Modified File: `src/components/EmailPreviewModalFollowUp.tsx`**

Add "Envoyer en test" functionality for simulated reminders:

```tsx
// In existing EmailPreviewModalFollowUp component

// Add new state for test email dialog
const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
const [testEmailAddress, setTestEmailAddress] = useState("");
const [isSendingTest, setIsSendingTest] = useState(false);

const sendSimulatedTestEmail = useAction(api.emails.sendSimulatedTestEmail);

// Handler for test send
const handleSendTest = async () => {
  if (!testEmailAddress || !reminder) return;

  setIsSendingTest(true);
  try {
    await sendSimulatedTestEmail({
      recipientEmail: testEmailAddress,
      invoiceId: reminder.invoice._id,
      reminderStepIndex: parseInt(reminder.reminderStatus.replace("reminder_", "")) - 1,
    });

    toast({
      title: "Email de test envoyé",
      description: `L'email a été envoyé à ${testEmailAddress}`,
    });

    // Notify parent that test was sent (for badge tracking)
    onTestSent?.(reminder._id);
    setShowTestEmailDialog(false);
    onClose();
  } catch (error) {
    toast({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Échec de l'envoi",
      variant: "destructive",
    });
  } finally {
    setIsSendingTest(false);
  }
};

// In the modal footer, replace hidden send button for simulations with:
{reminder.isSimulation && (
  <Button
    variant="default"
    onClick={() => setShowTestEmailDialog(true)}
    className="bg-purple-600 hover:bg-purple-700"
  >
    <Send className="h-4 w-4 mr-2" />
    Envoyer en test
  </Button>
)}

// Add TestEmailDialog
<Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>Envoyer un email de test</DialogTitle>
      <DialogDescription>
        L'email sera envoyé à l'adresse ci-dessous, pas au client réel ({reminder?.invoice.contactEmail}).
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="test-email">Adresse email de test</Label>
        <Input
          id="test-email"
          type="email"
          placeholder="test@exemple.com"
          value={testEmailAddress}
          onChange={(e) => setTestEmailAddress(e.target.value)}
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowTestEmailDialog(false)}>
        Annuler
      </Button>
      <Button
        onClick={handleSendTest}
        disabled={!testEmailAddress || isSendingTest}
        className="bg-purple-600 hover:bg-purple-700"
      >
        {isSendingTest ? "Envoi..." : "Envoyer"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

**Modified File: `src/pages/FollowUp.tsx`**

Add test sent tracking:

```tsx
// Add state for tracking test-sent reminders
const [testSentIds, setTestSentIds] = useState<Set<string>>(new Set());

// Reset when exiting simulation
const handleExitSimulation = () => {
  setSimulationDate(null);
  setTestSentIds(new Set());
  toast({
    title: "Mode simulation terminé",
    description: "Retour aux relances réelles",
  });
};

// Handler for when a test email is sent
const handleTestSent = (reminderId: string) => {
  setTestSentIds(prev => new Set([...prev, reminderId]));
};

// Pass to ReminderCard
<ReminderCard
  reminder={reminder}
  testSent={testSentIds.has(reminder._id)}
  onTestSent={handleTestSent}
  // ... other props
/>

// Update simulation banner button
<Button
  variant="ghost"
  size="sm"
  onClick={handleExitSimulation}
  className="text-purple-700 hover:text-purple-900"
>
  Quitter simulation
</Button>
```

**Modified File: ReminderCard in FollowUp.tsx**

Add "Test envoyé" badge:

```tsx
// Add to ReminderCard props
interface ReminderCardProps {
  reminder: AnyReminder;
  testSent?: boolean;
  onTestSent?: (id: string) => void;
  // ... existing props
}

// In ReminderCard JSX, after "Simulation" badge:
{testSent && (
  <Badge className="bg-green-100 text-green-700 border-green-200">
    <Check className="h-3 w-3 mr-1" />
    Test envoyé
  </Badge>
)}
```

### Existing Code References

- [Source: convex/emails.ts:1-50] - `sendTestEmail` action - pattern to follow
- [Source: convex/emails.ts:15-20] - Admin verification pattern
- [Source: convex/emails.ts:35-50] - Microsoft Graph sendMail pattern
- [Source: convex/oauth.ts:performTokenRefresh] - Token refresh internal action
- [Source: src/pages/FollowUp.tsx:45-60] - Simulation date state and banner
- [Source: src/pages/FollowUp.tsx:317-506] - ReminderCard component
- [Source: src/components/EmailPreviewModalFollowUp.tsx] - Email preview modal (modified in 5.2)
- [Source: convex/followUp.ts:generateSimulatedReminders] - Query that generates simulated reminders

### UI Patterns (from existing code)

```tsx
// Dialog pattern (from existing modals)
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    {/* Content */}
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

// Badge pattern (from ReminderCard)
<Badge className="bg-green-100 text-green-700 border-green-200">
  <Check className="h-3 w-3 mr-1" />
  Label
</Badge>

// Toast pattern
toast({
  title: "Success title",
  description: "Description text",
});
```

### Technical Requirements

**Convex Dependencies:**
- Use `action` for `sendSimulatedTestEmail` (external API call to Microsoft Graph)
- Reuse `internal.oauth.performTokenRefresh` for token refresh
- May need to create `internal.invoices.getInvoiceInternal` query

**Frontend Dependencies (already installed):**
- Shadcn `Dialog`, `Button`, `Input`, `Label`, `Badge` components
- `lucide-react` icons: `Send`, `Check`
- `@/hooks/use-toast` for notifications

**Type Updates:**

```typescript
// Update EmailPreviewModalFollowUp props
interface EmailPreviewModalProps {
  // ... existing props
  onTestSent?: (reminderId: string) => void;
}

// Update ReminderCard props
interface ReminderCardProps {
  // ... existing props
  testSent?: boolean;
  onTestSent?: (id: string) => void;
}
```

### Security Considerations

- Admin role verification in backend action (throws error for non-admins)
- Email sent to test address, NOT to real client
- Email clearly marked as "[TEST]" in subject
- Email body includes note about simulation and real recipient
- OAuth tokens stay in backend, never sent to frontend

### Edge Cases to Handle

1. **No OAuth connected** → Show error toast with link to settings
2. **Invalid email format** → Show validation error before sending
3. **Send fails** → Show error toast with retry option
4. **Multiple test sends** → Allow, each adds to testSentIds set
5. **Exit simulation after test sends** → Clear testSentIds, return to real view

### Previous Story Intelligence

**From Story 5.1:**
- Email sending pattern with Microsoft Graph API
- Admin role verification: `user.role !== "admin"` throw error
- Token refresh: check `emailTokenExpiresAt` before sending
- Toast patterns for success/error
- Server-side email validation regex

**From Story 5.2:**
- Simulated reminders have `isSimulation: true` flag
- `EmailPreviewModalFollowUp` already handles simulation (hides real send)
- Purple styling for simulation mode (bg-purple-50, text-purple-700)
- `simulationDate` state controls simulation mode
- Exiting simulation = setting `simulationDate` to null

**Key Learning:** Simulated reminders are NOT persisted - they're generated on-the-fly. "Clear all simulations" just means exit simulation mode.

### Git Intelligence

**Recent commits (Story 5.1 and 5.2):**
- `391f5a1 feat: add admin date simulation on /follow-up (story 5.2)`
- `5bc389f feat: add send test email to custom address (story 5.1)`

**Pattern:** Use `feat:` prefix for feature implementation commits.

### File Structure

```
convex/
├── emails.ts              # MODIFY: Add sendSimulatedTestEmail action
└── invoices.ts            # MODIFY: Add getInvoiceInternal if needed

src/pages/
└── FollowUp.tsx           # MODIFY: Add testSentIds state, handleExitSimulation, handleTestSent

src/components/
└── EmailPreviewModalFollowUp.tsx  # MODIFY: Add test email dialog and send functionality
```

### Dependencies

No new dependencies required. Uses existing:
- Shadcn Dialog, Button, Input, Label, Badge (already in project)
- `lucide-react` Send, Check icons (already in project)
- `@/hooks/use-toast` (already in project)

### Project Context Reference

Refer to `CLAUDE.md` for:
- Import aliases: always use `@/lib/utils` not relative paths
- Convex validation: run `pnpm dev:backend` after Convex changes
- Lint check: run `pnpm lint` before completion

### Testing Checklist

1. [ ] As admin, simulation mode active, click email reminder → "Envoyer en test" button visible
2. [ ] Click "Envoyer en test" → dialog opens with email input
3. [ ] Enter valid email and send → email received with [TEST] prefix and simulation note
4. [ ] After send → "Test envoyé" badge appears on card
5. [ ] Click "Quitter simulation" → returns to real reminders, badges cleared
6. [ ] As technician → cannot access simulation features
7. [ ] Invalid email format → validation error shown
8. [ ] No OAuth connected → error message with link to settings
9. [ ] Run `pnpm lint` - no errors

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Backend validation passed with `npx convex dev --once`
- Frontend lint and build passed with `pnpm lint`

### Completion Notes List

- **Task 1**: Created `sendSimulatedTestEmail` action in `convex/emails.ts` with:
  - Two internal queries: `getInvoiceForTestEmail` and `getOrgWithTokensAndSteps`
  - Full admin verification
  - Email template placeholder replacement
  - Microsoft Graph API integration with token refresh
  - Email marked with `[TEST]` prefix and simulation note in body

- **Task 2 & 3**: Added "Envoyer en test" button and dialog directly in `EmailPreviewModalFollowUp.tsx`:
  - Purple-styled button visible only for simulation reminders (admin only)
  - Dialog pre-fills with admin's email address
  - Basic email validation
  - Loading state during send
  - Success/error toast notifications
  - Notifies parent component when test sent

- **Task 4**: Implemented test sent tracking in `FollowUp.tsx`:
  - `testSentIds` state (Set) tracks sent test emails
  - `handleTestSent` callback passed through ReminderGroup to modal
  - Green "Test envoyé" badge shown on ReminderCard when test was sent

- **Task 5**: Enhanced exit simulation with `handleExitSimulation`:
  - Clears both `simulationDate` and `testSentIds`
  - Both exit buttons (X and "Quitter simulation") use this handler

- **Architecture decision**: Integrated TestEmailDialog directly in EmailPreviewModalFollowUp.tsx instead of creating separate component - cleaner code organization since dialog is only used in that context.

### File List

- `convex/emails.ts` - Added `sendSimulatedTestEmail` action, `getInvoiceForTestEmail` and `getOrgWithTokensAndSteps` internal queries
- `src/components/EmailPreviewModalFollowUp.tsx` - Added test email dialog, "Envoyer en test" button, and `onTestSent` prop
- `src/pages/FollowUp.tsx` - Added `testSentIds` state, `handleTestSent` and `handleExitSimulation` handlers, passed props through ReminderGroup to ReminderCard, added "Test envoyé" badge

