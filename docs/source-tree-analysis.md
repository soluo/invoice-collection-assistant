# Relance Factures - Source Tree Analysis

**Generated:** 2026-01-11

---

## Project Root Structure

```
invoice-collection-assistant/
│
├── 📁 src/                      # Frontend React application
├── 📁 convex/                   # Backend Convex functions
├── 📁 specs/                    # Feature specifications
│   ├── V2/                      # V2 specs (partially implemented)
│   └── v3/                      # V3 mockups (current direction)
├── 📁 docs/                     # Generated documentation (this folder)
├── 📁 _bmad/                    # BMM methodology files
├── 📁 _bmad-output/             # BMM planning artifacts
│
├── 📄 package.json              # Dependencies and scripts
├── 📄 vite.config.ts            # Vite configuration
├── 📄 tsconfig.json             # TypeScript config (frontend)
├── 📄 eslint.config.js          # ESLint configuration
├── 📄 index.html                # HTML entry point
├── 📄 components.json           # Shadcn/UI configuration
│
├── 📄 CLAUDE.md                 # Claude Code instructions
├── 📄 ARCHITECTURE.md           # Architecture doc (to consolidate)
├── 📄 CONVENTIONS.md            # Code conventions
├── 📄 DESIGN_GUIDELINES.md      # Design system (1000 lines)
├── 📄 MULTI_USER_SPEC.md        # Multi-user specification
├── 📄 CONVEX_GUIDELINES.md      # Convex validation procedure
├── 📄 convex_rules.txt          # Official Convex rules
└── 📄 .env.example              # Environment variables template
```

---

## Frontend Structure (`src/`)

