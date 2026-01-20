# Product Backlog

> Future improvements and feature ideas for the Invoice Collection Assistant.
> Items here are not yet prioritized or scheduled for implementation.

---

## UX Improvements

### UI-001: PDF Preview Panel in Invoice Drawer

**Problem Statement:**
Currently, viewing an invoice PDF requires opening a new browser tab, causing context-switching and loss of focus on invoice details.

**Proposed Solution:**
Transform the Invoice Drawer into a split-view panel:
- **Left side:** Embedded PDF preview with toolbar (zoom, page navigation, download, print)
- **Right side:** Invoice details panel (current Drawer content)

**Inspiration:** Pennylane invoice detail view (see reference screenshot)

**User Value:**
- No context-switching between tabs
- Side-by-side comparison of PDF and metadata
- Faster invoice processing workflow

**Technical Considerations:**
- PDF.js or react-pdf library for inline rendering
- Drawer width may need to expand (or become full-screen modal)
- Fallback for invoices without attached PDF

**Priority:** Medium
**Effort Estimate:** TBD

---

### UI-002: Invoice Drawer Visual Hierarchy Redesign

**Problem Statement:**
Current Drawer layout doesn't emphasize the most critical information (amount due) prominently enough for a collections-focused application.

**Proposed Solution:**
Reorganize Drawer header following Pennylane's pattern:
1. **Hero amount** at top (large, bold, primary focus)
2. **Client name** directly below amount
3. **Dates** (invoice date + due date) side-by-side, same visual weight
4. **Invoice number** demoted to metadata level (less prominent)
5. Status badges and actions below

**Current vs Proposed:**
```
CURRENT:                          PROPOSED:
┌─────────────────────┐           ┌─────────────────────┐
│ #FAC-2024-001       │           │ 1 250,00 €          │ ← Hero
│ Client Name         │           │ Solde: 750,00 €     │
│ [Badges...]         │           │                     │
├─────────────────────┤           │ Client Name         │
│ Montant TTC         │           ├─────────────────────┤
│ 1 250,00 €          │           │ Date      │ Échéance│
│                     │           │ 15 jan    │ 30 jan  │
│ Date: 15 jan 2026   │           │                     │
│ Échéance: 30 jan    │           │ #FAC-2024-001       │ ← Demoted
└─────────────────────┘           │ [Badges...]         │
                                  └─────────────────────┘
```

**User Value:**
- Instant visibility of what matters most (money owed)
- Better scanning when reviewing multiple invoices
- Aligned with industry best practices (Pennylane, QuickBooks)

**Priority:** Low
**Effort Estimate:** Small (CSS/layout changes only)

---

## Future Features

_(Empty - add items as they arise)_

---

## Technical Debt

_(Empty - add items as they arise)_

---

*Last updated: 2026-01-20*
