# Story 7.2: Template Email Invitation

Status: review

## Story

As an **admin**,
I want **to send invitation emails automatically using a customizable template when I invite a new team member**,
So that **new team members receive a branded, professional invitation with all the information they need to join**.

## Acceptance Criteria

### AC1: Automatic Email Send on Invitation Creation
**Given** I am an admin inviting a new team member via the InviteUserModal
**And** the organization has a connected OAuth email account
**When** I click "Inviter" to create the invitation
**Then** an invitation email is sent automatically to the invitee's email address
**And** I see a success message: "Invitation envoyée par email à {email}"
**And** I still see the invitation link in the modal (for manual sharing if needed)

### AC2: Email Template Content
**Given** an invitation email is sent
**When** the recipient opens the email
**Then** the email contains:
- A professional subject line (e.g., "Invitation à rejoindre {nom_organisation} sur RelanceZen")
- The organization name
- The role they are being invited as (Admin or Technicien)
- A clear call-to-action link to accept the invitation
- An expiration notice (7 days)

### AC3: Template Placeholders
**Given** the email is generated from the template
**When** placeholders are replaced
**Then** the following variables are supported:
- `{email_invite}` → recipient's email address
- `{nom_organisation}` → organization name
- `{role}` → role assigned (Admin or Technicien)
- `{lien_invitation}` → full invitation URL
- `{inviteur}` → name of the admin who sent the invitation

### AC4: Admin Template Configuration (Settings - "Modèles d'emails" section)
**Given** I am an admin on the /settings page
**When** I scroll to the "Modèles d'emails" section (created in Story 7.1)
**Then** I see a new template card "Invitation utilisateur"
**And** the card shows the template name and current subject preview
**And** I see ONLY an "Edit" button (no delete button - fixed template list)

**Given** I click "Modifier" on "Invitation utilisateur"
**When** the modal opens
**Then** I see the EmailTemplateModal (reused from Story 7.1)
**And** I see an "Objet" input field (subject line)
**And** I see a "Contenu du mail" textarea (email body)
**And** I see variable insertion buttons: `{email_invite}`, `{nom_organisation}`, `{role}`, `{lien_invitation}`, `{inviteur}`
**And** clicking a variable button inserts it at cursor position

**Given** I edit the template and click "Enregistrer"
**When** the mutation completes
**Then** the modal closes
**And** a success toast appears: "Modèle enregistré"
**And** future invitations use the updated template

### AC5: OAuth Not Connected Handling
**Given** the organization has no email OAuth connection
**When** I try to invite a user
**Then** the invitation is still created successfully (as before)
**And** I see an info message: "Email non envoyé - compte email non connecté. Partagez le lien manuellement."
**And** the invitation link is displayed for manual sharing

### AC6: Email Send Failure Handling
**Given** I am sending an invitation
**When** the email send fails (network error, OAuth token expired, etc.)
**Then** the invitation is still created successfully
**And** I see a warning message: "Invitation créée mais l'email n'a pas pu être envoyé. Partagez le lien manuellement."
**And** the invitation link is displayed for manual sharing

### AC7: Resend Invitation Email
**Given** I am viewing the invitations list on /team page
**And** the organization has a connected OAuth email account
**When** I regenerate an invitation token
**Then** a new email is sent with the updated link
**And** I see a success toast: "Nouveau lien envoyé par email"

## Tasks / Subtasks

### Task 1: Backend - Add Invitation Email Template to Schema (AC: #4)
- [x] 1.1 Add `invitationEmailSubject` field to organizations table (optional string)
- [x] 1.2 Add `invitationEmailTemplate` field to organizations table (optional string)
- [x] 1.3 Run `pnpm dev:backend` to validate schema

### Task 2: Backend - Default Template Constants (AC: #2, #3)
- [x] 2.1 Add `DEFAULT_INVITATION_EMAIL_SUBJECT` in `reminderDefaults.ts`
- [x] 2.2 Add `DEFAULT_INVITATION_EMAIL_TEMPLATE` in `reminderDefaults.ts`
- [x] 2.3 Include all placeholder variables: `{email_invite}`, `{nom_organisation}`, `{role}`, `{lien_invitation}`, `{inviteur}`

