import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // === MULTI-USER TABLES ===

  organizations: defineTable({
    name: v.string(), // Nom de la société
    senderEmail: v.string(), // Email expéditeur pour les relances
    createdAt: v.number(),
    // Paramètres de relances centralisés
    firstReminderDelay: v.number(),
    secondReminderDelay: v.number(),
    thirdReminderDelay: v.number(),
    litigationDelay: v.number(),
    firstReminderTemplate: v.string(),
    secondReminderTemplate: v.string(),
    thirdReminderTemplate: v.string(),
    signature: v.string(),
    // Paramètres d'envoi automatique (Phase 3)
    autoSendReminders: v.optional(v.boolean()), // Par défaut : false
    // Connexion email OAuth (Phase 3)
    emailProvider: v.optional(
      v.union(
        v.literal("microsoft"),
        v.literal("google"),
        v.literal("infomaniak")
      )
    ),
    emailConnectedAt: v.optional(v.number()),
    emailAccessToken: v.optional(v.string()),
    emailRefreshToken: v.optional(v.string()),
    emailTokenExpiresAt: v.optional(v.number()),
    emailConnectedBy: v.optional(v.id("users")),
    emailAccountInfo: v.optional(
      v.object({
        email: v.string(),
        name: v.string(),
      })
    ),
  }),

  invitations: defineTable({
    email: v.string(),
    organizationId: v.id("organizations"),
    role: v.union(v.literal("admin"), v.literal("technicien")),
    token: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired")
    ),
    invitedBy: v.id("users"),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_organization", ["organizationId"])
    .index("by_email", ["email"]),

  // === INVOICE TABLES ===

  invoices: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"), // ✅ Phase 2 : maintenant obligatoire
    createdBy: v.id("users"), // ✅ Phase 2 : maintenant obligatoire
    clientName: v.string(),
    contactName: v.optional(v.string()), // ✅ V2 Phase 2.6 : Nom du contact
    contactEmail: v.optional(v.string()), // ✅ V2 Phase 2.6 : Email du contact (renommé de clientEmail)
    contactPhone: v.optional(v.string()), // ✅ V2 Phase 2.6 : Téléphone du contact
    clientEmail: v.optional(v.string()), // 🔴 OBSOLETE - Use contactEmail instead (temporary for backward compatibility)
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("pending"), // ✅ V2 : nouveau statut "En attente"
      v.literal("overdue"),
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("partial_payment"), // ✅ V2 : nouveau statut "Paiement partiel"
      v.literal("litigation"),
      v.literal("paid")
    ),
    pdfStorageId: v.optional(v.id("_storage")),
    lastReminderDate: v.optional(v.string()),
    paidDate: v.optional(v.string()),
    paidAmount: v.optional(v.number()), // ✅ V2 : montant déjà payé (pour paiements partiels)
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_due_date", ["dueDate"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_creator", ["organizationId", "createdBy"])
    .index("by_organization_and_status", ["organizationId", "status"]),

  // Table reminderSettings supprimée - paramètres déplacés vers organizations

  reminders: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"), // ✅ Phase 2 : maintenant obligatoire
    invoiceId: v.id("invoices"),
    reminderDate: v.string(), // "2025-09-26 00:36:00"
    reminderStatus: v.union(
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder")
    ),
    emailSubject: v.string(),
    emailContent: v.string(),
    sendStatus: v.optional(
      v.union(v.literal("pending"), v.literal("sent"), v.literal("failed"))
    ),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    sendError: v.optional(v.string()),
    lastSendAttempt: v.optional(v.number()),
    generatedByCron: v.optional(v.boolean()),
    isPaused: v.optional(v.boolean()), // ✅ V2 Phase 2.8 : pour mettre en pause une relance planifiée
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_sendStatus", ["sendStatus"])
    .index("by_organization_and_status", ["organizationId", "sendStatus"]),

  // ✅ V2 Phase 2.8 : Table des événements pour l'historique de l'agenda
  events: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"), // Créateur de l'événement
    invoiceId: v.optional(v.id("invoices")), // Lié à une facture
    reminderId: v.optional(v.id("reminders")), // Lié à une relance (pour les events d'envoi)

    eventType: v.union(
      v.literal("invoice_imported"), // Facture importée
      v.literal("invoice_marked_sent"), // Facture marquée envoyée
      v.literal("invoice_sent"), // Facture envoyée (email)
      v.literal("payment_registered"), // Paiement enregistré sur la facture
      v.literal("invoice_marked_paid"), // Facture marquée payée
      v.literal("reminder_sent") // Email de relance envoyé (auto ou manuel)
    ),

    eventDate: v.number(), // timestamp

    // Métadonnées spécifiques selon le type
    metadata: v.optional(
      v.object({
        amount: v.optional(v.number()), // Pour payment_registered
        reminderType: v.optional(v.string()), // Pour reminder_sent (first/second/third)
        isAutomatic: v.optional(v.boolean()), // Pour reminder_sent (auto vs manuel)
        previousStatus: v.optional(v.string()), // Pour invoice_marked_*
        newStatus: v.optional(v.string()), // Pour invoice_marked_*
      })
    ),

    description: v.optional(v.string()), // Description lisible de l'événement
  })
    .index("by_organization", ["organizationId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_organization_and_date", ["organizationId", "eventDate"])
    .index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,

  // Étendre la table users avec nos champs personnalisés
  users: defineTable({
    // Champs requis par Convex Auth
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // NOS champs personnalisés pour multi-user
    role: v.optional(v.union(v.literal("admin"), v.literal("technicien"))),
    organizationId: v.optional(v.id("organizations")),
    invitedBy: v.optional(v.id("users")),
  })
    .index("by_email", ["email"])
    .index("by_organizationId", ["organizationId"]),
});