```
src/
├── 📄 App.tsx                   # ⭐ Root component, routing, auth flow
├── 📄 main.tsx                  # React entry point
├── 📄 index.css                 # ⭐ Tailwind v4 theme (@theme config)
├── 📄 vite-env.d.ts             # Vite type definitions
│
├── 📄 SignInForm.tsx            # Login form component
├── 📄 SignOutButton.tsx         # Logout button
│
├── 📁 components/               # ⭐ React components (80+ files)
│   │
│   ├── 📁 ui/                   # Shadcn UI components
│   │   ├── button.tsx           # Button variants
│   │   ├── input.tsx            # Text input
│   │   ├── dialog.tsx           # Modal dialogs
│   │   ├── select.tsx           # Dropdown select
│   │   ├── card.tsx             # Card container
│   │   ├── badge.tsx            # Status badges
│   │   ├── avatar.tsx           # User avatars
│   │   ├── tabs.tsx             # Tab navigation
│   │   ├── calendar.tsx         # Date picker calendar
│   │   ├── popover.tsx          # Floating popovers
│   │   ├── dropdown-menu.tsx    # Dropdown menus
│   │   ├── tooltip.tsx          # Tooltips
│   │   ├── sidebar.tsx          # Sidebar component
│   │   ├── collapsible.tsx      # Collapsible sections
│   │   ├── pagination.tsx       # Pagination controls
│   │   ├── textarea.tsx         # Multi-line input
│   │   ├── label.tsx            # Form labels
│   │   ├── switch.tsx           # Toggle switches
│   │   ├── radio-group.tsx      # Radio buttons
│   │   ├── input-group.tsx      # Input with addons
│   │   └── simple-tooltip.tsx   # Simple tooltip variant
│   │
│   ├── 📁 layout/               # Layout components
│   │   ├── AppLayout.tsx        # ⭐ Main app wrapper
│   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   └── Topbar.tsx           # Top navigation bar
│   │
│   ├── 📁 landing/              # Landing page components
│   │   ├── HeroSection.tsx      # Hero section
│   │   ├── FeaturesSection.tsx  # Features grid
│   │   ├── TestimonialSection.tsx # Testimonials
│   │   ├── CTASection.tsx       # Call to action
│   │   ├── LandingHeader.tsx    # Landing header
│   │   ├── LandingFooter.tsx    # Landing footer
│   │   ├── SocialProofBar.tsx   # Social proof
│   │   └── InteractiveDemo.tsx  # Interactive demo
│   │
│   ├── 📁 auth/                 # Authentication layouts
│   │   ├── SimpleAuthLayout.tsx # Simple auth page layout
│   │   ├── SplitAuthLayout.tsx  # Split screen auth
│   │   └── AuthVisualPanel.tsx  # Visual panel for auth
│   │
│   ├── 📁 modals/               # Modal dialogs
│   │   ├── MarkAsPaidModal.tsx  # Mark invoice paid
│   │   ├── RecordPaymentModal.tsx # Record payment
│   │   └── EmailPreviewModal.tsx # Email preview
│   │
│   ├── 📁 mainView/             # Main invoice view
│   │   ├── InvoiceRow.tsx       # Invoice table row
│   │   ├── InvoiceCard.tsx      # Invoice card (mobile)
│   │   ├── InvoiceTableCard.tsx # Invoice table wrapper
│   │   ├── InvoiceTableRow.tsx  # Table row variant
│   │   ├── FilterBar.tsx        # Filter controls
│   │   ├── TabFilterBar.tsx     # Tab-based filters
│   │   ├── StatsCards.tsx       # Statistics cards
│   │   └── AutoRemindersView.tsx # Auto reminders view
│   │
│   ├── 📄 Home.tsx              # Landing page component
│   ├── 📄 ForbiddenPage.tsx     # 403 error page
│   ├── 📄 InvoiceManager.tsx    # Invoice management
│   ├── 📄 InvoicesList.tsx      # Invoice list
│   ├── 📄 InvoiceEditModal.tsx  # Invoice editing
│   ├── 📄 InvoiceTimeline.tsx   # Invoice activity timeline
│   ├── 📄 InviteUserModal.tsx   # User invitation modal
│   ├── 📄 StatsNavigation.tsx   # Stats navigation
│   ├── 📄 MarkAsSentModal.tsx   # Mark as sent modal
│   ├── 📄 PaymentRecordModal.tsx # Payment record
│   ├── 📄 ReminderModal.tsx     # Reminder modal
│   ├── 📄 ReminderStepModal.tsx # Reminder step config
│   ├── 📄 SnoozeInvoiceModal.tsx # Snooze invoice
│   ├── 📄 EmailPreviewModalFollowUp.tsx # Follow-up email preview
│   ├── 📄 EmailEditModal.tsx    # Email editing
│   ├── 📄 BulkSendConfirmModal.tsx # Bulk send confirmation
│   └── 📄 PhoneCallCompleteModal.tsx # Phone call completion
│
├── 📁 pages/                    # Page components (routes)
│   ├── 📄 MainView.tsx          # ⭐ Main invoice view (/invoices)
│   ├── 📄 InvoiceDetail.tsx     # Invoice detail (/invoices/:id)
│   ├── 📄 InvoiceUpload.tsx     # Upload page (/upload)
│   ├── 📄 Dashboard.tsx         # Dashboard (legacy)
│   ├── 📄 Invoices.tsx          # Invoice list (V2 version)
│   ├── 📄 FollowUp.tsx          # Follow-up page
│   ├── 📄 CallPlan.tsx          # Call plan page
│   ├── 📄 Reminders.tsx         # Reminders page
│   ├── 📄 TeamManagement.tsx    # Team management
│   ├── 📄 OrganizationSettings.tsx # Settings page
│   ├── 📄 SignupForm.tsx        # Signup form
│   ├── 📄 AcceptInvitation.tsx  # Accept invitation
│   ├── 📄 OngoingInvoices.tsx   # Ongoing invoices (legacy)
│   ├── 📄 PaidInvoices.tsx      # Paid invoices (legacy)
│   ├── 📄 MvpMockup.tsx         # MVP mockup
│   └── 📄 MvpMockupV2.tsx       # MVP mockup v2
│
└── 📁 lib/                      # Utility functions
    ├── 📄 utils.ts              # cn() and other utilities
    ├── 📄 formatters.ts         # Date/currency formatters
    ├── 📄 invoiceHelpers.ts     # Invoice helper functions
    ├── 📄 invoiceActions.ts     # Invoice action handlers
    └── 📄 invoiceStatus.ts      # Status calculations
```

