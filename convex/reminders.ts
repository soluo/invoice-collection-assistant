import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, assertCanAccessInvoice, isAdmin } from "./permissions";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getReminderNumber, getReminderStatusFromNumber } from "./lib/invoiceStatus";

/**
 * ✅ V2 Phase 2.8 : Créer une relance
 * Note: Cette fonction est peu utilisée car les relances sont généralement créées via invoices.sendReminder
 */
export const create = mutation({
  args: {
    invoiceId: v.id("invoices"),
    reminderStatus: v.union(
      v.literal("reminder_1"),
      v.literal("reminder_2"),
      v.literal("reminder_3"),
      v.literal("reminder_4")
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

    assertCanAccessInvoice(user, invoice);

    const now = new Date();
    const reminderDate = now.toISOString().slice(0, 19).replace("T", " ");

    return await ctx.db.insert("reminders", {
      userId: user.userId,
      organizationId: user.organizationId,
      invoiceId: args.invoiceId,
      reminderDate,
      reminderStatus: args.reminderStatus,
      reminderType: "email", // Relance par email
      completionStatus: "pending",
      generatedByCron: false,
      data: {
        emailSubject: args.emailSubject,
        emailContent: args.emailContent,
      },
    });
  },
});

export const getByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Vérifier que la facture appartient à l'organisation
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions
    assertCanAccessInvoice(user, invoice);

    return await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();
  },
});

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    return await ctx.db
      .query("reminders")
      .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
      .collect();
  },
});

/**
 * Query pour récupérer toutes les relances accessibles à l'utilisateur courant
 * - Admin : toutes les relances de l'organisation
 * - Technicien : uniquement ses propres relances
 */
export const listForOrganization = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    const reminders = isAdmin(user)
      ? await ctx.db
          .query("reminders")
          .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
          .collect()
      : await ctx.db
          .query("reminders")
          .withIndex("by_user", (q) => q.eq("userId", user.userId))
          .collect();

    // Trier par date décroissante
    const sorted = reminders.sort((a, b) => {
      const dateA = new Date(a.reminderDate.replace(" ", "T"));
      const dateB = new Date(b.reminderDate.replace(" ", "T"));
      return dateB.getTime() - dateA.getTime();
    });

    return await Promise.all(
      sorted.map(async (reminder) => {
        const invoice = await ctx.db.get(reminder.invoiceId);
        const creator = invoice ? await ctx.db.get(invoice.createdBy) : null;

        return {
          _id: reminder._id,
          reminderDate: reminder.reminderDate,
          reminderStatus: reminder.reminderStatus,
          reminderType: reminder.reminderType,
          completionStatus: reminder.completionStatus,
          completedAt: reminder.completedAt ?? null,
          data: reminder.data ?? null,
          generatedByCron: reminder.generatedByCron ?? false,
          invoice: invoice
            ? {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                contactEmail: invoice.contactEmail ?? null,
                amountTTC: invoice.amountTTC,
                dueDate: invoice.dueDate,
                sendStatus: invoice.sendStatus,
                paymentStatus: invoice.paymentStatus,
                reminderStatus: invoice.reminderStatus,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                name: creator.name ?? creator.email ?? "Utilisateur",
              }
            : null,
        };
      })
    );
  },
});

