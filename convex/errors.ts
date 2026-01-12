import { ConvexError } from "convex/values";

/**
 * Structure d'erreur pour les validations de formulaire
 * Permet au frontend d'afficher les erreurs inline sur les champs concernés
 */
export type ValidationErrorData = {
  code: string;
  field?: string;
  message: string;
};

/**
 * Crée une erreur de validation avec des données structurées
 */
export function validationError(
  code: string,
  message: string,
  field?: string
): ConvexError<ValidationErrorData> {
  return new ConvexError({ code, message, field });
}

/**
 * Codes d'erreur standards pour les formulaires
 */
export const ErrorCodes = {
  // Auth
  UNAUTHENTICATED: "UNAUTHENTICATED",
  UNAUTHORIZED: "UNAUTHORIZED",

  // Email
  INVALID_EMAIL_FORMAT: "INVALID_EMAIL_FORMAT",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  EMAIL_MISMATCH: "EMAIL_MISMATCH",

  // Invitation
  INVITATION_PENDING: "INVITATION_PENDING",
  INVITATION_NOT_FOUND: "INVITATION_NOT_FOUND",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  INVITATION_ALREADY_USED: "INVITATION_ALREADY_USED",

  // Organization
  NO_ORGANIZATION: "NO_ORGANIZATION",
  ALREADY_IN_ORGANIZATION: "ALREADY_IN_ORGANIZATION",

  // Generic
  NOT_FOUND: "NOT_FOUND",
  INVALID_INPUT: "INVALID_INPUT",
} as const;
