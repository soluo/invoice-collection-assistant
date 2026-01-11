# Relance Factures - Data Models

**Generated:** 2026-01-11
**Source:** `convex/schema.ts`

---

## Database Overview

The application uses **Convex** as its database, a real-time document store with automatic TypeScript type generation.

### Tables Summary

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `organizations` | Companies/tenants | name, reminderSteps, OAuth config |
| `users` | Team members | email, role, organizationId |
| `invoices` | Invoice records | 3D status, client info, amounts |
| `reminders` | Follow-up records | type (email/phone), status |
| `payments` | Payment records | amount, type, status |
| `events` | Activity timeline | eventType, metadata |
| `invoiceNotes` | Notes on invoices | content, createdBy |
| `invitations` | Team invites | token, status, role |

---

## Table Schemas

### 1. Organizations

Multi-tenant organization with reminder configuration.

```typescript
organizations: {
  name: string,                    // Company name
  createdAt: number,               // Creation timestamp

  // Reminder Configuration (flexible steps)
  reminderSteps: [{                // Array of reminder steps
    id: string,                    // UUID for each step
    delay: number,                 // Days after due date
    type: "email" | "phone",       // Action type
    name: string,                  // Step name
    emailSubject?: string,         // Email subject (if email)
    emailTemplate?: string,        // Email content (if email)
  }],
  signature: string,               // Email signature

  // Auto-send Settings
  autoSendEnabled?: boolean,       // Enable automatic sending
  reminderSendTime?: string,       // Daily send time (HH:MM)

  // OAuth Email Connection
  emailProvider?: "microsoft" | "google" | "infomaniak",
  emailConnectedAt?: number,
  emailAccessToken?: string,
  emailRefreshToken?: string,
  emailTokenExpiresAt?: number,
  emailConnectedBy?: Id<"users">,
  emailAccountInfo?: { email: string, name: string },
  senderName?: string,
}
```

**Indexes:** None (queried by ID)

---

### 2. Users

Team members with role-based permissions.

```typescript
users: {
  // Convex Auth Fields
  name?: string,
  image?: string,
  email?: string,
  emailVerificationTime?: number,
  phone?: string,
  phoneVerificationTime?: number,
  isAnonymous?: boolean,

  // Custom Fields
  role?: "admin" | "technicien",   // Permission level
  organizationId?: Id<"organizations">,
  invitedBy?: Id<"users">,         // Who invited this user
}
```

**Indexes:**
- `by_email` → `[email]`
- `by_organizationId` → `[organizationId]`

---

### 3. Invoices

Core invoice entity with 3-dimensional status tracking.

```typescript
invoices: {
  // Ownership
  userId: Id<"users">,             // Legacy compatibility
  organizationId: Id<"organizations">,
  createdBy: Id<"users">,          // Creator

  // Client Information
  clientName: string,
  contactName?: string,            // Contact person
  contactEmail?: string,           // Contact email
  contactPhone?: string,           // Contact phone

  // Invoice Details
  invoiceNumber: string,
  amountTTC: number,               // Total amount (TTC)
  invoiceDate: string,             // YYYY-MM-DD
  dueDate: string,                 // YYYY-MM-DD
  pdfStorageId?: Id<"_storage">,   // PDF file reference

  // DIMENSION 1: Send Status
  sendStatus: "pending" | "sent",
  sentDate?: string,

  // DIMENSION 2: Payment Status
  paymentStatus: "unpaid" | "partial" | "pending_payment" | "paid",
  paidAmount?: number,             // Amount paid (for partial)
  paidDate?: string,               // Full payment date

  // DIMENSION 3: Reminder Status
  reminderStatus?: "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4" | "manual_followup",
  lastReminderDate?: string,
  overdueDetectedDate?: string,    // First overdue detection
}
```

**Indexes:**
- `by_user` → `[userId]`
- `by_due_date` → `[dueDate]`
- `by_organization` → `[organizationId]`
- `by_organization_and_creator` → `[organizationId, createdBy]`
- `by_organization_and_payment` → `[organizationId, paymentStatus]`
- `by_organization_and_reminder` → `[organizationId, reminderStatus]`

---

### 4. Reminders

Follow-up action records (email or phone).

```typescript
reminders: {
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  invoiceId: Id<"invoices">,

  reminderDate: string,            // When reminder is due
  reminderStatus: "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4",
  reminderType: "email" | "phone",

  // Completion Status
  completionStatus: "pending" | "completed" | "failed",
  completedAt?: number,

  // Metadata
  generatedByCron?: boolean,
  isPaused?: boolean,

  // Type-specific Data
  data?: {
    // Email fields
    emailSubject?: string,
    emailContent?: string,
    sendError?: string,
    lastSendAttempt?: number,

    // Phone fields
    phoneCallNotes?: string,
    phoneCallOutcome?: "no_answer" | "voicemail" | "will_pay" | "dispute",
  },
}
```

