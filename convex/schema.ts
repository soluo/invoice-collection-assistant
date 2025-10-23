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
    clientEmail: v.optional(v.string()), // ✅ Email facultatif
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("overdue"),
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("litigation"),
      v.literal("paid")
    ),
    pdfStorageId: v.optional(v.id("_storage")),
    lastReminderDate: v.optional(v.string()),
    paidDate: v.optional(v.string()),
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
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"]),
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
