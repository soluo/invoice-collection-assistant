# Story 5.1: Send Test Email to Custom Address

Status: ready

## Story

As an **admin**,
I want **to send a test email to a custom address**,
So that **I can verify email delivery works correctly before enabling automatic reminders**.

## Acceptance Criteria

1. **Given** I am an admin on the /settings page
   **When** I navigate to the email settings section
   **Then** I see a "Test Email" section with an input field for the test address

2. **Given** the organization has a connected OAuth email account
   **When** I enter a test email address and click "Send test"
   **Then** a test email is sent via the connected account
   **And** I see a success message with confirmation
   **And** I can check my inbox to verify the email arrived

3. **Given** the OAuth connection is not configured or expired
   **When** I try to send a test email
   **Then** I see an error message indicating the email account needs to be connected
   **And** I am prompted to reconnect the OAuth account

4. **Given** the test email fails to send
   **When** an error occurs
   **Then** I see an error message with details about the failure
   **And** I can retry after addressing the issue

5. **Given** I am not an admin (technician role)
   **When** I view the settings page
   **Then** I do not see the test email feature

## Tasks / Subtasks

- [ ] Task 1: Create sendTestEmail action in Convex (AC: #2, #3, #4)
  - [ ] Create new action `sendTestEmail` in `convex/emails.ts` (new file)
  - [ ] Accept parameters: `{ recipientEmail: string }`
  - [ ] Verify user is admin (reuse pattern from other admin-only actions)
  - [ ] Check OAuth tokens exist and are valid
  - [ ] Refresh token if needed (reuse `refreshTokenIfNeeded` pattern)
  - [ ] Send email via Microsoft Graph API with test content
  - [ ] Return `{ success: true }` or throw error with details
  - [ ] Run `pnpm dev:backend` to validate

- [ ] Task 2: Create TestEmailSection component (AC: #1, #5)
  - [ ] Create `/src/components/TestEmailSection.tsx`
  - [ ] Accept `organization` and `user` props
  - [ ] Only render if `user.role === "admin"`
  - [ ] Input field for recipient email address
  - [ ] "Send test email" button
  - [ ] Loading state while sending

- [ ] Task 3: Implement email sending logic (AC: #2, #3, #4)
  - [ ] Call `api.emails.sendTestEmail` on button click
  - [ ] Show success toast on completion ("Email de test envoyé!")
  - [ ] Handle errors: show toast with error message
  - [ ] Handle missing OAuth: show specific message + link to connect
  - [ ] Disable button while sending (loading state)

- [ ] Task 4: Integrate into OrganizationSettings (AC: #1, #5)
  - [ ] Import TestEmailSection into OrganizationSettings
  - [ ] Add section after "Connexion email" block
  - [ ] Only show if email provider is connected
  - [ ] Use consistent card styling with other sections

- [ ] Task 5: Test and validate (AC: #1-5)
  - [ ] Test as admin with connected OAuth: verify email sends
  - [ ] Test as admin without OAuth: verify error message
  - [ ] Test as technician: verify section is not visible
  - [ ] Test with invalid email: verify validation
  - [ ] Run `pnpm lint` to verify no errors

## Dev Notes

### Architecture Decision

Create a new `convex/emails.ts` file for test email functionality. This keeps email-related utilities separate from reminder-specific logic in `reminders.ts`. The test email action will reuse existing OAuth patterns.

### Backend Implementation

**New File: `convex/emails.ts`**

```typescript
import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthenticatedUser } from "./users";

export const sendTestEmail = action({
  args: { recipientEmail: v.string() },
  handler: async (ctx, { recipientEmail }) => {
    // 1. Get authenticated user
    const user = await getAuthenticatedUser(ctx);
    if (!user || user.role !== "admin") {
      throw new Error("Accès refusé: réservé aux administrateurs");
    }

    // 2. Get organization with OAuth tokens
    const org = await ctx.runQuery(internal.organizations.getOrgWithTokens, {
      organizationId: user.organizationId,
    });

    if (!org.emailAccessToken || !org.emailRefreshToken) {
      throw new Error("Compte email non connecté. Connectez votre compte Microsoft dans les paramètres.");
    }

    // 3. Refresh token if needed
    let accessToken = org.emailAccessToken;
    if (org.emailTokenExpiresAt && org.emailTokenExpiresAt < Date.now() + 10 * 60 * 1000) {
      accessToken = await ctx.runAction(api.oauth.refreshTokenIfNeeded, {
        organizationId: user.organizationId,
      });
    }

    // 4. Send via Microsoft Graph
    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: "Email de test - RelanceZen",
          body: {
            contentType: "Text",
            content: "Ceci est un email de test envoyé depuis RelanceZen.\n\nSi vous recevez ce message, votre configuration email fonctionne correctement.",
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

    return { success: true };
  },
});
```

### Frontend Implementation

**New File: `src/components/TestEmailSection.tsx`**

```typescript
interface TestEmailSectionProps {
  organization: Organization;
  user: User;
}

export function TestEmailSection({ organization, user }: TestEmailSectionProps) {
  // Only show for admins with connected email
  if (user.role !== "admin" || !organization.emailProvider) {
    return null;
  }

  // ... input state, mutation, toast handling
}
```

### Integration Point

In `OrganizationSettings.tsx`, add after the email connection block:

```tsx
{/* Block: Test Email (admin only) */}
<TestEmailSection organization={organization} user={user} />
```

### Existing Code References

- [Source: convex/reminders.ts:180-250] - `sendReminderEmail` action - reuse Microsoft Graph pattern
- [Source: convex/oauth.ts:1-50] - `refreshTokenIfNeeded` action - token refresh logic
- [Source: convex/oauth.ts:60-80] - `getOAuthUrl` query - OAuth URL generation
- [Source: src/pages/OrganizationSettings.tsx] - Settings page structure with 3 blocks
- [Source: convex/schema.ts:20-50] - Organization schema with OAuth fields

### UI Styling Patterns (from OrganizationSettings.tsx)

```tsx
// Card container pattern
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <IconComponent className="h-5 w-5" />
      Section Title
    </CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Content */}
  </CardContent>
</Card>

// Input with label pattern
<div className="space-y-2">
  <Label htmlFor="id">Label Text</Label>
  <Input id="id" value={value} onChange={...} />
</div>

// Button with loading
<Button disabled={isLoading}>
  {isLoading ? "Envoi en cours..." : "Envoyer"}
</Button>
```

### Toast Usage (already configured)

```tsx
import { toast } from "@/hooks/use-toast";

// Success
toast({
  title: "Email envoyé",
  description: "L'email de test a été envoyé avec succès.",
});

// Error
toast({
  title: "Erreur",
  description: error.message,
  variant: "destructive",
});
```

### Technical Requirements

**Convex Dependencies:**
- Use `action` (not `mutation`) for external API call to Microsoft Graph
- Use `internal` query to fetch org with tokens (avoids exposing tokens)
- Use existing `api.oauth.refreshTokenIfNeeded` for token refresh

**Validation:**
- Email format validation (basic regex or rely on Microsoft's validation)
- Admin role check (RBAC)
- OAuth connection check

**Error Handling:**
- Missing OAuth tokens → specific message with reconnection prompt
- Expired tokens → auto-refresh attempt
- Microsoft API errors → surface error message from API
- Network errors → generic retry message

### File Structure

```
convex/
├── emails.ts               # NEW: Test email action
└── reminders.ts            # EXISTING: Reference for sendReminderEmail pattern

src/components/
└── TestEmailSection.tsx    # NEW: Test email UI component

src/pages/
└── OrganizationSettings.tsx # MODIFY: Add TestEmailSection
```

### Security Considerations

- Admin role verification is mandatory
- OAuth tokens stay in backend, never sent to frontend
- Test email sent from organization's connected account (audit trail in sent items)
- Email address validation to prevent abuse

### Lucide Icons to Use

- `Send` - for send button
- `Mail` or `MailCheck` - for section icon
- `AlertCircle` - for error states

### Dependencies

No new dependencies required. All patterns reuse existing code.
