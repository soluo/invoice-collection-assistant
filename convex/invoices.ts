import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserWithOrg,
  isAdmin,
  assertCanAccessInvoice,
  assertCanUpdateInvoiceStatus,
  assertCanModifyInvoice,
  assertCanDeleteInvoice,
  assertCanSendReminder,
} from "./permissions";
import { Doc } from "./_generated/dataModel";
import { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { getInvoiceDisplayInfo } from "./lib/invoiceStatus";

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
 * ✅ V2 Phase 2.8 : Liste les factures avec statut calculé
 * - Technicien : uniquement ses propres factures
 * - Admin : toutes les factures de l'organisation
 */
export const list = query({
  args: {
    sortBy: v.optional(
      v.union(
        v.literal("invoiceDate"),
        v.literal("amountTTC"),
        v.literal("outstandingBalance"),
        v.literal("dueDate")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    const now = new Date();
    const invoicesWithDisplayInfo = invoicesWithCreator.map((invoice) => {
      const displayInfo = getInvoiceDisplayInfo(invoice, now);

      return {
        ...invoice,
        ...displayInfo,
      };
    });

    const sortBy = args.sortBy || "invoiceDate";
    const sortOrder = args.sortOrder || "desc";

    return invoicesWithDisplayInfo.sort((a, b) => {
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
 * ✅ V2 Phase 2.8 : Liste les factures avec filtres avancés
 * - filterByUserId: filtre par technicien spécifique
 * - searchQuery: recherche par N° facture ou nom client
 * - mainStatus: filtre par statut calculé (pending, sent, overdue, reminder_1, paid, etc.)
 * - amountFilter: filtre par montant (avec tolérance ±5%)
 */
export const listWithFilter = query({
  args: {
    filterByUserId: v.optional(v.id("users")),
    searchQuery: v.optional(v.string()),
    // ✅ V2 Phase 2.9 : Filtre par état avec catégories (envoi, paiement, relance)
    mainStatus: v.optional(v.union(
      // Par envoi
      v.literal("a-envoyer"),
      v.literal("envoyee"),
      // Par paiement
      v.literal("non-payee"),
      v.literal("payee"),
      v.literal("en-retard"),
      // Par relance
      v.literal("relance")
    )),
    amountFilter: v.optional(v.number()),
    sortBy: v.optional(
      v.union(
        v.literal("invoiceDate"),
        v.literal("amountTTC"),
        v.literal("outstandingBalance"),
        v.literal("dueDate")
      )
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    if (!isAdmin(user)) {
      throw new Error("Seuls les admins peuvent filtrer les factures");
    }

    let invoices;

    if (args.filterByUserId) {
      const filterUserId = args.filterByUserId;
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", filterUserId)
        )
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    }

    // Filtre recherche texte
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase().trim();
      invoices = invoices.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.clientName.toLowerCase().includes(query)
      );
    }

    // Filtre montant (±5%)
    if (args.amountFilter && args.amountFilter > 0) {
      const tolerance = 0.05;
      const minAmount = args.amountFilter * (1 - tolerance);
      const maxAmount = args.amountFilter * (1 + tolerance);
      invoices = invoices.filter(
        (invoice) => invoice.amountTTC >= minAmount && invoice.amountTTC <= maxAmount
      );
    }

    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    const now = new Date();
    let invoicesWithDisplayInfo = invoicesWithCreator.map((invoice) => {
      const displayInfo = getInvoiceDisplayInfo(invoice, now);

      return {
        ...invoice,
        ...displayInfo,
      };
    });

    // ✅ V2 Phase 2.9 : Filtre par état avec catégories
    if (args.mainStatus) {
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        switch (args.mainStatus) {
          // Par envoi
          case "a-envoyer":
            return invoice.sendStatus === "pending";
          case "envoyee":
            return invoice.sendStatus === "sent";

          // Par paiement
          case "payee":
            return invoice.paymentStatus === "paid";
          case "non-payee":
            return invoice.paymentStatus !== "paid" && !invoice.isOverdue;
          case "en-retard":
            return invoice.isOverdue;

          // Par relance (uniquement les factures impayées avec relance)
          case "relance":
            return invoice.reminderStatus != null && invoice.paymentStatus !== "paid";

          default:
            return true;
        }
      });
    }

    const sortBy = args.sortBy || "invoiceDate";
    const sortOrder = args.sortOrder || "desc";

    return invoicesWithDisplayInfo.sort((a, b) => {
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
 * ✅ V2 Phase 2.8 : Créer une nouvelle facture
 * - État initial : sendStatus="pending", paymentStatus="unpaid", reminderStatus="none"
 * - Créé événement invoice_imported
 */
export const create = mutation({
  args: {
    clientName: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    pdfStorageId: v.optional(v.id("_storage")),
    assignToUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    let createdBy = user.userId;

    if (args.assignToUserId) {
      if (!isAdmin(user)) {
        throw new Error("Seuls les admins peuvent assigner des factures à d'autres utilisateurs");
      }

      const assignedUser = await ctx.db.get(args.assignToUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        throw new Error("L'utilisateur assigné n'appartient pas à votre organisation");
      }

      createdBy = args.assignToUserId;
    }

    const { assignToUserId, ...invoiceData } = args;

    const invoiceId = await ctx.db.insert("invoices", {
      userId: createdBy,
      organizationId: user.organizationId,
      createdBy,
      ...invoiceData,
      // ✅ V2 Phase 2.8 : États initiaux
      sendStatus: "pending",
      paymentStatus: "unpaid",
      // reminderStatus est optionnel - undefined = aucune relance
    });

    // ✅ Créer événement invoice_imported
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
 * ✅ V2 Phase 2.8 : Marquer une facture comme envoyée
 */
export const markAsSent = mutation({
  args: {
    invoiceId: v.id("invoices"),
    sentDate: v.optional(v.string()), // Format: "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    assertCanUpdateInvoiceStatus(user, invoice);

    const previousSendStatus = invoice.sendStatus;

    await ctx.db.patch(args.invoiceId, {
      sendStatus: "sent",
      sentDate: args.sentDate ?? new Date().toISOString().split("T")[0],
    });

    // ✅ Créer événement invoice_marked_sent
    await ctx.scheduler.runAfter(0, internal.events.createInvoiceMarkedSentEvent, {
      organizationId: user.organizationId,
      userId: user.userId,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      previousSendStatus,
    });
  },
});

/**
 * ✅ V2 Phase 2.8 : Enregistrer un paiement (partiel ou complet)
 */
export const registerPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    assertCanUpdateInvoiceStatus(user, invoice);

    const previousPaidAmount = invoice.paidAmount || 0;
    const newPaidAmount = previousPaidAmount + args.amount;
    const previousPaymentStatus = invoice.paymentStatus;

    let newPaymentStatus: "unpaid" | "partial" | "paid";
    if (newPaidAmount >= invoice.amountTTC) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    const updateData: any = {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
    };

    if (newPaymentStatus === "paid") {
      updateData.paidDate = new Date().toISOString().split("T")[0];
    }

    await ctx.db.patch(args.invoiceId, updateData);

    // ✅ Créer événement payment_registered
    await ctx.scheduler.runAfter(0, internal.events.createPaymentRegisteredEvent, {
      organizationId: user.organizationId,
      userId: user.userId,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amount: args.amount,
      previousPaymentStatus,
    });
  },
});

/**
 * ✅ V2 Phase 2.8 : Marquer une facture comme entièrement payée
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

    assertCanUpdateInvoiceStatus(user, invoice);

    const previousPaymentStatus = invoice.paymentStatus;

    await ctx.db.patch(args.invoiceId, {
      paymentStatus: "paid",
      paidAmount: invoice.amountTTC,
      paidDate: new Date().toISOString().split("T")[0],
    });

    // ✅ Créer événement invoice_marked_paid
    await ctx.scheduler.runAfter(0, internal.events.createInvoiceMarkedPaidEvent, {
      organizationId: user.organizationId,
      userId: user.userId,
      invoiceId: args.invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      previousPaymentStatus,
    });
  },
});

/**
 * Modifier les données d'une facture
 *
 * Règles de permission (via assertCanModifyInvoice):
 * - Personne ne peut modifier une facture payée (paymentStatus === "paid")
 * - Admin peut modifier toutes les factures non payées de son organisation
 * - Technicien peut modifier uniquement ses propres factures non payées
 *
 * Réassignation (assignToUserId):
 * - Seuls les admins peuvent réassigner une facture à un autre utilisateur
 */
export const update = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientName: v.string(),
    contactName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    assignToUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    assertCanModifyInvoice(user, invoice);

    const updateData: Partial<Doc<"invoices">> = {
      clientName: args.clientName,
      contactName: args.contactName,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      invoiceNumber: args.invoiceNumber,
      amountTTC: args.amountTTC,
      invoiceDate: args.invoiceDate,
      dueDate: args.dueDate,
    };

    // Seuls les admins peuvent réassigner une facture
    if (args.assignToUserId) {
      if (!isAdmin(user)) {
        throw new Error("Seuls les admins peuvent réassigner une facture");
      }

      const assignedUser = await ctx.db.get(args.assignToUserId);
      if (!assignedUser || assignedUser.organizationId !== user.organizationId) {
        throw new Error("L'utilisateur assigné n'appartient pas à votre organisation");
      }

      updateData.createdBy = args.assignToUserId;
      updateData.userId = args.assignToUserId;
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
 * Attacher un PDF à une facture existante (sans parsing AI)
 * Accessible à tous les utilisateurs pouvant accéder à la facture
 */
export const attachPdf = mutation({
  args: {
    invoiceId: v.id("invoices"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier que l'utilisateur peut accéder à la facture
    assertCanAccessInvoice(user, invoice);

    // Supprimer l'ancien PDF s'il existe
    if (invoice.pdfStorageId) {
      await ctx.storage.delete(invoice.pdfStorageId);
    }

    // Mettre à jour la facture avec le nouveau PDF
    await ctx.db.patch(args.invoiceId, {
      pdfStorageId: args.storageId,
    });

    return { success: true };
  },
});

/**
 * Supprimer une facture
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

    assertCanDeleteInvoice(user, invoice);

    // Supprimer reminders
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // Supprimer events
    const events = await ctx.db
      .query("events")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    for (const event of events) {
      await ctx.db.delete(event._id);
    }

    // Supprimer le fichier PDF du storage
    if (invoice.pdfStorageId) {
      await ctx.storage.delete(invoice.pdfStorageId);
    }

    await ctx.db.delete(args.invoiceId);

    return { success: true };
  },
});

/**
 * ✅ MVP : Reporter l'échéance d'une facture (snooze)
 * Change la date d'échéance et ajoute une note automatique
 */
export const snooze = mutation({
  args: {
    invoiceId: v.id("invoices"),
    newDueDate: v.string(), // Format: "YYYY-MM-DD"
    reason: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    assertCanModifyInvoice(user, invoice);

    // Valider que la nouvelle date est dans le futur
    const newDate = new Date(args.newDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      throw new Error("La nouvelle échéance doit être dans le futur");
    }

    // Formater la nouvelle date pour affichage
    const newDueDateFormatted = new Date(args.newDueDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Construire le message de la note
    let noteContent = `📅 Échéance reportée au ${newDueDateFormatted}`;
    if (args.reason && args.reason.trim()) {
      noteContent += `\n\nRaison : ${args.reason.trim()}`;
    }

    // Mettre à jour l'échéance
    await ctx.db.patch(args.invoiceId, {
      dueDate: args.newDueDate,
    });

    // Ajouter une note automatique via le système de notes
    await ctx.scheduler.runAfter(0, internal.invoiceNotes.createInternal, {
      invoiceId: args.invoiceId,
      organizationId: invoice.organizationId,
      content: noteContent,
      createdBy: user.userId,
      createdByName: user.name || user.email || "Utilisateur",
    });

    return null;
  },
});

/**
 * ✅ V2 Phase 2.8 : Liste les factures en cours (envoyées mais pas encore échues, non payées)
 */
export const listOngoing = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    const now = new Date();
    const ongoingInvoices = invoicesWithCreator
      .filter((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        return (
          invoice.sendStatus === "sent" &&
          invoice.paymentStatus !== "paid" &&
          dueDate >= now
        );
      })
      .map((invoice) => {
        const dueDate = new Date(invoice.dueDate);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...invoice,
          daysUntilDue: Math.max(0, daysUntilDue),
        };
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    return ongoingInvoices;
  },
});

/**
 * ✅ V2 Phase 2.8 : Liste les factures payées
 */
export const listPaid = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    let invoices;

    if (isAdmin(user)) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_payment", (q) =>
          q.eq("organizationId", user.organizationId).eq("paymentStatus", "paid")
        )
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .filter((q) => q.eq(q.field("paymentStatus"), "paid"))
        .collect();
    }

    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    return invoicesWithCreator
      .map((invoice) => ({
        ...invoice,
        paidDateFormatted: invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString("fr-FR") : null,
      }))
      .sort((a, b) => {
        if (!a.paidDate && !b.paidDate) return 0;
        if (!a.paidDate) return 1;
        if (!b.paidDate) return -1;
        return new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
      });
  },
});

/**
 * ✅ V2 Phase 2.3 : Récupérer une facture par son ID avec toutes les infos calculées
 */
export const getById = query({
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
    if (!isAdmin(user) && invoice.createdBy !== user.userId) {
      throw new Error("Vous n'avez pas accès à cette facture");
    }

    // Enrichir avec le nom du créateur
    const creator = await ctx.db.get(invoice.createdBy);
    const invoiceWithCreator = {
      ...invoice,
      creatorName: creator?.name || creator?.email || "Utilisateur inconnu",
    };

    // Calculer les infos d'affichage
    const now = new Date();
    const displayInfo = getInvoiceDisplayInfo(invoice, now);

    return {
      ...invoiceWithCreator,
      ...displayInfo,
    };
  },
});

/**
 * ✅ V2 Phase 2.8 : Envoyer une relance
 * - Détermine le numéro de relance en fonction de la config org
 * - Met à jour reminderStatus
 * - Créé un reminder dans la table reminders
 */
export const sendReminder = mutation({
  args: {
    invoiceId: v.id("invoices"),
    emailSubject: v.string(),
    emailContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    assertCanSendReminder(user, invoice);

    // Récupérer la config de l'organisation
    const org = await ctx.db.get(user.organizationId);
    if (!org) {
      throw new Error("Organisation introuvable");
    }

    // Déterminer le numéro de relance suivant
    let nextReminderNumber = 1;
    if (invoice.reminderStatus === "reminder_1") nextReminderNumber = 2;
    else if (invoice.reminderStatus === "reminder_2") nextReminderNumber = 3;
    else if (invoice.reminderStatus === "reminder_3") nextReminderNumber = 4;
    else if (invoice.reminderStatus === "reminder_4") {
      // Pas de relance suivante → passer en manual_followup
      await ctx.db.patch(args.invoiceId, {
        reminderStatus: "manual_followup",
        lastReminderDate: new Date().toISOString().split("T")[0],
      });
      return { success: true, status: "manual_followup" };
    }

    // TODO: Adapter cette logique avec reminderSteps (V2 Phase 2.9)
    // Pour l'instant, on vérifie juste s'il y a assez d'étapes
    const currentSteps = org.reminderSteps || [];
    const emailSteps = currentSteps.filter((s: any) => s.type === "email");
    if (nextReminderNumber > emailSteps.length) {
      // Pas de config pour cette relance → passer en manual_followup
      await ctx.db.patch(args.invoiceId, {
        reminderStatus: "manual_followup",
        lastReminderDate: new Date().toISOString().split("T")[0],
      });
      return { success: true, status: "manual_followup" };
    }

    const newReminderStatus = `reminder_${nextReminderNumber}` as any;

    await ctx.db.patch(args.invoiceId, {
      reminderStatus: newReminderStatus,
      lastReminderDate: new Date().toISOString().split("T")[0],
    });

    // Créer l'enregistrement dans la table reminders
    const now = new Date();
    const reminderDate = now.toISOString().slice(0, 19).replace("T", " ");

    await ctx.db.insert("reminders", {
      userId: user.userId,
      organizationId: user.organizationId,
      invoiceId: args.invoiceId,
      reminderDate,
      reminderStatus: newReminderStatus,
      reminderType: "email", // Relance par email
      completionStatus: "pending",
      generatedByCron: false,
      data: {
        emailSubject: args.emailSubject,
        emailContent: args.emailContent,
      },
    });

    return { success: true, reminderNumber: nextReminderNumber };
  },
});

/**
 * ✅ V2 Interface : Liste les factures pour la vue principale
 * - Filtre par onglet (to_handle, waiting, paid)
 * - Recherche par client ou N° facture
 * - Filtre par statut (urgent, late, to_send)
 * - Tri personnalisable
 */
export const listForMainView = query({
  args: {
    tab: v.union(
      v.literal("to_handle"),
      v.literal("waiting"),
      v.literal("paid")
    ),
    searchQuery: v.optional(v.string()),
    filterStatus: v.optional(v.union(
      v.literal("urgent"),
      v.literal("late"),
      v.literal("to_send")
    )),
    sortBy: v.union(
      v.literal("dueDate"),
      v.literal("amount"),
      v.literal("client")
    ),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer toutes les factures de l'organisation
    let invoices;
    if (isAdmin(user)) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    // Calculer les infos d'affichage
    const now = new Date();
    let invoicesWithDisplayInfo = invoicesWithCreator.map((invoice) => {
      const displayInfo = getInvoiceDisplayInfo(invoice, now);

      return {
        ...invoice,
        ...displayInfo,
      };
    });

    // Filtre par onglet
    if (args.tab === "to_handle") {
      // Affiche : urgent (>15j retard), late (1-15j retard), to_send (pas encore envoyée)
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        if (invoice.paymentStatus === "paid") return false;

        if (invoice.sendStatus === "pending") return true; // to_send

        if (invoice.isOverdue) {
          // En retard
          return true;
        }

        return false;
      });
    } else if (args.tab === "waiting") {
      // Factures envoyées, pas encore à l'échéance OU échéance dépassée mais <7j
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        if (invoice.paymentStatus === "paid") return false;
        if (invoice.sendStatus === "pending") return false;

        // Envoyée et pas encore échue
        if (!invoice.isOverdue) return true;

        // OU échéance dépassée mais <7j
        if (invoice.daysPastDue < 7) return true;

        return false;
      });
    } else if (args.tab === "paid") {
      // Archives des factures payées
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) =>
        invoice.paymentStatus === "paid"
      );
    }

    // Filtre recherche texte
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase().trim();
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.clientName.toLowerCase().includes(query)
      );
    }

    // Filtre par statut (uniquement pour l'onglet "to_handle")
    if (args.filterStatus && args.tab === "to_handle") {
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        if (args.filterStatus === "urgent") {
          return invoice.isOverdue && invoice.daysPastDue > 15;
        } else if (args.filterStatus === "late") {
          return invoice.isOverdue && invoice.daysPastDue >= 1 && invoice.daysPastDue <= 15;
        } else if (args.filterStatus === "to_send") {
          return invoice.sendStatus === "pending";
        }
        return true;
      });
    }

    // Tri
    return invoicesWithDisplayInfo.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (args.sortBy) {
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case "amount":
          aValue = a.amountTTC;
          bValue = b.amountTTC;
          // Tri descendant pour les montants (plus gros d'abord)
          return bValue - aValue;
        case "client":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        default:
          return 0;
      }

      // Tri ascendant par défaut (sauf montants)
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });
  },
});

