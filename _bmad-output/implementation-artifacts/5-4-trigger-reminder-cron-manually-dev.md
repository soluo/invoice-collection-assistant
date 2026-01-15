# Story 5.4: Trigger Reminder Cron Manually (Dev Mode)

Status: ready-for-dev

## Story

As an **admin in development mode**,
I want **to manually trigger the reminder generation cron for a specific date**,
So that **I can test the complete reminder flow end-to-end without waiting for the daily cron**.

## Acceptance Criteria

1. **Given** I am in simulation mode viewing simulated reminders
   **When** I click "Générer ces relances" button
   **Then** the system creates REAL reminders in the database
   **And** I see a confirmation toast with the count of reminders created
   **And** simulation mode exits automatically

2. **Given** I have generated reminders manually
   **When** I view the "En cours" tab (after exiting simulation)
   **Then** I can see the newly created reminders
   **And** I can interact with them like normal reminders (preview, send, edit)

3. **Given** I am NOT in a development deployment (production)
   **When** the page loads in simulation mode
   **Then** the "Générer ces relances" button is NOT visible
   **And** only preview/test send capabilities remain available

4. **Given** reminders have been generated and sent
   **When** I view the History tab or invoice details
   **Then** the sent reminders appear in the history with proper audit trail

## Tasks / Subtasks

