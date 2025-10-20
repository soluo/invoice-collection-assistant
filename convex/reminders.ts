import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg } from "./permissions";

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
    const { assertCanAccessInvoice } = await import("./permissions");
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
    const { assertCanAccessInvoice } = await import("./permissions");
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