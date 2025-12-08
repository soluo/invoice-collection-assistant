import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg } from "./permissions";

/**
 * ✅ MVP : Liste les notes d'une facture
 * Triées par date de création (plus récente en premier)
 */
export const listForInvoice = query({
  args: { invoiceId: v.id("invoices") },
  returns: v.array(
    v.object({
      _id: v.id("invoiceNotes"),
      _creationTime: v.number(),
      invoiceId: v.id("invoices"),
      organizationId: v.id("organizations"),
      content: v.string(),
      createdBy: v.id("users"),
      createdByName: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Vérifier que la facture appartient à l'organisation
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== user.organizationId) {
      throw new Error("Facture introuvable");
    }

    const notes = await ctx.db
      .query("invoiceNotes")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Trier par date de création décroissante (plus récente en premier)
    return notes.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/**
 * ✅ MVP : Créer une note sur une facture
 */
export const create = mutation({
  args: {
    invoiceId: v.id("invoices"),
    content: v.string(),
  },
  returns: v.id("invoiceNotes"),
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Vérifier que la facture appartient à l'organisation
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.organizationId !== user.organizationId) {
      throw new Error("Facture introuvable");
    }

    // Créer la note
    const noteId = await ctx.db.insert("invoiceNotes", {
      invoiceId: args.invoiceId,
      organizationId: user.organizationId,
      content: args.content.trim(),
      createdBy: user.userId,
      createdByName: user.name || user.email || "Utilisateur",
    });

    return noteId;
  },
});

/**
 * ✅ MVP : Helper interne pour créer une note automatique (appelé par d'autres mutations)
 * Utilisé par snooze, recordPhoneCall, etc.
 */
export const createInternal = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    organizationId: v.id("organizations"),
    content: v.string(),
    createdBy: v.id("users"),
    createdByName: v.string(),
  },
  returns: v.id("invoiceNotes"),
  handler: async (ctx, args) => {
    const noteId = await ctx.db.insert("invoiceNotes", {
      invoiceId: args.invoiceId,
      organizationId: args.organizationId,
      content: args.content.trim(),
      createdBy: args.createdBy,
      createdByName: args.createdByName,
    });

    return noteId;
  },
});