/**
 * ✅ V3 : Obtenir les statistiques pour le tableau de bord principal
 * - Total En cours : toutes les factures envoyées non payées (en retard ou non)
 * - Total En retard : factures en retard non payées
 * - Total Payé : factures payées dans les 30 derniers jours
 */
export const getStatsForMainView = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer les factures selon le rôle
    let invoices;
    if (isAdmin(user)) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Calculer les 3 stats
    let totalOngoing = 0;
    let totalOverdue = 0;
    let totalPaidLast30Days = 0;

    for (const invoice of invoices) {
      const displayInfo = getInvoiceDisplayInfo(invoice, now);

      // Stat 1 : Total En cours (toutes factures envoyées non payées)
      if (invoice.sendStatus === "sent" && invoice.paymentStatus !== "paid") {
        totalOngoing += displayInfo.outstandingBalance;
      }

      // Stat 2 : Total En retard (factures en retard non payées)
      if (displayInfo.isOverdue && invoice.paymentStatus !== "paid") {
        totalOverdue += displayInfo.outstandingBalance;
      }

      // Stat 3 : Total Payé dans les 30 derniers jours
      if (invoice.paymentStatus === "paid" && invoice.paidDate) {
        const paidDate = new Date(invoice.paidDate);
        if (paidDate >= thirtyDaysAgo) {
          totalPaidLast30Days += invoice.amountTTC;
        }
      }
    }

    return {
      totalOngoing,
      totalOverdue,
      totalPaidLast30Days,
    };
  },
});

