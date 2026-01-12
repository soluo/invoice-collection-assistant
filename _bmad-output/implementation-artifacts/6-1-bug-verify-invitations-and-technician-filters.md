# Story 6.1: Bug - Vérifier Invitations et Filtres Techniciens

Status: done

## Story

As an **admin**,
I want **the invitation system and technician filters to work correctly**,
So that **new team members can join with the correct role and technicians only see their own invoices**.

## Problem Statement

When a technician is invited:
1. They receive and load the invitation URL
2. They create their account and are logged in
3. **BUG:** The invitation remains "pending" in the database
4. **BUG:** The user's role is saved as "admin" instead of the invited role (technicien)

## Root Cause Analysis

The bug is caused by a **race condition** in the authentication flow:

### Current Flow (Broken):
1. User loads `/accept-invitation/:token` and submits form
2. `sessionStorage.setItem("pendingInvitationData", {token, userName})`
3. `signIn("password", signUpFormData)` creates account via Convex Auth
4. **`afterUserCreatedOrUpdated` callback fires** (convex/auth.ts:22-45):
   - Checks `if (user.organizationId)` → FALSE (new user)
   - **Creates new org "Ma société"** with role "admin"
   - User now has `organizationId` set!
5. App.tsx useEffect checks `!loggedInUser.organizationId` (line 83)
   - **Condition is FALSE** because callback already set organizationId
   - `acceptInvitation` mutation is **NEVER called**
6. Result: Invitation stays "pending", user is admin in wrong org

### Affected Files:
| File | Lines | Issue |
|------|-------|-------|
| `convex/auth.ts` | 22-45 | Callback creates org before invitation can be processed |
| `src/App.tsx` | 81-105 | Condition `!loggedInUser.organizationId` fails |

## Acceptance Criteria

### AC1: Invitation Acceptance Works Correctly
**Given** I have sent an invitation to a new team member with role "technicien"
**When** the invited user accepts the invitation by creating their account
**Then** the user should have role "technicien" (NOT "admin")
**And** the user should belong to MY organization (the inviting org)
**And** the invitation status should be "accepted" (NOT "pending")
**And** NO new "Ma société" organization should be created

### AC2: Existing User Without Invitation Still Works
**Given** a new user signs up via /signup (NOT invitation)
**When** they create their account
**Then** a new organization should be created for them
**And** they should have role "admin" in that organization

### AC3: Technician Filter Works
**Given** I am logged in as a technician
**When** I view the invoice list on /invoices
**Then** I should only see invoices I created (createdBy = my userId)
**And** I should NOT see invoices created by other technicians or admins

### AC4: Automated Tests Prevent Regression
**Given** the test suite is set up with convex-test and vitest
**When** I run `pnpm test`
**Then** tests should verify invitation flow assigns correct role
**And** tests should verify invitation status is updated to "accepted"
**And** tests should verify technician RBAC filtering works
**And** all tests should pass

## Tasks / Subtasks

