# Story 3.1: Filtre "Suivi Manuel" sur Liste Factures

## Story

As a **user**,
I want **to filter invoices that have completed all automatic reminders**,
So that **I can see which invoices need manual follow-up (phone, other means) and track my progress via notes**.

## Status: review

## Context

Le système de relances automatiques passe automatiquement une facture en `reminderStatus = "manual_followup"` quand toutes les étapes configurées sont terminées (par défaut: J+7 email, J+14 email, J+30 phone).

À ce stade :
- Le cron ne génère plus de relances pour cette facture
- L'utilisateur doit relancer manuellement (téléphone, courrier, etc.)
- Les notes (Story 1.6) permettent de tracker les actions manuelles

**Il manque uniquement un filtre dans l'UI pour voir ces factures.**

## Acceptance Criteria

### AC1: Option de filtre visible
**Given** I am on the /invoices page
**When** I look at the status filter dropdown
**Then** I see a new option "Suivi manuel"

### AC2: Filtre fonctionne
**Given** I select the "Suivi manuel" filter
**When** the list updates
**Then** I see only invoices where `reminderStatus === "manual_followup"`
**And** these are invoices that have completed all configured reminder steps

### AC3: Badge compteur
**Given** there are invoices needing manual follow-up
**When** I view the filter options
**Then** I can see a count of invoices in "Suivi manuel" status (optional, if other filters have counts)

### AC4: Notes accessibles
**Given** I view an invoice in "Suivi manuel" status
**When** I open the invoice drawer
**Then** I can add notes to track my manual follow-up actions
**And** notes show author and timestamp (existing functionality from Story 1.6)

### AC5: Clear filter
**Given** I have the "Suivi manuel" filter active
**When** I select "Toutes" or clear the filter
**Then** I see all invoices again

## Technical Implementation

### Backend (convex/invoices.ts)

Dans la query `listInvoicesWithFilters`, ajouter un cas pour le filtre :

```typescript
// Dans le switch ou les conditions de filtrage
case "suivi-manuel":
  return invoice.reminderStatus === "manual_followup";
```

Ou si c'est un filtre séparé, ajouter un argument :
```typescript
args: {
  // ... existing args
  reminderStatusFilter?: v.optional(v.literal("manual_followup")),
}
```

### Frontend (src/components/mainView/FilterBar.tsx)

Ajouter l'option dans le dropdown de statut :

```tsx
<SelectItem value="suivi-manuel">Suivi manuel</SelectItem>
```

### Fichiers à modifier

1. `convex/invoices.ts` - Query `listInvoicesWithFilters` ou similaire
2. `src/components/mainView/FilterBar.tsx` - Dropdown des filtres
3. `src/pages/MainView.tsx` - Si logique de filtre côté client

### Vérification

- [x] Le filtre apparaît dans le dropdown (onglet "Suivi manuel" ajouté dans TabFilterBar)
- [x] Sélectionner "Suivi manuel" affiche uniquement les factures avec `reminderStatus === "manual_followup"`
- [x] Le drawer s'ouvre et les notes sont accessibles (fonctionnalité existante - Story 1.6)
- [x] Le filtre peut être effacé (sélectionner "Toutes" remet le filtre à all)

## Dev Agent Record

### Implementation Notes (2026-01-19)

**Changements effectués :**

1. **Backend (`convex/invoices.ts`):**
   - Ajout de `v.literal("suivi-manuel")` dans le validateur `statusFilter` de `listInvoicesWithFilters`
   - Ajout du cas `case "suivi-manuel": return invoice.reminderStatus === "manual_followup";` dans le switch de filtrage

2. **Frontend (`src/components/mainView/TabFilterBar.tsx`):**
   - Ajout de l'onglet `{ value: "suivi-manuel", label: "Suivi manuel" }` dans le tableau `statusTabs`

**Fichiers modifiés :**
- `convex/invoices.ts` (lignes 1145-1152, 1298-1299)
- `src/components/mainView/TabFilterBar.tsx` (ligne 48)

**Validation :**
- ✅ `pnpm lint` : TypeScript compile sans erreur
- ✅ `pnpm build` : Build production réussie

## Out of Scope

- Gestion des appels téléphoniques dans l'app (reporté au backlog)
- Auto-snooze des appels (reporté au backlog)
- Snooze manuel des relances (reporté au backlog)

## Dependencies

- Story 1.6 (Invoice Notes) - ✅ Done

## Estimation

~25-30 minutes (filtre simple, la logique `manual_followup` existe déjà)
