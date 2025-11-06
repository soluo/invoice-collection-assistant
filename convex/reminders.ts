import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, assertCanAccessInvoice, isAdmin } from "./permissions";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    invoiceId: v.id("invoices"),
    reminderStatus: v.union(
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder")
    ),
    emailSubject: v.string(),
    emailContent: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Vérifier que la facture appartient à l'organisation
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // Vérifier les permissions
    assertCanAccessInvoice(user, invoice);

    // Créer l'enregistrement de relance
    const now = new Date();
    const reminderDate = now.toISOString().slice(0, 19).replace("T", " "); // "2025-09-26 00:36:00"

    return await ctx.db.insert("reminders", {
      userId: user.userId,
      organizationId: user.organizationId,
      invoiceId: args.invoiceId,
      reminderDate,
      reminderStatus: args.reminderStatus,
      emailSubject: args.emailSubject,
      emailContent: args.emailContent,
      sendStatus: "pending",
      generatedByCron: false,
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
          sendStatus: reminder.sendStatus ?? "pending",
          emailSubject: reminder.emailSubject,
          emailContent: reminder.emailContent,
          sentAt: reminder.sentAt ?? null,
          sendError: reminder.sendError ?? null,
          generatedByCron: reminder.generatedByCron ?? false,
          invoice: invoice
            ? {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
                contactEmail: invoice.contactEmail ?? null, // ✅ V2 Phase 2.6 : Renommé de clientEmail
                amountTTC: invoice.amountTTC,
                dueDate: invoice.dueDate,
                status: invoice.status,
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
        emailSubject: v.string(),
        emailContent: v.string(),
        sendStatus: v.optional(
          v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"))
        ),
      }),
      invoice: v.union(
        v.object({
          _id: v.id("invoices"),
          clientName: v.string(),
          contactEmail: v.optional(v.string()), // ✅ V2 Phase 2.6 : Renommé de clientEmail
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
        emailSubject: reminder.emailSubject,
        emailContent: reminder.emailContent,
        sendStatus: reminder.sendStatus,
      },
      invoice: invoice
        ? {
            _id: invoice._id,
            clientName: invoice.clientName,
            contactEmail: invoice.contactEmail, // ✅ V2 Phase 2.6 : Renommé de clientEmail
            createdBy: invoice.createdBy,
          }
        : null,
    };
  },
});

export const markReminderSent = internalMutation({
  args: {
    reminderId: v.id("reminders"),
    sentAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.reminderId, {
      sendStatus: "sent",
      sentAt: args.sentAt,
      lastSendAttempt: args.sentAt,
      sendError: undefined,
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
    await ctx.db.patch(args.reminderId, {
      sendStatus: "failed",
      lastSendAttempt: args.attemptedAt,
      sendError: args.error,
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

    if (context.reminder.sendStatus === "sent") {
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
          subject: context.reminder.emailSubject,
          body: {
            contentType: "Text",
            content: context.reminder.emailContent,
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
      sentAt: attemptTime,
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