### Task 3: Backend - Template Configuration Mutations (AC: #4)
- [x] 3.1 Add `updateInvitationEmailTemplate` mutation in `organizations.ts`
- [x] 3.2 Admin-only access validation
- [x] 3.3 Add `getInvitationEmailTemplate` query (return defaults if not configured)
- [x] 3.4 Extend `getCurrentOrganization` to include invitation template fields

### Task 4: Backend - Create sendInvitationEmail Action (AC: #1, #5, #6)
- [x] 4.1 Create `sendInvitationEmail` action in `convex/invitationEmails.ts` (NEW FILE)
- [x] 4.2 Input args: `invitationId`, `organizationId`, `inviterUserId`
- [x] 4.3 Verify OAuth tokens are available, return early with flag if not
- [x] 4.4 Get invitation data (email, role, token)
- [x] 4.5 Get organization data (name, template, OAuth tokens)
- [x] 4.6 Get inviter user data (name)
- [x] 4.7 Generate full invitation URL from token
- [x] 4.8 Generate email content with placeholder replacement
- [x] 4.9 Refresh OAuth token if needed (reuse `internal.oauth.performTokenRefresh`)
- [x] 4.10 Send email via Microsoft Graph API
- [x] 4.11 Return `{ sent: boolean, error?: string }`

### Task 5: Backend - Integrate Email Sending in inviteUser Mutation (AC: #1)
- [x] 5.1 Modify `inviteUser` in `organizations.ts` to return info needed for frontend to call sendInvitationEmail
- [x] 5.2 Handle email send result and include in response
- [x] 5.3 Return `{ invitationId, token, organizationId, inviterUserId }`

### Task 6: Backend - Integrate Email Sending in regenerateInvitationToken (AC: #7)
- [x] 6.1 Modify `regenerateInvitationToken` to return info needed for frontend to call sendInvitationEmail
- [x] 6.2 Return updated response with info needed for email sending

### Task 7: Frontend - Update InviteUserModal (AC: #1, #5, #6)
- [x] 7.1 Update success message based on `emailSent` response flag
- [x] 7.2 Show "Email envoyé" success or "Email non envoyé - partagez le lien" warning
- [x] 7.3 Always display invitation link (for manual sharing backup)

### Task 8: Frontend - Update TeamManagement Page (AC: #7)
- [x] 8.1 Update `handleRegenerate` toast messages to include email status
- [x] 8.2 Show "Nouveau lien envoyé par email" or "Lien regénéré (email non envoyé)"

### Task 9: Frontend - Add Invitation Template to Settings (AC: #4)
- [x] 9.1 Add "Invitation utilisateur" template card in OrganizationSettings "Modèles d'emails" section
- [x] 9.2 Use existing `EmailTemplateModal` with invitation-specific variables
- [x] 9.3 Add state for invitation template (subject, body)
- [x] 9.4 Initialize from organization data via `getInvitationEmailTemplate` query
- [x] 9.5 Connect save to `updateInvitationEmailTemplate` mutation

### Task 10: Frontend - Update EmailTemplateModal for Multiple Template Types
- [x] 10.1 Add prop `templateType: "invoice" | "invitation"` to EmailTemplateModal
- [x] 10.2 Configure different variable buttons based on templateType
  - Invoice: `{nom_client}`, `{numero_facture}`, `{montant}`, `{date_facture}`, `{date_echeance}`
  - Invitation: `{email_invite}`, `{nom_organisation}`, `{role}`, `{lien_invitation}`, `{inviteur}`
- [x] 10.3 Update modal title based on templateType

### Task 11: Testing & Validation
- [x] 11.1 Run `pnpm dev:backend` - verify no Convex errors
- [x] 11.2 Run `pnpm lint` - verify no TypeScript/ESLint errors
- [ ] 11.3 Manual test: Invite user with OAuth connected - email should be sent
- [ ] 11.4 Manual test: Invite user without OAuth - email should not be sent, link displayed
- [ ] 11.5 Manual test: Configure invitation template in Settings
- [ ] 11.6 Manual test: Regenerate invitation token - new email should be sent

