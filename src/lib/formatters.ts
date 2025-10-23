/**
 * Formate un montant en euros avec la locale française
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Formate une date au format français (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("fr-FR");
}