- [x] Task 1: Setup test framework (AC: #4)
  - [x] 1.1 Install `convex-test` and `vitest` dependencies
  - [x] 1.2 Create `vitest.config.ts` for Convex tests
  - [x] 1.3 Add test scripts to `package.json`
  - [x] 1.4 Create `convex/tests/` directory structure

- [x] Task 2: Write tests for invitation bug prevention (AC: #1, #4)
  - [x] 2.1 Test: User with pending invitation should NOT get default org in auth callback
  - [x] 2.2 Test: User without invitation should get default org in auth callback
  - [x] 2.3 Test: acceptInvitation assigns correct role from invitation
  - [x] 2.4 Test: acceptInvitation updates invitation status to "accepted"

- [x] Task 3: Fix auth callback to check for pending invitations (AC: #1)
  - [x] 3.1 In `convex/auth.ts`, check if user's email has a pending invitation before creating org
  - [x] 3.2 If pending invitation exists, skip org creation entirely (let acceptInvitation handle it)
  - [x] 3.3 Write internal query to check for pending invitation by email

- [x] Task 4: Update App.tsx invitation flow logic (AC: #1)
  - [x] 4.1 Change condition to check for `pendingInvitationData` presence, not just `!organizationId`
  - [x] 4.2 If invited user already got default org from callback, handle cleanup
  - Note: App.tsx logic was already correct - the fix in auth.ts was sufficient

- [x] Task 5: Write tests for technician RBAC filtering (AC: #3)
  - [x] 5.1 Test: Technician only sees invoices they created
  - [x] 5.2 Test: Admin sees all invoices in organization
  - [x] 5.3 Test: Technician cannot see invoices from other technicians

- [x] Task 6: Verify tests pass and run CI (AC: #1, #2, #3, #4)
  - [x] 6.1 Run full test suite with `pnpm test`
  - [x] 6.2 Run `pnpm lint` to ensure no type errors
  - [x] 6.3 Code review completed with fixes applied

## Dev Notes

### Recommended Fix Strategy

**Option A (Recommended): Check for pending invitation in auth callback**

```typescript
// convex/auth.ts - afterUserCreatedOrUpdated callback
async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId }) {
  const user = await ctx.db.get(userId);
  if (!user) return;

  // Already has org (existing user login or already processed)
  if (user.organizationId) return;

  // NEW: Check if user has a pending invitation
  const pendingInvitation = await ctx.db
    .query("invitations")
    .withIndex("by_email", (q) => q.eq("email", normalizeEmail(user.email!)))
    .filter((q) => q.eq(q.field("status"), "pending"))
    .first();

  // If invited user, skip org creation - let acceptInvitation handle it
  if (pendingInvitation) {
    console.log("User has pending invitation, skipping default org creation");
    return;
  }

  // Regular signup: create default organization
  const organizationId = await ctx.db.insert("organizations", { ... });
  await ctx.db.patch(userId, { organizationId, role: "admin" });
}
```

**Option B: Remove auto org creation from callback entirely**

Move all org creation logic to explicit mutations (`createOrganizationWithAdmin` and `acceptInvitation`). Auth callback would only handle basic user record updates.

### Test Framework Setup

**1. Install dependencies:**
```bash
pnpm add -D convex-test vitest @edge-runtime/vm
```

**2. Create `vitest.config.mts` at project root:**
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/**/*.test.ts"],
  },
});
```

**3. Add scripts to `package.json`:**
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

**4. Create test file `convex/invitations.test.ts`:**
```typescript
import { convexTest } from "convex-test";
import { describe, it, expect, beforeEach } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

describe("Invitation Flow", () => {
  describe("acceptInvitation", () => {
    it("should assign the correct role from invitation (technicien)", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin user
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin",
          role: "admin",
          organizationId: orgId,
        });
      });

      // Create invitation for technicien
      const invitationId = await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "tech@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "test-token-123",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Create the invited user (simulating signup)
      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech User",
        });
      });

      // Accept invitation as the tech user
      await t.mutation(api.organizations.acceptInvitation, {
        token: "test-token-123",
        userName: "Tech User",
      }).asUser(techId);

      // Verify user has correct role
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(techId);
      });

      expect(user?.role).toBe("technicien");
      expect(user?.organizationId).toBe(orgId);

      // Verify invitation is marked as accepted
      const invitation = await t.run(async (ctx) => {
        return await ctx.db.get(invitationId);
      });

      expect(invitation?.status).toBe("accepted");
    });

    it("should NOT create default org for user with pending invitation", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Inviting Org",
          createdAt: Date.now(),
          signature: "Test",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin",
          role: "admin",
          organizationId: orgId,
        });
      });

      // Create pending invitation
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "newuser@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "pending-token",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Count organizations before
      const orgCountBefore = await t.run(async (ctx) => {
        return (await ctx.db.query("organizations").collect()).length;
      });

      // The auth callback should check for pending invitation
      // and NOT create a default org - this is what the fix implements
      // After fix: invited user signup should not trigger org creation

      expect(orgCountBefore).toBe(1); // Only the inviting org exists
    });
  });
});

