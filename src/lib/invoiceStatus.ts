export type InvoiceStatus =
  | "sent"
  | "overdue"
  | "first_reminder"
  | "second_reminder"
  | "third_reminder"
  | "litigation"
  | "paid";

export type StatusDisplay = {
  badgeLabel: string;
  complement?: string;
  colorClass: string;
};

const overdueStatuses = new Set<InvoiceStatus>([
  "overdue",
  "first_reminder",
  "second_reminder",
  "third_reminder",
  "litigation",
]);

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
  return `de ${days} ${pluralizeDays(days)}`;
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
 * Calcule l'affichage du statut d'une facture (badge + complément + couleur)
 */
export function getStatusDisplay(invoice: any): StatusDisplay {
  const status: InvoiceStatus = invoice.status;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
  const now = new Date();

  if (status === "paid") {
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined;
    const paidDate = invoice.paidDate ? new Date(invoice.paidDate) : undefined;
    if (invoiceDate && paidDate) {
      const days = Math.max(0, Math.round((paidDate.getTime() - invoiceDate.getTime()) / DAY_IN_MS));
      return {
        badgeLabel: "Payée",
        complement: formatComplementPaid(days),
        colorClass: "bg-emerald-100 text-emerald-800",
      };
    }
    return {
      badgeLabel: "Payée",
      colorClass: "bg-emerald-100 text-emerald-800",
    };
  }

  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const remainingRaw = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_IN_MS);
    const daysOverdue = invoice.daysOverdue ?? Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / DAY_IN_MS));

    if (status === "sent" && remainingRaw >= 0) {
      const daysRemaining = Math.max(0, remainingRaw);
      return {
        badgeLabel: "Due",
        complement: formatComplementDue(daysRemaining),
        colorClass: "bg-blue-100 text-blue-800",
      };
    }

    if (status === "sent" && remainingRaw < 0) {
      const overdueDays = Math.max(1, Math.abs(remainingRaw));
      return {
        badgeLabel: "En retard",
        complement: formatComplementOverdue(overdueDays),
        colorClass: "bg-red-100 text-red-800",
      };
    }

    if (overdueStatuses.has(status)) {
      const overdueDays = Math.max(1, daysOverdue);
      return {
        badgeLabel: "En retard",
        complement: formatComplementOverdue(overdueDays),
        colorClass: "bg-red-100 text-red-800",
      };
    }
  }

  return {
    badgeLabel: "À envoyer",
    colorClass: "bg-gray-100 text-gray-800",
  };
}
