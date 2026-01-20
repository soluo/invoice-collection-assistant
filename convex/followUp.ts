import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, isAdmin, isSuperAdmin } from "./permissions";
import { internal, api } from "./_generated/api";

/**
 * ✅ V2 : Query pour l'onglet "À Venir" de la page Relances
 * Récupère les relances planifiées (completionStatus='pending') non mises en pause
 * Supporte les relances email ET téléphone
 *
 * ✅ Bug Fix: Techniciens voient les relances de leurs factures (invoice.createdBy),
 *    pas les relances qu'ils ont générées (reminder.userId)
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
          // Story 7.3: Include PDF storage ID for preview indicator
          pdfStorageId: v.optional(v.id("_storage")),
        }),
        v.null()
      ),
      daysOverdue: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer les reminders non complétés (pending + failed) pour l'organisation
    // On récupère tous les reminders de l'org, puis on filtre par invoice.createdBy pour les techniciens
    const pendingReminders = await ctx.db
      .query("reminders")
      .withIndex("by_organization_and_status", (q) =>
        q.eq("organizationId", user.organizationId).eq("completionStatus", "pending")
      )
      .collect();

    const failedReminders = await ctx.db
      .query("reminders")
      .withIndex("by_organization_and_status", (q) =>
        q.eq("organizationId", user.organizationId).eq("completionStatus", "failed")
      )
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
                  // Story 7.3: Include PDF storage ID for preview indicator
                  pdfStorageId: invoice.pdfStorageId,
                  // Internal: for technician filtering
                  _createdBy: invoice.createdBy,
                }
              : null,
            daysOverdue,
          };
        })
    );

    // Filter for technicians: only show reminders for invoices they created
    const filteredReminders = isAdmin(user)
      ? enrichedReminders
      : enrichedReminders.filter(
          (r) => r.invoice && (r.invoice as any)._createdBy === user.userId
        );

    // Remove internal _createdBy and sort by date
    return filteredReminders
      .map((r) => ({
        ...r,
        invoice: r.invoice
          ? {
              _id: r.invoice._id,
              invoiceNumber: r.invoice.invoiceNumber,
              clientName: r.invoice.clientName,
              contactEmail: r.invoice.contactEmail,
              contactPhone: r.invoice.contactPhone,
              amountTTC: r.invoice.amountTTC,
              dueDate: r.invoice.dueDate,
              sendStatus: r.invoice.sendStatus,
              paymentStatus: r.invoice.paymentStatus,
              reminderStatus: r.invoice.reminderStatus,
              pdfStorageId: r.invoice.pdfStorageId,
            }
          : null,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.reminderDate.replace(" ", "T"));
        const dateB = new Date(b.reminderDate.replace(" ", "T"));
        return dateA.getTime() - dateB.getTime();
      });
  },
});

/**
 * ✅ Story 6.4 : Query FILTRÉE pour l'onglet "Historique" de la page Relances
 * Récupère UNIQUEMENT les événements de type reminder_sent
 * Utilisé sur /follow-up pour n'afficher que les relances (pas les imports, paiements, etc.)
 *
 * ✅ Code Review Fix: Techniciens ne voient que l'historique de leurs propres factures
 */
