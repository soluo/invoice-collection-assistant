import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Calculer les jours de retard et trier par urgence
    const now = new Date();
    const invoicesWithDays = invoices.map((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Ordre de priorité pour le tri
      const statusPriority = {
        litigation: 0,
        third_reminder: 1,
        second_reminder: 2,
        first_reminder: 3,
        overdue: 4,
        sent: 5,
        paid: 6,
      };

      return {
        ...invoice,
        daysOverdue,
        priority: statusPriority[invoice.status],
      };
    });

    // Trier par priorité puis par jours de retard
    return invoicesWithDays.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.daysOverdue - a.daysOverdue;
    });
  },
});

export const create = mutation({
  args: {
    clientName: v.string(),
    clientEmail: v.string(),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    pdfStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    return await ctx.db.insert("invoices", {
      userId,
      ...args,
      status: "sent",
    });
  },
});

export const updateStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: v.union(
      v.literal("sent"),
      v.literal("overdue"),
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("litigation"),
      v.literal("paid")
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new Error("Invoice not found");
    }

    const updateData: any = { status: args.status };
    
    if (args.status === "paid") {
      updateData.paidDate = new Date().toISOString().split('T')[0];
    }
    
    if (["first_reminder", "second_reminder", "third_reminder"].includes(args.status)) {
      updateData.lastReminderDate = new Date().toISOString().split('T')[0];
    }

    return await ctx.db.patch(args.invoiceId, updateData);
  },
});

export const markAsPaid = mutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new Error("Invoice not found");
    }

    return await ctx.db.patch(args.invoiceId, {
      status: "paid",
      paidDate: new Date().toISOString().split('T')[0],
    });
  },
});

export const update = mutation({
  args: {
    invoiceId: v.id("invoices"),
    clientName: v.string(),
    clientEmail: v.string(),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice || invoice.userId !== userId) {
      throw new Error("Invoice not found");
    }

    const { invoiceId, ...updateData } = args;
    return await ctx.db.patch(invoiceId, updateData);
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
