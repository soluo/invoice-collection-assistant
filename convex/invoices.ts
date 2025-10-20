import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getUserWithOrg, isAdmin } from "./permissions";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Liste les factures selon le rôle de l'utilisateur
 * - Technicien : uniquement ses propres factures
 * - Admin : toutes les factures de l'organisation
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      // Admin : récupère toutes les factures de l'organisation
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      // Technicien : récupère uniquement ses propres factures
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    // Calculer les jours de retard et trier par urgence
    const now = new Date();
    const invoicesWithDays = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Ordre de priorité pour le tri
      const statusPriority = {
        litigation: 0,
        third_reminder: 1,
        second_reminder: 2,
        first_reminder: 3,
        overdue: 4,
        sent: 5,
        paid: 6,
      };

      return {
        ...invoice,
        daysOverdue,
        priority: statusPriority[invoice.status],
      };
    });

    // Trier par priorité puis par jours de retard
    return invoicesWithDays.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.daysOverdue - a.daysOverdue;
    });
  },
});

/**
 * Liste les factures avec filtre (pour les admins uniquement)
 * - filterByUserId: filtre par technicien spécifique
 * - Si pas de filtre: toutes les factures de l'org
 */
export const listWithFilter = query({
  args: {
    filterByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Seuls les admins peuvent utiliser cette query avec filtre
    if (!isAdmin(user)) {
      throw new Error("Seuls les admins peuvent filtrer les factures");
    }

    let invoices;

    if (args.filterByUserId) {
      // Filtrer par technicien spécifique
      const filterUserId = args.filterByUserId; // TypeScript narrowing
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", filterUserId)
        )
        .collect();
    } else {
      // Toutes les factures de l'organisation
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    }

    // Calculer les jours de retard et trier par urgence
    const now = new Date();
    const invoicesWithDays = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      const statusPriority = {
        litigation: 0,
        third_reminder: 1,
        second_reminder: 2,
        first_reminder: 3,
        overdue: 4,
        sent: 5,
        paid: 6,
      };

      return {
        ...invoice,
        daysOverdue,
        priority: statusPriority[invoice.status],
      };
    });

    // Trier par priorité puis par jours de retard
    return invoicesWithDays.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.daysOverdue - a.daysOverdue;
    });
  },
});

/**
 * Créer une nouvelle facture
 * - Technicien : crée une facture pour lui-même
 * - Admin : peut créer une facture pour lui-même ou l'assigner à un technicien (via assignToUserId)
 */
export const create = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    pdfStorageId: v.optional(v.id("_storage")),
    assignToUserId: v.optional(v.id("users")), // Pour les admins : assigner à un technicien
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Déterminer le créateur de la facture
    let createdBy = user.userId;

    // Si assignToUserId est fourni, vérifier que l'utilisateur est admin
    if (args.assignToUserId) {
      if (!isAdmin(user)) {
        throw new Error("Seuls les admins peuvent assigner des factures à d'autres utilisateurs");
      }

      // Vérifier que l'utilisateur assigné appartient à la même organisation
      const assignedUser = await ctx.db.get(args.assignToUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        throw new Error("L'utilisateur assigné n'appartient pas à votre organisation");
      }

      createdBy = args.assignToUserId;
    }

    const { assignToUserId, ...invoiceData } = args;

    return await ctx.db.insert("invoices", {
      userId: createdBy, // Pour compatibilité avec l'ancien code
      organizationId: user.organizationId,
      createdBy,
      ...invoiceData,
      status: "sent",
    });
  },
});

/**
 * Mettre à jour le statut d'une facture
 * - Admin : peut modifier le statut de toutes les factures de l'org
 * - Technicien : peut modifier le statut de ses propres factures uniquement
 */
export const updateStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("sent"),
      v.literal("overdue"),
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("litigation"),
      v.literal("paid")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions avec l'helper
    const { assertCanUpdateInvoiceStatus } = await import("./permissions");
    assertCanUpdateInvoiceStatus(user, invoice);

    const updateData: any = { status: args.status };

    if (args.status === "paid") {
      updateData.paidDate = new Date().toISOString().split("T")[0];
    }

    if (["first_reminder", "second_reminder", "third_reminder"].includes(args.status)) {
      updateData.lastReminderDate = new Date().toISOString().split("T")[0];
    }

    return await ctx.db.patch(args.invoiceId, updateData);
  },
});

