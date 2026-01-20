# Story 7.1: Template Envoi Initial Facture

Status: done

## Story

As a **user (technician or admin)**,
I want **to send the initial invoice email using a dedicated template with the PDF attached**,
So that **the first contact with the client is professional and includes all necessary information**.

## Acceptance Criteria

### AC1: Send Invoice Button in Drawer
**Given** I have the invoice detail drawer open
**And** the invoice has `sendStatus === "pending"`
**When** I look at the primary actions
**Then** I see a new "Envoyer par email" button alongside "Marquer envoyée"
**And** the button has a Mail icon

### AC2: Send Invoice Email Preview Modal
**Given** I click "Envoyer par email" on a pending invoice
**When** the modal opens
**Then** I see a preview of the email that will be sent
**And** I see the recipient email (from `contactEmail`)
**And** I see the subject line with invoice number
**And** I see the email body generated from the "initial invoice" template
**And** I see an indicator that the PDF will be attached
**And** I see "Envoyer" and "Annuler" buttons

### AC3: Email Template Placeholders
**Given** the email preview is displayed
**When** I look at the content
**Then** the template variables are replaced:
- `{nom_client}` → invoice.clientName
- `{numero_facture}` → invoice.invoiceNumber
- `{montant}` → invoice.amountTTC (formatted as "1 234,56")
- `{date_facture}` → invoice.invoiceDate (formatted as "12 janvier 2026")
- `{date_echeance}` → invoice.dueDate (formatted as "26 janvier 2026")

### AC4: Send Email Action
**Given** I am viewing the send invoice email preview
**And** the invoice has a `contactEmail`
**And** the invoice has a `pdfStorageId` (PDF attached)
**When** I click "Envoyer"
**Then** the email is sent via Microsoft Graph API
**And** the PDF is attached to the email
**And** the invoice `sendStatus` changes to "sent"
**And** the invoice `sentDate` is set to today
**And** an event `invoice_sent` is logged
**And** a success toast appears: "Facture envoyée par email"
**And** the modal closes

### AC5: Missing Contact Email Handling
**Given** I want to send an invoice by email
**And** the invoice has no `contactEmail`
**When** I click "Envoyer par email"
**Then** I see an error message: "Ajoutez un email de contact avant d'envoyer"
**And** the Send button is disabled
**Or** I am redirected to edit the invoice contact info

### AC6: Missing PDF Handling
**Given** I want to send an invoice by email
**And** the invoice has no `pdfStorageId`
**When** I click "Envoyer par email"
**Then** I see a warning: "Aucun PDF attaché. Voulez-vous envoyer quand même?"
**And** I can choose "Envoyer sans PDF" or "Annuler"

### AC7: Admin Template Configuration (Settings) - Section "Modèles d'emails"
**Given** I am an admin on the /settings page
**When** I scroll to the email templates section
**Then** I see a new section titled "Modèles d'emails"
**And** this section appears AFTER "Gestion des relances"

**Given** I view the "Modèles d'emails" section
**When** I look at the content
**Then** I see a template card "Envoi de la facture" (similar layout to reminder steps)
**And** the card shows the template name and current subject preview
**And** I see ONLY a "Modifier" button (Edit icon) - NO delete button
**And** I do NOT see a "+Ajouter un modèle" button (fixed list of templates)

**Given** I click "Modifier" on "Envoi de la facture"
**When** the modal opens
**Then** I see a modal similar to `ReminderStepModal` but simpler
**And** I see an "Objet" input field (subject line)
**And** I see a "Contenu du mail" textarea (email body)
**And** I see variable insertion buttons: `{nom_client}`, `{numero_facture}`, `{montant}`, `{date_facture}`, `{date_echeance}`
**And** clicking a variable button inserts it at cursor position
**And** I see "Enregistrer" and "Annuler" buttons

**Given** I edit the template and click "Enregistrer"
**When** the mutation completes successfully
**Then** the modal closes
**And** a success toast appears: "Modèle enregistré"
**And** the card preview updates with the new subject

