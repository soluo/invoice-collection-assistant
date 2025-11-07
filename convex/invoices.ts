import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserWithOrg,
  isAdmin,
  assertCanUpdateInvoiceStatus,
  assertCanModifyInvoice,
  assertCanDeleteInvoice,
  assertCanSendReminder
} from "./permissions";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

/**
 * Helper pour enrichir les factures avec le nom du créateur
 */
async function enrichInvoicesWithCreator(ctx: QueryCtx, invoices: Doc<"invoices">[]) {
  return Promise.all(
    invoices.map(async (invoice) => {
      const creator = await ctx.db.get(invoice.createdBy);
      return {
        ...invoice,
        creatorName: creator?.name || creator?.email || "Utilisateur inconnu",
      };
    })
  );
}

/**
 * Liste les factures selon le rôle de l'utilisateur
 * - Technicien : uniquement ses propres factures
 * - Admin : toutes les factures de l'organisation
 */
export const list = query({
  args: {
    sortBy: v.optional(v.union(
      v.literal("invoiceDate"),
      v.literal("amountTTC"),
      v.literal("outstandingBalance"),
      v.literal("dueDate")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
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

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    // Calculer les jours de retard et trier par urgence
    const now = new Date();
    const invoicesWithDays = invoicesWithCreator.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      // ✅ V2 : Calculer le solde dû
      const outstandingBalance = invoice.amountTTC - (invoice.paidAmount || 0);

      // Ordre de priorité pour le tri
      const statusPriority = {
        litigation: 0,
        third_reminder: 1,
        second_reminder: 2,
        first_reminder: 3,
        partial_payment: 4, // ✅ V2 : paiement partiel (priorité élevée)
        overdue: 5,
        pending: 6, // ✅ V2 : en attente (entre overdue et sent)
        sent: 7,
        paid: 8,
      };

      return {
        ...invoice,
        daysOverdue,
        outstandingBalance, // ✅ V2 : nouveau champ
        priority: statusPriority[invoice.status],
      };
    });

    // Tri personnalisé ou tri par défaut
    const sortBy = args.sortBy || "invoiceDate";
    const sortOrder = args.sortOrder || "desc";

    return invoicesWithDays.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "invoiceDate":
          aValue = new Date(a.invoiceDate).getTime();
          bValue = new Date(b.invoiceDate).getTime();
          break;
        case "amountTTC":
          aValue = a.amountTTC;
          bValue = b.amountTTC;
          break;
        case "outstandingBalance":
          aValue = a.outstandingBalance;
          bValue = b.outstandingBalance;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  },
});

/**
 * Liste les factures avec filtre (pour les admins uniquement)
 * ✅ V2 : Filtres enrichis
 * - filterByUserId: filtre par technicien spécifique
 * - searchQuery: recherche par N° facture ou nom client
 * - status: filtre par statut
 * - amountFilter: filtre par montant (avec tolérance ±5%)
 */