---

## Backend Structure (`convex/`)

```
convex/
├── 📄 schema.ts                 # ⭐ Database schema (289 lines)
├── 📄 auth.ts                   # Authentication functions
├── 📄 auth.config.ts            # Auth providers config
│
├── 📄 invoices.ts               # ⭐ Invoice CRUD (~1200 lines)
├── 📄 organizations.ts          # ⭐ Org management (~900 lines)
├── 📄 followUp.ts               # ⭐ Reminder processing (~600 lines)
├── 📄 events.ts                 # Activity events (~350 lines)
├── 📄 reminders.ts              # Reminder records
├── 📄 payments.ts               # Payment tracking
├── 📄 invoiceNotes.ts           # Invoice notes
├── 📄 users.ts                  # User functions
│
├── 📄 pdfExtractionAI.ts        # ⭐ Claude AI integration
├── 📄 oauth.ts                  # OAuth token management
├── 📄 permissions.ts            # Permission checks
├── 📄 reminderDefaults.ts       # Default reminder config
├── 📄 crons.ts                  # Scheduled jobs
├── 📄 testReminders.ts          # Test utilities
├── 📄 dev.ts                    # Development utilities
│
├── 📄 http.ts                   # HTTP endpoints
├── 📄 router.ts                 # Route definitions
├── 📄 utils.ts                  # Backend utilities
│
├── 📄 tsconfig.json             # TypeScript config (backend)
├── 📁 lib/                      # Shared backend utilities
└── 📁 _generated/               # Auto-generated types (do not edit)
```

---

## Specifications Structure (`specs/`)

```
specs/
├── 📁 V2/                       # V2 Specifications (Indigo theme - outdated)
│   ├── 📄 V2_TRACKING.md        # Development tracking
│   ├── 📄 WORKFLOW_STATES.md    # Invoice state machine
│   ├── 📄 PHASE_3_INTEGRATIONS.md # Integration specs
│   └── 📁 SCREENS/              # Per-screen specs
│       ├── 2.1_Dashboard.md
│       ├── 2.2_Invoices.md
│       ├── 2.3_InvoiceDetail.md
│       ├── 2.4_Clients.md
│       ├── 2.5_CallPlan.md
│       ├── 2.6_InvoiceUpload.md
│       ├── 2.7_BankReconciliation.md
│       ├── 2.8_RemindersAgenda.md
│       └── 2.9_Settings.md
│
└── 📁 v3/                       # V3 Specifications (Orange theme - current)
    └── 📁 screens/              # HTML mockups + images
        ├── landing_page.html
        ├── landing_page_desktop.jpg
        ├── landing_page_mobile.jpg
        ├── signup__login.html
        ├── signup__login_desktop.jpg
        ├── signup__login_mobile.jpg
        ├── invoices_list.html
        ├── invoices_list_desktop.png
        ├── settings.html
        └── settings_desktop.png
```

---

## Critical Paths Summary

### Entry Points

| File | Purpose |
|------|---------|
| `src/main.tsx` | React application entry |
| `src/App.tsx` | Routing and auth flow |
| `index.html` | HTML template |

### Core Business Logic

| File | Domain |
|------|--------|
| `convex/invoices.ts` | Invoice lifecycle |
| `convex/followUp.ts` | Reminder automation |
| `convex/organizations.ts` | Multi-tenancy |
| `convex/pdfExtractionAI.ts` | AI processing |

### Theme & Design

| File | Purpose |
|------|---------|
| `src/index.css` | Tailwind v4 theme config |
| `DESIGN_GUIDELINES.md` | Design system documentation |

---

*Generated by BMM document-project workflow.*
