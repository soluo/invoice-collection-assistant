---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
workflowStatus: complete
completedAt: 2026-01-12
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - docs/architecture.md
  - DESIGN_GUIDELINES.md
projectContext: brownfield
---

# invoice-collection-assistant - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for invoice-collection-assistant (RelanceZen), decomposing the requirements from the PRD and Architecture into implementable stories.

**Project Context:** Brownfield improvement of existing application with 7 users (6 technicians + 1 admin).

## Requirements Inventory

### Functional Requirements

**Invoice Viewing & Status:**
- FR1: User can view invoice details including client info, amount, dates, and PDF
- FR2: User can see invoice send status (pending/sent) at a glance
- FR3: User can see invoice payment status (unpaid/partial/pending/paid) at a glance
- FR4: User can see invoice reminder status and current step at a glance
- FR5: User can see days overdue for unpaid invoices past due date
- FR6: User can view complete history of reminders sent for an invoice
- FR7: Technician can only view invoices they created
- FR8: Admin can view all invoices in the organization

**Invoice Actions:**
- FR9: User can mark an unsent invoice as sent with a specific date
- FR10: User can edit the due date of an invoice
- FR11: User can record a bank transfer payment for an invoice
- FR12: User can record a check payment with expected deposit date
- FR13: System pauses reminders when check is recorded until deposit date
- FR14: User can add notes to an invoice

**Reminder Management:**
- FR15: User can view pending reminders scheduled for today on /follow-up
- FR16: User can view overdue reminders on /follow-up
- FR17: User can view history of completed reminders on /follow-up
- FR18: User can preview email content before it is sent
- FR19: User can edit email content before it is sent
- FR20: User can record phone call outcome (will pay, no answer, dispute, voicemail)
- FR21: System automatically snoozes "no answer" calls to next business day
- FR22: User can manually snooze a reminder to a specific date
- FR23: System generates reminders automatically based on organization's configured steps

**Email System:**
- FR24: Admin can connect organization email via Microsoft OAuth
- FR25: System sends reminder emails via connected OAuth account
- FR26: Admin can configure email send time for the organization
- FR27: Admin can send test email to a custom address
- FR28: System stores email send status and any errors

**Admin Demo Mode:**
- FR29: Admin can select a target date for demo simulation
- FR30: Admin can trigger reminder generation for the selected date
- FR31: Admin can view what reminders would be generated for that date
- FR32: Admin can send test reminders to test email address during demo

**Search & Navigation:**
- FR33: User can search invoices by invoice number
- FR34: User can search invoices by amount
- FR35: User can filter invoices by payment status
- FR36: User can filter invoices by overdue status
- FR37: User can navigate from /follow-up to invoice detail

### NonFunctional Requirements

**Reliability:**
- NFR1: Reminder emails are sent within 30 minutes of configured send time
- NFR2: System automatically retries failed email sends up to 3 times with exponential backoff
- NFR3: Failed email sends are logged with error details for troubleshooting
- NFR4: Cron job for reminder generation executes daily without manual intervention
- NFR5: System is available during business hours (8h-19h) with 99% uptime

**Security:**
- NFR6: OAuth tokens are stored encrypted in the database
- NFR7: Users can only access data within their organization (tenant isolation)
- NFR8: Technicians can only access their own invoices (row-level security)
- NFR9: Admin actions (settings, team, email test) require admin role verification
- NFR10: Session tokens expire after 30 days of inactivity

**Integration:**
- NFR11: Microsoft Graph API integration handles token refresh automatically
- NFR12: OAuth connection status is visible to admin in settings
- NFR13: Email sending errors are captured with provider error codes
- NFR14: System gracefully handles OAuth provider downtime (queue and retry)

**Performance:**
- NFR15: Page transitions and actions respond within 2 seconds
- NFR16: Invoice detail view loads within 1 second

### Additional Requirements

**Technology Stack (Existing - Brownfield):**
- React 19 with TypeScript (frontend)
- Convex Backend (serverless, real-time via WebSocket)
- Tailwind CSS v4 with @theme directive
- Shadcn/UI component system
- Lucide React icons
- Vite build system

**Infrastructure Requirements:**
- Real-time sync via Convex WebSocket (no manual cache invalidation)
- Convex Cloud deployment (automatic)
- Daily cron job at 9 AM UTC for reminder processing
- Overdue detection cron updates invoice statuses

**Integration Requirements:**
- Anthropic Claude AI for PDF invoice extraction (implemented)
- Microsoft Graph API for email sending via Outlook (implemented)
- Google OAuth planned for Gmail (schema ready)
- Infomaniak schema ready for Swiss provider

**Data Architecture:**
- Multi-tenant with organizationId isolation on all tables
- RBAC with admin/technicien roles
- Indexes for efficient queries (.withIndex() over .filter())
- Cascading deletes for invoice-related data

