import { useSearchParams } from "react-router-dom";
import { useCallback, useMemo } from "react";
import { Id } from "@convex/_generated/dataModel";

/**
 * Hook to manage invoice drawer state synchronized with URL params.
 * Enables shareable URLs and proper browser back/forward navigation.
 *
 * The backend (invoices:getById) handles invalid ID validation gracefully
 * by using ctx.db.normalizeId() and returning null for invalid formats.
 *
 * @returns {Object} - invoiceId and setter function
 * - selectedInvoiceId: The current invoice ID from URL, or null
 * - setSelectedInvoiceId: Function to update/clear the invoice param
 */
export function useInvoiceDrawerUrl() {
  const [searchParams, setSearchParams] = useSearchParams();

  const invoiceParam = searchParams.get("invoice");

  // Pass the raw param to the backend - it handles validation gracefully
  const selectedInvoiceId = useMemo(() => {
    if (!invoiceParam) return null;
    return invoiceParam as Id<"invoices">;
  }, [invoiceParam]);

  const setSelectedInvoiceId = useCallback(
    (invoiceId: Id<"invoices"> | null) => {
      // Preserve existing query params while updating/removing "invoice"
      const newParams = new URLSearchParams(searchParams);
      if (invoiceId) {
        newParams.set("invoice", invoiceId);
      } else {
        newParams.delete("invoice");
      }
      setSearchParams(newParams);
    },
    [searchParams, setSearchParams]
  );

  return {
    selectedInvoiceId,
    setSelectedInvoiceId,
  };
}
