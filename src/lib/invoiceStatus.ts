/**
 * Frontend helper for invoice status display
 * Uses V2 status structure (mainStatus, isOverdue, daysPastDue)
 */

export type MainStatus =
  | "pending"
  | "sent"
  | "overdue"
  | "reminder_1"
  | "reminder_2"
  | "reminder_3"
  | "reminder_4"
  | "manual_followup"
  | "paid";

// Keep old InvoiceStatus type for backward compatibility
export type InvoiceStatus = MainStatus;

export type StatusDisplay = {
  badgeLabel: string;
  complement?: string;
  colorClass: string;
};

const DAY_IN_MS = 1000 * 60 * 60 * 24;

/**
 * Pluralise le mot "jour" selon le nombre
 */
export function pluralizeDays(days: number): string {
  return `jour${Math.abs(days) > 1 ? "s" : ""}`;
}

/**
 * Formate le complément pour une facture à venir
 */
export function formatComplementDue(days: number): string {
  if (days <= 0) {
    return "aujourd'hui";
  }
  return `dans ${days} ${pluralizeDays(days)}`;
}

/**
 * Formate le complément pour une facture en retard
 */
export function formatComplementOverdue(days: number): string {
  if (days <= 0) {
    return "aujourd'hui";
  }
  return `En retard de ${days} ${pluralizeDays(days)}`;
}

/**
 * Formate le complément pour une facture payée
 */
export function formatComplementPaid(days: number): string {
  if (days <= 0) {
    return "le jour même";
  }
  return `en ${days} ${pluralizeDays(days)}`;
}

/**
 * Labels français pour l'affichage des statuts principaux
 */
const MAIN_STATUS_LABELS: Record<MainStatus, string> = {
  pending: "En attente",
  sent: "Envoyée",
  overdue: "En retard",
  reminder_1: "Relance 1",
  reminder_2: "Relance 2",
  reminder_3: "Relance 3",
  reminder_4: "Relance 4",
  manual_followup: "Suivi manuel",
  paid: "Payée",
};

/**
 * Couleurs pour les badges de statut (Tailwind classes)
 */
const MAIN_STATUS_COLORS: Record<MainStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  overdue: "bg-orange-100 text-orange-800",
  reminder_1: "bg-yellow-100 text-yellow-800",
  reminder_2: "bg-orange-100 text-orange-800",
  reminder_3: "bg-red-100 text-red-800",
  reminder_4: "bg-red-100 text-red-800",
  manual_followup: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
};

/**
 * Calcule l'affichage du statut d'une facture (badge + complément + couleur)
 * ✅ V2 : Utilise mainStatus, isOverdue, daysPastDue du backend
 */
export function getStatusDisplay(invoice: any): StatusDisplay {
  const mainStatus: MainStatus = invoice.mainStatus || "pending";
  const hasPartialPayment = invoice.hasPartialPayment || false;
  const outstandingBalance = invoice.outstandingBalance ?? 0;

  // Badge label depuis le mainStatus
  const badgeLabel = MAIN_STATUS_LABELS[mainStatus];
  const colorClass = MAIN_STATUS_COLORS[mainStatus];

  // Complément selon le statut
  let complement: string | undefined;

  if (mainStatus === "paid") {
    // Facture payée : afficher le délai de paiement
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined;
    const paidDate = invoice.paidDate ? new Date(invoice.paidDate) : undefined;
    if (invoiceDate && paidDate) {
      const days = Math.max(0, Math.round((paidDate.getTime() - invoiceDate.getTime()) / DAY_IN_MS));
      complement = formatComplementPaid(days);
    }
  } else if (hasPartialPayment) {
    // Paiement partiel : afficher le solde restant
    complement = `${outstandingBalance.toFixed(2)}€ restant`;
  } else if (mainStatus === "sent") {
    // Facture envoyée : afficher l'échéance
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
    if (dueDate) {
      const now = new Date();
      const daysRemaining = Math.max(0, Math.ceil((dueDate.getTime() - now.getTime()) / DAY_IN_MS));
      complement = formatComplementDue(daysRemaining);
    }
  }

  return {
    badgeLabel,
    complement,
    colorClass,
  };
}
