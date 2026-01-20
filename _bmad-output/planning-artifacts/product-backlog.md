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

### FEAT-001: Tracking Ouverture des Emails (Analytics)

**Problem Statement:**
Actuellement, il n'y a aucune visibilité sur l'efficacité des emails de relance envoyés. On ne sait pas si les clients ouvrent les emails ou les ignorent.

**Proposed Solution:**
Utiliser l'image de signature comme pixel de tracking. L'endpoint HTTP qui sert l'image logge chaque requête avant de retourner l'image.

**Principe technique :**
```
Email HTML: <img src="https://xxx.convex.site/track/{trackingId}/signature.png" alt="Signature" />
                                    │
                                    ▼ Client ouvre l'email
Endpoint HTTP: GET /track/{trackingId}/signature.png
  1. Décoder trackingId → reminderId, invoiceId, organizationId
  2. Logger l'ouverture (table emailOpens ou event)
  3. Retourner l'image de signature
```

**Points clés :**

| Aspect | Détail |
|--------|--------|
| **trackingId** | Token unique encodé par email (base64 de `{reminderId}:{timestamp}`) |
| **Données à logger** | `reminderId`, `invoiceId`, `openedAt`, `userAgent`, `ipAddress` |
| **Faux positifs** | Pre-fetching Outlook/Gmail, Apple Mail Privacy Protection |
| **Fiabilité** | ~40-60% des ouvertures détectées (images bloquées par défaut) |
| **Cache** | `Cache-Control: no-cache` pour éviter le cache navigateur |

**Schema suggéré :**
```typescript
emailOpens: defineTable({
  organizationId: v.id("organizations"),
  invoiceId: v.id("invoices"),
  reminderId: v.optional(v.id("reminders")),
  trackingId: v.string(),
  openedAt: v.number(),
  userAgent: v.optional(v.string()),
  ipAddress: v.optional(v.string()),
  isLikelyBot: v.optional(v.boolean()), // Détection pre-fetchers
})
```

**Stories à créer :**
- Story: Génération de trackingId unique par email envoyé
- Story: Endpoint de tracking avec logging des ouvertures
- Story: Détection des bots/pre-fetchers (filtrer faux positifs)
- Story: UI dashboard stats d'ouverture par facture/relance
- Story: Indicateur "Email vu" sur la liste des relances

**Limites connues :**
- Images bloquées par défaut dans beaucoup de clients mail
- Apple Mail Privacy Protection (iOS 15+) pré-charge les images
- Outlook peut pre-fetcher les images (faux positifs)
- Ne fonctionne que si le destinataire charge les images

**User Value:**
- Visibilité sur l'efficacité des relances
- Identifier les clients qui ignorent systématiquement les emails
- Adapter la stratégie de relance (passer au téléphone si emails non lus)

**Prerequisite:** Story 7.4 (Signature Email avec Image) - l'endpoint `/organization/{orgId}/signature.png` sera étendu vers `/track/{trackingId}/signature.png`

**Priority:** Low (indicateur approximatif, pas critique pour MVP)
**Effort Estimate:** Medium (backend + UI dashboard)

---

## Technical Debt

_(Empty - add items as they arise)_

---

*Last updated: 2026-01-20*
