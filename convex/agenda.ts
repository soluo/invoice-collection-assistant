import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, isAdmin } from "./permissions";

/**
 * ✅ V2 Phase 2.8 : Query pour l'onglet "À Venir" de l'agenda
 * Récupère les relances planifiées (sendStatus='pending') non mises en pause
 */
export const getUpcomingReminders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("reminders"),
      reminderDate: v.string(),
      reminderStatus: v.string(),
      emailSubject: v.string(),
      sendStatus: v.optional(v.string()),
      isPaused: v.optional(v.boolean()),
      invoice: v.union(
        v.object({
          _id: v.id("invoices"),
          invoiceNumber: v.string(),
          clientName: v.string(),
          contactEmail: v.optional(v.string()),
          amountTTC: v.number(),
          dueDate: v.string(),
          status: v.string(),
        }),
        v.null()
      ),
      daysOverdue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer les reminders en attente pour l'organisation
    const reminders = isAdmin(user)
      ? await ctx.db
          .query("reminders")
          .withIndex("by_organization_and_status", (q) =>
            q.eq("organizationId", user.organizationId).eq("sendStatus", "pending")
          )
          .collect()
      : await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", user.userId))
          .filter((q) => q.eq(q.field("sendStatus"), "pending"))
          .collect();

    // Filtrer les relances non mises en pause et enrichir avec les données de factures
    const now = new Date();
    const enrichedReminders = await Promise.all(
      reminders
        .filter((reminder) => !reminder.isPaused)
        .map(async (reminder) => {
          const invoice = await ctx.db.get(reminder.invoiceId);

          // Calculer les jours de retard si la facture existe
          let daysOverdue: number | undefined;
          if (invoice) {
            const dueDate = new Date(invoice.dueDate);
            daysOverdue = Math.max(
              0,
              Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
            );
          }

          return {
            _id: reminder._id,
            reminderDate: reminder.reminderDate,
            reminderStatus: reminder.reminderStatus,
            emailSubject: reminder.emailSubject,
            sendStatus: reminder.sendStatus,
            isPaused: reminder.isPaused,
            invoice: invoice
              ? {
                  _id: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  clientName: invoice.clientName,
                  contactEmail: invoice.contactEmail,
                  amountTTC: invoice.amountTTC,
                  dueDate: invoice.dueDate,
                  status: invoice.status,
                }
              : null,
            daysOverdue,
          };
        })
    );

    // Trier par date de relance (chronologique)
    return enrichedReminders.sort((a, b) => {
      const dateA = new Date(a.reminderDate.replace(" ", "T"));
      const dateB = new Date(b.reminderDate.replace(" ", "T"));
      return dateA.getTime() - dateB.getTime();
    });
  },
});

/**
 * ✅ V2 Phase 2.8 : Query pour l'onglet "Historique" de l'agenda
 * Récupère les événements passés (wrapper vers events.getEventHistory)
 */
export const getReminderHistory = query({
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
          reminderType: v.optional(v.string()),
          isAutomatic: v.optional(v.boolean()),
          previousStatus: v.optional(v.string()),
          newStatus: v.optional(v.string()),
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

    // Récupérer les événements de l'organisation
    const events = await ctx.db
      .query("events")
      .withIndex("by_organization_and_date", (q) =>
        q.eq("organizationId", user.organizationId)
      )
      .order("desc")
      .take(args.limit || 1000);

    // Enrichir avec les données de factures et utilisateurs
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
 * ✅ V2 Phase 2.8 : Mutation pour mettre en pause une relance planifiée
 */
export const pauseReminder = mutation({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      throw new Error("Relance introuvable");
    }

    // Vérifier que la relance appartient à l'organisation
    if (reminder.organizationId !== user.organizationId) {
      throw new Error("Accès refusé à cette relance");
    }

    // Vérifier les permissions (technicien ne peut mettre en pause que ses propres relances)
    if (!isAdmin(user) && reminder.userId !== user.userId) {
      throw new Error("Vous ne pouvez mettre en pause que vos propres relances");
    }

    // Vérifier que la relance est bien en attente
    if (reminder.sendStatus !== "pending") {
      throw new Error("Seules les relances en attente peuvent être mises en pause");
    }

    // Mettre en pause
    await ctx.db.patch(args.reminderId, {
      isPaused: true,
    });

    return { success: true };
  },
});

/**
 * ✅ V2 Phase 2.8 : Mutation pour réactiver une relance mise en pause
 */
export const resumeReminder = mutation({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      throw new Error("Relance introuvable");
    }

    // Vérifier que la relance appartient à l'organisation
    if (reminder.organizationId !== user.organizationId) {
      throw new Error("Accès refusé à cette relance");
    }

    // Vérifier les permissions
    if (!isAdmin(user) && reminder.userId !== user.userId) {
      throw new Error("Vous ne pouvez réactiver que vos propres relances");
    }

    // Réactiver
    await ctx.db.patch(args.reminderId, {
      isPaused: false,
    });

    return { success: true };
  },
});
