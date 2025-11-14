/**
 * ✅ V2 : Helpers pour calculer le statut d'affichage des factures
 *
 * Ce fichier contient la logique de calcul du "statut principal" pour l'UI,
 * basé sur les 3 dimensions d'états + calculs temporels.
 */

export type SendStatus = "pending" | "sent";
export type PaymentStatus = "unpaid" | "partial" | "pending_payment" | "paid";
export type ReminderStatus =
  | "none"
  | "reminder_1"
  | "reminder_2"
  | "reminder_3"
  | "reminder_4"
  | "manual_followup";

export type MainStatus =
  | "pending" // En attente d'envoi
  | "sent" // Envoyée, pas encore échue
  | "overdue" // En retard, pas encore de relance
  | "reminder_1" // Première relance
  | "reminder_2" // Deuxième relance
  | "reminder_3" // Troisième relance
  | "reminder_4" // Quatrième relance (si configuré)
  | "manual_followup" // Suivi manuel / contentieux
  | "pending_payment" // Chèque(s) en attente d'encaissement
  | "paid"; // Payée (statut final)

export interface InvoiceDisplayInfo {
  mainStatus: MainStatus;
  isOverdue: boolean;
  daysPastDue: number;
  hasPartialPayment: boolean;
  partialAmount: number | undefined;
  outstandingBalance: number;
}

interface InvoiceData {
  sendStatus: SendStatus;
  paymentStatus: PaymentStatus;
  reminderStatus: ReminderStatus;
  dueDate: string;
  amountTTC: number;
  paidAmount?: number;
}

/**
 * Calcule les informations d'affichage complètes d'une facture
 *
 * Retourne un objet riche avec :
 * - mainStatus : statut principal pour l'UI (tri, couleur, icône)
 * - isOverdue : la facture est-elle en retard ?
 * - daysPastDue : nombre de jours de retard
 * - hasPartialPayment : y a-t-il un paiement partiel ?
 * - partialAmount : montant du paiement partiel
 * - outstandingBalance : solde restant à payer
 */
export function getInvoiceDisplayInfo(
  invoice: InvoiceData,
  now: Date = new Date()
): InvoiceDisplayInfo {
  const dueDate = new Date(invoice.dueDate);
  // ✅ Les factures avec paymentStatus "pending_payment" ne sont pas considérées en retard
  const isOverdue = dueDate < now && invoice.paymentStatus !== "paid" && invoice.paymentStatus !== "pending_payment";
  const daysPastDue = isOverdue
    ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const hasPartialPayment = invoice.paymentStatus === "partial";
  const partialAmount = invoice.paidAmount;
  const outstandingBalance = invoice.amountTTC - (invoice.paidAmount || 0);

  // Déterminer le statut principal selon la logique de priorité
  // ✅ V2 : sendStatus vérifié en PREMIER (factures non envoyées ne peuvent pas avoir de relances)
  let mainStatus: MainStatus;

  if (invoice.sendStatus === "pending") {
    // En attente d'envoi - prioritaire sur tout (car pas encore envoyée au client)
    mainStatus = "pending";
  } else if (invoice.paymentStatus === "paid") {
    // Statut final : facture payée
    mainStatus = "paid";
  } else if (invoice.paymentStatus === "pending_payment") {
    // Chèque(s) en attente d'encaissement - prioritaire sur tout sauf "paid"
    mainStatus = "pending_payment";
  } else if (invoice.reminderStatus === "manual_followup") {
    // Fin des relances automatiques → suivi manuel
    mainStatus = "manual_followup";
  } else if (invoice.reminderStatus !== "none") {
    // En cours de relance (reminder_1, reminder_2, etc.)
    mainStatus = invoice.reminderStatus as MainStatus;
  } else if (isOverdue) {
    // En retard mais pas encore de relance
    mainStatus = "overdue";
  } else if (invoice.sendStatus === "sent") {
    // Envoyée, pas encore échue
    mainStatus = "sent";
  } else {
    // Fallback (ne devrait jamais arriver)
    mainStatus = "pending";
  }

  return {
    mainStatus,
    isOverdue,
    daysPastDue,
    hasPartialPayment,
    partialAmount,
    outstandingBalance,
  };
}

/**
 * Extrait le numéro de relance depuis un ReminderStatus
 *
 * @param reminderStatus - Le statut de relance (ex: "reminder_2")
 * @returns Le numéro de relance (ex: 2), ou 0 si "none" ou "manual_followup"
 *
 * @example
 * getReminderNumber("reminder_1") // 1
 * getReminderNumber("reminder_3") // 3
 * getReminderNumber("none") // 0
 * getReminderNumber("manual_followup") // 0
 */
export function getReminderNumber(reminderStatus: ReminderStatus): number {
  if (reminderStatus === "none" || reminderStatus === "manual_followup") {
    return 0;
  }

  // Extraire le numéro depuis "reminder_X"
  const match = reminderStatus.match(/^reminder_(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/**
 * Construit un ReminderStatus depuis un numéro
 *
 * @param reminderNumber - Le numéro de relance (1, 2, 3, 4...)
 * @returns Le ReminderStatus correspondant (ex: "reminder_2")
 *
 * @example
 * getReminderStatusFromNumber(1) // "reminder_1"
 * getReminderStatusFromNumber(3) // "reminder_3"
 */
export function getReminderStatusFromNumber(reminderNumber: number): ReminderStatus {
  if (reminderNumber <= 0) {
    return "none";
  }
  return `reminder_${reminderNumber}` as ReminderStatus;
}

/**
 * Labels français pour l'affichage des statuts principaux
 */
export const MAIN_STATUS_LABELS: Record<MainStatus, string> = {
  pending: "À envoyer",
  sent: "En attente",
  overdue: "En retard",
  reminder_1: "Relance 1",
  reminder_2: "Relance 2",
  reminder_3: "Relance 3",
  reminder_4: "Relance 4",
  manual_followup: "Suivi manuel",
  pending_payment: "Chèque(s) en attente",
  paid: "Payée",
};

/**
 * Couleurs pour les badges de statut (Tailwind classes)
 */
export const MAIN_STATUS_COLORS: Record<MainStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  overdue: "bg-orange-100 text-orange-800",
  reminder_1: "bg-yellow-100 text-yellow-800",
  reminder_2: "bg-orange-100 text-orange-800",
  reminder_3: "bg-red-100 text-red-800",
  reminder_4: "bg-red-100 text-red-800",
  manual_followup: "bg-purple-100 text-purple-800",
  pending_payment: "bg-cyan-100 text-cyan-800",
  paid: "bg-green-100 text-green-800",
};
