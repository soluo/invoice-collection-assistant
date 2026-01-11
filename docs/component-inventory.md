# Relance Factures - Component Inventory

**Generated:** 2026-01-11

---

## UI Component System

The project uses **Shadcn/UI** as the base component library, built on Radix UI primitives with Tailwind CSS styling.

### Design System

- **Theme:** Orange (`#f97316`) - defined in `DESIGN_GUIDELINES.md`
- **Configuration:** `src/index.css` with `@theme` directive (Tailwind v4)
- **Icons:** Lucide React (`lucide-react`)
- **Typography:** Rubik font family

---

## Shadcn/UI Components (`src/components/ui/`)

| Component | File | Radix Dependency | Usage |
|-----------|------|------------------|-------|
| **Button** | `button.tsx` | - | Primary actions, CTAs |
| **Input** | `input.tsx` | - | Text inputs |
| **Textarea** | `textarea.tsx` | - | Multi-line inputs |
| **Label** | `label.tsx` | `@radix-ui/react-label` | Form labels |
| **Select** | `select.tsx` | `@radix-ui/react-select` | Dropdown selects |
| **Dialog** | `dialog.tsx` | `@radix-ui/react-dialog` | Modal dialogs |
| **Popover** | `popover.tsx` | `@radix-ui/react-popover` | Floating content |
| **Dropdown Menu** | `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | Context menus |
| **Tabs** | `tabs.tsx` | `@radix-ui/react-tabs` | Tab navigation |
| **Card** | `card.tsx` | - | Content containers |
| **Badge** | `badge.tsx` | - | Status indicators |
| **Avatar** | `avatar.tsx` | `@radix-ui/react-avatar` | User avatars |
| **Calendar** | `calendar.tsx` | react-day-picker | Date picker |
| **Tooltip** | `tooltip.tsx` | `@radix-ui/react-tooltip` | Hover tips |
| **Switch** | `switch.tsx` | `@radix-ui/react-switch` | Toggle switches |
| **Radio Group** | `radio-group.tsx` | `@radix-ui/react-radio-group` | Radio buttons |
| **Sidebar** | `sidebar.tsx` | `@radix-ui/react-collapsible` | Navigation sidebar |
| **Collapsible** | `collapsible.tsx` | `@radix-ui/react-collapsible` | Expandable sections |
| **Pagination** | `pagination.tsx` | - | Page navigation |
| **Input Group** | `input-group.tsx` | - | Input with addons |
| **Simple Tooltip** | `simple-tooltip.tsx` | - | Simple tooltip variant |

---

## Layout Components (`src/components/layout/`)

### AppLayout

**File:** `AppLayout.tsx`

Main application wrapper providing sidebar and topbar structure.

```tsx
<AppLayout>
  <PageContent />