/**
 * Marquer une facture comme payée
 * - Admin : peut marquer toutes les factures de l'org comme payées
 * - Technicien : peut marquer ses propres factures comme payées
 */
export const markAsPaid = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions
    const { assertCanUpdateInvoiceStatus } = await import("./permissions");
    assertCanUpdateInvoiceStatus(user, invoice);

    return await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidDate: new Date().toISOString().split("T")[0],
    });
  },
});

/**
 * Modifier les données d'une facture
 * - Admin : peut modifier toutes les factures de l'org
 * - Technicien : AUCUNE modification (factures immutables après import)
 */
export const update = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientName: v.string(),
    clientEmail: v.string(),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions (seuls les admins peuvent modifier)
    const { assertCanModifyInvoice } = await import("./permissions");
    assertCanModifyInvoice(user, invoice);

    const { invoiceId, ...updateData } = args;
    return await ctx.db.patch(invoiceId, updateData);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getLoggedInUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const getPdfUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await getLoggedInUser(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Supprimer une facture
 * - Admin : peut supprimer toutes les factures de l'org
 * - Technicien : peut supprimer uniquement ses propres factures (pour ré-import)
 */
export const deleteInvoice = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions
    const { assertCanDeleteInvoice } = await import("./permissions");
    assertCanDeleteInvoice(user, invoice);

    // Supprimer d'abord tous les reminders associés
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // Supprimer la facture
    await ctx.db.delete(args.invoiceId);

    return { success: true };
  },
});

/**
 * Liste les factures en cours (envoyées mais pas encore échues)
 * - Technicien : uniquement ses propres factures
 * - Admin : toutes les factures de l'organisation
 */
export const listOngoing = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      // Admin : toutes les factures de l'organisation avec statut "sent"
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_status", (q) =>
          q.eq("organizationId", user.organizationId).eq("status", "sent")
        )
        .collect();
    } else {
      // Technicien : uniquement ses propres factures avec statut "sent"
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .filter((q) => q.eq(q.field("status"), "sent"))
        .collect();
    }

    // Filtrer les factures envoyées qui ne sont pas encore échues
    const now = new Date();
    const ongoingInvoices = invoices.filter((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      return dueDate >= now; // Pas encore échue
    });

    return ongoingInvoices
      .map((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...invoice,
          daysUntilDue: Math.max(0, daysUntilDue),
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  },
});

/**
 * Liste les factures payées
 * - Technicien : uniquement ses propres factures
 * - Admin : toutes les factures de l'organisation
 */
export const listPaid = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      // Admin : toutes les factures payées de l'organisation
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_status", (q) =>
          q.eq("organizationId", user.organizationId).eq("status", "paid")
        )
        .collect();
    } else {
      // Technicien : uniquement ses propres factures payées
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();
    }

    return invoices
      .map((invoice) => ({
        ...invoice,
        paidDateFormatted: invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString("fr-FR") : null,
      }))
      .sort((a, b) => {
        // Trier par date de paiement, plus récent en premier
        if (!a.paidDate && !b.paidDate) return 0;
        if (!a.paidDate) return 1;
        if (!b.paidDate) return -1;
        return new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
      });
  },
});

/**
 * Envoyer une relance pour une facture
 * - Admin : peut envoyer des relances pour toutes les factures de l'org
 * - Technicien : peut envoyer des relances pour ses propres factures uniquement
 */
export const sendReminder = mutation({
  args: {
    invoiceId: v.id("invoices"),
    newStatus: v.union(
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("litigation")
    ),
    emailSubject: v.string(),
    emailContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions
    const { assertCanSendReminder } = await import("./permissions");
    assertCanSendReminder(user, invoice);

    // Mettre à jour le statut de la facture et la date de dernière relance
    const now = new Date();
    const updateData: any = {
      status: args.newStatus,
      lastReminderDate: now.toISOString().split("T")[0],
    };

    await ctx.db.patch(args.invoiceId, updateData);

    // Créer l'enregistrement dans l'historique des relances (sauf pour litigation)
    if (args.newStatus !== "litigation") {
      const reminderDate = now.toISOString().slice(0, 19).replace("T", " ");

      await ctx.db.insert("reminders", {
        userId: user.userId,
        organizationId: user.organizationId,
        invoiceId: args.invoiceId,
        reminderDate,
        reminderStatus: args.newStatus,
        emailSubject: args.emailSubject,
        emailContent: args.emailContent,
      });
    }

    return { success: true };
  },
});