export const getReminderForSending = internalQuery({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: v.union(
    v.object({
      reminder: v.object({
        _id: v.id("reminders"),
        userId: v.id("users"),
        organizationId: v.id("organizations"),
        invoiceId: v.id("invoices"),
        data: v.optional(
          v.object({
            emailSubject: v.optional(v.string()),
            emailContent: v.optional(v.string()),
          })
        ),
        completionStatus: v.union(
          v.literal("pending"),
          v.literal("completed"),
          v.literal("failed")
        ),
      }),
      invoice: v.union(
        v.object({
          _id: v.id("invoices"),
          clientName: v.string(),
          contactEmail: v.optional(v.string()),
          createdBy: v.id("users"),
        }),
        v.null()
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      return null;
    }

    const invoice = await ctx.db.get(reminder.invoiceId);

    return {
      reminder: {
        _id: reminder._id,
        userId: reminder.userId,
        organizationId: reminder.organizationId,
        invoiceId: reminder.invoiceId,
        data: reminder.data,
        completionStatus: reminder.completionStatus,
      },
      invoice: invoice
        ? {
            _id: invoice._id,
            clientName: invoice.clientName,
            contactEmail: invoice.contactEmail,
            createdBy: invoice.createdBy,
          }
        : null,
    };
  },
});

export const markReminderSent = internalMutation({
  args: {
    reminderId: v.id("reminders"),
    completedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Récupérer la relance pour créer l'événement
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      throw new Error("Relance introuvable");
    }

    // Récupérer la facture pour les détails de l'événement
    const invoice = await ctx.db.get(reminder.invoiceId);
    if (!invoice) {
      throw new Error("Facture associée introuvable");
    }

    // Mettre à jour les données
    const currentData = reminder.data || {};
    await ctx.db.patch(args.reminderId, {
      completionStatus: "completed",
      completedAt: args.completedAt,
      data: {
        ...currentData,
        lastSendAttempt: args.completedAt,
        sendError: undefined,
      },
    });

    // ✅ V2 Phase 2.8 : Créer un événement "Relance envoyée"
    // Extraire le numéro de relance depuis "reminder_X"
    const reminderNumber = parseInt(reminder.reminderStatus.split("_")[1], 10);

    await ctx.scheduler.runAfter(0, internal.events.createReminderSentEvent, {
      organizationId: reminder.organizationId,
      userId: reminder.userId,
      invoiceId: reminder.invoiceId,
      reminderId: args.reminderId,
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      reminderNumber,
      isAutomatic: reminder.generatedByCron ?? false,
    });
  },
});

export const markReminderFailed = internalMutation({
  args: {
    reminderId: v.id("reminders"),
    error: v.string(),
    attemptedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    const currentData = reminder?.data || {};

    await ctx.db.patch(args.reminderId, {
      completionStatus: "failed",
      data: {
        ...currentData,
        lastSendAttempt: args.attemptedAt,
        sendError: args.error,
      },
    });
  },
});

export const sendReminderEmail = action({
  args: {
    reminderId: v.id("reminders"),
  },
  returns: v.object({
    status: v.literal("sent"),
    sentAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Non authentifié");
    }

    const userIdString = extractUserIdFromSubject(identity.subject);
    const userId = userIdString as Id<"users">;

    const user = await ctx.runQuery(internal.oauth.getUserForOAuth, {
      userId,
    });

    if (!user?.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }

    const context = await ctx.runQuery(internal.reminders.getReminderForSending, {
      reminderId: args.reminderId,
    });

    if (!context) {
      throw new Error("Relance introuvable");
    }

    if (context.reminder.organizationId !== user.organizationId) {
      throw new Error("Accès refusé à cette relance");
    }

    const isAdminUser = user.role === "admin";
    if (!isAdminUser && context.reminder.userId !== userId) {
      throw new Error("Accès refusé à cette relance");
    }

    if (context.reminder.completionStatus === "completed") {
      throw new Error("Cette relance a déjà été envoyée");
    }

    const invoice = context.invoice;
    if (!invoice?.contactEmail) { // ✅ V2 Phase 2.6 : Renommé de clientEmail
      throw new Error("Adresse email du contact manquante");
    }

    const organizationTokens = await ctx.runQuery(internal.oauth.getOrganization, {
      organizationId: context.reminder.organizationId,
    });

    if (!organizationTokens?.emailRefreshToken) {
      throw new Error(
        "Compte Outlook incomplet. Reconnectez-vous pour envoyer des relances."
      );
    }

    let accessToken = organizationTokens.emailAccessToken ?? "";
    let expiresAt = organizationTokens.emailTokenExpiresAt ?? 0;

    const needsRefresh =
      !accessToken || expiresAt - Date.now() <= 60 * 1000;

    if (needsRefresh) {
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

      if (!clientId || !clientSecret) {
        throw new Error("Configuration OAuth incomplète");
      }

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const response: Response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: organizationTokens.emailRefreshToken,
          grant_type: "refresh_token",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        await ctx.runMutation(internal.reminders.markReminderFailed, {
          reminderId: args.reminderId,
          error: `Échec du refresh token: ${errorText}`,
          attemptedAt: Date.now(),
        });
        throw new Error("Impossible de rafraîchir le token Outlook");
      }

      const data: any = await response.json();
      const newExpiresAt = Date.now() + data.expires_in * 1000;

      await ctx.runMutation(internal.oauth.updateAccessToken, {
        organizationId: context.reminder.organizationId,
        accessToken: data.access_token,
        expiresAt: newExpiresAt,
      });

      accessToken = data.access_token;
      expiresAt = newExpiresAt;
    }

    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: context.reminder.data?.emailSubject || "Relance",
          body: {
            contentType: "Text",
            content: context.reminder.data?.emailContent || "",
          },
          toRecipients: [
            {
              emailAddress: {
                address: invoice.contactEmail, // ✅ V2 Phase 2.6 : Renommé de clientEmail
                name: invoice.clientName,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    const attemptTime = Date.now();

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      await ctx.runMutation(internal.reminders.markReminderFailed, {
        reminderId: args.reminderId,
        error: errorText.slice(0, 500),
        attemptedAt: attemptTime,
      });
      throw new Error("Échec de l'envoi via Outlook");
    }

    await ctx.runMutation(internal.reminders.markReminderSent, {
      reminderId: args.reminderId,
      completedAt: attemptTime,
    });

    return {
      status: "sent" as const,
      sentAt: attemptTime,
    };
  },
});

function extractUserIdFromSubject(subject: string): string {
  if (subject.includes("|")) {
    return subject.split("|")[0];
  }
  if (subject.includes("/")) {
    const parts = subject.split("/");
    return parts[parts.length - 1];
  }
  return subject;
}

// ===================================================================
// ✅ V2 Phase 2.9 : GÉNÉRATION AUTOMATIQUE DES RELANCES PAR CRON
// ===================================================================

/**
 * Fonction principale : génération quotidienne des relances pour toutes les factures en retard
 *
 * Cette fonction est appelée par le cron quotidien (4h du matin) et peut également
 * être testée manuellement depuis le dashboard Convex.
 *
 * Logique :
 * 1. Récupère toutes les factures en retard (optimisé : 1 requête au lieu de N)
 * 2. Les groupe par organizationId
 * 3. Pour chaque facture, appelle generateInvoiceReminder
 *
 * @param currentDate - Date de référence (YYYY-MM-DD), optionnelle (défaut: aujourd'hui)
 * @param organizationId - ID d'une organisation spécifique (optionnel, pour tests)
 */
export const generateDailyReminders = internalMutation({
  args: {
    currentDate: v.optional(v.string()), // Format YYYY-MM-DD
    organizationId: v.optional(v.id("organizations")), // Pour tester une seule org
    generatedByCron: v.optional(v.boolean()), // TRUE si appelé par le cron, FALSE pour tests manuels
  },
  returns: v.object({
    totalInvoicesProcessed: v.number(),
    totalRemindersGenerated: v.number(),
    organizationsProcessed: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = args.currentDate ? new Date(args.currentDate) : new Date();
    const todayStr = now.toISOString().split("T")[0]; // Format YYYY-MM-DD
    const generatedByCron = args.generatedByCron ?? false; // FALSE par défaut

    console.log(
      `[DAILY_REMINDERS] Starting for ${todayStr}${args.organizationId ? ` (org: ${args.organizationId})` : ""}${generatedByCron ? " [CRON]" : " [MANUAL]"}`
    );

    // ===== ÉTAPE 1 : Récupérer toutes les factures en retard =====
    let overdueInvoices;

    if (args.organizationId) {
      // Mode test : récupérer uniquement les factures de cette organisation
      const allOrgInvoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId!)
        )
        .collect();

      // Filtrer les factures en retard
      overdueInvoices = allOrgInvoices.filter((invoice) => {
        if (invoice.sendStatus !== "sent") return false;
        if (
          invoice.paymentStatus === "paid" ||
          invoice.paymentStatus === "pending_payment"
        )
          return false;
        if (invoice.reminderStatus === "manual_followup") return false;

        // Inclure les factures échues aujourd'hui pour la génération anticipée (J+1)
        const dueDate = new Date(invoice.dueDate);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return dueDate < tomorrow;
      });
    } else {
      // Mode production : récupérer toutes les factures, puis filtrer
      const allInvoices = await ctx.db.query("invoices").collect();

      overdueInvoices = allInvoices.filter((invoice) => {
        if (invoice.sendStatus !== "sent") return false;
        if (
          invoice.paymentStatus === "paid" ||
          invoice.paymentStatus === "pending_payment"
        )
          return false;
        if (invoice.reminderStatus === "manual_followup") return false;

        // Inclure les factures échues aujourd'hui pour la génération anticipée (J+1)
        const dueDate = new Date(invoice.dueDate);
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return dueDate < tomorrow;
      });
    }

    console.log(
      `[DAILY_REMINDERS] Found ${overdueInvoices.length} overdue invoices`
    );

    // ===== ÉTAPE 2 : Grouper les factures par organizationId =====
    const invoicesByOrg = new Map<string, typeof overdueInvoices>();

    for (const invoice of overdueInvoices) {
      const orgId = invoice.organizationId;
      if (!invoicesByOrg.has(orgId)) {
        invoicesByOrg.set(orgId, []);
      }
      invoicesByOrg.get(orgId)!.push(invoice);
    }

    console.log(
      `[DAILY_REMINDERS] Processing ${invoicesByOrg.size} organizations`
    );

    // ===== ÉTAPE 3 : Traiter chaque organisation =====
    let totalInvoicesProcessed = 0;
    let totalRemindersGenerated = 0;

    for (const [orgId, invoices] of invoicesByOrg.entries()) {
      console.log(
        `[DAILY_REMINDERS] Organization ${orgId}: ${invoices.length} overdue invoices`
      );

      for (const invoice of invoices) {
        totalInvoicesProcessed++;

        try {
          // Appeler la fonction de génération de relance
          const result = await ctx.runMutation(
            internal.reminders.generateInvoiceReminder,
            {
              invoiceId: invoice._id,
              organizationId: invoice.organizationId,
              currentDate: todayStr,
              generatedByCron,
            }
          );

          if (result.action === "reminder_generated") {
            totalRemindersGenerated++;
            console.log(
              `[DAILY_REMINDERS] ✓ Generated reminder_${result.reminderNumber} for invoice ${invoice.invoiceNumber}`
            );
          } else {
            console.log(
              `[DAILY_REMINDERS] ⊘ No action for invoice ${invoice.invoiceNumber}: ${result.reason}`
            );
          }
        } catch (error) {
          console.error(
            `[DAILY_REMINDERS] ✗ Error processing invoice ${invoice.invoiceNumber}:`,
            error
          );
        }
      }
    }

    const summary = {
      totalInvoicesProcessed,
      totalRemindersGenerated,
      organizationsProcessed: invoicesByOrg.size,
    };

    console.log(
      `[DAILY_REMINDERS] ✔ Completed: ${summary.totalInvoicesProcessed} invoices processed, ${summary.totalRemindersGenerated} reminders generated across ${summary.organizationsProcessed} organizations`
    );

    return summary;
  },
});

/**
 * Fonction interne : génère automatiquement une relance pour une facture donnée
 *
 * Logique :
 * 1. Si première détection de retard → marque overdueDetectedDate + génère reminder_1
 * 2. Si déjà détecté → calcule jours depuis détection + génère reminder_N si délai atteint
 * 3. Support email ET téléphone (les deux générés automatiquement, téléphone complété manuellement)
 * 4. Paramètre currentDate optionnel pour tests
 *
 * @param invoiceId - ID de la facture à traiter
 * @param organizationId - ID de l'organisation (pour récupérer reminderSteps)
 * @param currentDate - Date de référence (YYYY-MM-DD), optionnelle (pour tests)
 */
export const generateInvoiceReminder = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    organizationId: v.id("organizations"),
    currentDate: v.optional(v.string()), // Format YYYY-MM-DD
    generatedByCron: v.optional(v.boolean()), // Pour marquer les reminders générés par le cron
  },
  returns: v.union(
    v.object({
      action: v.literal("reminder_generated"),
      reminderNumber: v.number(),
      reminderId: v.id("reminders"),
    }),
    v.object({
      action: v.literal("no_action"),
      reason: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const now = args.currentDate ? new Date(args.currentDate) : new Date();
    const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const generatedByCron = args.generatedByCron ?? false;

    // Récupérer la facture
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      return { action: "no_action" as const, reason: "Invoice not found" };
    }

    // Vérifier si la facture est payée ou en attente de paiement
    if (invoice.paymentStatus === "paid" || invoice.paymentStatus === "pending_payment") {
      return { action: "no_action" as const, reason: "Invoice already paid/pending payment" };
    }

    // Vérifier si en suivi manuel
    if (invoice.reminderStatus === "manual_followup") {
      return { action: "no_action" as const, reason: "Already in manual followup" };
    }

    // Récupérer la configuration de l'organisation
    const org = await ctx.db.get(args.organizationId);
    if (!org || !org.reminderSteps || org.reminderSteps.length === 0) {
      return { action: "no_action" as const, reason: "No reminder steps configured" };
    }

    // Trier les étapes par délai
    const steps = [...org.reminderSteps].sort((a, b) => a.delay - b.delay);

    if (steps.length === 0) {
      return { action: "no_action" as const, reason: "No reminder steps configured" };
    }

    // ===== PREMIÈRE DÉTECTION =====
    if (!invoice.overdueDetectedDate) {
      console.log(`[REMINDER] First detection for invoice ${invoice.invoiceNumber}`);

      // Marquer la date de détection
      await ctx.db.patch(args.invoiceId, {
        overdueDetectedDate: todayStr,
      });

      // Calculer tomorrow pour la génération anticipée
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculer les jours entre DEMAIN et la date d'échéance
      const dueDate = new Date(invoice.dueDate);
      const daysPastDueTomorrow = Math.floor(
        (tomorrow.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Vérifier si le délai du premier step est atteint
      const firstStep = steps[0];

      // Générer le rappel si demain correspond exactement au délai configuré
      if (daysPastDueTomorrow === firstStep.delay) {
        // Le délai est atteint, générer la première relance
        const reminderId = await createReminderRecord(
          ctx,
          invoice,
          org,
          firstStep,
          1,
          todayStr,
          generatedByCron
        );

        // Mettre à jour le statut de la facture
        await ctx.db.patch(args.invoiceId, {
          reminderStatus: "reminder_1",
          lastReminderDate: todayStr,
        });

        console.log(
          `[REMINDER] Generated reminder_1 for invoice ${invoice.invoiceNumber} for tomorrow (type: ${firstStep.type}, tomorrow will be ${daysPastDueTomorrow} days past due, matching delay=${firstStep.delay})`
        );

        return {
          action: "reminder_generated" as const,
          reminderNumber: 1,
          reminderId,
        };
      } else {
        // Pas encore temps pour la première relance
        console.log(
          `[REMINDER] First detection but not yet time for reminder_1 (tomorrow: ${daysPastDueTomorrow} days past due, need ${firstStep.delay})`
        );
        return {
          action: "no_action" as const,
          reason: `First detection, but delay not reached yet (tomorrow: ${daysPastDueTomorrow}/${firstStep.delay} days past due)`,
        };
      }
    }

    // ===== RELANCES SUIVANTES =====
    // Calculer tomorrow pour la génération anticipée
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const detectionDate = new Date(invoice.overdueDetectedDate);
    const daysSinceDetectionTomorrow = Math.floor(
      (tomorrow.getTime() - detectionDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Déterminer le numéro de relance actuel
    const currentReminderNum = getReminderNumber(invoice.reminderStatus);
    const nextReminderNum = currentReminderNum + 1;

    console.log(
      `[REMINDER] Invoice ${invoice.invoiceNumber}: current reminder=${currentReminderNum}, next=${nextReminderNum}, tomorrow will be ${daysSinceDetectionTomorrow} days since detection`
    );

    // Vérifier si on a une prochaine étape
    if (nextReminderNum > steps.length) {
      // Plus d'étapes → passage en suivi manuel
      await ctx.db.patch(args.invoiceId, {
        reminderStatus: "manual_followup",
      });
      console.log(
        `[REMINDER] Invoice ${invoice.invoiceNumber} moved to manual followup (no more steps)`
      );
      return {
        action: "no_action" as const,
        reason: "No more reminder steps, moved to manual followup",
      };
    }

    // Récupérer la prochaine étape configurée
    const nextStep = steps[nextReminderNum - 1];

    // Vérifier si demain correspond exactement au délai configuré
    if (daysSinceDetectionTomorrow === nextStep.delay) {
      // Vérifier qu'on n'a pas déjà envoyé une relance récemment
      const lastReminderDate = invoice.lastReminderDate
        ? new Date(invoice.lastReminderDate)
        : null;

      if (lastReminderDate) {
        const daysSinceLastReminder = Math.floor(
          (now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Au moins 1 jour entre deux relances
        if (daysSinceLastReminder < 1) {
          console.log(
            `[REMINDER] Invoice ${invoice.invoiceNumber}: too soon since last reminder (${daysSinceLastReminder} days)`
          );
          return {
            action: "no_action" as const,
            reason: "Too soon since last reminder",
          };
        }
      }

      // Générer la relance
      const reminderId = await createReminderRecord(
        ctx,
        invoice,
        org,
        nextStep,
        nextReminderNum,
        todayStr,
        generatedByCron
      );

      // Mettre à jour le statut de la facture
      await ctx.db.patch(args.invoiceId, {
        reminderStatus: getReminderStatusFromNumber(nextReminderNum),
        lastReminderDate: todayStr,
      });

      console.log(
        `[REMINDER] Generated reminder_${nextReminderNum} for invoice ${invoice.invoiceNumber} for tomorrow (type: ${nextStep.type}, tomorrow will be ${daysSinceDetectionTomorrow} days since detection, matching delay=${nextStep.delay})`
      );

      return {
        action: "reminder_generated" as const,
        reminderNumber: nextReminderNum,
        reminderId,
      };
    }

    // Pas encore temps pour la prochaine relance
    console.log(
      `[REMINDER] Invoice ${invoice.invoiceNumber}: not yet time (tomorrow: ${daysSinceDetectionTomorrow} days since detection, need ${nextStep.delay})`
    );
    return {
      action: "no_action" as const,
      reason: `Not yet time for next reminder (tomorrow: ${daysSinceDetectionTomorrow}/${nextStep.delay} days since detection)`,
    };
  },
});

/**
 * Helper : créer un enregistrement de relance dans la table reminders
 */
async function createReminderRecord(
  ctx: any,
  invoice: any,
  org: any,
  step: any,
  reminderNum: number,
  dateStr: string,
  generatedByCron: boolean
): Promise<Id<"reminders">> {
  // Calculer la date de demain pour la génération anticipée
  const today = new Date(dateStr);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  // Utiliser l'heure configurée dans l'organisation (défaut: 10:00)
  const sendTime = org.reminderSendTime || "10:00";
  const reminderDate = `${tomorrowStr} ${sendTime}:00`;

  // Calculer les jours de retard depuis l'échéance réelle (pour affichage)
  const dueDate = new Date(invoice.dueDate);
  const now = new Date(dateStr);
  const daysPastDue = Math.max(
    0,
    Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Données spécifiques selon le type
  let data: any = {};

  if (step.type === "email") {
    // Remplacer les placeholders dans le template
    const emailSubject = replaceTemplatePlaceholders(
      step.emailSubject || "",
      invoice,
      daysPastDue
    );
    const emailContent = replaceTemplatePlaceholders(
      step.emailTemplate || "",
      invoice,
      daysPastDue,
      org.signature
    );

    data = {
      emailSubject,
      emailContent,
    };
  } else if (step.type === "phone") {
    // Pas de données pré-remplies pour le téléphone
    data = {
      phoneCallNotes: `Relance ${reminderNum} - ${step.name}`,
    };
  }

  return await ctx.db.insert("reminders", {
    userId: invoice.createdBy,
    organizationId: invoice.organizationId,
    invoiceId: invoice._id,
    reminderDate,
    reminderStatus: getReminderStatusFromNumber(reminderNum),
    reminderType: step.type,
    completionStatus: "pending",
    generatedByCron, // ✅ Utiliser le paramètre passé (TRUE pour cron, FALSE pour manuel)
    data,
  });
}

/**
 * Helper : remplacer les placeholders dans les templates d'email
 */
function replaceTemplatePlaceholders(
  template: string,
  invoice: any,
  daysPastDue: number,
  signature?: string
): string {
  // Format amount in French locale (123,45)
  const formattedAmount = invoice.amountTTC.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let result = template
    .replace(/{numero_facture}/g, invoice.invoiceNumber)
    .replace(/{montant}/g, formattedAmount)
    .replace(/{date_facture}/g, invoice.invoiceDate)
    .replace(/{date_echeance}/g, invoice.dueDate)
    .replace(/{nom_client}/g, invoice.clientName)
    .replace(/{jours_retard}/g, daysPastDue.toString());

  // Ajouter la signature si fournie
  if (signature) {
    result += `\n\n${signature}`;
  }

  return result;
}

/**
 * Query de débogage : Vérifier pourquoi une facture n'est pas incluse dans les rappels
 */
export const debugInvoiceFilter = query({
  args: {
    invoiceId: v.id("invoices"),
    currentDate: v.optional(v.string()),
  },
  returns: v.object({
    invoice: v.any(),
    now: v.string(),
    tomorrow: v.string(),
    checks: v.object({
      sendStatus: v.object({ value: v.string(), passes: v.boolean() }),
      paymentStatus: v.object({ value: v.string(), passes: v.boolean() }),
      reminderStatus: v.object({ value: v.union(v.string(), v.null()), passes: v.boolean() }),
      dueDate: v.object({
        value: v.string(),
        passes: v.boolean(),
        daysPastDueToday: v.number(),
        daysPastDueTomorrow: v.number(),
      }),
    }),
    overallPasses: v.boolean(),
    reason: v.string(),
  }),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const now = args.currentDate ? new Date(args.currentDate) : new Date();
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    // Vérifier chaque condition du filtre
    const sendStatusPasses = invoice.sendStatus === "sent";
    const paymentStatusPasses =
      invoice.paymentStatus !== "paid" &&
      invoice.paymentStatus !== "pending_payment";
    const reminderStatusPasses = invoice.reminderStatus !== "manual_followup";

    const dueDate = new Date(invoice.dueDate);
    const datePasses = dueDate < tomorrow;

    const daysPastDueToday = Math.floor(
      (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const daysPastDueTomorrow = Math.floor(
      (tomorrow.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const overallPasses =
      sendStatusPasses &&
      paymentStatusPasses &&
      reminderStatusPasses &&
      datePasses;

    let reason = "OK";
    if (!sendStatusPasses) {
      reason = `sendStatus must be "sent" but is "${invoice.sendStatus}"`;
    } else if (!paymentStatusPasses) {
      reason = `paymentStatus must not be "paid" or "pending_payment" but is "${invoice.paymentStatus}"`;
    } else if (!reminderStatusPasses) {
      reason = `reminderStatus must not be "manual_followup" but is "${invoice.reminderStatus}"`;
    } else if (!datePasses) {
      reason = `dueDate (${invoice.dueDate}) must be < tomorrow (${tomorrowStr}) but it's not`;
    }

    return {
      invoice,
      now: todayStr,
      tomorrow: tomorrowStr,
      checks: {
        sendStatus: { value: invoice.sendStatus, passes: sendStatusPasses },
        paymentStatus: { value: invoice.paymentStatus, passes: paymentStatusPasses },
        reminderStatus: { value: invoice.reminderStatus || null, passes: reminderStatusPasses },
        dueDate: {
          value: invoice.dueDate,
          passes: datePasses,
          daysPastDueToday,
          daysPastDueTomorrow,
        },
      },
      overallPasses,
      reason,
    };
  },
});

/**
 * ✅ MVP : Mutation pour modifier le contenu d'un email de relance
 * Uniquement autorisé pour les relances en attente (completionStatus = "pending")
 */
export const updateEmailContent = mutation({
  args: {
    reminderId: v.id("reminders"),
    subject: v.string(),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Récupérer la relance
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder) {
      throw new Error("Relance introuvable");
    }

    // Vérifier les permissions
    if (reminder.organizationId !== user.organizationId) {
      throw new Error("Accès non autorisé");
    }

    // Uniquement pour les relances en attente
    if (reminder.completionStatus !== "pending") {
      throw new Error("Vous ne pouvez modifier que les relances en attente");
    }

    // Vérifier que c'est une relance email
    if (reminder.reminderType !== "email") {
      throw new Error("Seules les relances email peuvent être modifiées");
    }

    // Récupérer la facture pour vérifier les permissions
    const invoice = await ctx.db.get(reminder.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Permissions : admin OU createdBy de la facture
    const isAdmin = user.role === "admin";
    const isCreator = user.userId === invoice.createdBy;
    if (!isAdmin && !isCreator) {
      throw new Error("Vous n'avez pas les permissions pour modifier cette relance");
    }

    // Mettre à jour le contenu
    await ctx.db.patch(args.reminderId, {
      data: {
        ...reminder.data,
        emailSubject: args.subject,
        emailContent: args.content,
      },
    });

    return null;
  },
});

/**
 * ✅ MVP : Action pour envoyer plusieurs relances en masse
 */
export const sendMultipleReminders = action({
  args: {
    reminderIds: v.array(v.id("reminders")),
  },
  returns: v.object({
    sent: v.number(),
    failed: v.number(),
    errors: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const reminderId of args.reminderIds) {
      try {
        await ctx.runAction(api.reminders.sendReminderEmail, { reminderId });
        sent++;
      } catch (error: any) {
        failed++;
        const errorMsg = `Relance ${reminderId}: ${error?.message || "Erreur inconnue"}`;
        errors.push(errorMsg);
        console.error(errorMsg, error);
      }
    }

    return {
      sent,
      failed,
      errors,
    };
  },
});
