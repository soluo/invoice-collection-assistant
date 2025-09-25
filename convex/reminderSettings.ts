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

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);
    
    const settings = await ctx.db
      .query("reminderSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    // Valeurs par défaut si aucun paramètre n'existe
    if (!settings) {
      return {
        firstReminderDelay: 15,
        secondReminderDelay: 30,
        thirdReminderDelay: 45,
        litigationDelay: 60,
        firstReminderTemplate: "Bonjour,\n\nNous vous rappelons que la facture #{invoiceNumber} d'un montant de {amount}€ est échue depuis {daysOverdue} jours.\n\nMerci de procéder au règlement dans les plus brefs délais.\n\nCordialement,",
        secondReminderTemplate: "Bonjour,\n\nMalgré notre précédent rappel, la facture #{invoiceNumber} d'un montant de {amount}€ reste impayée depuis {daysOverdue} jours.\n\nNous vous demandons de régulariser cette situation rapidement.\n\nCordialement,",
        thirdReminderTemplate: "Bonjour,\n\nCeci est notre dernier rappel concernant la facture #{invoiceNumber} d'un montant de {amount}€, impayée depuis {daysOverdue} jours.\n\nÀ défaut de règlement sous 8 jours, nous serons contraints d'engager une procédure de recouvrement.\n\nCordialement,",
        signature: "Votre entreprise\nTéléphone : 01 23 45 67 89\nEmail : contact@votre-entreprise.fr",
      };
    }

    return settings;
  },
});

export const upsert = mutation({
  args: {
    firstReminderDelay: v.number(),
    secondReminderDelay: v.number(),
    thirdReminderDelay: v.number(),
    litigationDelay: v.number(),
    firstReminderTemplate: v.string(),
    secondReminderTemplate: v.string(),
    thirdReminderTemplate: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getLoggedInUser(ctx);
    
    const existing = await ctx.db
      .query("reminderSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      return await ctx.db.patch(existing._id, args);
    } else {
      return await ctx.db.insert("reminderSettings", {
        userId,
        ...args,
      });
    }
  },
});
