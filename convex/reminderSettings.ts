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
        firstReminderTemplate: "Bonjour {clientName},\n\nJ'espère que vous allez bien.\n\nJe me permets de vous contacter concernant la facture {invoiceNumber} d'un montant de {amount} € qui semble ne pas avoir été réglée à ce jour.\n\nIl s'agit probablement d'un simple oubli, mais je souhaitais m'en assurer auprès de vous.\n\nPourriez-vous vérifier de votre côté et procéder au règlement si ce n'est pas déjà fait ?\n\nJe vous remercie par avance pour votre diligence.\n\nCordialement,",
        secondReminderTemplate: "Bonjour {clientName},\n\nMalgré notre précédent courrier, le règlement de votre facture {invoiceNumber} d'un montant de {amount} € demeure impayé.\n\nCette situation nous préoccupe et nous espérons qu'elle trouvera une solution rapide.\n\nNous vous demandons de bien vouloir régulariser votre situation sous 8 jours, faute de quoi nous serons contraints de prendre des mesures plus fermes.\n\nNous restons à votre disposition pour tout échange à ce sujet.",
        thirdReminderTemplate: "Bonjour {clientName},\n\nMalgré nos relances précédentes, votre facture {invoiceNumber} d'un montant de {amount} € reste impayée à ce jour.\n\nNous vous accordons un dernier délai de 15 jours pour régulariser votre situation.\n\nPassé ce délai et en l'absence de règlement ou de prise de contact de votre part, nous serons dans l'obligation de transmettre ce dossier à notre service contentieux pour recouvrement judiciaire.\n\nCette procédure entraînera des frais supplémentaires qui vous seront facturés.\n\nNous espérons que cette dernière mise en demeure permettra de résoudre cette situation à l'amiable.",
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