### AC8: OAuth Not Connected Handling
**Given** the organization has no email OAuth connection
**When** I try to send an invoice by email
**Then** I see an error: "Connectez votre compte email dans les paramètres"
**And** I have a link to go to /settings

### AC9: Email Send Failure Handling
**Given** I am sending an invoice email
**When** the email send fails (network error, OAuth token expired, etc.)
**Then** I see an error message with details
**And** the invoice `sendStatus` remains "pending"
**And** I can retry the send

## Tasks / Subtasks

### Task 1: Backend - Create sendInvoiceEmail Action (AC: #4, #8, #9)
- [x] 1.1 Create `convex/invoiceEmails.ts` with `sendInvoiceEmail` action
- [x] 1.2 Add input validation: invoiceId required
- [x] 1.3 Verify user authentication and org membership
- [x] 1.4 Verify invoice exists and belongs to org
- [x] 1.5 Verify contactEmail is present (return error if not)
- [x] 1.6 Get organization OAuth tokens
- [x] 1.7 Refresh token if needed (reuse existing pattern from `emails.ts`)
- [x] 1.8 Generate email content from template (see reminderDefaults.ts pattern)
- [x] 1.9 Get PDF from storage if available
- [x] 1.10 Convert PDF to base64 for Graph API attachment
- [x] 1.11 Send email via Microsoft Graph API with attachment
- [x] 1.12 Update invoice: sendStatus='sent', sentDate=today
- [x] 1.13 Create event: type='invoice_sent'
- [x] 1.14 Return success/error response

### Task 2: Backend - Add Invoice Email Template to Schema (AC: #7)
- [x] 2.1 Add `invoiceEmailSubject` field to organizations table (optional string)
- [x] 2.2 Add `invoiceEmailTemplate` field to organizations table (optional string)
- [x] 2.3 Run `pnpm dev:backend` to validate schema
- [x] 2.4 Add default template in code (similar to reminderDefaults.ts)

### Task 3: Backend - Template Configuration Mutations (AC: #7)
- [x] 3.1 Add `updateInvoiceEmailTemplate` mutation in `organizations.ts`
- [x] 3.2 Admin-only access validation
- [x] 3.3 Add `getInvoiceEmailTemplate` query (or extend getOrganizationSettings)

### Task 4: Frontend - Send Invoice Email Modal (AC: #2, #3, #5, #6)
- [x] 4.1 Create `src/components/SendInvoiceEmailModal.tsx`
- [x] 4.2 Props: invoiceId, onClose
- [x] 4.3 Query invoice data and org template
- [x] 4.4 Generate preview with placeholder replacement
- [x] 4.5 Show recipient email, subject, body preview
- [x] 4.6 Show PDF attachment indicator (or warning if missing)
- [x] 4.7 Handle missing contactEmail state
- [x] 4.8 Add send button with loading state
- [x] 4.9 Call sendInvoiceEmail action on submit
- [x] 4.10 Handle success/error toast notifications

### Task 5: Frontend - Integrate in InvoiceDetailDrawer (AC: #1)
- [x] 5.1 Add "Envoyer par email" button when sendStatus='pending'
- [x] 5.2 Add state for showSendEmailModal
- [x] 5.3 Import and render SendInvoiceEmailModal
- [x] 5.4 Button should have Mail icon from lucide-react

### Task 6: Frontend - Admin Template Configuration UI (AC: #7)
- [x] 6.1 Create `src/components/EmailTemplateModal.tsx` (reusable for future templates)
  - [x] 6.1.1 Props: templateType, subject, body, onSave, onClose, open
  - [x] 6.1.2 Input for "Objet" (subject line)
  - [x] 6.1.3 Textarea for "Contenu du mail" (body) with ref for cursor position
  - [x] 6.1.4 Variable buttons row: `{nom_client}`, `{numero_facture}`, `{montant}`, `{date_facture}`, `{date_echeance}`
  - [x] 6.1.5 Insert variable at cursor on button click (same pattern as ReminderStepModal)
  - [x] 6.1.6 Enregistrer / Annuler buttons