- [ ] Task 1: Create `triggerManualReminderGeneration` action (AC: #1, #3)
  - [ ] Create new file `convex/dev.ts` for dev-only actions
  - [ ] Add action `triggerManualReminderGeneration` with args: `{ targetDate: string }`
  - [ ] Verify deployment is NOT production (check `process.env` for "prod")
  - [ ] Verify user is admin (reuse existing pattern)
  - [ ] Call `internal.reminders.generateDailyReminders` with `currentDate` param
  - [ ] Return `{ success: true, remindersCreated: number }`
  - [ ] Run `pnpm dev:backend` to validate

- [ ] Task 2: Add dev mode detection utility (AC: #3)
  - [ ] Create or update `src/lib/devMode.ts`
  - [ ] Add `isDevDeployment()` function that returns boolean
  - [ ] Check Convex deployment URL for "dev" or localhost patterns
  - [ ] Export for use in components

- [ ] Task 3: Add "Générer ces relances" button to simulation banner (AC: #1, #2)
  - [ ] Modify `src/pages/FollowUp.tsx` simulation banner section
  - [ ] Add button only if `isDevDeployment() && simulationDate && isAdmin`
  - [ ] Style button in purple (consistent with simulation theme)
  - [ ] Add loading state while generating
  - [ ] On success: show toast with count, call `handleExitSimulation()`
  - [ ] On error: show error toast with message

- [ ] Task 4: Test and validate (AC: #1-4)
  - [ ] Test: Button visible in dev deployment with simulation active
  - [ ] Test: Button NOT visible in prod-like deployment URL
  - [ ] Test: Generate reminders for future date creates real DB entries
  - [ ] Test: Exit simulation shows new reminders in "En cours" tab
  - [ ] Test: Can send generated reminders and see them in history
  - [ ] Run `pnpm lint` - no errors

## Dev Notes

### Architecture Decision

This story completes **FR30: Trigger reminder generation for date** by allowing admins to generate REAL reminders in the database during development/demo. This is distinct from Story 5.2-5.3 which only provide read-only simulation.

**Key Design Choices:**
1. **Dev-only safeguard** - Production deployments cannot trigger manual generation
2. **Reuse existing cron logic** - `generateDailyReminders` already supports `currentDate` param
3. **Automatic exit from simulation** - After generation, user sees real data immediately
4. **Separate dev.ts file** - Clean separation of dev-only actions from production code

### Existing Code to Reuse

**Backend - `convex/reminders.ts:486-600`:**
```typescript
export const generateDailyReminders = internalMutation({
  args: {
    currentDate: v.optional(v.string()), // Format YYYY-MM-DD - USE THIS!
    organizationId: v.optional(v.id("organizations")), // For targeted generation
    generatedByCron: v.optional(v.boolean()), // Set to FALSE for manual
  },
  // ... generates real reminders in DB
});
```

**Frontend - `src/pages/FollowUp.tsx:144-162`:**
- Existing simulation banner with "Quitter simulation" button
- `handleExitSimulation()` function to reuse after generation

### Backend Implementation

**New File: `convex/dev.ts`**

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Manually trigger reminder generation for a specific date
 * DEV ONLY - blocked in production deployments
 */
export const triggerManualReminderGeneration = action({
  args: {
    targetDate: v.string(), // Format YYYY-MM-DD
  },
  returns: v.object({
    success: v.boolean(),
    remindersCreated: v.number(),
  }),
  handler: async (ctx, { targetDate }) => {
    // 1. Check if production deployment (BLOCK if so)
    const deploymentUrl = process.env.CONVEX_CLOUD_URL || "";
    const isProduction = deploymentUrl.includes("prod") ||
                         (deploymentUrl.includes("convex.cloud") && !deploymentUrl.includes("dev"));

    if (isProduction) {
      throw new Error("Cette action n'est disponible qu'en environnement de développement");
    }

    // 2. Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // 3. Get user and verify admin
    const user = await ctx.runQuery(internal.oauth.getUserForOAuth, { userId });
    if (!user || user.role !== "admin") {
      throw new Error("Accès refusé: réservé aux administrateurs");
    }

    // 4. Call existing reminder generation logic
    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: targetDate,
      organizationId: user.organizationId,
      generatedByCron: false, // Mark as manual trigger
    });

    return {
      success: true,
      remindersCreated: result.totalRemindersGenerated,
    };
  },
});
```

### Frontend Implementation

**New File: `src/lib/devMode.ts`**

```typescript
/**
 * Check if current deployment is development (not production)
 * Used to conditionally show dev-only features
 */
export function isDevDeployment(): boolean {
  // In Vite, import.meta.env.VITE_CONVEX_URL contains the deployment URL
  const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

  // Dev indicators: contains "dev", is localhost, or doesn't contain "prod"
  const isDev = convexUrl.includes("dev") ||
                convexUrl.includes("localhost") ||
                !convexUrl.includes("prod");

  return isDev;
}
```

**Modified: `src/pages/FollowUp.tsx`**

```tsx
// Add imports
import { isDevDeployment } from "@/lib/devMode";
import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";

// Inside FollowUp component, add:
const triggerGeneration = useAction(api.dev.triggerManualReminderGeneration);
const [isGenerating, setIsGenerating] = useState(false);

const handleGenerateReminders = async () => {
  if (!simulationDateString) return;

  setIsGenerating(true);
  try {
    const result = await triggerGeneration({ targetDate: simulationDateString });
    toast.success(`${result.remindersCreated} relance(s) créée(s)`, {
      description: "Les relances sont maintenant visibles dans 'En cours'",
    });
    handleExitSimulation(); // Exit simulation to show real data
  } catch (error: any) {
    toast.error(error?.message || "Échec de la génération");
  } finally {
    setIsGenerating(false);
  }
};

// In the simulation banner, add button:
{simulationDate && isDevDeployment() && (
  <Button
    variant="default"
    size="sm"
    onClick={handleGenerateReminders}
    disabled={isGenerating}
    className="bg-purple-600 hover:bg-purple-700 text-white"
  >
    {isGenerating ? "Génération..." : "Générer ces relances"}
  </Button>
)}
```

### Security Considerations

1. **Production guard** - Double check: backend verifies deployment URL, frontend hides button
2. **Admin-only** - Backend verifies `user.role === "admin"`
3. **Audit trail** - Generated reminders marked with `generatedByCron: false` for traceability
4. **Organization isolation** - Only generates for current user's organization

### Previous Story Intelligence

**From Story 5.2:**
- `generateSimulatedReminders` query generates read-only simulations
- Simulation banner UI pattern: purple theme, "Quitter simulation" button
- `simulationDate` state controls simulation mode

**From Story 5.3:**
- `handleExitSimulation()` resets both `simulationDate` and `testSentIds`
- Toast patterns for success/error notifications
- Admin verification pattern in actions

**Key Insight:** The existing `generateDailyReminders` internal mutation already does exactly what we need - we just need to expose it safely through a dev-only action wrapper.

### File Structure

```
convex/
├── dev.ts                 # NEW: Dev-only actions
├── reminders.ts           # EXISTING: generateDailyReminders to call

src/
├── lib/
│   └── devMode.ts         # NEW: isDevDeployment() utility
├── pages/
│   └── FollowUp.tsx       # MODIFY: Add "Générer ces relances" button
```

### Testing Checklist

1. [ ] As admin in dev deployment + simulation mode → "Générer ces relances" button visible
2. [ ] Click button → reminders created in DB with correct data
3. [ ] After generation → auto-exit simulation, reminders visible in "En cours"
4. [ ] Can preview/send generated reminders normally
5. [ ] Sent reminders appear in History tab
6. [ ] In prod-like URL → button NOT visible
7. [ ] As technician → button NOT visible (no simulation mode at all)
8. [ ] Run `pnpm lint` - no errors

### Dependencies

No new dependencies required. Uses existing:
- Convex action/mutation patterns
- Shadcn Button component
- Toast from sonner
- `format` from date-fns (already in FollowUp.tsx)

### Edge Cases

1. **No invoices eligible** → Returns 0 reminders created, show info toast
2. **Already generated for date** → Existing cron logic handles duplicates
3. **Network error during generation** → Show error toast, can retry
4. **Dev mode detection fails** → Default to hiding button (safe fallback)

## Dev Agent Record

### Agent Model Used

(To be filled by dev agent)

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

(To be filled during implementation)