## Dev Notes

### Architecture Patterns & Constraints

**Existing Pattern to Follow (from Story 7.1 - `invoiceEmails.ts`):**
```typescript
// Action structure for sending emails
export const sendInvitationEmail = action({
  args: {
    invitationId: v.id("invitations"),
    organizationId: v.id("organizations"),
    inviterUserId: v.id("users"),
  },
  returns: v.object({
    sent: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    // 1. Get OAuth tokens from organization
    // 2. If no tokens, return { sent: false, error: "no_oauth" }
    // 3. Get invitation, organization, inviter data
    // 4. Generate email content from template
    // 5. Refresh token if needed
    // 6. Send via Microsoft Graph API
    // 7. Return { sent: true } or { sent: false, error: "..." }
  },
});
```

**Microsoft Graph API Email Format (from `emails.ts`):**
```typescript
await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    message: {
      subject: emailSubject,
      body: { contentType: "Text", content: emailContent },
      toRecipients: [{ emailAddress: { address: recipientEmail } }],
    },
    saveToSentItems: true,
  }),
});
```

**Template Placeholder Replacement Pattern (from `reminderDefaults.ts`):**
```typescript
const emailContent = template
  .replace(/{email_invite}/g, invitation.email)
  .replace(/{nom_organisation}/g, organization.name)
  .replace(/{role}/g, invitation.role === "admin" ? "Administrateur" : "Technicien")
  .replace(/{lien_invitation}/g, invitationUrl)
  .replace(/{inviteur}/g, inviterUser.name || "L'équipe");
```

### Default Template Content

**Subject (DEFAULT_INVITATION_EMAIL_SUBJECT):**
```
Invitation à rejoindre {nom_organisation} sur RelanceZen
```

**Body (DEFAULT_INVITATION_EMAIL_TEMPLATE):**
```
Bonjour,

{inviteur} vous invite à rejoindre l'équipe {nom_organisation} sur RelanceZen en tant que {role}.

Cliquez sur le lien ci-dessous pour créer votre compte :
{lien_invitation}

Ce lien est valable pendant 7 jours.

À très bientôt sur RelanceZen !
```

### Project Structure Notes

**Backend Files to Modify/Create:**
- `convex/invitationEmails.ts` (NEW) - sendInvitationEmail action
- `convex/schema.ts` - Add `invitationEmailSubject`, `invitationEmailTemplate` to organizations
- `convex/organizations.ts` - Add template mutations, modify inviteUser and regenerateInvitationToken
- `convex/reminderDefaults.ts` - Add DEFAULT_INVITATION_EMAIL_* constants

**Frontend Files to Modify:**
- `src/components/InviteUserModal.tsx` - Update success messages based on email sent status
- `src/components/EmailTemplateModal.tsx` - Add templateType prop for different variable sets
- `src/pages/OrganizationSettings.tsx` - Add "Invitation utilisateur" template card
- `src/pages/TeamManagement.tsx` - Update regenerate toast messages

### Key Implementation Details

**1. Non-blocking email send:**
The email sending should NOT block invitation creation. If email fails, the invitation is still created and the admin can share the link manually. This is critical for reliability.

**2. Schema extension pattern (from Story 7.1):**
```typescript
// In convex/schema.ts organizations table, add:
invitationEmailSubject: v.optional(v.string()),
invitationEmailTemplate: v.optional(v.string()),
```

**3. EmailTemplateModal variable configuration:**
```typescript
const TEMPLATE_VARIABLES = {
  invoice: [
    { key: "{nom_client}", label: "Nom client" },
    { key: "{numero_facture}", label: "N° facture" },
    { key: "{montant}", label: "Montant" },
    { key: "{date_facture}", label: "Date facture" },
    { key: "{date_echeance}", label: "Échéance" },
  ],
  invitation: [
    { key: "{email_invite}", label: "Email invité" },
    { key: "{nom_organisation}", label: "Organisation" },
    { key: "{role}", label: "Rôle" },
    { key: "{lien_invitation}", label: "Lien" },
    { key: "{inviteur}", label: "Inviteur" },
  ],
};
```