export const getReminderHistoryFiltered = query({
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

    // Fetch events filtered at database level for better performance
    // Using .filter() before .collect() to filter in Convex instead of JS
    const reminderEvents = await ctx.db
      .query("events")
      .withIndex("by_organization_and_date", (q) =>
        q.eq("organizationId", user.organizationId)
      )
      .filter((q) => q.eq(q.field("eventType"), "reminder_sent"))
      .order("desc")
      .take(args.limit || 1000);

    // Enrich with invoice and user data
    const enrichedEvents = await Promise.all(
      reminderEvents.map(async (event) => {
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
                // Include createdBy for filtering (not returned to client)
                _createdBy: invoice.createdBy,
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

    // Filter for technicians: only show events for invoices they created
    const filteredEvents = isAdmin(user)
      ? enrichedEvents
      : enrichedEvents.filter(
          (event) => event.invoice && (event.invoice as any)._createdBy === user.userId
        );

    // Remove internal _createdBy field before returning
    return filteredEvents.map((event) => ({
      ...event,
      invoice: event.invoice
        ? {
            _id: event.invoice._id,
            invoiceNumber: event.invoice.invoiceNumber,
            clientName: event.invoice.clientName,
            amountTTC: event.invoice.amountTTC,
          }
        : null,
    }));
  },
});

/**
 * ✅ V2 : Query pour l'onglet "Historique" de la page Relances (LEGACY - non filtré par eventType)
 * Récupère TOUS les événements - conservé pour compatibilité
 * @deprecated Utiliser getReminderHistoryFiltered pour /follow-up
 *
 * ✅ Code Review Fix: Techniciens ne voient que l'historique de leurs propres factures
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
                // Include createdBy for filtering (not returned to client)
                _createdBy: invoice.createdBy,
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

    // Filter for technicians: only show events for invoices they created
    const filteredEvents = isAdmin(user)
      ? enrichedEvents
      : enrichedEvents.filter(
          (event) => event.invoice && (event.invoice as any)._createdBy === user.userId
        );

    // Remove internal _createdBy field before returning
    return filteredEvents.map((event) => ({
      ...event,
      invoice: event.invoice
        ? {
            _id: event.invoice._id,
            invoiceNumber: event.invoice.invoiceNumber,
            clientName: event.invoice.clientName,
            amountTTC: event.invoice.amountTTC,
          }
        : null,
    }));
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

    // Outcomes qui nécessitent un rappel (pas de contact réel)
    const needsReschedule = args.outcome === "no_answer" || args.outcome === "voicemail";

    if (needsReschedule) {
      // Reprogrammer à +1 jour
      const currentDate = new Date(reminder.reminderDate.replace(" ", "T"));
      currentDate.setDate(currentDate.getDate() + 1);
      const newReminderDate = currentDate.toISOString().replace("T", " ").slice(0, 19);

      await ctx.db.patch(args.reminderId, {
        reminderDate: newReminderDate,
        data: updatedData,
      });

      // Créer un événement "tentative d'appel"
      const outcomeLabel = args.outcome === "no_answer" ? "Pas de réponse" : "Message vocal laissé";
      await ctx.db.insert("events", {
        organizationId: user.organizationId,
        userId: user.userId,
        invoiceId: reminder.invoiceId,
        reminderId: args.reminderId,
        eventType: "reminder_sent",
        eventDate: Date.now(),
        description: `Tentative d'appel : ${outcomeLabel}${args.notes ? ` - ${args.notes}` : ""}`,
        metadata: {
          reminderType: "phone",
          isAutomatic: false,
        },
      });
    } else {
      // Contact réel : marquer comme effectuée
      await ctx.db.patch(args.reminderId, {
        completionStatus: "completed",
        completedAt: Date.now(),
        data: updatedData,
      });

      // Créer un événement dans l'historique
      const outcomeLabels: Record<string, string> = {
        will_pay: "Client s'engage à payer",
        dispute: "Litige signalé",
      };
      await ctx.db.insert("events", {
        organizationId: user.organizationId,
        userId: user.userId,
        invoiceId: reminder.invoiceId,
        reminderId: args.reminderId,
        eventType: "reminder_sent",
        eventDate: Date.now(),
        description: `${outcomeLabels[args.outcome] || "Appel effectué"}${args.notes ? ` - ${args.notes}` : ""}`,
        metadata: {
          reminderType: "phone",
          isAutomatic: false,
        },
      });
    }

    return { success: true };
  },
});

/**
 * ✅ Story 5.2 : Génère des relances simulées pour une date cible (admin uniquement)
 * Permet de prévisualiser quelles relances seraient générées pour une date donnée
 * Sans écrire dans la base de données
 */
export const generateSimulatedReminders = query({
  args: { targetDate: v.string() }, // Format YYYY-MM-DD
  returns: v.array(
    v.object({
      _id: v.string(), // Simulated ID (not a real reminder)
      reminderDate: v.string(),
      reminderStatus: v.string(),
      reminderType: v.string(),
      completionStatus: v.string(),
      isSimulation: v.literal(true),
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
          // Story 7.3: Include PDF storage ID for preview indicator
          pdfStorageId: v.optional(v.id("_storage")),
        }),
        v.null()
      ),
      daysOverdue: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { targetDate }) => {
    const user = await getUserWithOrg(ctx);

    // Admin-only access
    if (!isAdmin(user)) {
      throw new Error("Accès réservé aux administrateurs");
    }

    // Get organization's reminder steps configuration
    const org = await ctx.db.get(user.organizationId);
    if (!org) {
      throw new Error("Organisation introuvable");
    }

    const reminderSteps = org.reminderSteps || [];
    if (reminderSteps.length === 0) {
      return []; // No reminder steps configured
    }

    // Parse target date
    const targetDateObj = new Date(targetDate + "T00:00:00");

    // Find invoices that would trigger reminders on targetDate
    // Criteria: sent + unpaid
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .collect();

    // Filter to sent and unpaid invoices (same criteria as generateDailyReminders)
    const eligibleInvoices = invoices.filter(
      (invoice) =>
        invoice.sendStatus === "sent" &&
        invoice.paymentStatus !== "paid" &&
        invoice.paymentStatus !== "pending_payment" &&
        invoice.reminderStatus !== "manual_followup"
    );

    // Generate simulated reminders based on due date + delay
    const simulatedReminders: Array<{
      _id: string;
      reminderDate: string;
      reminderStatus: string;
      reminderType: string;
      completionStatus: string;
      isSimulation: true;
      data?: {
        emailSubject?: string;
        emailContent?: string;
        phoneCallNotes?: string;
        phoneCallOutcome?: string;
      };
      invoice: {
        _id: typeof invoices[0]["_id"];
        invoiceNumber: string;
        clientName: string;
        contactEmail?: string;
        contactPhone?: string;
        amountTTC: number;
        dueDate: string;
        sendStatus: string;
        paymentStatus: string;
        reminderStatus?: string;
        // Story 7.3: Include PDF storage ID for preview indicator
        pdfStorageId?: typeof invoices[0]["pdfStorageId"];
      } | null;
      daysOverdue?: number;
    }> = [];

    for (const invoice of eligibleInvoices) {
      const dueDate = new Date(invoice.dueDate + "T00:00:00");

      for (let stepIndex = 0; stepIndex < reminderSteps.length; stepIndex++) {
        const step = reminderSteps[stepIndex];

        // Calculate reminder date: due date + delay days
        const reminderDate = new Date(dueDate);
        reminderDate.setDate(reminderDate.getDate() + step.delay);

        // Check if this step falls on target date
        const reminderDateString = reminderDate.toISOString().split("T")[0];

        if (reminderDateString === targetDate) {
          // Calculate days overdue first (needed for placeholder replacement)
          const daysOverdue = Math.max(
            0,
            Math.floor((targetDateObj.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          );

          // Format amount in French locale (123,45€)
          const formattedAmount = invoice.amountTTC.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          // Replace placeholders in email templates using the same format as reminderDefaults.ts
          const emailSubject = step.emailSubject
            ?.replace(/{numero_facture}/g, invoice.invoiceNumber)
            ?.replace(/{nom_client}/g, invoice.clientName)
            ?.replace(/{montant}/g, formattedAmount)
            ?.replace(/{date_echeance}/g, invoice.dueDate)
            ?.replace(/{date_facture}/g, invoice.invoiceDate)
            ?.replace(/{jours_retard}/g, daysOverdue.toString());

          const emailContent = step.emailTemplate
            ?.replace(/{numero_facture}/g, invoice.invoiceNumber)
            ?.replace(/{nom_client}/g, invoice.clientName)
            ?.replace(/{montant}/g, formattedAmount)
            ?.replace(/{date_echeance}/g, invoice.dueDate)
            ?.replace(/{date_facture}/g, invoice.invoiceDate)
            ?.replace(/{jours_retard}/g, daysOverdue.toString());

          // daysOverdue already calculated above

          simulatedReminders.push({
            _id: `sim-${invoice._id}-${step.id}`,
            reminderDate: `${targetDate} 10:00:00`,
            reminderStatus: `reminder_${stepIndex + 1}`,
            reminderType: step.type,
            completionStatus: "pending",
            isSimulation: true,
            data:
              step.type === "email"
                ? {
                    emailSubject: emailSubject || "",
                    emailContent: emailContent || "",
                  }
                : undefined,
            invoice: {
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
              // Story 7.3: Include PDF storage ID for preview indicator
              pdfStorageId: invoice.pdfStorageId,
            },
            daysOverdue,
          });
        }
      }
    }

    // Sort by reminder date (chronological)
    return simulatedReminders.sort((a, b) => {
      const dateA = new Date(a.reminderDate.replace(" ", "T"));
      const dateB = new Date(b.reminderDate.replace(" ", "T"));
      return dateA.getTime() - dateB.getTime();
    });
  },
});

/**
 * ✅ V2 Interface : Récupère les relances pour l'onglet "Relances auto"
 * Format simplifié pour l'interface V2
 *
 * ✅ Bug Fix: Techniciens voient les relances de leurs factures (invoice.createdBy),
 *    pas les relances qu'ils ont générées (reminder.userId)
 */
export const getRemindersForAutoTab = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("reminders"),
      invoiceId: v.id("invoices"),
      invoiceNumber: v.string(),
      clientName: v.string(),
      amount: v.number(),
      scheduledDate: v.string(),
      reminderType: v.string(),
      status: v.union(v.literal("scheduled"), v.literal("sent")),
      sentDate: v.optional(v.string()),
      emailSubject: v.optional(v.string()),
      emailContent: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer tous les reminders de l'organisation
    // On filtre ensuite par invoice.createdBy pour les techniciens
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .collect();

    // Filtrer pour garder uniquement :
    // - Les reminders "pending" (pas encore envoyés)
    // - Les reminders "completed" envoyés dans les derniers 30 jours
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filteredReminders = reminders.filter((reminder) => {
      if (reminder.completionStatus === "pending") return true;

      if (reminder.completionStatus === "completed" && reminder.completedAt) {
        const completedDate = new Date(reminder.completedAt);
        return completedDate >= thirtyDaysAgo;
      }

      return false;
    });

    // Enrichir avec les infos de la facture
    const enrichedReminders = await Promise.all(
      filteredReminders.map(async (reminder) => {
        const invoice = await ctx.db.get(reminder.invoiceId);

        if (!invoice) {
          // Facture supprimée, skip
          return null;
        }

        // Déterminer le nom du type de relance
        let reminderTypeName = "";
        const reminderStatusStr = String(reminder.reminderStatus);

        switch (reminder.reminderStatus) {
          case "reminder_1":
            reminderTypeName = "Relance 1 - Amicale";
            break;
          case "reminder_2":
            reminderTypeName = "Relance 2 - Sérieuse";
            break;
          case "reminder_3":
            reminderTypeName = "Relance 3 - Ferme";
            break;
          case "reminder_4":
            reminderTypeName = "Relance 4 - Ultime";
            break;
          default:
            reminderTypeName = `Relance ${reminderStatusStr.replace("reminder_", "")}`;
        }

        return {
          _id: reminder._id,
          invoiceId: reminder.invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          amount: invoice.amountTTC,
          scheduledDate: reminder.reminderDate,
          reminderType: reminderTypeName,
          status: reminder.completionStatus === "pending" ? "scheduled" as const : "sent" as const,
          sentDate: reminder.completedAt
            ? new Date(reminder.completedAt).toISOString().split("T")[0]
            : undefined,
          emailSubject: reminder.data?.emailSubject,
          emailContent: reminder.data?.emailContent,
          // Internal: for technician filtering
          _invoiceCreatedBy: invoice.createdBy,
        };
      })
    );

    // Filtrer les nulls
    const nonNullReminders = enrichedReminders.filter((r) => r !== null) as Array<{
      _id: any;
      invoiceId: any;
      invoiceNumber: string;
      clientName: string;
      amount: number;
      scheduledDate: string;
      reminderType: string;
      status: "scheduled" | "sent";
      sentDate?: string;
      emailSubject?: string;
      emailContent?: string;
      _invoiceCreatedBy: any;
    }>;

    // Filter for technicians: only show reminders for invoices they created
    const userFilteredReminders = isAdmin(user)
      ? nonNullReminders
      : nonNullReminders.filter((r) => r._invoiceCreatedBy === user.userId);

    // Remove internal field and sort
    const validReminders = userFilteredReminders.map((r) => ({
      _id: r._id,
      invoiceId: r.invoiceId,
      invoiceNumber: r.invoiceNumber,
      clientName: r.clientName,
      amount: r.amount,
      scheduledDate: r.scheduledDate,
      reminderType: r.reminderType,
      status: r.status,
      sentDate: r.sentDate,
      emailSubject: r.emailSubject,
      emailContent: r.emailContent,
    }));

    // Trier : planifiées d'abord (par date), puis envoyées (par date desc)
    return validReminders.sort((a, b) => {
      if (a.status === "scheduled" && b.status === "sent") return -1;
      if (a.status === "sent" && b.status === "scheduled") return 1;

      if (a.status === "scheduled") {
        // Trier par date planifiée (ascendant)
        return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
      } else {
        // Trier par date d'envoi (descendant)
        const aDate = a.sentDate ? new Date(a.sentDate).getTime() : 0;
        const bDate = b.sentDate ? new Date(b.sentDate).getTime() : 0;
        return bDate - aDate;
      }
    });
  },
});

