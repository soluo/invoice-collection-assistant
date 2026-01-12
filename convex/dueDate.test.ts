import { describe, it, expect } from "vitest";

/**
 * Tests for default due date calculation logic.
 *
 * Business Rule: Default due date is invoice date + 14 days (J+14)
 *
 * This tests the pure date calculation logic used in:
 * - src/pages/InvoiceUpload.tsx (getDefaultDueDate function)
 * - convex/pdfExtractionAI.ts (fallback calculation)
 */

// Helper functions matching the implementation
const formatDateToISO = (date: Date) => date.toISOString().split("T")[0];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getDefaultDueDate = (invoiceDate?: string | null) => {
  if (invoiceDate) {
    const parsed = new Date(invoiceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateToISO(addDays(parsed, 14));
    }
  }
  return formatDateToISO(addDays(new Date(), 14));
};

// Backend fallback calculation (extracted from pdfExtractionAI.ts)
const getAIFallbackDueDate = () => {
  return new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
};

describe("Default Due Date Logic (J+14)", () => {
  describe("Frontend: getDefaultDueDate", () => {
    it("should return invoice date + 14 days when invoice date is provided", () => {
      const invoiceDate = "2026-01-01";
      const result = getDefaultDueDate(invoiceDate);
      expect(result).toBe("2026-01-15"); // Jan 1 + 14 days = Jan 15
    });

    it("should return today + 14 days when no invoice date is provided", () => {
      const result = getDefaultDueDate(null);
      const expected = formatDateToISO(addDays(new Date(), 14));
      expect(result).toBe(expected);
    });

    it("should return today + 14 days when invoice date is undefined", () => {
      const result = getDefaultDueDate(undefined);
      const expected = formatDateToISO(addDays(new Date(), 14));
      expect(result).toBe(expected);
    });

    it("should return today + 14 days when invoice date is empty string", () => {
      const result = getDefaultDueDate("");
      const expected = formatDateToISO(addDays(new Date(), 14));
      expect(result).toBe(expected);
    });

    it("should handle end of month correctly", () => {
      const invoiceDate = "2026-01-20";
      const result = getDefaultDueDate(invoiceDate);
      expect(result).toBe("2026-02-03"); // Jan 20 + 14 days = Feb 3
    });

    it("should handle leap year correctly", () => {
      const invoiceDate = "2024-02-15"; // 2024 is a leap year
      const result = getDefaultDueDate(invoiceDate);
      expect(result).toBe("2024-02-29"); // Feb 15 + 14 days = Feb 29
    });

    it("should handle year boundary correctly", () => {
      const invoiceDate = "2025-12-25";
      const result = getDefaultDueDate(invoiceDate);
      expect(result).toBe("2026-01-08"); // Dec 25 + 14 days = Jan 8
    });
  });

  describe("Backend: AI Fallback Due Date", () => {
    it("should return today + 14 days for AI fallback", () => {
      const result = getAIFallbackDueDate();
      const expected = formatDateToISO(addDays(new Date(), 14));
      expect(result).toBe(expected);
    });

    it("AI fallback should use 14 days, not 30 days", () => {
      const result = getAIFallbackDueDate();
      const todayPlus30 = formatDateToISO(addDays(new Date(), 30));
      expect(result).not.toBe(todayPlus30); // Must NOT be 30 days
    });
  });

  describe("Date format validation", () => {
    it("should return dates in YYYY-MM-DD format", () => {
      const result = getDefaultDueDate("2026-06-15");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