**UI/UX Requirements (from Design Guidelines):**
- Orange brand color (#f97316) as primary
- Mobile-first responsive design with md: breakpoint
- Shadcn/UI components with brand extensions for CTAs
- Lucide icons with consistent sizes (w-4 h-4 to w-8 h-8)
- Clear visual hierarchy with generous spacing
- NavLink for navigation (not button onClick)
- Import aliases (@/lib/utils, not relative paths)

**Existing Routes (to reference):**
- /invoices - Main invoice list (authenticated home)
- /invoices/:id - Invoice detail view
- /follow-up - Follow-up management
- /settings - Organization settings
- /team - Team management
- /upload - PDF upload with AI extraction
- /call-plan - Phone call planning

**Validation Requirement:**
- Run `pnpm dev:backend` after any Convex schema/function changes

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | View invoice details (client, amount, dates, PDF) |
| FR2 | Epic 1 | See invoice send status at a glance |
| FR3 | Epic 1 | See invoice payment status at a glance |
| FR4 | Epic 1 | See invoice reminder status and step |
| FR5 | Epic 1 | See days overdue for unpaid invoices |
| FR6 | Epic 1 | View complete reminder history |
| FR7 | ✅ Implemented | Technician RBAC (own invoices only) |
| FR8 | ✅ Implemented | Admin RBAC (all org invoices) |
| FR9 | Epic 1 | Mark invoice as sent with date |
| FR10 | Epic 1 | Edit due date |
| FR11 | Epic 1 | Record bank transfer payment |
| FR12 | Epic 1 | Record check payment with deposit date |
| FR13 | Epic 1 | Pause reminders until check deposit |
| FR14 | Epic 1 | Add notes to invoice |
| FR15 | Epic 2 | View pending reminders on /follow-up |
| FR16 | Epic 2 | View overdue reminders on /follow-up |
| FR17 | Epic 2 | View reminder history on /follow-up |
| FR18 | Epic 2 | Preview email before send |
| FR19 | Epic 2 | Edit email before send |
| FR20 | Epic 3 | Record phone call outcome |
| FR21 | Epic 3 | Auto-snooze "no answer" to next business day |
| FR22 | Epic 3 | Manual snooze to specific date |
| FR23 | ✅ Implemented | Auto-generate reminders (cron) |
| FR24 | ✅ Implemented | OAuth Microsoft connection |
| FR25 | ✅ Implemented | Send emails via OAuth |
| FR26 | ✅ Implemented | Configure email send time |
| FR27 | Epic 5 | Send test email to custom address |
| FR28 | ✅ Implemented | Store email send status |
| FR29 | Epic 5 | Select target date for demo (simulation) |
| FR30 | Epic 5 | Trigger reminder generation for date |
| FR31 | Epic 5 | View generated reminders for date |
| FR32 | Epic 5 | Send test reminders during demo |
| FR33 | ✅ Implemented | Search by invoice number |
| FR34 | ✅ Implemented | Search by amount (±5% tolerance) |
| FR35 | ✅ Implemented | Filter by payment status |
| FR36 | ✅ Implemented | Filter by overdue status |
| FR37 | Epic 2 | Navigate from /follow-up to invoice |

**Summary:** 26 FRs to implement across 4 Epics + 11 FRs already implemented (Epic 4 + backend FRs). Epic 6 merged into Epic 5.

## Epic List

### Epic 1: Invoice Detail View Enhancement (Priority 1)

**Goal:** User can see complete invoice status at a glance and take contextual actions directly from the invoice detail view.

**User Value:** Clear visibility on invoice state (send, payment, reminder status, days overdue) with complete reminder history and ability to perform all relevant actions (mark sent, edit due date, record payments, add notes).

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR9, FR10, FR11, FR12, FR13, FR14

**Implementation Notes:** Redesign of existing /invoices/:id page. Must respect existing RBAC (FR7, FR8 already implemented).

---

### Epic 2: Follow-up Dashboard Completion (Priority 2)

**Goal:** User can review and manage daily reminders with email preview and editing capability from the /follow-up page.

**User Value:** Morning check in under 5 minutes - see all pending/overdue reminders, preview emails before they're sent, personalize messages, and quickly navigate to invoice details.

**FRs covered:** FR15, FR16, FR17, FR18, FR19, FR37

**Implementation Notes:** Complete UI for existing backend functionality. Backend reminder generation (FR23) already working.

---

### Epic 3: Phone Call Workflow

**Goal:** User can manage phone call reminders with outcome recording and automatic/manual snooze functionality.

**User Value:** Efficient call management - record outcomes (will pay, no answer, dispute, voicemail), automatic rescheduling on no answer, manual snooze when needed.

**FRs covered:** FR20, FR21, FR22

**Implementation Notes:** Extends follow-up functionality for call-type reminders. Must handle business day calculation for auto-snooze.

---

### Epic 4: Invoice Search & Filtering - ✅ ALREADY IMPLEMENTED

**Goal:** User can quickly find invoices by number, amount, or status filters.

**Status:** Already fully implemented in the existing codebase.

**FRs covered:** FR33, FR34, FR35, FR36

**Existing Implementation:**
- Search by invoice number and client name (`/invoices` and MainView)
- Search by amount with ±5% tolerance
- Filter by payment status (dropdown "État" with paid/unpaid/overdue options)
- Filter by overdue status ("En retard" option)
- Additional: technician filter for admin, sorting, URL state persistence, pagination

---

### Epic 5: Email Test & Admin Simulation (Priority 3 + NEW Demo)

**Goal:** Admin can test emails and simulate reminders to demonstrate the system to clients.

**User Value:** Confidence in the system + powerful demo capability - test emails before go-live, and show clients in 5 minutes what would happen over 30 days.

**FRs covered:** FR27, FR29, FR30, FR31, FR32

**Implementation Notes:** Admin-only features. Simulation reuses /follow-up page with date picker (minimal new code). Test send reuses OAuth email logic.

---

### Epic 6: Améliorations Post-Demo (Quick Wins)

**Goal:** Corriger les bugs et améliorer l'UX suite aux retours de démo client.

**User Value:** Meilleure expérience utilisateur, correction de bugs bloquants.

**Priority:** High (bugs) to Medium (UX)

---

### Epic 7: Templates Email Avancés

**Goal:** Améliorer les capacités d'email avec nouveaux templates, pièces jointes et signatures.

**User Value:** Communication plus professionnelle et personnalisée.

**Priority:** Medium

---

### Epic 8: Gestion Chèques Avancée

**Goal:** Gérer le cas particulier des chèques en attente de vente avec workflow adapté.

**User Value:** Support du processus métier spécifique aux chèques longue durée.

**Priority:** Medium (specific use case)

---

### Backlog: Types de Clients A/B

**Goal:** Séquences de relance différentes selon le type de client (notaires vs agences).

**Status:** À prioriser après validation du besoin en production.

---

## Epic 1: Invoice Detail View Enhancement

**Goal:** User can see complete invoice status at a glance and take contextual actions directly from the invoice detail drawer, with option to open full page when needed.

**Architecture Decision:** Hybrid approach - Drawer as primary view (accessible from /invoices and /follow-up) + existing /invoices/:id page remains accessible via "Open full page" button.

---

### Story 1.1: Invoice Detail Drawer with Status Display

As a **user (technician or admin)**,
I want **to open an invoice detail drawer from the invoice list or follow-up page**,
So that **I can quickly see all important invoice information without losing my current context**.

**Acceptance Criteria:**

**Given** I am on the /invoices list page
**When** I click on an invoice row
**Then** a drawer opens from the right side showing the invoice details
**And** I can see the invoice number, client name, and total amount
**And** I can see the send status as a badge (pending/sent)
**And** I can see the payment status as a badge (unpaid/partial/pending/paid)
**And** I can see the reminder status with current step indicator
**And** I can see days overdue displayed prominently if invoice is past due date
**And** I can see the PDF preview or a button to view the PDF
**And** I can see a button "Open full page" that navigates to /invoices/:id

**Given** I am on the /follow-up page
**When** I click on a reminder's invoice reference
**Then** the same invoice detail drawer opens
**And** I can see all invoice information as described above

**Given** the drawer is open
**When** I click outside the drawer or press Escape
**Then** the drawer closes and I return to my previous view

---

### Story 1.2: Reminder History in Drawer

As a **user**,
I want **to see the complete history of reminders sent for an invoice**,
So that **I know what communications have already happened before taking action**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**When** I look at the reminder history section
**Then** I can see a timeline of all reminders for this invoice
**And** each reminder shows the type (email/phone), date, and status
**And** completed reminders show the outcome (sent, answered, no answer, etc.)
**And** reminders are ordered chronologically (most recent first)

**Given** an invoice has many reminders (more than 5)
**When** I view the drawer
**Then** I see the 5 most recent reminders
**And** I can click "Show all" to expand and see the complete history

**Given** an invoice has no reminders yet
**When** I view the drawer
**Then** I see a message indicating no reminders have been sent

---

### Story 1.3: Mark Invoice as Sent Action

As a **user**,
I want **to mark an unsent invoice as sent with a specific date**,
So that **I can track when the invoice was delivered to the client and start the payment due period**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**And** the invoice send status is "pending"
**When** I click the "Mark as sent" action button
**Then** a popover or modal appears asking for the sent date
**And** the date defaults to today

**Given** the mark as sent dialog is open
**When** I select a date and confirm
**Then** the invoice send status updates to "sent"
**And** the sent date is recorded
**And** the drawer refreshes to show the updated status
**And** a success toast notification appears

**Given** the invoice is already marked as sent
**When** I view the drawer
**Then** the "Mark as sent" action is not visible
**And** I can see the sent date in the invoice details

---

### Story 1.4: Edit Due Date Action

As a **user**,
I want **to edit the due date of an invoice**,
So that **I can adjust payment terms based on client agreements or corrections**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**When** I click on the due date or an "Edit due date" action
**Then** a date picker appears allowing me to select a new due date

**Given** the date picker is open
**When** I select a new date and confirm
**Then** the due date is updated
**And** the days overdue indicator recalculates accordingly
**And** reminder scheduling adjusts to the new due date
**And** a success toast notification appears

**Given** I change the due date to a future date
**When** the invoice was previously overdue
**Then** the days overdue indicator disappears or shows the new remaining days

---

### Story 1.5: Record Payment Actions

As a **user**,
I want **to record one or more payments (bank transfer or checks) for an invoice**,
So that **I can track payments received and the system stops unnecessary reminders**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**And** the invoice is not fully paid
**When** I click "Record payment"
**Then** a dialog opens with payment type options (Bank transfer / Check)

**Given** I select "Bank transfer"
**When** the dialog opens
**Then** the payment date is pre-filled with today's date (modifiable)
**And** the amount is pre-filled with the remaining balance
**And** I can modify the amount if needed (partial payment)

**Given** I confirm a bank transfer payment
**When** the payment is saved
**Then** the payment is recorded with the specified date and amount
**And** the payment status updates (partial if remaining > 0, paid if remaining = 0)
**And** reminders stop if fully paid

**Given** I select "Check"
**When** the dialog opens
**Then** the payment date is pre-filled with today's date (modifiable)
**And** I must enter the check amount
**And** I must enter an expected deposit date

**Given** I confirm a check payment
**When** there is still a remaining balance after this check
**Then** I am offered to add another check immediately
**And** I can add multiple checks in sequence

**Given** I have recorded one or more checks
**When** all checks are saved
**Then** each check is tracked separately with its amount and deposit date
**And** reminders are paused until the latest deposit date passes
**And** payment status shows "pending" until deposit dates pass

**Given** partial payments exist (transfers and/or checks)
**When** I view the drawer
**Then** I see the list of all payments with type, amount, and dates
**And** I see the remaining balance clearly displayed

---

### Story 1.6: Invoice Notes

As a **user**,
I want **to add notes to an invoice**,
So that **I can record important context about client communications or special arrangements**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**When** I look at the notes section
**Then** I can see existing notes with author and timestamp

**Given** I want to add a note
**When** I type in the note input field and submit
**Then** the note is saved with my name and current timestamp
**And** it appears at the top of the notes list
**And** the input field clears for potential additional notes

**Given** an invoice has no notes
**When** I view the drawer
**Then** I see an empty state with the note input field ready

**Given** I am viewing notes
**When** I see a note from another user
**Then** I can see their name and when they added it

---

## Epic 2: Follow-up Dashboard Completion

**Goal:** User can review and manage daily reminders with email preview and editing capability from the /follow-up page.

**Context:** The /follow-up page exists. Backend reminder generation works (FR23). We are completing the UI.

---

### Story 2.1: Pending and Overdue Reminders View

As a **user**,
I want **to see all pending and overdue reminders on the /follow-up page**,
So that **I can quickly review my morning tasks and take action on urgent items**.

**Acceptance Criteria:**

**Given** I navigate to /follow-up
**When** the page loads
**Then** I see a list of pending reminders scheduled for today
**And** I see a separate section or indicator for overdue reminders
**And** each reminder shows the invoice reference, client name, amount, and reminder type (email/phone)
**And** overdue reminders are visually highlighted (badge or color)

**Given** I am viewing the reminders list
**When** I click on an invoice reference or row
**Then** the invoice detail Drawer opens (as defined in Epic 1)
**And** I can see full invoice details and take actions

**Given** there are no pending or overdue reminders
**When** I view /follow-up
**Then** I see an empty state message indicating no reminders for today

---

### Story 2.2: Reminders History (Filtered)

As a **user**,
I want **to view the history of completed reminders only**,
So that **I can see what follow-up actions have been taken without noise from other events**.

**Acceptance Criteria:**

**Given** I am on /follow-up
**When** I navigate to the History tab
**Then** I see only reminder-related events (emails sent, calls completed)
**And** I do NOT see other event types (invoice created, payment recorded, etc.)

**Given** I view the history list
**When** I look at each entry
**Then** I can see the date, reminder type, invoice reference, and outcome
**And** entries are sorted by date (most recent first)

**Given** I click on an invoice reference in the history
**When** the click is registered
**Then** the invoice detail Drawer opens

**Given** there are many history entries
**When** I scroll or paginate
**Then** I can load more entries to see older reminders

---

### Story 2.3: Email Preview with Send Action

As a **user**,
I want **to preview the email content before it is sent and manually trigger the send if needed**,
So that **I can verify the message is correct and send it immediately when ready**.

**Acceptance Criteria:**

**Given** I see a pending email reminder on /follow-up
**When** I click a "Preview" button or action
**Then** a modal or panel opens showing the full email content
**And** I can see the recipient, subject, and body

**Given** I am viewing the email preview
**When** I click the "Send now" button
**Then** the email is sent immediately via the connected OAuth account
**And** the reminder status updates to "sent"
**And** a success toast notification appears
**And** the preview closes

**Given** the email fails to send
**When** an error occurs
**Then** I see an error message with details
**And** the reminder remains in pending state for retry

**Given** I don't want to send yet
**When** I close the preview without sending
**Then** the reminder remains pending for automatic sending at configured time

---

### Story 2.4: Email Edit Before Send

As a **user**,
I want **to edit the email content before sending**,
So that **I can personalize the message based on recent client interactions**.

**Acceptance Criteria:**

**Given** I am viewing the email preview
**When** I click an "Edit" button
**Then** the email body becomes editable
**And** I can modify the text content

**Given** I have edited the email content
**When** I click "Save" or "Send"
**Then** the modified content is stored for this reminder
**And** the personalized version is what gets sent

**Given** I have edited the email
**When** I view the preview again before sending
**Then** I see my edited version, not the original template

**Given** I want to revert my changes
**When** I click "Reset to template" or similar
**Then** the email content reverts to the original generated version

---

## Epic 3: Suivi Manuel Post-Relances (Simplifié)

**Goal:** User can identify and track invoices that have completed all automatic reminders and need manual follow-up (phone calls, etc.).

**Context (2026-01-19):** Client feedback indicates phone calls will be handled outside the application for now. The system already has a `manual_followup` status that is automatically set when all reminder steps are completed. Users can use the existing Notes feature (Story 1.6) to track call outcomes.

**What exists:**
- ✅ `reminderStatus = "manual_followup"` flag (auto-set when all steps done)
- ✅ Invoice Notes with author + timestamp (Story 1.6)
- ✅ Cron stops generating reminders for `manual_followup` invoices

**What's missing:**
- ❌ Filter in /invoices to see `manual_followup` invoices

**Original Stories 3.1-3.3 (DEPRECATED):** Phone call outcome recording, auto-snooze, manual snooze - moved to backlog for future consideration if in-app call management is needed.

---

### Story 3.1: Filtre "Suivi Manuel" sur Liste Factures

As a **user**,
I want **to filter invoices that have completed all automatic reminders**,
So that **I can see which invoices need manual follow-up (phone, other means) and track my progress via notes**.

**Acceptance Criteria:**

**Given** I am on the /invoices page
**When** I look at the status filter dropdown
**Then** I see a new option "Suivi manuel" (or "Manual follow-up")

**Given** I select the "Suivi manuel" filter
**When** the list updates
**Then** I see only invoices where `reminderStatus === "manual_followup"`
**And** these are invoices that have completed all configured reminder steps
**And** the count badge shows the number of invoices needing manual follow-up

**Given** I view an invoice in "Suivi manuel" status
**When** I open the invoice drawer
**Then** I can add notes to track my manual follow-up actions (calls, emails, etc.)
**And** notes show author and timestamp (existing functionality)

**Given** I want to clear the filter
**When** I select "Toutes" or clear the filter
**Then** I see all invoices again

**Technical Notes:**
- Backend: Add case in `listInvoicesWithFilters` for `statusFilter === "suivi-manuel"`
- Frontend: Add option in `FilterBar.tsx` dropdown
- The `manual_followup` status is already computed and stored by the reminder cron

---

### Backlog: Original Phone Call Stories (Future)

The following stories are preserved for future implementation if in-app phone call management becomes a requirement:

<details>
<summary>Story 3.2 (Backlog): Record Phone Call Outcome</summary>

User can record call outcomes (will pay, no answer, dispute, voicemail) with notes. System pauses reminders on "will pay" or "dispute".

</details>

<details>
<summary>Story 3.3 (Backlog): Auto-Snooze No Answer Calls</summary>

"No answer" calls automatically reschedule to next business day (skip weekends/holidays).

</details>

<details>
<summary>Story 3.4 (Backlog): Manual Snooze Reminder</summary>

User can manually postpone any reminder to a specific future date.

</details>

---

## Epic 5: Email Test & Admin Simulation

**Goal:** Admin can test emails and simulate reminders to demonstrate the system to clients.

**Context:** Admin-only features. OAuth Microsoft connection already implemented (FR24). Simulation reuses /follow-up components for minimal code addition.

**FRs covered:** FR27, FR29, FR30, FR31, FR32 (includes merged Epic 6)

---

### Story 5.1: Send Test Email to Custom Address

As an **admin**,
I want **to send a test email to a custom address**,
So that **I can verify email delivery works correctly before enabling automatic reminders**.

**Acceptance Criteria:**

**Given** I am an admin on the /settings page
**When** I navigate to the email settings section
**Then** I see a "Test Email" section with an input field for the test address

**Given** the organization has a connected OAuth email account
**When** I enter a test email address and click "Send test"
**Then** a test email is sent via the connected account
**And** I see a success message with confirmation
**And** I can check my inbox to verify the email arrived

**Given** the OAuth connection is not configured or expired
**When** I try to send a test email
**Then** I see an error message indicating the email account needs to be connected
**And** I am prompted to reconnect the OAuth account

**Given** the test email fails to send
**When** an error occurs
**Then** I see an error message with details about the failure
**And** I can retry after addressing the issue

**Given** I am not an admin (technician role)
**When** I view the settings page
**Then** I do not see the test email feature

---

### Story 5.2: Admin Date Simulation on /follow-up

As an **admin**,
I want **to select a simulation date on /follow-up and see what reminders would be generated**,
So that **I can demonstrate the system behavior to clients without affecting real data**.

**Acceptance Criteria:**

**Given** I am an admin on /follow-up
**When** I view the page
**Then** I see a date picker allowing me to select a simulation date
**And** the date picker defaults to "today" (real mode)

**Given** I select a future or different date
**When** I confirm the selection
**Then** the system generates simulated reminders for that date
**And** the reminders are flagged as `isSimulation: true`
**And** I see these simulated reminders in the same list format as real reminders
**And** simulated reminders are visually distinguished (badge or color)

**Given** I am viewing simulated reminders
**When** I click on an email reminder
**Then** I can preview the email content (reusing Epic 2 preview component)

**Given** I am a technician (not admin)
**When** I view /follow-up
**Then** I do not see the date simulation picker
**And** I only see real reminders

---

### Story 5.3: Test Send and Cleanup Simulated Reminders

As an **admin**,
I want **to send test emails from simulated reminders and clean up all simulations when done**,
So that **I can demonstrate real emails to clients and leave no simulation data behind**.

**Acceptance Criteria:**

**Given** I am viewing simulated email reminders
**When** I click "Send as test" on a reminder
**Then** I can enter a test email address
**And** the email is sent to that address (not the real client)
**And** the reminder is marked as "test sent"

**Given** I have simulated reminders in the system
**When** I click "Clear all simulations" button
**Then** all reminders with `isSimulation: true` are deleted
**And** I see a confirmation message
**And** the view returns to showing only real reminders

**Given** I change the date picker back to "today"
**When** the view refreshes
**Then** I see only real reminders (simulations are hidden but not deleted until cleanup)

---

## Epic 6: Améliorations Post-Demo (Quick Wins)

**Goal:** Corriger les bugs et améliorer l'UX suite aux retours de démo client.

**User Value:** Meilleure expérience utilisateur, correction de bugs bloquants, et amélioration de la productivité au quotidien.

**Priority:** High (bugs) to Medium (UX improvements)

---

### Story 6.1: Bug - Vérifier Invitations et Filtres Techniciens

As an **admin**,
I want **the invitation system and technician filters to work correctly**,
So that **new team members can join and technicians see only their invoices**.

**Acceptance Criteria:**

**Given** I have sent an invitation to a new team member
**When** the invitation is accepted
**Then** the user status should update to "active"
**And** the user should have proper access to the application

**Given** I am a technician
**When** I view the invoice list
**Then** I should only see invoices I created
**And** the filter should work correctly

**Investigation needed:** Identify the specific bug - is it invitation acceptance, role assignment, or filter logic?

---

### Story 6.2: Échéance +14 Jours par Défaut

As a **user**,
I want **the due date to default to +14 days when adding a new invoice**,
So that **I don't have to manually calculate and enter the standard payment term**.

**Acceptance Criteria:**

**Given** I am on the invoice upload/creation page
**When** the invoice is extracted/created
**Then** the due date field defaults to today + 14 days
**And** I can still modify the due date if needed

**Given** the AI extracts a due date from the PDF
**When** a due date is found in the document
**Then** use the extracted date instead of the default
**And** only apply +14 days default when no due date is detected

---

### Story 6.3: Modifier et Ré-associer une Facture

As a **user**,
I want **to edit invoice details and reassign an invoice to another technician**,
So that **I can correct mistakes or transfer responsibility when needed**.

**Acceptance Criteria:**

**Given** I have the invoice detail drawer open
**When** I click an "Edit" action
**Then** I can modify invoice fields (client name, amount, due date, etc.)

**Given** I am an admin editing an invoice
**When** I look at the edit options
**Then** I see a dropdown to reassign the invoice to another technician
**And** selecting a technician updates the invoice ownership

**Given** I am a technician
**When** I edit an invoice
**Then** I cannot reassign it to another technician (admin only)

---

### Story 6.4: Historique Filtré sur /follow-up + Historique Complet sur InvoiceDetails

As a **user**,
I want **to see only reminder history on the /follow-up page, but full event history on invoice details**,
So that **each view shows contextually relevant information without noise**.

**Context:** Currently, the history on /follow-up shows all event types (invoice import, due date changes, payments, etc.) which is noisy for a page focused on follow-up actions. Meanwhile, InvoiceDetails should show the complete audit trail.

**Acceptance Criteria:**

**Given** I am on the /follow-up page in the History tab
**When** I view the history list
**Then** I see ONLY reminder-related events (emails sent, calls made, snoozes)
**And** I do NOT see other event types (invoice created, payment recorded, due date modified, etc.)
**And** each entry shows date, reminder type, invoice reference, and outcome

**Given** I am viewing an invoice in the InvoiceDetails drawer or page
**When** I look at the event history section
**Then** I see ALL events for this invoice in chronological order
**And** events include: invoice import/creation, due date modifications, payment recordings, reminders sent, notes added
**And** each event shows the date, event type, description, and author (who performed the action)

**Given** an invoice was imported via AI extraction
**When** I view InvoiceDetails history
**Then** I see an entry "Invoice imported" with the import date and the user who uploaded it

**Given** someone modified the due date of an invoice
**When** I view InvoiceDetails history
**Then** I see an entry "Due date modified: [old date] → [new date]" with timestamp and author

**Given** a payment was recorded
**When** I view InvoiceDetails history
**Then** I see an entry "Payment recorded: [amount] via [method]" with timestamp and author

---

**Technical Notes - Audit des Events Existants et Manquants:**

**Events actuellement trackés (table `events` dans `convex/schema.ts:189-223`) :**

| Event Type | Mutation | Fichier | Status |
|------------|----------|---------|--------|
| `invoice_imported` | `invoices.create` | `convex/invoices.ts:330` | ✅ OK |
| `invoice_marked_sent` | `invoices.markAsSent` | `convex/invoices.ts:368` | ✅ OK |
| `payment_registered` | `invoices.registerPayment`, `payments.recordPayment` | `convex/invoices.ts:422`, `convex/payments.ts:236` | ✅ OK |
| `invoice_marked_paid` | `invoices.markAsPaid`, `payments.confirmCheckDeposit` | `convex/invoices.ts:460`, `convex/payments.ts:341` | ✅ OK |
| `reminder_sent` | `reminders.markReminderSent`, `followUp.completePhoneReminder` | `convex/reminders.ts:258`, `convex/followUp.ts:466,492` | ✅ OK |
| `invoice_sent` | N/A | `convex/events.ts` | ⏳ Défini, sera implémenté avec Epic 7 (Story 7.1 - Envoi initial facture) |

**Events MANQUANTS à créer (priorité haute pour cette story) :**

| Action | Mutation actuelle | Event à créer | Priorité |
|--------|-------------------|---------------|----------|
| Modification facture (montant, dates, contact) | `invoices.update` | `invoice_updated` | 🔴 HAUTE |
| Report d'échéance | `invoices.snooze` | `invoice_due_date_changed` | 🔴 HAUTE |
| Pause relance | `followUp.pauseReminder` | `reminder_paused` | 🟠 MOYENNE |
| Reprise relance | `followUp.resumeReminder` | `reminder_resumed` | 🟠 MOYENNE |
| Replanification relance | `followUp.rescheduleReminder` | `reminder_rescheduled` | 🟠 MOYENNE |

**Events MANQUANTS (hors scope - audit sécurité futur) :**

| Action | Mutation | Event suggéré | Priorité |
|--------|----------|---------------|----------|
| Suppression facture | `invoices.deleteInvoice` | `invoice_deleted` | 🔴 HAUTE |
| Changement rôle utilisateur | `organizations.updateUserRole` | `user_role_changed` | 🔴 HAUTE |
| Suppression utilisateur | `organizations.removeUser` | `user_removed` | 🔴 HAUTE |
| Invitation utilisateur | `organizations.inviteUser` | `user_invited` | 🟠 MOYENNE |
| Acceptation invitation | `organizations.acceptInvitation` | `user_joined` | 🟠 MOYENNE |
| Modification config relances | `organizations.updateReminderSteps` | `reminder_config_changed` | 🟠 MOYENNE |
| Ajout note | `invoiceNotes.create` | `invoice_note_added` | 🟢 BASSE |

**Implémentation recommandée :**

1. **Étendre le schema `events`** pour supporter les nouveaux types d'events
2. **Créer les helper functions** dans `convex/events.ts` pour chaque nouveau type
3. **Ajouter les appels** dans les mutations existantes (`invoices.update`, `invoices.snooze`, `followUp.*`)
4. **Query `/follow-up` History** : filtrer par `eventType IN ('reminder_sent', 'reminder_paused', 'reminder_resumed', 'reminder_rescheduled')`
5. **Query `InvoiceDetails` History** : récupérer tous les events pour l'invoice, triés par date décroissante

---

## Epic 7: Templates Email Avancés

**Goal:** Améliorer les capacités d'email avec de nouveaux templates, pièces jointes et signatures personnalisées.

**User Value:** Communication plus professionnelle et personnalisée avec les clients, meilleure image de marque.

**Priority:** Medium

---

### Story 7.1: Template Envoi Initial Facture

As a **user**,
I want **to send the initial invoice email using a dedicated template**,
So that **the first contact with the client is professional and includes all necessary information**.

**Acceptance Criteria:**

**Given** I have a new invoice that hasn't been sent
**When** I click "Send invoice" action
**Then** an email is generated using the "initial invoice" template
**And** the template includes a professional introduction
**And** the invoice PDF is attached automatically

**Given** an admin configures email templates
**When** they access template settings
**Then** they can customize the "initial invoice" template content
**And** variables like {client_name}, {invoice_number}, {amount}, {due_date} are supported

---

### Story 7.2: Template Email Invitation

As an **admin**,
I want **to customize the invitation email template**,
So that **new team members receive a branded, professional invitation**.

**Acceptance Criteria:**

**Given** I invite a new team member
**When** the invitation is sent
**Then** it uses a customizable invitation template
**And** the template includes organization name and branding

**Given** I configure the invitation template
**When** I save my changes
**Then** future invitations use the updated template

---

### Story 7.3: Pièces Jointes aux Relances

As a **user**,
I want **to attach the invoice PDF to reminder emails**,
So that **clients have easy access to the invoice without searching their archives**.

**Acceptance Criteria:**

**Given** a reminder email is being generated
**When** the email is prepared for sending
**Then** the invoice PDF is attached automatically

**Given** an admin configures reminder settings
**When** they access email settings
**Then** they can toggle "Attach invoice PDF to reminders" on/off
**And** the setting applies to all reminder emails for the organization

---

### Story 7.4: Signature Email avec Image

As an **admin**,
I want **to configure an email signature with an image (logo)**,
So that **all outgoing emails look professional and branded**.

**Acceptance Criteria:**

**Given** I am in organization email settings
**When** I configure the email signature
**Then** I can enter text for the signature
**And** I can upload an image (logo) to include in the signature

**Given** a signature with image is configured
**When** any email is sent from the organization
**Then** the signature with image appears at the bottom of the email

**Given** I upload a signature image
**When** the upload is processed
**Then** the image is resized/optimized for email (max width 300px)
**And** the image is stored and included inline in emails

---

## Epic 8: Gestion Chèques Avancée

**Goal:** Gérer le cas particulier des chèques en attente de vente avec un workflow adapté.

**User Value:** Support complet du processus métier spécifique aux chèques longue durée, avec relances pour péremption et possibilité pour les techniciens de recevoir des paiements.

**Priority:** Medium (specific use case)

**Context:** Certains clients paient par chèques en attente de vente immobilière. Ces chèques ont un comportement différent :
- L'enregistrement du chèque vaut "paiement" (plus besoin de relances standard)
- Besoin de relancer pour chèques périmés (1 an + 1 jour)
- Les techniciens peuvent recevoir des paiements directement

---

### Story 8.1: Statut Chèque en Attente + Notes

As a **user**,
I want **to mark a check as "pending sale" with associated notes**,
So that **the system stops standard reminders and I can track the special context**.

**Acceptance Criteria:**

**Given** I record a check payment
**When** I fill the payment form
**Then** I see an option "Check pending sale" (checkbox)
**And** I can add notes explaining the situation

**Given** a check is marked as "pending sale"
**When** the check is saved
**Then** standard reminders stop for this invoice
**And** the invoice status shows "Check pending" instead of "Unpaid"
**And** notes are visible in the invoice detail

**Given** an invoice has a "pending sale" check
**When** I view the invoice detail
**Then** I can see all notes related to this check
**And** I can add additional notes over time

---

### Story 8.2: Relance Péremption Chèques

As a **user**,
I want **to be reminded when a check is about to expire (1 year + 1 day)**,
So that **I can contact the client to get a replacement check before it becomes invalid**.

**Acceptance Criteria:**

**Given** a check is recorded with a date
**When** the check approaches 1 year old (e.g., 30 days before expiration)
**Then** a special reminder is generated: "Check expiration warning"
**And** the reminder appears on /follow-up

**Given** a check expiration reminder is displayed
**When** I view the reminder details
**Then** I see the original check date and expiration date
**And** I see suggested action: "Contact client to replace check"

**Given** I resolve the check expiration reminder
**When** I record the outcome
**Then** I can select: "Check replaced", "Check deposited", "Client contacted", "Other"
**And** notes are added to the invoice

---

### Story 8.3: Paiement Reçu par Technicien

As a **technician**,
I want **to record that I received a payment directly from a client**,
So that **the system reflects the actual payment flow in my business**.

**Acceptance Criteria:**

**Given** I am a technician viewing an invoice
**When** I record a payment
**Then** I see an option "Payment received by me" (in addition to "Bank transfer" and "Check")

**Given** I select "Payment received by me"
**When** I fill the payment details
**Then** I enter the amount and payment method (cash, check, etc.)
**And** I enter the date I received the payment
**And** the payment is recorded with flag "receivedByTechnician: true"

**Given** a payment was received by technician
**When** admin views the payment history
**Then** they can see which payments were received directly by technicians
**And** this helps with accounting reconciliation

---

## Backlog (Future Considerations)

### Audit Logging Complet (Sécurité & Compliance)

**Context:** L'application dispose d'une table `events` mais plusieurs actions critiques ne génèrent pas d'event. Un audit logging complet est nécessaire pour la traçabilité et la conformité.

**Events à implémenter :**

| Priorité | Action | Mutation | Event suggéré |
|----------|--------|----------|---------------|
| 🔴 HAUTE | Suppression facture | `invoices.deleteInvoice` | `invoice_deleted` |
| 🔴 HAUTE | Changement rôle utilisateur | `organizations.updateUserRole` | `user_role_changed` |
| 🔴 HAUTE | Suppression utilisateur | `organizations.removeUser` | `user_removed` |
| 🟠 MOYENNE | Invitation utilisateur | `organizations.inviteUser` | `user_invited` |
| 🟠 MOYENNE | Acceptation invitation | `organizations.acceptInvitation` | `user_joined` |
| 🟠 MOYENNE | Modification config relances | `organizations.updateReminderSteps` | `reminder_config_changed` |
| 🟢 BASSE | Ajout note | `invoiceNotes.create` | `invoice_note_added` |
| 🟢 BASSE | Modification nom orga | `organizations.updateOrganizationName` | `organization_updated` |
| 🟢 BASSE | Annulation invitation | `organizations.deleteInvitation` | `invitation_cancelled` |

**Stories à créer quand priorisé :**
- Story: Events sécurité utilisateurs (role_changed, removed, invited, joined)
- Story: Events administratifs (config_changed, organization_updated)
- Story: Events factures complémentaires (deleted, note_added)
- Story: Interface admin de consultation des logs d'audit

**Note:** À prioriser selon besoins de conformité (RGPD, audit interne).

---

### Types de Clients avec Séquences de Relance Différentes

**Context:** Notaires et agences immobilières nécessitent parfois un traitement différent des autres clients.

**Proposed Solution:**
- Ajouter un champ "Client Type" avec valeurs A et B (ou configurable)
- Permettre de définir une séquence de relance différente par type
- Type A: Séquence standard (ex: J+7, J+14, J+30, appel)
- Type B: Séquence adaptée (ex: J+30, J+60, appel seulement)

**Stories à créer quand priorisé:**
- Story: Configuration des types de clients
- Story: Séquences de relance par type
- Story: Attribution du type lors de la création client
- Story: Migration des clients existants

**Note:** À prioriser après validation du besoin réel en production.
