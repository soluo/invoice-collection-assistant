# Story 6.2: Échéance J+14 par Défaut

Status: done

## Story

As a **user**,
I want **the due date to default to +14 days when adding a new invoice**,
So that **I don't have to manually calculate and enter the standard payment term**.

## Acceptance Criteria

### AC1: Default Due Date is +14 Days from Invoice Date
**Given** I am on the invoice upload/creation page
**When** a PDF is uploaded and AI extracts the invoice date but NOT a due date
**Then** the due date field defaults to invoice date + 14 days
**And** I can still modify the due date if needed

### AC2: Default Due Date When No Invoice Date
**Given** I am on the invoice upload/creation page
**When** no invoice date is available (manual entry or extraction failed)
**Then** the due date field defaults to today + 14 days

### AC3: AI Extracted Due Date Takes Priority
**Given** the AI extracts a due date from the PDF
**When** a due date is found in the document
**Then** use the extracted date instead of the default
**And** only apply +14 days default when no due date is detected

### AC4: AI Fallback Uses +14 Days
**Given** the AI extraction action runs
**When** no due date can be extracted from the PDF
**Then** the fallback calculation uses +14 days

## Tasks / Subtasks

- [x] Task 1: Verify frontend default calculation (AC: #1, #2)
  - [x] 1.1 Confirm `src/pages/InvoiceUpload.tsx` uses J+14 ✅ Already correct

- [x] Task 2: Fix AI extraction fallback (AC: #4)
  - [x] 2.1 In `convex/pdfExtractionAI.ts`, change fallback from 30 days to 14 days (line 153)
  - [x] 2.2 In `convex/pdfExtractionAI.ts`, change error fallback from 30 days to 14 days (line 179)
  - [x] 2.3 Run `pnpm dev:backend` to validate Convex changes

- [x] Task 3: Add tests (AC: #1, #2, #3, #4)
  - [x] 3.1 Create test file `convex/dueDate.test.ts`
  - [x] 3.2 Test: Default due date is invoice date + 14 days
  - [x] 3.3 Test: Default due date is today + 14 days when no invoice date
  - [x] 3.4 Test: AI fallback uses 14 days not 30 days
  - [x] 3.5 Test: Edge cases (leap year, month/year boundaries)
  - [x] 3.6 Run `pnpm lint` and `pnpm test` - all 19 tests pass

## Dev Notes

### Changes Made

**File: `convex/pdfExtractionAI.ts`**
- Line 153: Changed `30 * 24 * 60 * 60 * 1000` → `14 * 24 * 60 * 60 * 1000`
- Line 179: Changed `30 * 24 * 60 * 60 * 1000` → `14 * 24 * 60 * 60 * 1000`

**File: `src/pages/InvoiceUpload.tsx`**
- ✅ Already correct at J+14 (lines 32 and 35)

### Date Calculation Logic

```typescript
// Frontend: src/pages/InvoiceUpload.tsx
const getDefaultDueDate = (invoiceDate?: string | null) => {
  if (invoiceDate) {
    const parsed = new Date(invoiceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateToISO(addDays(parsed, 14));  // ✅ J+14
    }
  }
  return formatDateToISO(addDays(new Date(), 14));  // ✅ J+14
};

// Backend AI fallback: convex/pdfExtractionAI.ts
dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)  // ✅ Now J+14
```

### Priority Rules

1. **Extracted due date** from PDF → Use as-is
2. **No extracted date + invoice date available** → invoice date + 14 days
3. **No extracted date + no invoice date** → today + 14 days

### References

- [Source: src/pages/InvoiceUpload.tsx:28-36] - Frontend default calculation
- [Source: convex/pdfExtractionAI.ts:153,179] - AI extraction fallbacks
- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.2] - Original story

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- ✅ Frontend was already using J+14 - no changes needed
- ✅ Fixed AI fallback from J+30 to J+14 (2 occurrences in pdfExtractionAI.ts)
- ✅ Added 14 tests for due date logic in convex/dueDate.test.ts
- ✅ Removed debug console.log from pdfExtractionAI.ts (code review fix)
- ✅ Added tests for AC3 (extracted date priority) and invalid dates (code review fix)
- ✅ All tests pass, lint and build pass

### File List

- convex/pdfExtractionAI.ts (modified - fallback 30 → 14 days, removed debug logs)
- convex/dueDate.test.ts (created - 14 tests for due date logic)
- _bmad-output/planning-artifacts/epics.md (modified - corrected 15 → 14 days in story definition)