export const listWithFilter = query({
  args: {
    filterByUserId: v.optional(v.id("users")),
    searchQuery: v.optional(v.string()), // ✅ V2 : recherche texte
    status: v.optional(v.string()), // ✅ V2 : filtre statut
    amountFilter: v.optional(v.number()), // ✅ V2 : filtre montant (±5%)
    sortBy: v.optional(v.union(
      v.literal("invoiceDate"),
      v.literal("amountTTC"),
      v.literal("outstandingBalance"),
      v.literal("dueDate")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Seuls les admins peuvent utiliser cette query avec filtre
    if (!isAdmin(user)) {
      throw new Error("Seuls les admins peuvent filtrer les factures");
    }

    let invoices;

    // Filtre 1 : Par technicien ou toute l'org
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

    // Filtre 2 : Par statut (si spécifié)
    if (args.status && args.status !== "all") {
      invoices = invoices.filter((invoice) => invoice.status === args.status);
    }

    // Filtre 3 : Recherche texte (N° facture ou client)
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase().trim();
      invoices = invoices.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.clientName.toLowerCase().includes(query)
      );
    }

    // Filtre 4 : Montant avec tolérance ±5%
    if (args.amountFilter && args.amountFilter > 0) {
      const tolerance = 0.05; // 5%
      const minAmount = args.amountFilter * (1 - tolerance);
      const maxAmount = args.amountFilter * (1 + tolerance);
      invoices = invoices.filter(
        (invoice) => invoice.amountTTC >= minAmount && invoice.amountTTC <= maxAmount
      );
    }

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    // Calculer les jours de retard, solde dû et trier par urgence
    const now = new Date();
    const invoicesWithDays = invoicesWithCreator.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      // ✅ V2 : Calculer le solde dû
      const outstandingBalance = invoice.amountTTC - (invoice.paidAmount || 0);

      const statusPriority = {
        litigation: 0,
        third_reminder: 1,
        second_reminder: 2,
        first_reminder: 3,
        partial_payment: 4, // ✅ V2 : paiement partiel (priorité élevée)
        overdue: 5,
        pending: 6, // ✅ V2 : en attente (entre overdue et sent)
        sent: 7,
        paid: 8,
      };

      return {
        ...invoice,
        daysOverdue,
        outstandingBalance, // ✅ V2 : nouveau champ
        priority: statusPriority[invoice.status],
      };
    });

    // Tri personnalisé ou tri par défaut
    const sortBy = args.sortBy || "invoiceDate";
    const sortOrder = args.sortOrder || "desc";

    return invoicesWithDays.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "invoiceDate":
          aValue = new Date(a.invoiceDate).getTime();
          bValue = new Date(b.invoiceDate).getTime();
          break;
        case "amountTTC":
          aValue = a.amountTTC;
          bValue = b.amountTTC;
          break;
        case "outstandingBalance":
          aValue = a.outstandingBalance;
          bValue = b.outstandingBalance;
          break;
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
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
    contactName: v.optional(v.string()), // ✅ V2 Phase 2.6 : Nom du contact
    contactEmail: v.optional(v.string()), // ✅ V2 Phase 2.6 : Email du contact
    contactPhone: v.optional(v.string()), // ✅ V2 Phase 2.6 : Téléphone du contact
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

    const invoiceId = await ctx.db.insert("invoices", {
      userId: createdBy, // Pour compatibilité avec l'ancien code
      organizationId: user.organizationId,
      createdBy,
      ...invoiceData,
      status: "sent",
    });

    // ✅ V2 Phase 2.8 : Créer un événement "Facture importée"
    await ctx.scheduler.runAfter(0, internal.events.createInvoiceImportedEvent, {
      organizationId: user.organizationId,
      userId: createdBy,
      invoiceId,
      invoiceNumber: args.invoiceNumber,
      clientName: args.clientName,
    });

    return invoiceId;
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
    assertCanUpdateInvoiceStatus(user, invoice);

    const previousStatus = invoice.status;
    const updateData: any = { status: args.status };

    if (args.status === "paid") {
      updateData.paidDate = new Date().toISOString().split("T")[0];
    }

    if (["first_reminder", "second_reminder", "third_reminder"].includes(args.status)) {
      updateData.lastReminderDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(args.invoiceId, updateData);

    // ✅ V2 Phase 2.8 : Créer un événement selon le nouveau statut
    if (args.status === "sent") {
      await ctx.scheduler.runAfter(0, internal.events.createInvoiceMarkedSentEvent, {
        organizationId: user.organizationId,
        userId: user.userId,
        invoiceId: args.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        previousStatus,
      });
    } else if (args.status === "paid") {
      await ctx.scheduler.runAfter(0, internal.events.createInvoiceMarkedPaidEvent, {
        organizationId: user.organizationId,
        userId: user.userId,
        invoiceId: args.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        clientName: invoice.clientName,
        previousStatus,
      });
    }
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
    assertCanUpdateInvoiceStatus(user, invoice);

    const previousStatus = invoice.status;

    await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidDate: new Date().toISOString().split("T")[0],
    });

    // ✅ V2 Phase 2.8 : Créer un événement "Facture marquée payée"
    await ctx.scheduler.runAfter(0, internal.events.createInvoiceMarkedPaidEvent, {
      organizationId: user.organizationId,
      userId: user.userId,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      previousStatus,
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
    contactName: v.optional(v.string()), // ✅ V2 Phase 2.6 : Nom du contact
    contactEmail: v.optional(v.string()), // ✅ V2 Phase 2.6 : Email du contact
    contactPhone: v.optional(v.string()), // ✅ V2 Phase 2.6 : Téléphone du contact
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    assignToUserId: v.optional(v.id("users")), // ✅ Pour les admins : changer le créateur
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions (seuls les admins peuvent modifier)
    assertCanModifyInvoice(user, invoice);

    // Gérer le changement de créateur (admins uniquement)
    let updateData: any = {
      clientName: args.clientName,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      invoiceNumber: args.invoiceNumber,
      amountTTC: args.amountTTC,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
    };

    if (args.assignToUserId) {
      // Vérifier que l'utilisateur assigné appartient à la même organisation
      const assignedUser = await ctx.db.get(args.assignToUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        throw new Error("L'utilisateur assigné n'appartient pas à votre organisation");
      }

      updateData.createdBy = args.assignToUserId;
      updateData.userId = args.assignToUserId; // Pour compatibilité
    }

    return await ctx.db.patch(args.invoiceId, updateData);
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

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    // Filtrer les factures envoyées qui ne sont pas encore échues
    const now = new Date();
    const ongoingInvoices = invoicesWithCreator.filter((invoice) => {
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

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    return invoicesWithCreator
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
        sendStatus: "pending",
        generatedByCron: false,
      });
    }

    return { success: true };
  },
});
