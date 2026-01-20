import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Check if user has admin privileges (admin or superadmin role)
 * Centralized to ensure consistency across the app
 */
export function isAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Check if user has superadmin privileges
 */
export function isSuperAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin";
}
