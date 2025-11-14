import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, isAdmin } from "./permissions";

/**
 * ✅ V2 : Query pour l'onglet "À Venir" de la page Relances
 * Récupère les relances planifiées (completionStatus='pending') non mises en pause
 * Supporte les relances email ET téléphone
 */
export const getUpcomingReminders = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("reminders"),
      reminderDate: v.string(),
      reminderStatus: v.string(),
      reminderType: v.string(),
      completionStatus: v.string(),
      isPaused: v.optional(v.boolean()),
      data: v.optional(
        v.object({
          emailSubject: v.optional(v.string()),
          emailContent: v.optional(v.string()),
          phoneCallNotes: v.optional(v.string()),
          phoneCallOutcome: v.optional(v.string()),
        })
      ),
      invoice: v.union(
        v.object({
          _id: v.id("invoices"),
          invoiceNumber: v.string(),
          clientName: v.string(),
          contactEmail: v.optional(v.string()),
          contactPhone: v.optional(v.string()),
          amountTTC: v.number(),
          dueDate: v.string(),
          sendStatus: v.string(),
          paymentStatus: v.string(),
          reminderStatus: v.optional(v.string()),
        }),
        v.null()
      ),
      daysOverdue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer les reminders non complétés (pending + failed)
    // Utilisation de l'index composé pour performance optimale
    const pendingReminders = isAdmin(user)
      ? await ctx.db
          .query("reminders")
          .withIndex("by_organization_and_status", (q) =>
            q.eq("organizationId", user.organizationId).eq("completionStatus", "pending")
          )
          .collect()
      : await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", user.userId))
          .filter((q) => q.eq(q.field("completionStatus"), "pending"))
          .collect();

    const failedReminders = isAdmin(user)
      ? await ctx.db
          .query("reminders")
          .withIndex("by_organization_and_status", (q) =>
            q.eq("organizationId", user.organizationId).eq("completionStatus", "failed")
          )
          .collect()
      : await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", user.userId))
          .filter((q) => q.eq(q.field("completionStatus"), "failed"))
          .collect();

    // Fusionner les résultats
    const reminders = [...pendingReminders, ...failedReminders];

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
            reminderType: reminder.reminderType,
            completionStatus: reminder.completionStatus,
            isPaused: reminder.isPaused,
            data: reminder.data,
            invoice: invoice
              ? {
                  _id: invoice._id,
                  invoiceNumber: invoice.invoiceNumber,
                  clientName: invoice.clientName,
                  contactEmail: invoice.contactEmail,
                  contactPhone: invoice.contactPhone,
                  amountTTC: invoice.amountTTC,
                  dueDate: invoice.dueDate,
                  sendStatus: invoice.sendStatus,
                  paymentStatus: invoice.paymentStatus,
                  reminderStatus: invoice.reminderStatus,
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
 * ✅ V2 : Query pour l'onglet "Historique" de la page Relances
 * Récupère les événements passés
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
 * ✅ V2 : Mutation pour mettre en pause une relance planifiée
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
    if (reminder.completionStatus !== "pending") {
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
 * ✅ V2 : Mutation pour réactiver une relance mise en pause
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

/**
 * ✅ V2 : Mutation pour modifier une relance email
 */
export const updateReminder = mutation({
  args: {
    reminderId: v.id("reminders"),
    emailSubject: v.optional(v.string()),
    emailContent: v.optional(v.string()),
    phoneCallNotes: v.optional(v.string()),
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
      throw new Error("Vous ne pouvez modifier que vos propres relances");
    }

    // Vérifier que la relance est bien en attente
    if (reminder.completionStatus !== "pending") {
      throw new Error("Seules les relances en attente peuvent être modifiées");
    }

    // Préparer les données à mettre à jour
    const currentData = reminder.data || {};
    const updatedData = { ...currentData };

    if (args.emailSubject !== undefined) updatedData.emailSubject = args.emailSubject;
    if (args.emailContent !== undefined) updatedData.emailContent = args.emailContent;
    if (args.phoneCallNotes !== undefined) updatedData.phoneCallNotes = args.phoneCallNotes;

    // Mettre à jour
    await ctx.db.patch(args.reminderId, { data: updatedData });

    return { success: true };
  },
});

/**
 * ✅ V2 : Mutation pour reprogrammer une relance
 */
export const rescheduleReminder = mutation({
  args: {
    reminderId: v.id("reminders"),
    newReminderDate: v.string(),
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
      throw new Error("Vous ne pouvez reprogrammer que vos propres relances");
    }

    // Vérifier que la relance est bien en attente
    if (reminder.completionStatus !== "pending") {
      throw new Error("Seules les relances en attente peuvent être reprogrammées");
    }

    // Reprogrammer
    await ctx.db.patch(args.reminderId, {
      reminderDate: args.newReminderDate,
    });

    return { success: true };
  },
});

/**
 * ✅ V2 : Mutation pour marquer un appel téléphonique comme effectué
 */
export const completePhoneReminder = mutation({
  args: {
    reminderId: v.id("reminders"),
    outcome: v.union(
      v.literal("completed"),
      v.literal("no_answer"),
      v.literal("voicemail"),
      v.literal("will_pay"),
      v.literal("dispute")
    ),
    notes: v.optional(v.string()),
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
      throw new Error("Vous ne pouvez compléter que vos propres relances");
    }

    // Vérifier que c'est une relance téléphonique
    if (reminder.reminderType !== "phone") {
      throw new Error("Seules les relances téléphoniques peuvent être marquées comme effectuées");
    }

    // Vérifier que la relance est bien en attente
    if (reminder.completionStatus !== "pending") {
      throw new Error("Cette relance a déjà été effectuée");
    }

    // Préparer les données mises à jour
    const currentData = reminder.data || {};
    const updatedData = {
      ...currentData,
      phoneCallOutcome: args.outcome,
      phoneCallNotes: args.notes,
    };

    // Marquer comme effectuée
    await ctx.db.patch(args.reminderId, {
      completionStatus: "completed",
      completedAt: Date.now(),
      data: updatedData,
    });

    // Créer un événement dans l'historique
    await ctx.db.insert("events", {
      organizationId: user.organizationId,
      userId: user.userId,
      invoiceId: reminder.invoiceId,
      reminderId: args.reminderId,
      eventType: "reminder_sent",
      eventDate: Date.now(),
      description: `Appel téléphonique effectué`,
      metadata: {
        reminderType: "phone",
        isAutomatic: false,
      },
    });

    return { success: true };
  },
});
