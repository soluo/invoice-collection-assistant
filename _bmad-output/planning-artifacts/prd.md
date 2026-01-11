---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain-skipped
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
workflowStatus: complete
completedAt: 2026-01-11
inputDocuments:
  - docs/index.md
  - docs/project-overview.md
  - docs/architecture.md
  - docs/data-models.md
  - docs/source-tree-analysis.md
  - docs/component-inventory.md
  - docs/development-guide.md
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 7
classification:
  projectType: saas_b2b
  domain: smb_operations
  complexity: medium
  projectContext: brownfield
scope:
  - label: Page/Drawer Facture
    priority: 1
    description: Revoir l'affichage, les infos et les actions selon l'état
  - label: Relances automatiques
    priority: 2
    description: Valider le fonctionnement, clarifier le stockage (étapes configurables)
  - label: Test envoi emails
    priority: 3
    description: Pouvoir tester l'envoi des emails de relance
  - label: Nettoyage code
    priority: 4
    description: Supprimer les pages/composants obsolètes
---

# Product Requirements Document - invoice-collection-assistant

**Author:** Julien
**Date:** 2026-01-11

## Executive Summary

**Product:** RelanceZen - Invoice Collection Management for SMEs
**Context:** Brownfield improvement of existing application
**Client:** 7 users (6 technicians + 1 admin)

### Problem

Users spend 0.5-1 day/month on manual invoice reminders, creating stress and delays. They dislike the task and tend to postpone it.

### Solution

Automated reminder system with clear visibility and minimal manual intervention. Emails and phone call reminders are generated automatically based on configurable steps.

### MVP Scope

| Priority | Feature | Status |
|----------|---------|--------|
| 1 | Invoice Page/Drawer redesign | To develop |
| 2 | Automatic reminder validation | Backend OK, UI to complete |
| 3 | Email testing capability | To develop |
| NEW | Admin demo mode | To develop |

### Key Success Metrics

- Zero manual email reminders
- Morning check < 5 minutes
- Clear visibility on past and future reminders

---

## Success Criteria

### User Success

**Invoice Detail View - Immediate Clarity:**
- User sees invoice status at a glance (send status, payment status, reminder status)
- Days overdue clearly displayed
- Complete history of automatic reminders already sent

**Invoice Detail View - Contextual Actions:**

| State | Available Actions |
|-------|-------------------|
| Not sent | Send invoice / Mark as sent (with date) |
| Not paid | Edit due date, Record payment(s), View reminders |
| Phone call scheduled | Call + record outcome, Snooze if no answer |

**Follow-up Page (/follow-up):**
- View ongoing reminders (overdue or scheduled)
- Access history of past reminders

**Email Testing:**
- Admin-only feature to test email sending with custom test address

**Ultimate Success Indicator:**
Users no longer need to manually chase invoices. They can easily visualize what the system will do and what it has already done.

### Business Success

| Metric | Current State | Target |
|--------|---------------|--------|
| Time on reminders | 0.5-1 day/month/user | Near-zero (quick morning check) |
| Emotional burden | Dislike reminding, tend to postpone | No stress, it's automatic |
| Manual reminders | Everything manual | Only phone calls when needed |
| Unpaid invoices | Not measured | Expected reduction via automation |

**User Base:** 7 users (6 technicians including owner + 1 admin)

### Technical Success

| Aspect | Current State | To Validate/Improve |
|--------|---------------|---------------------|
| Generation timing | 4 AM daily (1 day ahead) | Working |
| Send timing | Admin-configurable | Working |
| Email delivery reliability | To validate | Logs, send confirmation |
| Error handling | To validate | Retry mechanism, failure notification |

### Measurable Outcomes

1. **Zero manual email reminders** - All email reminders handled automatically
2. **Morning check < 5 minutes** - Quick review of scheduled reminders
3. **Clear visibility** - User can see past and future reminders in 2 clicks
4. **Reliable sending** - 100% of scheduled emails sent (with error handling for failures)

## Product Scope

### MVP - Minimum Viable Product

1. **Invoice Page/Drawer redesign**
   - Status display (send, payment, reminder)
   - Contextual actions based on state
   - Days overdue indicator
   - Reminder history on invoice