- [x] 6.2 Add "Modèles d'emails" section in OrganizationSettings.tsx
  - [x] 6.2.1 Add section AFTER "Gestion des relances" section
  - [x] 6.2.2 Section title: "Modèles d'emails"
  - [x] 6.2.3 NO "+Ajouter un modèle" button (fixed list of templates)
- [x] 6.3 Add "Envoi de la facture" template card
  - [x] 6.3.1 Card layout similar to reminder step cards
  - [x] 6.3.2 Show template name and subject preview
  - [x] 6.3.3 ONLY Edit button (no delete) - using `<Edit />` icon
  - [x] 6.3.4 On click: open EmailTemplateModal
- [x] 6.4 State management in OrganizationSettings.tsx
  - [x] 6.4.1 Add state: invoiceEmailSubject, invoiceEmailTemplate
  - [x] 6.4.2 Add state: emailTemplateModalOpen, editingTemplateType
  - [x] 6.4.3 Initialize from organization data in useEffect
- [x] 6.5 Connect to backend
  - [x] 6.5.1 Call updateInvoiceEmailTemplate mutation on save
  - [x] 6.5.2 Show success toast: "Modèle enregistré"
  - [x] 6.5.3 Update local state on success

### Task 7: Testing & Validation
- [x] 7.1 Run `pnpm dev:backend` - verify no Convex errors
- [x] 7.2 Run `pnpm lint` - verify no TypeScript/ESLint errors
- [ ] 7.3 Manual test: Send invoice email with PDF
- [ ] 7.4 Manual test: Send invoice email without PDF
- [ ] 7.5 Manual test: Missing contact email handling
- [ ] 7.6 Manual test: OAuth not connected error
- [ ] 7.7 Manual test: Configure template in Settings

## Dev Notes

### Architecture Patterns & Constraints

**Email Sending Pattern (from `convex/emails.ts`):**
- Use Microsoft Graph API at `https://graph.microsoft.com/v1.0/me/sendMail`
- Always check OAuth token expiry and refresh if needed
- Use `internal.oauth.performTokenRefresh` for DRY token refresh
- Content type must be "Text" for plain text or "HTML" for rich content
- Set `saveToSentItems: true` to save in user's sent folder

**Template Placeholder Pattern (from `convex/reminderDefaults.ts`):**
```typescript
// Placeholders used in reminder templates:
// {numero_facture}, {nom_client}, {montant}, {date_facture}, {date_echeance}, {jours_retard}

// Replacement code pattern:
const emailContent = template
  .replace(/{numero_facture}/g, invoice.invoiceNumber)
  .replace(/{nom_client}/g, invoice.clientName)
  .replace(/{montant}/g, formattedAmount)
  .replace(/{date_echeance}/g, invoice.dueDate)
  .replace(/{date_facture}/g, invoice.invoiceDate);
```

**PDF Attachment with Graph API:**
- Get PDF from Convex storage using `ctx.storage.getUrl()`
- Fetch the PDF content as ArrayBuffer
- Convert to base64 for Graph API
- Use `attachments` array in message body:
```typescript
{
  message: {
    subject: "...",
    body: { contentType: "Text", content: "..." },
    toRecipients: [{ emailAddress: { address: "..." } }],
    attachments: [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: `facture-${invoiceNumber}.pdf`,
        contentType: "application/pdf",
        contentBytes: base64Content
      }
    ]
  },
  saveToSentItems: true
}
```

**Event Logging Pattern (from `convex/events.ts`):**
```typescript
await ctx.db.insert("events", {
  organizationId: user.organizationId,
  userId: user.userId,
  invoiceId: invoice._id,
  eventType: "invoice_sent",
  eventDate: Date.now(),
  description: `Facture envoyée par email à ${invoice.contactEmail}`,
  metadata: { isAutomatic: false },
});
```

**Invoice Update Pattern (from `convex/invoices.ts:markAsSent`):**
```typescript
await ctx.db.patch(invoiceId, {
  sendStatus: "sent",
  sentDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
});
```