**4. Invitation URL generation:**
```typescript
const baseUrl = process.env.CONVEX_SITE_URL || "https://your-app.com";
const invitationUrl = `${baseUrl}/accept-invitation/${invitation.token}`;
```
Note: In the action, use environment variable. In frontend, use `window.location.origin`.

### Previous Story Intelligence (Story 7.1)

**Files Created:**
- `convex/invoiceEmails.ts` - Follow same pattern for invitationEmails.ts
- `src/components/SendInvoiceEmailModal.tsx` - Reference for email preview (not needed for invitation)
- `src/components/EmailTemplateModal.tsx` - REUSE this component, add templateType prop

**Patterns Established:**
- Template stored in organizations table with optional fields
- Default templates in `reminderDefaults.ts`
- `updateXxxEmailTemplate` mutation pattern for admin-only template updates
- `getXxxEmailTemplate` query returning defaults if not configured
- EmailTemplateModal component for editing templates with variable insertion buttons

### References

- Email sending via Graph API: [Source: convex/emails.ts:80-115]
- Template defaults pattern: [Source: convex/reminderDefaults.ts:57-72]
- Invoice email template mutations: [Source: convex/organizations.ts:1016-1095]
- EmailTemplateModal component: [Source: src/components/EmailTemplateModal.tsx]
- InviteUserModal: [Source: src/components/InviteUserModal.tsx]
- inviteUser mutation: [Source: convex/organizations.ts:63-177]
- regenerateInvitationToken mutation: [Source: convex/organizations.ts:975-1009]
- OrganizationSettings email templates section: [Source: src/pages/OrganizationSettings.tsx - "Modèles d'emails" section]
- Epics requirements: [Source: _bmad-output/planning-artifacts/epics.md:983-999]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

N/A - No errors or debugging required

### Completion Notes List

- Implemented automatic email sending when inviting new team members via InviteUserModal
- Created `convex/invitationEmails.ts` with `sendInvitationEmail` action following the same pattern as `invoiceEmails.ts`
- Added invitation email template fields to organizations schema (`invitationEmailSubject`, `invitationEmailTemplate`)
- Added default invitation email template constants in `reminderDefaults.ts`
- Added `updateInvitationEmailTemplate` mutation and `getInvitationEmailTemplate` query for admin template customization
- Modified `inviteUser` and `regenerateInvitationToken` mutations to return info needed for frontend to call the send email action
- Updated `InviteUserModal` to call `sendInvitationEmail` action after creating invitation and show appropriate success/warning messages
- Updated `TeamManagement` page to send email when regenerating invitation token
- Added "Invitation utilisateur" template card in OrganizationSettings "Modèles d'emails" section
- Updated `EmailTemplateModal` to support multiple template types via `templateType` prop with different variable sets for invoice vs invitation
- Non-blocking email send: if OAuth not connected or email fails, invitation is still created and link is displayed for manual sharing

### File List

**New Files:**
- convex/invitationEmails.ts

**Modified Files:**
- convex/schema.ts (added invitationEmailSubject, invitationEmailTemplate fields)
- convex/reminderDefaults.ts (added DEFAULT_INVITATION_EMAIL_SUBJECT, DEFAULT_INVITATION_EMAIL_TEMPLATE)
- convex/organizations.ts (added updateInvitationEmailTemplate mutation, getInvitationEmailTemplate query, extended getCurrentOrganization, modified inviteUser and regenerateInvitationToken return types)
- src/components/InviteUserModal.tsx (added sendInvitationEmail call and email status display)
- src/components/EmailTemplateModal.tsx (added templateType prop with different variable sets and titles)
- src/pages/TeamManagement.tsx (added sendInvitationEmail call in handleRegenerate)
- src/pages/OrganizationSettings.tsx (added invitation template card and modal)

## Change Log

- 2026-01-20: Implemented Story 7.2 - Template Email Invitation feature with automatic email sending on invitation creation, template customization in settings, and proper handling of OAuth connection status
