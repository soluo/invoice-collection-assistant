import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  getUserWithOrg,
  isAdmin,
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
 * Modifier les données d'une facture (admins uniquement)
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
