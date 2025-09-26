import { mutation } from "./_generated/server"
import { v } from "convex/values"

// Données d'exemple
const SAMPLE_INVOICES = [
    {
        clientName: "Pierre Dubois",
        clientEmail: "pierre.dubois@gmail.com",
        invoiceNumber: "F2025-0847",
        amountTTC: 1250,
        invoiceDate: "2025-09-10",
        dueDate: "2025-09-25",
        status: "sent" as const,
    },
    {
        clientName: "Marie Lefebvre",
        clientEmail: "m.lefebvre@orange.fr",
        invoiceNumber: "F2025-0923",
        amountTTC: 780,
        invoiceDate: "2025-08-28",
        dueDate: "2025-09-12",
        status: "sent" as const,
    },
    {
        clientName: "Jean-Claude Martin",
        clientEmail: "jc.martin@wanadoo.fr",
        invoiceNumber: "F2025-1156",
        amountTTC: 2340,
        invoiceDate: "2025-09-15",
        dueDate: "2025-09-30",
        status: "sent" as const,
    },
    {
        clientName: "Sophie Rousseau",
        clientEmail: "sophie.rousseau@hotmail.com",
        invoiceNumber: "F2025-1287",
        amountTTC: 450,
        invoiceDate: "2025-09-03",
        dueDate: "2025-09-18",
        status: "sent" as const,
    },
    {
        clientName: "Michel Petit",
        clientEmail: "michel.petit@free.fr",
        invoiceNumber: "F2025-0765",
        amountTTC: 3150,
        invoiceDate: "2025-08-15",
        dueDate: "2025-08-30",
        status: "sent" as const,
    },
    {
        clientName: "Catherine Moreau",
        clientEmail: "cat.moreau@gmail.com",
        invoiceNumber: "F2025-1098",
        amountTTC: 890,
        invoiceDate: "2025-09-08",
        dueDate: "2025-09-23",
        status: "sent" as const,
    },
    {
        clientName: "Alain Robert",
        clientEmail: "alain.robert@laposte.net",
        invoiceNumber: "F2025-0652",
        amountTTC: 1680,
        invoiceDate: "2025-08-22",
        dueDate: "2025-09-06",
        status: "sent" as const,
    },
    {
        clientName: "Nathalie Garcia",
        clientEmail: "nathalie.garcia@yahoo.fr",
        invoiceNumber: "F2025-1423",
        amountTTC: 320,
        invoiceDate: "2025-09-20",
        dueDate: "2025-10-05",
        status: "sent" as const,
    },
    {
        clientName: "François Durand",
        clientEmail: "f.durand@bbox.fr",
        invoiceNumber: "F2025-0834",
        amountTTC: 2750,
        invoiceDate: "2025-07-25",
        dueDate: "2025-08-09",
        status: "sent" as const,
    },
    {
        clientName: "Isabelle Roux",
        clientEmail: "isabelle.roux@sfr.fr",
        invoiceNumber: "F2025-1201",
        amountTTC: 1420,
        invoiceDate: "2025-08-05",
        dueDate: "2025-08-20",
        status: "sent" as const,
    },
]

export const seedDatabase = mutation({
    args: {},
    returns: v.null(),
    handler: async (ctx) => {
        // Vérifier si l'utilisateur est authentifié
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) {
            throw new Error("Utilisateur non authentifié")
        }

        const userId = identity.subject

        // Insérer les factures d'exemple
        for (const invoice of SAMPLE_INVOICES) {
            await ctx.db.insert("invoices", {
                userId: userId as any,
                ...invoice,
            })
        }

        // Insérer des paramètres de rappel par défaut
        const existingSettings = await ctx.db
            .query("reminderSettings")
            .withIndex("by_user", (q) => q.eq("userId", userId as any))
            .first()

        if (!existingSettings) {
            await ctx.db.insert("reminderSettings", {
                userId: userId as any,
                firstReminderDelay: 15,
                secondReminderDelay: 30,
                thirdReminderDelay: 45,
                litigationDelay: 60,
                firstReminderTemplate: "Bonjour,\n\nNous vous rappelons que la facture {{invoiceNumber}} d'un montant de {{amount}}€ est échue depuis le {{dueDate}}.\n\nMerci de procéder au règlement dans les plus brefs délais.",
                secondReminderTemplate: "Bonjour,\n\nMalgré notre premier rappel, la facture {{invoiceNumber}} d'un montant de {{amount}}€ reste impayée.\n\nNous vous remercions de régulariser cette situation rapidement.",
                thirdReminderTemplate: "Bonjour,\n\nCeci constitue notre dernier rappel avant engagement de procédures de recouvrement pour la facture {{invoiceNumber}} d'un montant de {{amount}}€.\n\nVeuillez procéder au règlement sous 8 jours.",
                signature: "Cordialement,\nVotre équipe",
            })
        }

        console.log("Base de données initialisée avec succès !")
    },
})