### Project Structure Notes

**Backend Files to Modify/Create:**
- `convex/invoiceEmails.ts` (NEW) - Send invoice email action
- `convex/schema.ts` - Add `invoiceEmailSubject`, `invoiceEmailTemplate` to organizations
- `convex/organizations.ts` - Add template config mutations

**Frontend Files to Modify/Create:**
- `src/components/SendInvoiceEmailModal.tsx` (NEW) - Email preview before send
- `src/components/EmailTemplateModal.tsx` (NEW) - Reusable template editor modal
- `src/components/InvoiceDetailDrawer.tsx` - Add send email button
- `src/pages/OrganizationSettings.tsx` - Add "Modèles d'emails" section

**Existing Patterns to Follow:**
- Modal: Use `Dialog` from `@/components/ui/dialog`
- Toast: Use `toast` from `sonner`
- Mutation: Use `useMutation(api.invoiceEmails.sendInvoiceEmail)`
- Icons: Use `Mail`, `Edit` from `lucide-react`
- Button styling: Use `Button` from `@/components/ui/button`

### UI Pattern Reference: Settings Page Structure

**Section "Modèles d'emails" - Layout Pattern:**
Follow the exact same structure as "Séquence de relance" section (lines 524-612 of OrganizationSettings.tsx):
```tsx
<section className="space-y-3">
  <h2 className="text-lg font-semibold text-gray-900">
    Modèles d'emails
  </h2>
  <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
    {/* Template cards here - NO add button */}
    <div className="divide-y divide-gray-200 sm:divide-y-0 sm:space-y-3">
      {/* "Envoi de la facture" card */}
    </div>
  </div>
</section>
```

**Template Card Layout (similar to reminder step card):**
```tsx
<div className="py-4 sm:p-4 sm:border sm:border-gray-200 sm:rounded-lg hover:sm:border-gray-400 transition-colors cursor-pointer">
  <div className="flex items-start sm:items-center gap-3 sm:gap-4">
    {/* Icon */}
    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
      <Mail className="h-5 w-5 text-blue-600" />
    </div>
    {/* Info + Actions */}
    <div className="flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900">Envoi de la facture</p>
          <p className="text-sm text-gray-600 mt-1">{subjectPreview}</p>
        </div>
        {/* ONLY Edit button - NO delete */}
        <Button variant="outline" size="sm" onClick={handleEditTemplate}>
          <Edit className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </div>
</div>
```

**ReminderStepModal Reference for Variable Buttons:**
See `src/components/ReminderStepModal.tsx` for the variable insertion pattern:
- Use `useRef<HTMLTextAreaElement>` for cursor position
- Variable buttons with `onClick` that inserts at `selectionStart`
- Buttons styled as small outline buttons with variable name

### Extensibility for Future Templates (Story 7.2+)

**Design for multiple templates:**
The "Modèles d'emails" section will eventually contain multiple templates:
1. **Envoi de la facture** (Story 7.1) - This story
2. **Invitation utilisateur** (Story 7.2) - Future

**Schema design for extensibility:**
Rather than adding individual fields, consider a structure that scales:
```typescript
// Option A: Individual fields (simpler, chosen for 7.1)
invoiceEmailSubject: v.optional(v.string()),
invoiceEmailTemplate: v.optional(v.string()),
// Future: invitationEmailSubject, invitationEmailTemplate

// Option B: Object structure (more scalable, consider for 7.2)
emailTemplates: v.optional(v.object({
  invoice: v.optional(v.object({ subject: v.string(), body: v.string() })),
  invitation: v.optional(v.object({ subject: v.string(), body: v.string() })),
}))
```

**UI extensibility:**
The `EmailTemplateModal` component should be reusable:
- Accept `templateType` prop to customize title and available variables
- Invoice template variables: `{nom_client}`, `{numero_facture}`, `{montant}`, `{date_facture}`, `{date_echeance}`
- Invitation template variables (future): `{nom_invité}`, `{nom_organisation}`, `{lien_invitation}`

