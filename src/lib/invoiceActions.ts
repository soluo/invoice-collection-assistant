import { Send, DollarSign } from "lucide-react";
import type { SimplifiedInvoiceStatus } from "./invoiceStatus";

export interface PrimaryAction {
  label: string;
  icon: typeof Send | typeof DollarSign;
  variant: "default" | "outline";
  action: "markAsSent" | "recordPayment";
}

/**
 * ✅ Get the primary action button for a given invoice status
 * Returns null for paid invoices (no primary action)
 */
export function getPrimaryActionForStatus(
  status: SimplifiedInvoiceStatus
): PrimaryAction | null {
  const actions: Record<SimplifiedInvoiceStatus, PrimaryAction | null> = {
    "a-envoyer": {
      label: "Envoyer",
      icon: Send,
      variant: "default",
      action: "markAsSent",
    },
    envoyee: {
      label: "Enregistrer un paiement",
      icon: DollarSign,
      variant: "outline",
      action: "recordPayment",
    },
    "en-retard": {
      label: "Enregistrer un paiement",
      icon: DollarSign,
      variant: "outline",
      action: "recordPayment",
    },
    payee: null, // No primary action for paid invoices
  };

  return actions[status];
}
