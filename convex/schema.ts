import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // === MULTI-USER TABLES ===

  organizations: defineTable({
    name: v.string(), // Nom de la société
    senderEmail: v.string(), // Email expéditeur pour les relances
    createdAt: v.number(),

    // ✅ V2 Phase 2.9 : Configuration flexible des relances avec support téléphone
    reminderSteps: v.optional(
      v.array(
        v.object({
          id: v.string(), // UUID unique pour chaque étape
          delay: v.number(), // Jours après échéance (7, 14, 30...)
          type: v.union(v.literal("email"), v.literal("phone")), // Type d'action
          name: v.string(), // Nom de l'étape (ex: "Relance amicale")
          emailSubject: v.optional(v.string()), // Objet de l'email (si type = email)
          emailTemplate: v.optional(v.string()), // Contenu de l'email (si type = email)
        })
      )
    ),
    signature: v.string(), // Signature commune à toutes les relances email

    // Paramètres d'envoi automatique (Phase 3)
    autoSendEnabled: v.optional(v.boolean()), // Par défaut : false

    // Anciens champs (à supprimer après migration)
    manualFollowupDelay: v.optional(v.number()),
    firstReminderDelay: v.optional(v.number()),
    secondReminderDelay: v.optional(v.number()),
    thirdReminderDelay: v.optional(v.number()),
    litigationDelay: v.optional(v.number()),
    firstReminderTemplate: v.optional(v.string()),
    secondReminderTemplate: v.optional(v.string()),
    thirdReminderTemplate: v.optional(v.string()),

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
    senderName: v.optional(v.string()), // Nom d'affichage pour l'expéditeur (si supporté par le provider)
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
    userId: v.id("users"), // Pour compatibilité ancienne logique
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),

    // Informations client
    clientName: v.string(),
    contactName: v.optional(v.string()), // ✅ V2 Phase 2.6 : Nom du contact
    contactEmail: v.optional(v.string()), // ✅ V2 Phase 2.6 : Email du contact
    contactPhone: v.optional(v.string()), // ✅ V2 Phase 2.6 : Téléphone du contact

    // Informations facture
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(), // Format: "YYYY-MM-DD"
    dueDate: v.string(), // Format: "YYYY-MM-DD"
    pdfStorageId: v.optional(v.id("_storage")),

    // ✅ V2 Phase 2.8 : 3 dimensions d'états (indépendantes)

    // DIMENSION 1 : État d'envoi
    sendStatus: v.union(
      v.literal("pending"), // En attente d'envoi
      v.literal("sent") // Envoyée au client
    ),
    sentDate: v.optional(v.string()), // Date d'envoi effective

    // DIMENSION 2 : État de paiement
    paymentStatus: v.union(
      v.literal("unpaid"), // Pas encore payée
      v.literal("partial"), // Paiement partiel reçu
      v.literal("pending_payment"), // Chèque(s) en attente d'encaissement
      v.literal("paid") // Entièrement payée
    ),
    paidAmount: v.optional(v.number()), // Montant déjà payé (pour paiements partiels)
    paidDate: v.optional(v.string()), // Date de paiement complet

    // DIMENSION 3 : État de relance
    reminderStatus: v.union(
      v.literal("none"), // Pas de relance
      v.literal("reminder_1"), // Première relance
      v.literal("reminder_2"), // Deuxième relance
      v.literal("reminder_3"), // Troisième relance
      v.literal("reminder_4"), // Quatrième relance (si configuré)
      v.literal("manual_followup") // Fin des relances auto → suivi manuel
    ),
    lastReminderDate: v.optional(v.string()), // Date de dernière relance envoyée
  })
    .index("by_user", ["userId"])
    .index("by_due_date", ["dueDate"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_creator", ["organizationId", "createdBy"])
    .index("by_organization_and_payment", ["organizationId", "paymentStatus"])
    .index("by_organization_and_reminder", ["organizationId", "reminderStatus"]),

  reminders: defineTable({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),

    reminderDate: v.string(), // "2025-09-26 00:36:00"
    reminderStatus: v.union(
      v.literal("reminder_1"),
      v.literal("reminder_2"),
      v.literal("reminder_3"),
      v.literal("reminder_4")
    ),

    // Type de relance : email ou téléphone
    reminderType: v.union(v.literal("email"), v.literal("phone")),

    // Statut de complétion (générique pour email ET téléphone)
    completionStatus: v.optional(
      v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"))
    ),
    completedAt: v.optional(v.number()),

    // Métadonnées
    generatedByCron: v.optional(v.boolean()),
    isPaused: v.optional(v.boolean()),

    // Données spécifiques par type (flexible, non indexé)
    data: v.optional(
      v.object({
        // Champs spécifiques email
        emailSubject: v.optional(v.string()),
        emailContent: v.optional(v.string()),
        sendError: v.optional(v.string()),
        lastSendAttempt: v.optional(v.number()),

        // Champs spécifiques téléphone
        phoneCallNotes: v.optional(v.string()),
        phoneCallOutcome: v.optional(
          v.union(
            v.literal("completed"), // Contact établi avec succès
            v.literal("no_answer"), // Pas de réponse
            v.literal("voicemail"), // Messagerie
            v.literal("will_pay"), // Client promet de payer
            v.literal("dispute") // Litige/contestation
          )
        ),
      })
    ),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_user", ["userId"])
    .index("by_organization", ["organizationId"])
    .index("by_completionStatus", ["completionStatus"])
    .index("by_organization_and_status", ["organizationId", "completionStatus"])
    .index("by_organization_and_type", ["organizationId", "reminderType"]),

  // ✅ V2 Phase 2.8 : Table des événements pour l'historique de l'agenda
  events: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"), // Créateur de l'événement
    invoiceId: v.optional(v.id("invoices")), // Lié à une facture
    reminderId: v.optional(v.id("reminders")), // Lié à une relance (pour les events d'envoi)

    eventType: v.union(
      v.literal("invoice_imported"), // Facture importée (sendStatus: pending)
      v.literal("invoice_marked_sent"), // Facture marquée envoyée (sendStatus: sent)
      v.literal("invoice_sent"), // Facture envoyée par email (auto)
      v.literal("payment_registered"), // Paiement enregistré (paymentStatus: partial)
      v.literal("invoice_marked_paid"), // Facture marquée payée (paymentStatus: paid)
      v.literal("reminder_sent") // Email de relance envoyé (auto ou manuel)
    ),

    eventDate: v.number(), // timestamp

    // Métadonnées spécifiques selon le type
    metadata: v.optional(
      v.object({
        amount: v.optional(v.number()), // Pour payment_registered
        reminderNumber: v.optional(v.number()), // Pour reminder_sent (1, 2, 3, 4...)
        reminderType: v.optional(v.string()), // Pour reminder_sent (email ou phone)
        isAutomatic: v.optional(v.boolean()), // Pour reminder_sent (auto vs manuel)
        previousSendStatus: v.optional(v.string()), // Pour invoice_marked_sent
        previousPaymentStatus: v.optional(v.string()), // Pour invoice_marked_paid, payment_registered
      })
    ),

    description: v.optional(v.string()), // Description lisible de l'événement
  })
    .index("by_organization", ["organizationId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_organization_and_date", ["organizationId", "eventDate"])
    .index("by_user", ["userId"]),

  // ✅ V2 Phase 2.7 : Table des paiements
  payments: defineTable({
    organizationId: v.id("organizations"),
    invoiceId: v.id("invoices"),
    userId: v.id("users"), // Qui a enregistré le paiement

    type: v.union(v.literal("bank_transfer"), v.literal("check")),
    amount: v.number(),
    status: v.union(v.literal("received"), v.literal("pending")),

    // Dates
    recordedDate: v.string(), // Date d'enregistrement du paiement (YYYY-MM-DD)
    receivedDate: v.optional(v.string()), // Date réelle d'encaissement (pour status: received)
    expectedDepositDate: v.optional(v.string()), // Date souhaitée d'encaissement (pour checks pending)

    // Métadonnées
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_status", ["organizationId", "status"])
    .index("by_expected_deposit", [
      "organizationId",
      "status",
      "expectedDepositDate",
    ]),
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