2. **Automatic reminder validation**
   - Verify generation and sending works correctly
   - Clarify reminder storage (configurable steps)
   - Visible history on /follow-up page

3. **Email testing capability**
   - Admin-only test email feature
   - Custom test address input

4. **Code cleanup**
   - Remove obsolete pages/components

### Growth Features (Post-MVP)

- Collection statistics dashboard (rates, average delays)
- Summary dashboard
- Push notifications / SMS channel

### Vision (Future)

- Intelligent multi-channel (auto-select email/SMS per client)
- Bad payer prediction
- Accounting software integration

## User Journeys

### Journey 1: Marie (Technician) - Morning Reminder Review

**Opening Scene:**
Marie arrives at the office at 8:30 AM. She opens RelanceZen and goes directly to /follow-up.

**Rising Action:**
She sees today's reminders:
- 2 reminder emails ready to send at 9 AM
- 1 phone call to make (client Durand, invoice #2024-0892, 15 days overdue)

She glances at the emails - everything looks correct. For the call, she clicks on the Durand invoice and sees the history (2 emails already sent without response).

**Climax:**
Marie calls. Mr. Durand answers and promises to pay within 8 days.

**Resolution:**
Marie records the outcome "Will pay" with a note. The system pauses automatic reminders. Marie moves on - total time: 10 minutes for her morning check.

**Capabilities Revealed:** /follow-up page, pending reminders list, email preview, invoice detail with history, call outcome recording

---

### Journey 2: Marie (Technician) - Phone Call No Answer

**Opening Scene:**
Marie has a phone call scheduled for client Martin.

**Rising Action:**
She calls but gets no answer. She tries again 30 minutes later - still no answer.

**Climax:**
Marie clicks "No answer" on the reminder.

**Resolution:**
The system automatically reschedules the call to the next business day. Marie doesn't need to think about it - the system handles the follow-up.

**Capabilities Revealed:** Call outcome options, automatic snooze to next business day

---

### Journey 3: Marie (Technician) - Check Received

**Opening Scene:**
A client hands Marie a check during an on-site visit.

**Rising Action:**
Back at the office, Marie opens the invoice and clicks "Record payment".

**Climax:**
She selects "Check" and enters the expected deposit date (5 days from now).

**Resolution:**
The system shifts the due date to the deposit date and pauses reminders until then. If the check bounces, the invoice will re-enter the reminder cycle.

**Capabilities Revealed:** Check recording, expected deposit date, automatic reminder pause

---

### Journey 4: Sophie (Admin) - Payment Reconciliation

**Opening Scene:**
Sophie, the admin, has the bank statement open. Several payments came in yesterday.

**Rising Action:**
She goes to the invoices page (/invoices) and uses the search to find each invoice by number or amount.

**Climax:**
For each matching invoice, she clicks "Record payment", selects "Bank transfer", and confirms the amount.

**Resolution:**
Invoices are marked as paid. Some invoices had reminders sent, others were paid before any reminder was needed - both cases are handled the same way.

**Capabilities Revealed:** Invoice search (by number/amount), payment recording, status update regardless of reminder history

---

### Journey 5: Sophie (Admin) - Email Test Before Go-Live

**Opening Scene:**
Sophie wants to verify reminder emails work correctly before enabling automatic sending.

**Rising Action:**
She goes to Settings and finds the "Test email" section.

**Climax:**
She enters her personal email address and clicks "Send test".

**Resolution:**
She checks her inbox, sees the test email arrived correctly with proper formatting. She's confident the system works.

**Capabilities Revealed:** Admin settings, test email feature, custom test address

---

### Journey 6: Marie (Technician) - Email Preview and Edit

**Opening Scene:**
Marie checks /follow-up and sees an email scheduled for client Petit. She remembers a recent conversation with this client.

**Rising Action:**
She clicks to preview the email before it sends.

**Climax:**
She notices the standard template doesn't mention their recent agreement. She clicks "Edit" and adds a personalized line: "Suite à notre échange du 5 janvier..."

**Resolution:**
The modified email is saved and will be sent at the scheduled time with her personalization. The client receives a more relevant reminder.

**Capabilities Revealed:** Email preview before send, email editing, personalization

---

### Journey Requirements Summary

| Journey | Key Capabilities Required |
|---------|---------------------------|
| Morning review | /follow-up page, pending reminders list, quick access to invoice |
| No answer call | Call outcome recording, automatic snooze to next business day |
| Check received | Payment recording with type, expected deposit date, reminder pause |
| Payment reconciliation | Invoice search (number/amount), bank transfer recording, paid status |
| Email test | Admin-only settings, test email input, send test button |
| Email preview/edit | Preview scheduled emails, edit before send, save modifications |

## SaaS B2B Specific Requirements

### Project-Type Overview

RelanceZen is a multi-tenant SaaS B2B application for invoice collection management. The existing architecture supports multiple organizations with role-based access control.

### Multi-Tenancy Model

| Aspect | Implementation |
|--------|----------------|
| **Tenant isolation** | Organization-scoped data (organizationId on all tables) |
| **Data model** | Single database with organization filtering via Convex indexes |
| **User binding** | Each user belongs to one organization |

### Permission Model (RBAC)

| Role | Invoice Access | Settings | Team | Email Test |
|------|----------------|----------|------|------------|
| **Admin** | All org invoices | Full | Full | Yes |
| **Technicien** | Own invoices only | Read | None | No |

**Current behavior:** Technicians see only invoices they created (filtered by `createdBy`).

### Integration Architecture

| Integration | Status | Purpose |
|-------------|--------|---------|
| **Microsoft Graph API** | Implemented | Send reminder emails via Outlook |
| **Google Gmail API** | Schema ready | Future: Gmail sending |
| **Infomaniak** | Schema ready | Future: Swiss email provider |
| **Anthropic Claude** | Implemented | PDF invoice extraction |

**OAuth flow:** Organization-level connection (one email account per organization).

### Reminder System Architecture

| Component | Description |
|-----------|-------------|
| **Generation** | Cron job at 4 AM creates pending reminders for next day |
| **Storage** | `reminders` table with `completionStatus`: pending → completed |
| **Sending** | Configurable send time, emails sent via OAuth |
| **Steps** | Configurable reminder steps per organization (reminderSteps array) |

**Reminder lifecycle:**
```
Invoice overdue → Cron creates reminder (pending) → Send time reached →
Email sent OR call completed → Reminder marked completed
```

### Technical Considerations for MVP

| Area | Consideration |
|------|---------------|
| **Invoice detail view** | Must respect RBAC (technician sees own, admin sees all) |
| **Reminder history** | Query reminders by invoiceId, display chronologically |
| **Email preview/edit** | Store modifications in reminder.data before send |
| **Phone call snooze** | Create new reminder for next business day, mark current as completed with outcome |
| **Email test** | Admin-only action, requires OAuth connection check |

### Implementation Constraints

- **Real-time updates:** Convex handles via WebSocket - no manual cache invalidation
- **File storage:** PDF invoices stored in Convex storage (cascading delete implemented)
- **Validation:** Run `pnpm dev:backend` after any Convex schema/function changes

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Problem-Solving MVP
- Solve the immediate user problem (eliminate manual reminders)
- Existing client with validated need
- Targeted evolution, not market growth

**Resource Requirements:** 1 full-stack developer with Convex/React knowledge

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Morning reminder review (Marie)
- Phone call handling with snooze
- Check/payment recording
- Email preview and edit
- Payment reconciliation (Sophie)
- Email testing (Sophie)

**Must-Have Capabilities:**

| Priority | Feature | Status |
|----------|---------|--------|
| **1** | Invoice Page/Drawer redesign | To develop |
| **2** | Reminder system validation | Backend OK, UI to complete |
| **3** | Email test capability | To develop |
| **NEW** | Admin demo mode | To develop |

### Admin Demo Mode (New Requirement)

**Purpose:** Allow admin to simulate reminder service execution at a chosen date for client demo.

**Functionality:**
- Admin-only feature in Settings
- Target date selection
- Execute generation cron as if running on that date
- Visualize generated reminders
- Option to send test emails (to test address)

**Use case:** During demo, show in 5 minutes what would happen over 30 days of reminders.

### Post-MVP Features

**Phase 2 (Growth) - After client validation:**
- Statistics dashboard
- Google Gmail integration
- Mobile optimizations

**Phase 3 (Expansion):**
- Multi-channel (SMS)
- Bad payer prediction
- Accounting integration

**Deferred (Code Cleanup):**
- Remove obsolete pages/components
- To be done after MVP delivery

### Risk Mitigation Strategy

| Risk Type | Risk | Mitigation |
|-----------|------|------------|
| **Technical** | Reminder service not tested in real conditions | Admin demo mode for validation |
| **Client** | Client doesn't visualize the value | Interactive demo with time simulation |
| **Timeline** | Scope too large | Code cleanup deferred post-MVP |

## Functional Requirements

### Invoice Viewing & Status

- **FR1:** User can view invoice details including client info, amount, dates, and PDF
- **FR2:** User can see invoice send status (pending/sent) at a glance
- **FR3:** User can see invoice payment status (unpaid/partial/pending/paid) at a glance
- **FR4:** User can see invoice reminder status and current step at a glance
- **FR5:** User can see days overdue for unpaid invoices past due date
- **FR6:** User can view complete history of reminders sent for an invoice
- **FR7:** Technician can only view invoices they created
- **FR8:** Admin can view all invoices in the organization

### Invoice Actions

- **FR9:** User can mark an unsent invoice as sent with a specific date
- **FR10:** User can edit the due date of an invoice
- **FR11:** User can record a bank transfer payment for an invoice
- **FR12:** User can record a check payment with expected deposit date
- **FR13:** System pauses reminders when check is recorded until deposit date
- **FR14:** User can add notes to an invoice

### Reminder Management

- **FR15:** User can view pending reminders scheduled for today on /follow-up
- **FR16:** User can view overdue reminders on /follow-up
- **FR17:** User can view history of completed reminders on /follow-up
- **FR18:** User can preview email content before it is sent
- **FR19:** User can edit email content before it is sent
- **FR20:** User can record phone call outcome (will pay, no answer, dispute, voicemail)
- **FR21:** System automatically snoozes "no answer" calls to next business day
- **FR22:** User can manually snooze a reminder to a specific date
- **FR23:** System generates reminders automatically based on organization's configured steps

### Email System

- **FR24:** Admin can connect organization email via Microsoft OAuth
- **FR25:** System sends reminder emails via connected OAuth account
- **FR26:** Admin can configure email send time for the organization
- **FR27:** Admin can send test email to a custom address
- **FR28:** System stores email send status and any errors

### Admin Demo Mode

- **FR29:** Admin can select a target date for demo simulation
- **FR30:** Admin can trigger reminder generation for the selected date
- **FR31:** Admin can view what reminders would be generated for that date
- **FR32:** Admin can send test reminders to test email address during demo

### Search & Navigation

- **FR33:** User can search invoices by invoice number
- **FR34:** User can search invoices by amount
- **FR35:** User can filter invoices by payment status
- **FR36:** User can filter invoices by overdue status
- **FR37:** User can navigate from /follow-up to invoice detail

## Non-Functional Requirements

### Reliability

- **NFR1:** Reminder emails are sent within 30 minutes of configured send time
- **NFR2:** System automatically retries failed email sends up to 3 times with exponential backoff
- **NFR3:** Failed email sends are logged with error details for troubleshooting
- **NFR4:** Cron job for reminder generation executes daily without manual intervention
- **NFR5:** System is available during business hours (8h-19h) with 99% uptime

### Security

- **NFR6:** OAuth tokens are stored encrypted in the database
- **NFR7:** Users can only access data within their organization (tenant isolation)
- **NFR8:** Technicians can only access their own invoices (row-level security)
- **NFR9:** Admin actions (settings, team, email test) require admin role verification
- **NFR10:** Session tokens expire after 30 days of inactivity

### Integration

- **NFR11:** Microsoft Graph API integration handles token refresh automatically
- **NFR12:** OAuth connection status is visible to admin in settings
- **NFR13:** Email sending errors are captured with provider error codes
- **NFR14:** System gracefully handles OAuth provider downtime (queue and retry)

### Performance

- **NFR15:** Page transitions and actions respond within 2 seconds
- **NFR16:** Invoice detail view loads within 1 second

