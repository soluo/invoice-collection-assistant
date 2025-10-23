/**
 * Normalize email addresses so lookups remain case-insensitive.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