/**
 * ✅ SuperAdmin : Génère les relances pour une date cible (écrit en BDD)
 * Permet de tester le système de génération automatique sans attendre le cron
 * Appelle internal.reminders.generateDailyReminders avec la date spécifiée
 */
export const generateRemindersForDate = mutation({
  args: {
    targetDate: v.string(), // Format YYYY-MM-DD
  },
  returns: v.object({
    totalInvoicesProcessed: v.number(),
    totalRemindersGenerated: v.number(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{ totalInvoicesProcessed: number; totalRemindersGenerated: number }> => {
    const user = await getUserWithOrg(ctx);

    // SuperAdmin only
    if (!isSuperAdmin(user)) {
      throw new Error("Cette opération nécessite les privilèges super administrateur");
    }

    // Call the internal mutation to generate reminders
    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: args.targetDate,
      organizationId: user.organizationId,
      generatedByCron: false, // Mark as manual generation
    });

    return {
      totalInvoicesProcessed: result.totalInvoicesProcessed,
      totalRemindersGenerated: result.totalRemindersGenerated,
    };
  },
});

/**
 * ✅ SuperAdmin : Envoie toutes les relances email "pending" pour une date donnée
 * Permet de tester le système d'envoi sans attendre l'envoi automatique
 */
export const sendRemindersForDate = mutation({
  args: {
    targetDate: v.string(), // Format YYYY-MM-DD
  },
  returns: v.object({
    scheduled: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // SuperAdmin only
    if (!isSuperAdmin(user)) {
      throw new Error("Cette opération nécessite les privilèges super administrateur");
    }

    // Find all pending email reminders for this date in the user's organization
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_organization_and_status", (q) =>
        q.eq("organizationId", user.organizationId).eq("completionStatus", "pending")
      )
      .collect();

    // Filter to email reminders for the target date
    const targetDatePrefix = args.targetDate; // e.g. "2025-01-20"
    const emailRemindersForDate = reminders.filter((r) => {
      if (r.reminderType !== "email") return false;
      // reminderDate is in format "YYYY-MM-DD HH:MM:SS"
      return r.reminderDate.startsWith(targetDatePrefix);
    });

    let scheduled = 0;
    let skipped = 0;

    for (const reminder of emailRemindersForDate) {
      // Check if invoice has a contact email
      const invoice = await ctx.db.get(reminder.invoiceId);
      if (!invoice?.contactEmail) {
        skipped++;
        continue;
      }

      // Schedule the email send action
      await ctx.scheduler.runAfter(0, api.reminders.sendReminderEmail, {
        reminderId: reminder._id,
      });
      scheduled++;
    }

    return { scheduled, skipped };
  },
});