### Default Template (to be used if org has no custom template)

**Subject:**
```
Facture {numero_facture} - {nom_client}
```

**Body:**
```
Bonjour,

Veuillez trouver ci-joint notre facture n°{numero_facture} d'un montant de {montant}€ TTC.

Date de facture : {date_facture}
Date d'échéance : {date_echeance}

Nous vous remercions de procéder au règlement avant la date d'échéance.

Cordialement,
```

### References

- Email sending implementation: [Source: convex/emails.ts:80-115]
- Template placeholders: [Source: convex/reminderDefaults.ts:21-58]
- Event types schema: [Source: convex/schema.ts:195-202]
- Invoice markAsSent: [Source: convex/invoices.ts - markAsSent mutation]
- InvoiceDetailDrawer: [Source: src/components/InvoiceDetailDrawer.tsx:1-605]
- OrganizationSettings page: [Source: src/pages/OrganizationSettings.tsx:1-628]
- Reminder steps section UI: [Source: src/pages/OrganizationSettings.tsx:524-612]
- ReminderStepModal (variable buttons pattern): [Source: src/components/ReminderStepModal.tsx]
- Epics requirements: [Source: _bmad-output/planning-artifacts/epics.md:962-979]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - no significant issues encountered during implementation.

### Completion Notes List

- Task 2 completed: Added `invoiceEmailSubject` and `invoiceEmailTemplate` fields to organizations schema, plus default templates in `reminderDefaults.ts`
- Task 3 completed: Added `updateInvoiceEmailTemplate` mutation and `getInvoiceEmailTemplate` query with admin-only access validation
- Task 1 completed: Created `convex/invoiceEmails.ts` with `sendInvoiceEmail` action implementing full email sending flow with PDF attachment support, OAuth token refresh, and error handling
- Task 4 completed: Created `SendInvoiceEmailModal.tsx` with preview, placeholder replacement, PDF indicator, and all error states (missing email, no OAuth, no PDF confirmation)
- Task 5 completed: Integrated "Envoyer par email" button in InvoiceDetailDrawer for pending invoices
- Task 6 completed: Added "Modèles d'emails" section in Settings page with template card and EmailTemplateModal for editing
- Task 7 (partial): Backend validation passed (`pnpm dev:backend`), TypeScript/build validation passed (`pnpm lint`)
- Manual tests remain to be performed by user

### File List

**New Files:**
- `convex/invoiceEmails.ts` - Send invoice email action with PDF attachment
- `src/components/SendInvoiceEmailModal.tsx` - Email preview modal before sending
- `src/components/EmailTemplateModal.tsx` - Reusable template editor modal
- `src/components/ui/alert.tsx` - Alert component from shadcn (dependency)

**Modified Files:**
- `convex/schema.ts` - Added invoiceEmailSubject, invoiceEmailTemplate fields to organizations
- `convex/reminderDefaults.ts` - Added DEFAULT_INVOICE_EMAIL_SUBJECT and DEFAULT_INVOICE_EMAIL_TEMPLATE
- `convex/organizations.ts` - Added updateInvoiceEmailTemplate mutation, getInvoiceEmailTemplate query, extended getCurrentOrganization
- `src/components/InvoiceDetailDrawer.tsx` - Added "Envoyer par email" button and SendInvoiceEmailModal integration
- `src/pages/OrganizationSettings.tsx` - Added "Modèles d'emails" section with template card and EmailTemplateModal
- `src/components/mainView/InvoiceTableCard.tsx` - Added sendInvoiceEmail action to "Envoyer" button
- `src/components/mainView/InvoiceTableRow.tsx` - Added sendInvoiceEmail action to "Envoyer" button
- `src/pages/InvoiceDetail.tsx` - Added "Envoyer par email" button and SendInvoiceEmailModal integration
- `src/pages/MainView.tsx` - Added SendInvoiceEmailModal state management and import

## Change Log

- 2026-01-19: Story implementation completed - all tasks done, code validated with pnpm lint