</AppLayout>
```

**Features:**
- Responsive sidebar (fixed desktop, overlay mobile)
- Topbar with user menu
- Content area with proper spacing

---

### Sidebar

**File:** `Sidebar.tsx`

Navigation sidebar with role-based menu items.

**Navigation Items:**
| Route | Icon | Label | Access |
|-------|------|-------|--------|
| `/invoices` | FileText | Factures | All |
| `/upload` | Upload | Importer | All |
| `/follow-up` | Bell | Relances | All |
| `/call-plan` | Phone | Appels | All |
| `/team` | Users | Équipe | Admin |
| `/settings` | Settings | Réglages | Admin |

**Mobile Behavior:** Overlay with backdrop, slide-in animation

---

### Topbar

**File:** `Topbar.tsx`

Top navigation bar with user greeting and dropdown menu.

**Features:**
- Dynamic greeting (Bonjour/Bonsoir based on time)
- User avatar with initials
- Dropdown menu (profile, settings, logout)
- Mobile hamburger menu trigger

---

## Business Components (`src/components/`)

### Invoice Components

| Component | File | Purpose |
|-----------|------|---------|
| **InvoiceManager** | `InvoiceManager.tsx` | Invoice list management |
| **InvoicesList** | `InvoicesList.tsx` | Invoice list display |
| **InvoiceEditModal** | `InvoiceEditModal.tsx` | Edit invoice details |
| **InvoiceTimeline** | `InvoiceTimeline.tsx` | Activity timeline |

### Main View Components (`mainView/`)

| Component | File | Purpose |
|-----------|------|---------|
| **InvoiceRow** | `InvoiceRow.tsx` | Table row (desktop) |
| **InvoiceCard** | `InvoiceCard.tsx` | Card view (mobile) |
| **InvoiceTableCard** | `InvoiceTableCard.tsx` | Table wrapper |
| **InvoiceTableRow** | `InvoiceTableRow.tsx` | Alternate row |
| **FilterBar** | `FilterBar.tsx` | Search and filters |
| **TabFilterBar** | `TabFilterBar.tsx` | Tab-based status filters |
| **StatsCards** | `StatsCards.tsx` | Statistics summary |
| **AutoRemindersView** | `AutoRemindersView.tsx` | Auto-reminder display |

### Modal Components

| Component | File | Trigger |
|-----------|------|---------|
| **MarkAsSentModal** | `MarkAsSentModal.tsx` | Mark invoice sent |
| **PaymentRecordModal** | `PaymentRecordModal.tsx` | Record payment |
| **ReminderModal** | `ReminderModal.tsx` | Send reminder |
| **ReminderStepModal** | `ReminderStepModal.tsx` | Configure step |
| **SnoozeInvoiceModal** | `SnoozeInvoiceModal.tsx` | Snooze invoice |
| **InviteUserModal** | `InviteUserModal.tsx` | Invite team member |
| **EmailPreviewModal** | `EmailPreviewModal.tsx` | Preview email |
| **EmailEditModal** | `EmailEditModal.tsx` | Edit email |
| **BulkSendConfirmModal** | `BulkSendConfirmModal.tsx` | Confirm bulk send |
| **PhoneCallCompleteModal** | `PhoneCallCompleteModal.tsx` | Complete phone call |
| **MarkAsPaidModal** | `modals/MarkAsPaidModal.tsx` | Mark as paid |
| **RecordPaymentModal** | `modals/RecordPaymentModal.tsx` | Record payment |
| **EmailPreviewModal** | `modals/EmailPreviewModal.tsx` | Email preview |

### Landing Page Components (`landing/`)

| Component | File | Purpose |
|-----------|------|---------|
| **HeroSection** | `HeroSection.tsx` | Main hero |
| **FeaturesSection** | `FeaturesSection.tsx` | Feature grid |
| **TestimonialSection** | `TestimonialSection.tsx` | Testimonials |
| **CTASection** | `CTASection.tsx` | Call to action |
| **LandingHeader** | `LandingHeader.tsx` | Header navigation |
| **LandingFooter** | `LandingFooter.tsx` | Footer |
| **SocialProofBar** | `SocialProofBar.tsx` | Social proof |
| **InteractiveDemo** | `InteractiveDemo.tsx` | Demo section |

### Auth Components (`auth/`)

| Component | File | Purpose |
|-----------|------|---------|
| **SimpleAuthLayout** | `SimpleAuthLayout.tsx` | Login page layout |
| **SplitAuthLayout** | `SplitAuthLayout.tsx` | Signup split layout |
| **AuthVisualPanel** | `AuthVisualPanel.tsx` | Visual panel |

---

## Page Components (`src/pages/`)

| Page | File | Route | Purpose |
|------|------|-------|---------|
| **MainView** | `MainView.tsx` | `/invoices` | Main invoice list |
| **InvoiceDetail** | `InvoiceDetail.tsx` | `/invoices/:id` | Invoice details |
| **InvoiceUpload** | `InvoiceUpload.tsx` | `/upload` | PDF upload |
| **Dashboard** | `Dashboard.tsx` | `/dashboard` | Legacy dashboard |
| **FollowUp** | `FollowUp.tsx` | `/follow-up` | Follow-up view |
| **CallPlan** | `CallPlan.tsx` | `/call-plan` | Call planning |
| **Reminders** | `Reminders.tsx` | `/reminders` | Reminders view |
| **TeamManagement** | `TeamManagement.tsx` | `/team` | Team management |
| **OrganizationSettings** | `OrganizationSettings.tsx` | `/settings` | Settings |
| **SignupForm** | `SignupForm.tsx` | `/signup` | Registration |
| **AcceptInvitation** | `AcceptInvitation.tsx` | `/accept-invitation/:token` | Accept invite |

---

## Utility Functions (`src/lib/`)

| File | Exports | Purpose |
|------|---------|---------|
| `utils.ts` | `cn()` | Class name merging (clsx + tailwind-merge) |
| `formatters.ts` | Date/currency formatters | Display formatting |
| `invoiceHelpers.ts` | Invoice calculations | Business logic helpers |
| `invoiceActions.ts` | Action handlers | Invoice action logic |
| `invoiceStatus.ts` | Status utilities | Status calculations |

---

## Component Patterns

### Using cn() for Conditional Classes

```tsx
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded-lg",
    isActive && "bg-brand-500 text-white",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
>
  Click me
</button>
```

### NavLink for Navigation

```tsx
import { NavLink } from "react-router-dom";

<NavLink
  to="/invoices"
  className={({ isActive }) =>
    cn(
      "px-4 py-2 rounded-lg",
      isActive ? "bg-brand-50 text-brand-600" : "text-slate-600"
    )
  }
>
  Factures
</NavLink>
```

### Modal Pattern

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

---

## Icon Usage

Icons from `lucide-react` with consistent sizing:

```tsx
import { FileText, Mail, Phone, Settings } from "lucide-react";

// Standard sizes
<FileText className="h-4 w-4" />  // Small (inline)
<FileText className="h-5 w-5" />  // Medium (buttons)
<FileText className="h-6 w-6" />  // Large (features)
```

---

*Generated by BMM document-project workflow.*
