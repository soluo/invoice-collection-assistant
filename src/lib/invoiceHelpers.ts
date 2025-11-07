/**
 * Vérifie si on peut envoyer une relance pour une facture
 * Conditions : facture non payée ET échéance dépassée
 */
export function canSendReminder(invoice: any): boolean {
  return invoice.paymentStatus !== "paid" && new Date(invoice.dueDate) < new Date();
}

/**
 * Vérifie si on peut marquer une facture comme payée
 * Condition : facture non encore payée
 */
export function canMarkAsPaid(invoice: any): boolean {
  return invoice.paymentStatus !== "paid";
}