/**
 * ✅ V3 : Liste les factures avec tous les filtres pour le nouveau MainView
 * - Filtre par rôle (technicien/admin)
 * - Recherche par N° facture ou client
 * - Filtre par statut simplifié (a-envoyer, envoyee, en-retard, payee)
 * - Filtre par technicien (admin uniquement)
 * - Tri configurable
 * - Calcul du prochain rappel
 */
export const listInvoicesWithFilters = query({
  args: {
    searchQuery: v.optional(v.string()),
    statusFilter: v.optional(
      v.union(
        v.literal("a-envoyer"),
        v.literal("envoyee"),
        v.literal("en-retard"),
        v.literal("payee")
      )
    ),
    sortBy: v.optional(
      v.union(
        v.literal("invoiceDate"),
        v.literal("dueDate"),
        v.literal("amountTTC"),
        v.literal("clientName")
      )
    ),
    filterByUserId: v.optional(v.id("users")), // Admin only
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer les factures selon le rôle et le filtre user
    let invoices;

    if (args.filterByUserId) {
      // Filtre par technicien spécifique (admin uniquement)
      if (!isAdmin(user)) {
        throw new Error("Seuls les admins peuvent filtrer par technicien");
      }

      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", args.filterByUserId!)
        )
        .collect();
    } else if (isAdmin(user)) {
      // Admin sans filtre = toutes les factures de l'org
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
        .collect();
    } else {
      // Technicien = seulement ses factures
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    // Récupérer l'organisation pour les reminderSteps
    const organization = await ctx.db.get(user.organizationId);
    const reminderSteps = organization?.reminderSteps || [];

    // Enrichir avec le nom du créateur
    const invoicesWithCreator = await enrichInvoicesWithCreator(ctx, invoices);

    // Calculer les infos d'affichage + prochain rappel
    const now = new Date();
    let invoicesWithDisplayInfo = invoicesWithCreator.map((invoice) => {
      const displayInfo = getInvoiceDisplayInfo(invoice, now);

      // Calculer le prochain rappel
      let nextReminderDate: string | null = null;

      // Si payée ou pas encore envoyée, pas de rappel
      if (invoice.paymentStatus === "paid" || invoice.sendStatus === "pending") {
        nextReminderDate = null;
      }
      // Si pas encore en retard, pas de rappel
      else if (!displayInfo.isOverdue) {
        nextReminderDate = null;
      }
      // Si en retard, calculer le prochain rappel
      else {
        // TODO: Implémenter calculateNextReminderDate
        // Pour l'instant, logique simple
        const dueDate = new Date(invoice.dueDate);

        if (!invoice.reminderStatus) {
          // Pas encore de relance -> calculer le premier rappel
          if (reminderSteps.length > 0) {
            const firstStep = reminderSteps[0];
            const nextDate = new Date(dueDate);
            nextDate.setDate(nextDate.getDate() + firstStep.delay);
            nextReminderDate = nextDate.toISOString().split("T")[0];
          } else {
            nextReminderDate = null; // Pas de steps configurés
          }
        } else if (invoice.reminderStatus === "manual_followup") {
          nextReminderDate = null; // Suivi manuel
        } else {
          // Relance en cours -> calculer le prochain
          const currentReminderNumber = invoice.reminderStatus.match(/reminder_(\d+)/)?.[1];
          if (currentReminderNumber) {
            const nextReminderNumber = parseInt(currentReminderNumber) + 1;
            const nextStep = reminderSteps[nextReminderNumber - 1];

            if (nextStep && invoice.lastReminderDate) {
              const lastReminder = new Date(invoice.lastReminderDate);
              const nextDate = new Date(lastReminder);
              nextDate.setDate(nextDate.getDate() + nextStep.delay);
              nextReminderDate = nextDate.toISOString().split("T")[0];
            } else {
              nextReminderDate = null; // Pas de step suivant ou pas de lastReminderDate
            }
          }
        }
      }

      return {
        ...invoice,
        ...displayInfo,
        nextReminderDate,
      };
    });

    // Filtre recherche texte
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase().trim();
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        // Recherche par numéro de facture ou nom client
        if (
          invoice.invoiceNumber.toLowerCase().includes(query) ||
          invoice.clientName.toLowerCase().includes(query)
        ) {
          return true;
        }
        // Recherche par montant (ex: "1500" ou "1500.50")
        const amountStr = invoice.amountTTC.toString();
        const amountFormatted = invoice.amountTTC.toFixed(2);
        if (amountStr.includes(query) || amountFormatted.includes(query)) {
          return true;
        }
        return false;
      });
    }

    // Filtre par statut simplifié
    if (args.statusFilter) {
      invoicesWithDisplayInfo = invoicesWithDisplayInfo.filter((invoice) => {
        switch (args.statusFilter) {
          case "a-envoyer":
            return invoice.sendStatus === "pending";
          case "envoyee":
            return invoice.sendStatus === "sent" && !invoice.isOverdue;
          case "en-retard":
            return invoice.isOverdue;
          case "payee":
            return invoice.paymentStatus === "paid";
          default:
            return true;
        }
      });
    }

    // Tri
    const sortBy = args.sortBy || "dueDate";
    return invoicesWithDisplayInfo.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "invoiceDate":
          aValue = new Date(a.invoiceDate).getTime();
          bValue = new Date(b.invoiceDate).getTime();
          break;
        case "dueDate":
          aValue = new Date(a.dueDate).getTime();
          bValue = new Date(b.dueDate).getTime();
          break;
        case "amountTTC":
          aValue = a.amountTTC;
          bValue = b.amountTTC;
          break;
        case "clientName":
          aValue = a.clientName.toLowerCase();
          bValue = b.clientName.toLowerCase();
          break;
        default:
          return 0;
      }

      // Tri ascendant
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    });
  },
});

