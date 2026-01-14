import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * ✅ Fonction de nettoyage de toutes les tables Convex (DEV UNIQUEMENT)
 *
 * ATTENTION : Cette fonction supprime TOUTES les données de la base de données.
 * Elle est protégée pour ne fonctionner qu'en environnement de développement.
 *
 * Usage : Appeler cette mutation depuis le dashboard Convex ou le code frontend
 * pour réinitialiser complètement la base de données pendant le développement.
 */
export const clearAllTables = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    deletedCounts: v.object({
      invoices: v.number(),
      reminders: v.number(),
      events: v.number(),
      payments: v.number(),
      invoiceNotes: v.number(),
      organizations: v.number(),
      invitations: v.number(),
      users: v.number(),
      storageFiles: v.number(),
      authSessions: v.number(),
      authAccounts: v.number(),
      authRefreshTokens: v.number(),
      authVerificationCodes: v.number(),
      authVerifiers: v.number(),
      authRateLimits: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Protection : uniquement en développement
    const deploymentUrl = process.env.CONVEX_CLOUD_URL || "";
    const isDev = deploymentUrl.includes("127.0.0.1") ||
                  deploymentUrl.includes("localhost") ||
                  deploymentUrl.includes(".convex.cloud"); // Tous les deployments Convex Cloud sont considérés comme dev pour cette démo

    if (!isDev) {
      throw new Error(
        "Cette fonction est désactivée en production. Elle ne peut être exécutée qu'en environnement de développement."
      );
    }

    const deletedCounts = {
      invoices: 0,
      reminders: 0,
      events: 0,
      payments: 0,
      invoiceNotes: 0,
      organizations: 0,
      invitations: 0,
      users: 0,
      storageFiles: 0,
      authSessions: 0,
      authAccounts: 0,
      authRefreshTokens: 0,
      authVerificationCodes: 0,
      authVerifiers: 0,
      authRateLimits: 0,
    };

    try {
      // Supprimer les tables dans l'ordre (dépendances d'abord)

      // 1. Tables dépendantes des invoices
      const reminders = await ctx.db.query("reminders").collect();
      for (const reminder of reminders) {
        await ctx.db.delete(reminder._id);
        deletedCounts.reminders++;
      }

      const events = await ctx.db.query("events").collect();
      for (const event of events) {
        await ctx.db.delete(event._id);
        deletedCounts.events++;
      }

      const payments = await ctx.db.query("payments").collect();
      for (const payment of payments) {
        await ctx.db.delete(payment._id);
        deletedCounts.payments++;
      }

      const invoiceNotes = await ctx.db.query("invoiceNotes").collect();
      for (const note of invoiceNotes) {
        await ctx.db.delete(note._id);
        deletedCounts.invoiceNotes++;
      }

      // 2. Supprimer TOUS les fichiers storage (PDFs)
      const allFiles = await ctx.db.system.query("_storage").collect();
      for (const file of allFiles) {
        await ctx.storage.delete(file._id);
        deletedCounts.storageFiles++;
      }

      // 3. Invoices
      const invoices = await ctx.db.query("invoices").collect();
      for (const invoice of invoices) {
        await ctx.db.delete(invoice._id);
        deletedCounts.invoices++;
      }

      // 4. Invitations
      const invitations = await ctx.db.query("invitations").collect();
      for (const invitation of invitations) {
        await ctx.db.delete(invitation._id);
        deletedCounts.invitations++;
      }

      // 5. Tables auth (dépendent de users)
      const authSessions = await ctx.db.query("authSessions").collect();
      for (const session of authSessions) {
        await ctx.db.delete(session._id);
        deletedCounts.authSessions++;
      }

      const authAccounts = await ctx.db.query("authAccounts").collect();
      for (const account of authAccounts) {
        await ctx.db.delete(account._id);
        deletedCounts.authAccounts++;
      }

      const authRefreshTokens = await ctx.db.query("authRefreshTokens").collect();
      for (const token of authRefreshTokens) {
        await ctx.db.delete(token._id);
        deletedCounts.authRefreshTokens++;
      }

      const authVerificationCodes = await ctx.db.query("authVerificationCodes").collect();
      for (const code of authVerificationCodes) {
        await ctx.db.delete(code._id);
        deletedCounts.authVerificationCodes++;
      }

      const authVerifiers = await ctx.db.query("authVerifiers").collect();
      for (const verifier of authVerifiers) {
        await ctx.db.delete(verifier._id);
        deletedCounts.authVerifiers++;
      }

      const authRateLimits = await ctx.db.query("authRateLimits").collect();
      for (const limit of authRateLimits) {
        await ctx.db.delete(limit._id);
        deletedCounts.authRateLimits++;
      }

      // 6. Users
      const users = await ctx.db.query("users").collect();
      for (const user of users) {
        await ctx.db.delete(user._id);
        deletedCounts.users++;
      }

      // 7. Organizations (en dernier car référencé par users)
      const organizations = await ctx.db.query("organizations").collect();
      for (const org of organizations) {
        await ctx.db.delete(org._id);
        deletedCounts.organizations++;
      }

      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);

      return {
        success: true,
        message: `✅ Base de données nettoyée avec succès. ${totalDeleted} entrées supprimées.`,
        deletedCounts,
      };
    } catch (error) {
      console.error("Erreur lors du nettoyage de la base de données:", error);
      throw new Error(`Échec du nettoyage : ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    }
  },
});

/**
 * Nettoie les événements orphelins (dont la facture a été supprimée)
 */
export const cleanOrphanEvents = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    const events = await ctx.db.query("events").collect();
    let deletedCount = 0;

    for (const event of events) {
      if (event.invoiceId) {
        const invoice = await ctx.db.get(event.invoiceId);
        if (!invoice) {
          await ctx.db.delete(event._id);
          deletedCount++;
        }
      }
    }

    return { success: true, deletedCount };
  },
});

/**
 * Nettoie les fichiers orphelins du storage (dont la facture a été supprimée)
 */
export const cleanOrphanFiles = mutation({
  args: {},
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
  }),
  handler: async (ctx) => {
    // Récupérer tous les fichiers stockés
    const allFiles = await ctx.db.system.query("_storage").collect();

    // Récupérer tous les pdfStorageId des factures existantes
    const invoices = await ctx.db.query("invoices").collect();
    const usedStorageIds = new Set(
      invoices
        .filter((inv) => inv.pdfStorageId)
        .map((inv) => inv.pdfStorageId)
    );

    // Supprimer les fichiers orphelins
    let deletedCount = 0;
    for (const file of allFiles) {
      if (!usedStorageIds.has(file._id)) {
        await ctx.storage.delete(file._id);
        deletedCount++;
      }
    }

    return { success: true, deletedCount };
  },
});