**Indexes:**
- `by_invoice` → `[invoiceId]`
- `by_user` → `[userId]`
- `by_organization` → `[organizationId]`
- `by_completionStatus` → `[completionStatus]`
- `by_organization_and_status` → `[organizationId, completionStatus]`
- `by_organization_and_type` → `[organizationId, reminderType]`

---

### 5. Payments

Payment records with partial payment support.

```typescript
payments: {
  organizationId: Id<"organizations">,
  invoiceId: Id<"invoices">,
  userId: Id<"users">,             // Who recorded it

  type: "bank_transfer" | "check",
  amount: number,
  status: "received" | "pending",

  // Dates
  recordedDate: string,            // When recorded (YYYY-MM-DD)
  receivedDate?: string,           // Actual receipt date
  expectedDepositDate?: string,    // For pending checks

  notes?: string,
  createdAt: number,
}
```

**Indexes:**
- `by_invoice` → `[invoiceId]`
- `by_organization` → `[organizationId]`
- `by_organization_and_status` → `[organizationId, status]`
- `by_expected_deposit` → `[organizationId, status, expectedDepositDate]`

---

### 6. Events

Activity timeline for auditing.

```typescript
events: {
  organizationId: Id<"organizations">,
  userId: Id<"users">,             // Actor
  invoiceId?: Id<"invoices">,
  reminderId?: Id<"reminders">,

  eventType:
    | "invoice_imported"
    | "invoice_marked_sent"
    | "invoice_sent"
    | "payment_registered"
    | "invoice_marked_paid"
    | "reminder_sent",

  eventDate: number,               // Timestamp

  metadata?: {
    amount?: number,               // For payments
    reminderNumber?: number,       // For reminders
    reminderType?: string,
    isAutomatic?: boolean,
    previousSendStatus?: string,
    previousPaymentStatus?: string,
  },

  description?: string,            // Human-readable
}
```

**Indexes:**
- `by_organization` → `[organizationId]`
- `by_invoice` → `[invoiceId]`
- `by_organization_and_date` → `[organizationId, eventDate]`
- `by_user` → `[userId]`

---

### 7. Invoice Notes

Notes attached to invoices.

```typescript
invoiceNotes: {
  invoiceId: Id<"invoices">,
  organizationId: Id<"organizations">,
  content: string,
  createdBy: Id<"users">,
  createdByName: string,
  // _creationTime is automatic
}
```

**Indexes:**
- `by_invoice` → `[invoiceId]`
- `by_organization` → `[organizationId]`

---

### 8. Invitations

Team member invitation tokens.

```typescript
invitations: {
  email: string,
  organizationId: Id<"organizations">,
  role: "admin" | "technicien",
  token: string,                   // Unique invite token
  status: "pending" | "accepted" | "expired",
  invitedBy: Id<"users">,
  expiresAt: number,
  createdAt: number,
}
```

**Indexes:**
- `by_token` → `[token]`
- `by_organization` → `[organizationId]`
- `by_email` → `[email]`

---

## Entity Relationships

```
┌──────────────────┐
│  organizations   │
└────────┬─────────┘
         │ 1:N
         ▼
┌──────────────────┐     ┌──────────────────┐
│      users       │────▶│   invitations    │
└────────┬─────────┘     └──────────────────┘
         │ 1:N
         ▼
┌──────────────────┐
│     invoices     │
└────────┬─────────┘
         │ 1:N
    ┌────┴────┬─────────┬─────────┐
    ▼         ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐
│reminders│ │payments│ │ events │ │invoiceNotes  │
└────────┘ └────────┘ └────────┘ └──────────────┘
```

---

## Invoice Status Flow

### 3-Dimensional Status Model

```
DIMENSION 1: Send Status
  pending ──────────────▶ sent

DIMENSION 2: Payment Status
  unpaid ──▶ partial ──▶ pending_payment ──▶ paid
            (partial)    (check pending)

DIMENSION 3: Reminder Status
  (none) ──▶ reminder_1 ──▶ reminder_2 ──▶ reminder_3 ──▶ reminder_4 ──▶ manual_followup
```

### Status Combinations

| Scenario | sendStatus | paymentStatus | reminderStatus |
|----------|------------|---------------|----------------|
| Draft invoice | pending | unpaid | null |
| Sent, waiting | sent | unpaid | null |
| First reminder sent | sent | unpaid | reminder_1 |
| Partial payment | sent | partial | reminder_1 |
| Check pending | sent | pending_payment | null |
| Fully paid | sent | paid | null |
| Escalated | sent | unpaid | manual_followup |

---

*Generated from convex/schema.ts by BMM document-project workflow.*