describe("Technician RBAC", () => {
  it("technician should only see own invoices", async () => {
    const t = convexTest(schema, modules);

    // Setup org
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test",
      });
    });

    // Create two technicians
    const tech1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech1@test.com",
        name: "Tech 1",
        role: "technicien",
        organizationId: orgId,
      });
    });

    const tech2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech2@test.com",
        name: "Tech 2",
        role: "technicien",
        organizationId: orgId,
      });
    });

    // Tech1 creates an invoice
    await t.run(async (ctx) => {
      return await ctx.db.insert("invoices", {
        invoiceNumber: "INV-001",
        clientName: "Client A",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech1Id,
        createdBy: tech1Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Tech2 creates an invoice
    await t.run(async (ctx) => {
      return await ctx.db.insert("invoices", {
        invoiceNumber: "INV-002",
        clientName: "Client B",
        amountTTC: 2000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech2Id,
        createdBy: tech2Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Tech1 queries invoices - should only see own
    const tech1Invoices = await t.query(api.invoices.list, {})
      .asUser(tech1Id);

    expect(tech1Invoices.invoices).toHaveLength(1);
    expect(tech1Invoices.invoices[0].invoiceNumber).toBe("INV-001");
  });

  it("admin should see all org invoices", async () => {
    const t = convexTest(schema, modules);

    // Setup org
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test",
      });
    });

    // Create admin and technician
    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "admin@test.com",
        name: "Admin",
        role: "admin",
        organizationId: orgId,
      });
    });

    const techId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech@test.com",
        name: "Tech",
        role: "technicien",
        organizationId: orgId,
      });
    });

    // Create invoices from both users
    await t.run(async (ctx) => {
      await ctx.db.insert("invoices", {
        invoiceNumber: "INV-ADMIN",
        clientName: "Client Admin",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: adminId,
        createdBy: adminId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      await ctx.db.insert("invoices", {
        invoiceNumber: "INV-TECH",
        clientName: "Client Tech",
        amountTTC: 2000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: techId,
        createdBy: techId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Admin queries invoices - should see all
    const adminInvoices = await t.query(api.invoices.list, {})
      .asUser(adminId);

    expect(adminInvoices.invoices).toHaveLength(2);
  });
});
```

### Architecture Constraints

- **Convex Auth**: The `afterUserCreatedOrUpdated` callback is synchronous and runs immediately after user creation
- **Real-time sync**: Any db.patch will trigger useQuery updates in frontend
- **Index requirement**: Use `by_email` index on invitations table for efficient lookup

### Key Files to Modify

| File | Purpose |
|------|---------|
| `convex/auth.ts` | Add invitation check to callback |
| `src/App.tsx` | May need adjustment if Option A is not sufficient |
| `convex/invoices.ts` | Verify RBAC filter (should already work) |

### Testing Checklist

1. **Invitation flow**:
   - Create invitation as admin → Copy token → Open in incognito → Accept → Verify role
2. **Regular signup**:
   - Go to /signup → Create account → Verify new org created with admin role
3. **Technician filter**:
   - Login as technician → Create invoice → Login as different user → Verify isolation

### Related Code References

- Invitation creation: `convex/organizations.ts:62-165`
- Invitation acceptance: `convex/organizations.ts:171-228`
- Auth callback: `convex/auth.ts:22-45`
- Frontend invitation page: `src/pages/AcceptInvitation.tsx`
- Frontend flow orchestration: `src/App.tsx:81-105`
- Invoice list with RBAC: `convex/invoices.ts` (search for "list" query)

### Project Structure Notes

- Backend Convex functions in `/convex/`
- Frontend React pages in `/src/pages/`
- After modifying Convex files, run `pnpm dev:backend` to validate

### References

- [Source: convex/auth.ts#afterUserCreatedOrUpdated] - Auth callback that creates default org
- [Source: convex/organizations.ts#acceptInvitation] - Invitation acceptance mutation
- [Source: src/App.tsx#useEffect] - Frontend invitation flow handler
- [Source: convex/schema.ts#invitations] - Invitations table with by_email index
- [Source: convex/schema.ts#invoices] - Invoices table with RBAC indexes
- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.1] - Original story definition
- [Docs: https://docs.convex.dev/testing/convex-test] - Convex testing documentation

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- None required - fix was straightforward

### Completion Notes List

- ✅ Implemented Option A from Dev Notes: Check for pending invitation in auth callback
- ✅ The auth callback now queries the invitations table by email before creating a default org
- ✅ If a pending invitation exists, org creation is skipped (acceptInvitation handles it later)
- ✅ App.tsx logic was already correct - the condition `!loggedInUser.organizationId` now works properly
- ✅ Test framework configured with convex-test + vitest
- ✅ 9 unit tests passing covering invitation flow and RBAC filtering
- ✅ RBAC filtering for technicians was already correctly implemented using `by_organization_and_creator` index
- ✅ Full lint passed (TypeScript + Convex + Vite build)
- ✅ Code review completed - removed console.log, fixed email normalization test
- ✅ Added inline validation errors to AcceptInvitation.tsx and SignupForm.tsx (displays "Cet email est déjà utilisé" etc.)

### Change Log
- 2026-01-12: Story created with root cause analysis and fix strategy
- 2026-01-12: Added test framework setup and test suite for regression prevention
- 2026-01-12: Implemented fix in convex/auth.ts - checks for pending invitation before creating default org
- 2026-01-12: Created 10 tests for invitation flow and RBAC filtering - all passing
- 2026-01-12: Excluded test files from Convex tsconfig to fix build error
- 2026-01-12: Code review - removed console.log, fixed tests, added inline form validation errors

### Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| CREATE | `vitest.config.mts` | Vitest config for Convex tests |
| CREATE | `convex/invitations.test.ts` | Test suite for invitation and RBAC (10 tests) |
| MODIFY | `package.json` | Add test dependencies and scripts |
| MODIFY | `convex/auth.ts` | Fix auth callback to check for pending invitations |
| MODIFY | `convex/tsconfig.json` | Exclude test files from Convex build |

### File List
- vitest.config.mts (created)
- convex/invitations.test.ts (created, then updated during code review)
- package.json (modified - added test scripts and devDependencies)
- pnpm-lock.yaml (modified - lockfile update from new devDependencies)
- convex/auth.ts (modified - added pending invitation check, removed console.log)
- convex/tsconfig.json (modified - excluded .test.ts files)
- src/pages/AcceptInvitation.tsx (modified - added inline validation errors)
- src/pages/SignupForm.tsx (modified - added inline validation errors)
- src/components/InviteUserModal.tsx (modified - added inline error for duplicate email)
