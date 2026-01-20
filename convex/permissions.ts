/**
 * Helpers pour la gestion des permissions multi-utilisateurs
 *
 * Ce fichier centralise toute la logique de permissions pour :
 * - Vérifier les rôles (admin vs technicien)
 * - Contrôler l'accès aux factures
 * - Valider les opérations (création, modification, suppression)
 */

import { Doc, Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Type pour un utilisateur avec ses informations d'organisation
 */
export type UserWithOrg = {
  userId: Id<"users">;
  role: "admin" | "technicien" | "superadmin";
  organizationId: Id<"organizations">;
  email?: string;
  name?: string;
};

/**
 * Récupère l'utilisateur authentifié avec ses informations d'organisation
 * Lance une erreur si l'utilisateur n'est pas authentifié ou n'appartient à aucune organisation
 */
export async function getUserWithOrg(
  ctx: QueryCtx | MutationCtx
): Promise<UserWithOrg> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Non authentifié");
  }

  // Validate userId format before attempting db.get
  // Convex IDs should be longer than 7 characters
  if (typeof userId === 'string' && userId.length < 10) {
    throw new Error("Session invalide - veuillez vous reconnecter");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("Utilisateur introuvable");
  }

  if (!user.organizationId) {
    throw new Error("Vous n'appartenez à aucune organisation");
  }

  if (!user.role) {
    throw new Error("Rôle utilisateur non défini");
  }

  return {
    userId,
    role: user.role,
    organizationId: user.organizationId,
    email: user.email,
    name: user.name,
  };
}

/**
 * Vérifie si l'utilisateur est admin (ou superadmin qui hérite des privilèges admin)
 */
export function isAdmin(user: UserWithOrg): boolean {
  return hasAdminRole(user.role);
}

/**
 * Vérifie si l'utilisateur est superadmin
 */
export function isSuperAdmin(user: UserWithOrg): boolean {
  return user.role === "superadmin";
}

/**
 * Helper simple pour vérifier si un rôle est admin ou superadmin
 * Utilisable quand on n'a pas un UserWithOrg complet
 */
export function hasAdminRole(role: string | undefined | null): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Assertion : lance une erreur si l'utilisateur n'est pas superadmin
 */
export function assertIsSuperAdmin(user: UserWithOrg): void {
  if (!isSuperAdmin(user)) {
    throw new Error("Cette opération nécessite les privilèges super administrateur");
  }
}

/**
 * Vérifie si l'utilisateur peut accéder à une facture (lecture)
 *
 * Règles :
 * - Admin : peut voir toutes les factures de son organisation
 * - Technicien : peut voir uniquement ses propres factures
 */
export function canAccessInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): boolean {
  // Vérifier que la facture appartient à la même organisation
  if (invoice.organizationId !== user.organizationId) {
    return false;
  }

  // Si admin, accès à toutes les factures de l'org
  if (isAdmin(user)) {
    return true;
  }

  // Si technicien, accès uniquement à ses propres factures
  // On vérifie à la fois userId (ancienne logique) et createdBy (nouvelle logique)
  return invoice.userId === user.userId || invoice.createdBy === user.userId;
}

/**
 * Vérifie si l'utilisateur peut modifier une facture
 *
 * Règles :
 * - Personne ne peut modifier une facture payée (paymentStatus === "paid")
 * - Admin : peut modifier toutes les factures non payées de son organisation
 * - Technicien : peut modifier uniquement ses propres factures non payées
 */
export function canModifyInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): boolean {
  // Vérifier que la facture appartient à la même organisation
  if (invoice.organizationId !== user.organizationId) {
    return false;
  }

  // Personne ne peut modifier une facture payée
  if (invoice.paymentStatus === "paid") {
    return false;
  }

  // Admin peut modifier toutes les factures non payées de l'org
  if (isAdmin(user)) {
    return true;
  }

  // Technicien peut modifier uniquement ses propres factures non payées
  return invoice.userId === user.userId || invoice.createdBy === user.userId;
}

/**
 * Vérifie si l'utilisateur peut supprimer une facture
 *
 * Règles :
 * - Admin : peut supprimer toutes les factures de son organisation
 * - Technicien : peut supprimer uniquement ses propres factures (pour ré-import)
 */
export function canDeleteInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): boolean {
  // Vérifier que la facture appartient à la même organisation
  if (invoice.organizationId !== user.organizationId) {
    return false;
  }

  // Admin peut supprimer toutes les factures de l'org
  if (isAdmin(user)) {
    return true;
  }

  // Technicien peut supprimer uniquement ses propres factures
  return invoice.userId === user.userId || invoice.createdBy === user.userId;
}

/**
 * Vérifie si l'utilisateur peut changer le statut d'une facture
 *
 * Règles :
 * - Admin : peut changer le statut de toutes les factures de son organisation
 * - Technicien : peut changer le statut de ses propres factures uniquement
 */
export function canUpdateInvoiceStatus(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): boolean {
  // Vérifier que la facture appartient à la même organisation
  if (invoice.organizationId !== user.organizationId) {
    return false;
  }

  // Admin peut changer le statut de toutes les factures
  if (isAdmin(user)) {
    return true;
  }

  // Technicien peut changer le statut de ses propres factures
  return invoice.userId === user.userId || invoice.createdBy === user.userId;
}

/**
 * Vérifie si l'utilisateur peut envoyer une relance pour une facture
 *
 * Règles :
 * - Admin : peut envoyer des relances pour toutes les factures de son organisation
 * - Technicien : peut envoyer des relances pour ses propres factures uniquement
 */
export function canSendReminder(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): boolean {
  // Même logique que canUpdateInvoiceStatus
  return canUpdateInvoiceStatus(user, invoice);
}

/**
 * Assertion : lance une erreur si l'utilisateur n'est pas admin
 */
export function assertIsAdmin(user: UserWithOrg): void {
  if (!isAdmin(user)) {
    throw new Error("Cette opération nécessite les privilèges administrateur");
  }
}

/**
 * Assertion : lance une erreur si l'utilisateur ne peut pas accéder à la facture
 */
export function assertCanAccessInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): void {
  if (!canAccessInvoice(user, invoice)) {
    throw new Error("Vous n'avez pas accès à cette facture");
  }
}

/**
 * Assertion : lance une erreur si l'utilisateur ne peut pas modifier la facture
 */
export function assertCanModifyInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): void {
  if (!canModifyInvoice(user, invoice)) {
    throw new Error("Vous n'avez pas le droit de modifier cette facture");
  }
}

/**
 * Assertion : lance une erreur si l'utilisateur ne peut pas supprimer la facture
 */
export function assertCanDeleteInvoice(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): void {
  if (!canDeleteInvoice(user, invoice)) {
    throw new Error("Vous n'avez pas le droit de supprimer cette facture");
  }
}

/**
 * Assertion : lance une erreur si l'utilisateur ne peut pas changer le statut
 */
export function assertCanUpdateInvoiceStatus(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): void {
  if (!canUpdateInvoiceStatus(user, invoice)) {
    throw new Error("Vous n'avez pas le droit de modifier le statut de cette facture");
  }
}

/**
 * Assertion : lance une erreur si l'utilisateur ne peut pas envoyer de relance
 */
export function assertCanSendReminder(
  user: UserWithOrg,
  invoice: Doc<"invoices">
): void {
  if (!canSendReminder(user, invoice)) {
    throw new Error("Vous n'avez pas le droit d'envoyer une relance pour cette facture");
  }
}
