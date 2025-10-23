import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, assertCanAccessInvoice, isAdmin } from "./permissions";

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
          generatedByCron: reminder.generatedByCron ?? false,
          invoice: invoice
            ? {
                _id: invoice._id,
                invoiceNumber: invoice.invoiceNumber,
                clientName: invoice.clientName,
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
