import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, isAdmin } from "./permissions";
import { Id } from "./_generated/dataModel";

/**
 * ✅ V2 Phase 2.8 : Mutation interne générique pour créer un événement
 */
export const createEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.optional(v.id("invoices")),
    reminderId: v.optional(v.id("reminders")),
    eventType: v.union(
      v.literal("invoice_imported"),
      v.literal("invoice_marked_sent"),
      v.literal("invoice_sent"),
      v.literal("payment_registered"),
      v.literal("invoice_marked_paid"),
      v.literal("reminder_sent")
    ),
    eventDate: v.number(),
    metadata: v.optional(
      v.object({
        amount: v.optional(v.number()),
        reminderNumber: v.optional(v.number()),
        isAutomatic: v.optional(v.boolean()),
        previousSendStatus: v.optional(v.string()),
        previousPaymentStatus: v.optional(v.string()),
      })
    ),
    description: v.optional(v.string()),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", args);
  },
});

/**
 * Helper : Créer un événement "Facture importée"
 */
export const createInvoiceImportedEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "invoice_imported",
      eventDate: Date.now(),
      description: `Facture ${args.invoiceNumber} importée pour ${args.clientName}`,
    });
  },
});

/**
 * Helper : Créer un événement "Facture marquée envoyée"
 */
export const createInvoiceMarkedSentEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    previousSendStatus: v.string(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "invoice_marked_sent",
      eventDate: Date.now(),
      metadata: {
        previousSendStatus: args.previousSendStatus,
      },
      description: `Facture ${args.invoiceNumber} (${args.clientName}) marquée comme envoyée`,
    });
  },
});

/**
 * Helper : Créer un événement "Facture envoyée" (email)
 */
export const createInvoiceSentEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "invoice_sent",
      eventDate: Date.now(),
      description: `Facture ${args.invoiceNumber} envoyée par email à ${args.clientName}`,
    });
  },
});

/**
 * Helper : Créer un événement "Paiement enregistré"
 */
export const createPaymentRegisteredEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    amount: v.number(),
    previousPaymentStatus: v.string(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "payment_registered",
      eventDate: Date.now(),
      metadata: {
        amount: args.amount,
        previousPaymentStatus: args.previousPaymentStatus,
      },
      description: `Paiement de ${args.amount.toFixed(2)}€ enregistré pour facture ${args.invoiceNumber} (${args.clientName})`,
    });
  },
});

/**
 * Helper : Créer un événement "Facture marquée payée"
 */
export const createInvoiceMarkedPaidEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    previousPaymentStatus: v.string(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "invoice_marked_paid",
      eventDate: Date.now(),
      metadata: {
        previousPaymentStatus: args.previousPaymentStatus,
      },
      description: `Facture ${args.invoiceNumber} (${args.clientName}) marquée comme payée`,
    });
  },
});

/**
 * Helper : Créer un événement "Relance envoyée"
 */
export const createReminderSentEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    reminderId: v.id("reminders"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    reminderNumber: v.number(), // 1, 2, 3, 4...
    isAutomatic: v.boolean(),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const label = `${args.reminderNumber}${args.reminderNumber === 1 ? "ère" : "ème"} relance`;
    const mode = args.isAutomatic ? "automatique" : "manuelle";

    return await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      reminderId: args.reminderId,
      eventType: "reminder_sent",
      eventDate: Date.now(),
      metadata: {
        reminderNumber: args.reminderNumber,
        isAutomatic: args.isAutomatic,
      },
      description: `${label} ${mode} envoyée pour facture ${args.invoiceNumber} (${args.clientName})`,
    });
  },
});

/**
 * Query : Récupérer l'historique des événements pour l'organisation
 * Utilisé pour l'onglet "Historique" de l'agenda (Phase 2.8)
 */
export const getEventHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      eventType: v.string(),
      eventDate: v.number(),
      description: v.optional(v.string()),
      metadata: v.optional(
        v.object({
          amount: v.optional(v.number()),
          reminderNumber: v.optional(v.number()),
          reminderType: v.optional(v.string()),
          isAutomatic: v.optional(v.boolean()),
          previousSendStatus: v.optional(v.string()),
          previousPaymentStatus: v.optional(v.string()),
        })
      ),
      invoice: v.union(
        v.object({
          _id: v.id("invoices"),
          invoiceNumber: v.string(),
          clientName: v.string(),
          amountTTC: v.number(),
        }),
        v.null()
      ),
      user: v.union(
        v.object({
          _id: v.id("users"),
          name: v.optional(v.string()),
          email: v.optional(v.string()),
        }),
        v.null()
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const events = await ctx.db
      .query("events")
      .withIndex("by_organization_and_date", (q) =>
        q.eq("organizationId", user.organizationId)
      )
      .order("desc")
      .take(args.limit || 1000);

    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const invoice = event.invoiceId ? await ctx.db.get(event.invoiceId) : null;
        const eventUser = await ctx.db.get(event.userId);

        return {
          _id: event._id,
          eventType: event.eventType,
          eventDate: event.eventDate,
          description: event.description,
          metadata: event.metadata,
          invoice: invoice
            ? {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                amountTTC: invoice.amountTTC,
              }
            : null,
          user: eventUser
            ? {
                _id: eventUser._id,
                name: eventUser.name,
                email: eventUser.email,
              }
            : null,
        };
      })
    );

    return enrichedEvents;
  },
});

/**
 * ✅ V2 Phase 2.3 : Récupérer l'historique des événements pour une facture spécifique
 * Utilisé pour la page de détail d'une facture
 */
export const getByInvoice = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.array(
    v.object({
      _id: v.id("events"),
      eventType: v.string(),
      eventDate: v.number(),
      description: v.optional(v.string()),
      metadata: v.optional(
        v.object({
          amount: v.optional(v.number()),
          reminderNumber: v.optional(v.number()),
          reminderType: v.optional(v.string()),
          isAutomatic: v.optional(v.boolean()),
          previousSendStatus: v.optional(v.string()),
          previousPaymentStatus: v.optional(v.string()),
        })
      ),
      user: v.union(
        v.object({
          _id: v.id("users"),
          name: v.optional(v.string()),
          email: v.optional(v.string()),
        }),
        v.null()
      ),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Vérifier que la facture existe et appartient à l'organisation
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    if (invoice.organizationId !== user.organizationId) {
      throw new Error("Vous n'avez pas accès à cette facture");
    }

    // Vérifier les permissions
    if (!isAdmin(user) && invoice.createdBy !== user.userId) {
      throw new Error("Vous n'avez pas accès à cette facture");
    }

    // Récupérer les événements de la facture
    const events = await ctx.db
      .query("events")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .order("desc")
      .collect();

    // Enrichir avec les infos utilisateur
    const enrichedEvents = await Promise.all(
      events.map(async (event) => {
        const eventUser = await ctx.db.get(event.userId);

        return {
          _id: event._id,
          eventType: event.eventType,
          eventDate: event.eventDate,
          description: event.description,
          metadata: event.metadata,
          user: eventUser
            ? {
                _id: eventUser._id,
                name: eventUser.name,
                email: eventUser.email,
              }
            : null,
        };
      })
    );

    return enrichedEvents;
  },
});
