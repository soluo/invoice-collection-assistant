import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { normalizeEmail } from "./utils";
import {
  getDefaultReminderSteps,
  DEFAULT_INVOICE_EMAIL_SUBJECT,
  DEFAULT_INVOICE_EMAIL_TEMPLATE,
  DEFAULT_INVITATION_EMAIL_SUBJECT,
  DEFAULT_INVITATION_EMAIL_TEMPLATE,
} from "./reminderDefaults";
import { validationError, ErrorCodes } from "./errors";

/**
 * Mutation pour créer une organisation et son premier utilisateur admin
 * Appelée après que l'utilisateur s'est inscrit avec email/password via Convex Auth
 */
export const createOrganizationWithAdmin = mutation({
  args: {
    organizationName: v.string(),
    userName: v.string(),
  },
  returns: v.object({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Vérifier que l'utilisateur n'appartient pas déjà à une organisation
    const existingUser = await ctx.db.get(userId);
    if (existingUser?.organizationId) {
      throw new Error("Vous appartenez déjà à une organisation");
    }

    // ✅ V2 Phase 2.9 : Créer l'organisation avec reminderSteps flexible
    const organizationId = await ctx.db.insert("organizations", {
      name: args.organizationName,
      createdAt: Date.now(),
      // Configuration des 3 étapes de relance par défaut (2 emails + 1 téléphone)
      reminderSteps: getDefaultReminderSteps(),
      signature: `L'équipe ${args.organizationName}`,
      autoSendEnabled: false,
      reminderSendTime: "10:00", // Heure d'envoi par défaut: 10h du matin
    });

    // Mettre à jour l'utilisateur avec le rôle admin et l'organisation
    await ctx.db.patch(userId, {
      name: args.userName,
      role: "admin",
      organizationId: organizationId,
      invitedBy: undefined,
    });

    return {
      organizationId,
      userId,
    };
  },
});

/**
 * Mutation pour inviter un utilisateur dans l'organisation
 * Génère un token unique et crée l'invitation
 */
export const inviteUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("technicien")),
  },
  returns: v.object({
    invitationId: v.id("invitations"),
    token: v.string(),
    organizationId: v.id("organizations"),
    inviterUserId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = normalizeEmail(args.email);
    if (!emailRegex.test(normalizedEmail)) {
      throw validationError(
        ErrorCodes.INVALID_EMAIL_FORMAT,
        "Format d'email invalide",
        "email"
      );
    }

    // Récupérer l'utilisateur et vérifier qu'il est admin
    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }
    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent inviter des utilisateurs");
    }

    // Vérifier qu'un utilisateur avec cet email n'existe pas déjà dans l'organisation
    let existingUserWithEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!existingUserWithEmail && normalizedEmail !== args.email) {
      existingUserWithEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    }

    if (
      existingUserWithEmail &&
      existingUserWithEmail.organizationId === user.organizationId
    ) {
      throw validationError(
        ErrorCodes.EMAIL_ALREADY_EXISTS,
        "Un utilisateur avec cet email existe déjà dans votre organisation",
        "email"
      );
    }

    // Vérifier qu'il n'y a pas déjà une invitation en attente pour cet email
    let existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), user.organizationId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (!existingInvitation && normalizedEmail !== args.email) {
      existingInvitation = await ctx.db
        .query("invitations")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .filter((q) =>
          q.and(
            q.eq(q.field("organizationId"), user.organizationId),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();
    }

    if (existingInvitation) {
      throw validationError(
        ErrorCodes.INVITATION_PENDING,
        "Une invitation est déjà en attente pour cet email",
        "email"
      );
    }

    // Générer un token unique
    const token = crypto.randomUUID();

    // Créer l'invitation (expire dans 7 jours)
    const invitationId = await ctx.db.insert("invitations", {
      email: normalizedEmail,
      organizationId: user.organizationId,
      role: args.role,
      token,
      status: "pending",
      invitedBy: userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      createdAt: Date.now(),
    });

    // Story 7.2: Return all info needed for frontend to call sendInvitationEmail action
    return {
      invitationId,
      token,
      organizationId: user.organizationId,
      inviterUserId: userId,
    };
  },
});

/**
 * Mutation pour accepter une invitation
 * Appelée après que l'utilisateur s'est inscrit avec email/password via Convex Auth
 */
export const acceptInvitation = mutation({
  args: {
    token: v.string(),
    userName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Récupérer l'invitation par token
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation introuvable");
    }

    if (invitation.status !== "pending") {
      throw new Error("Cette invitation a déjà été utilisée ou a expiré");
    }

    if (invitation.expiresAt < Date.now()) {
      // Marquer l'invitation comme expirée
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("Cette invitation a expiré");
    }

    // Vérifier que l'email de l'utilisateur correspond à l'invitation
    const user = await ctx.db.get(userId);
    if (!user?.email || normalizeEmail(user.email) !== normalizeEmail(invitation.email)) {
      throw new Error("L'email ne correspond pas à l'invitation");
    }

    // Mettre à jour l'utilisateur avec les infos de l'organisation
    await ctx.db.patch(userId, {
      name: args.userName,
      role: invitation.role,
      organizationId: invitation.organizationId,
      invitedBy: invitation.invitedBy,
    });

    // Marquer l'invitation comme acceptée
    await ctx.db.patch(invitation._id, { status: "accepted" });

    return {
      userId,
      organizationId: invitation.organizationId,
    };
  },
});

/**
 * Query pour lister les invitations en attente ou expirées d'une organisation
 */
export const listInvitations = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      role: v.union(v.literal("admin"), v.literal("technicien")),
      createdAt: v.number(),
      expiresAt: v.number(),
      invitedByName: v.optional(v.string()),
      token: v.string(),
      status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return [];
    }

    if (user.role !== "admin") {
      return [];
    }

    const organizationId = user.organizationId;

    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "expired")
        )
      )
      .order("desc")
      .collect();

    const invitationsWithDetails = await Promise.all(
      invitations.map(async (invitation) => {
        const inviter = await ctx.db.get(invitation.invitedBy);
        return {
          _id: invitation._id,
          email: invitation.email,
          role: invitation.role,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          token: invitation.token,
          status: invitation.status,
          invitedByName: inviter?.name,
        };
      })
    );

    return invitationsWithDetails;
  },
});

/**
 * Query pour lister les utilisateurs d'une organisation
 */
export const listUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      role: v.optional(v.union(v.literal("admin"), v.literal("technicien"))),
      invitedBy: v.optional(v.id("users")),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return [];
    }

    // Seuls les admins peuvent voir tous les utilisateurs
    if (user.role !== "admin") {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_organizationId", (q) => q.eq("organizationId", user.organizationId))
      .collect();

    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      invitedBy: u.invitedBy,
    }));
  },
});

/**
 * Query pour récupérer les informations de l'organisation courante
 */
export const getCurrentOrganization = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("organizations"),
      name: v.string(),
      reminderSteps: v.array(
        v.object({
          id: v.string(),
          delay: v.number(),
          type: v.union(v.literal("email"), v.literal("phone")),
          name: v.string(),
          emailSubject: v.optional(v.string()),
          emailTemplate: v.optional(v.string()),
        })
      ),
      signature: v.string(),
      autoSendEnabled: v.optional(v.boolean()),
      reminderSendTime: v.optional(v.string()),
      emailProvider: v.optional(
        v.union(
          v.literal("microsoft"),
          v.literal("google"),
          v.literal("infomaniak")
        )
      ),
      emailConnectedAt: v.optional(v.number()),
      emailTokenExpiresAt: v.optional(v.number()),
      emailAccountInfo: v.optional(
        v.object({
          email: v.string(),
          name: v.string(),
        })
      ),
      senderName: v.optional(v.string()),
      // Story 7.1: Invoice email template
      invoiceEmailSubject: v.optional(v.string()),
      invoiceEmailTemplate: v.optional(v.string()),
      // Story 7.2: Invitation email template
      invitationEmailSubject: v.optional(v.string()),
      invitationEmailTemplate: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return null;
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      return null;
    }

    // ✅ V2 Phase 2.9 : Retourner la nouvelle structure reminderSteps
    // Si pas de reminderSteps (ancienne data), utiliser les valeurs par défaut
    return {
      _id: organization._id,
      name: organization.name,
      reminderSteps: organization.reminderSteps || [],
      signature: organization.signature,
      autoSendEnabled: organization.autoSendEnabled,
      reminderSendTime: organization.reminderSendTime,
      emailProvider: organization.emailProvider,
      emailConnectedAt: organization.emailConnectedAt,
      emailTokenExpiresAt: organization.emailTokenExpiresAt,
      emailAccountInfo: organization.emailAccountInfo,
      senderName: organization.senderName,
      // Story 7.1: Invoice email template (with defaults)
      invoiceEmailSubject: organization.invoiceEmailSubject,
      invoiceEmailTemplate: organization.invoiceEmailTemplate,
      // Story 7.2: Invitation email template
      invitationEmailSubject: organization.invitationEmailSubject,
      invitationEmailTemplate: organization.invitationEmailTemplate,
    };
  },
});

/**
 * Query pour récupérer uniquement les paramètres de relance
 */
export const getReminderSettings = query({
  args: {},
  returns: v.union(
    v.object({
      autoSendEnabled: v.boolean(),
      reminderSteps: v.array(
        v.object({
          id: v.string(),
          delay: v.number(),
          type: v.union(v.literal("email"), v.literal("phone")),
          name: v.string(),
          emailSubject: v.optional(v.string()),
          emailTemplate: v.optional(v.string()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return null;
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      return null;
    }

    return {
      autoSendEnabled: organization.autoSendEnabled ?? false,
      reminderSteps: organization.reminderSteps || [],
    };
  },
});

/**
 * Mutation pour mettre à jour le nom de l'organisation
 */
export const updateOrganizationName = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier le nom de l'organisation");
    }

    await ctx.db.patch(user.organizationId, { name: args.name });

    return null;
  },
});

/**
 * Mutation pour mettre à jour le toggle d'envoi automatique
 */
export const updateAutoSendEnabled = mutation({
  args: {
    enabled: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier ce paramètre");
    }

    await ctx.db.patch(user.organizationId, { autoSendEnabled: args.enabled });

    return null;
  },
});

/**
 * Mutation pour remplacer complètement le tableau des étapes de relance
 */
export const updateReminderSteps = mutation({
  args: {
    steps: v.array(
      v.object({
        id: v.string(),
        delay: v.number(),
        type: v.union(v.literal("email"), v.literal("phone")),
        name: v.string(),
        emailSubject: v.optional(v.string()),
        emailTemplate: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier les étapes de relance");
    }

    // Validation: Vérifier que les délais sont positifs
    for (const step of args.steps) {
      if (step.delay <= 0) {
        throw new Error("Les délais doivent être supérieurs à 0");
      }
    }

    // Validation: Vérifier que les délais sont uniques
    const delays = args.steps.map((s) => s.delay);
    const uniqueDelays = new Set(delays);
    if (delays.length !== uniqueDelays.size) {
      throw new Error("Chaque étape doit avoir un délai unique");
    }

    // Validation: Vérifier que les étapes email ont un sujet et un template
    for (const step of args.steps) {
      if (step.type === "email") {
        if (!step.emailSubject || !step.emailTemplate) {
          throw new Error("Les étapes de type email doivent avoir un sujet et un contenu");
        }
      }
    }

    // Tri automatique par délai croissant
    const sortedSteps = [...args.steps].sort((a, b) => a.delay - b.delay);

    await ctx.db.patch(user.organizationId, { reminderSteps: sortedSteps });

    return null;
  },
});

/**
 * Mutation pour ajouter une nouvelle étape de relance
 */
export const addReminderStep = mutation({
  args: {
    delay: v.number(),
    type: v.union(v.literal("email"), v.literal("phone")),
    name: v.string(),
    emailSubject: v.optional(v.string()),
    emailTemplate: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      delay: v.number(),
      type: v.union(v.literal("email"), v.literal("phone")),
      name: v.string(),
      emailSubject: v.optional(v.string()),
      emailTemplate: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent ajouter des étapes de relance");
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      throw new Error("Organisation introuvable");
    }

    // Validation: Délai positif
    if (args.delay <= 0) {
      throw new Error("Le délai doit être supérieur à 0");
    }

    // Validation: Délai unique
    const currentSteps = organization.reminderSteps || [];
    const existingDelays = currentSteps.map((s) => s.delay);
    if (existingDelays.includes(args.delay)) {
      throw new Error("Une étape existe déjà pour ce délai");
    }

    // Validation: Email doit avoir sujet et template
    if (args.type === "email") {
      if (!args.emailSubject || !args.emailTemplate) {
        throw new Error("Les étapes de type email doivent avoir un sujet et un contenu");
      }
    }

    // Créer la nouvelle étape avec un UUID
    const newStep = {
      id: crypto.randomUUID(),
      delay: args.delay,
      type: args.type,
      name: args.name,
      emailSubject: args.emailSubject,
      emailTemplate: args.emailTemplate,
    };

    // Ajouter et trier
    const updatedSteps = [...currentSteps, newStep].sort(
      (a, b) => a.delay - b.delay
    );

    await ctx.db.patch(user.organizationId, { reminderSteps: updatedSteps });

    return updatedSteps;
  },
});

/**
 * Mutation pour mettre à jour une étape de relance existante
 */
export const updateReminderStep = mutation({
  args: {
    stepId: v.string(),
    delay: v.optional(v.number()),
    type: v.optional(v.union(v.literal("email"), v.literal("phone"))),
    name: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailTemplate: v.optional(v.string()),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      delay: v.number(),
      type: v.union(v.literal("email"), v.literal("phone")),
      name: v.string(),
      emailSubject: v.optional(v.string()),
      emailTemplate: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier les étapes de relance");
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      throw new Error("Organisation introuvable");
    }

    // Trouver l'étape à modifier
    const currentSteps = organization.reminderSteps || [];
    const stepIndex = currentSteps.findIndex((s) => s.id === args.stepId);
    if (stepIndex === -1) {
      throw new Error("Étape introuvable");
    }

    const existingStep = currentSteps[stepIndex];

    // Créer l'étape mise à jour
    const updatedStep = {
      id: existingStep.id,
      delay: args.delay ?? existingStep.delay,
      type: args.type ?? existingStep.type,
      name: args.name ?? existingStep.name,
      emailSubject: args.emailSubject ?? existingStep.emailSubject,
      emailTemplate: args.emailTemplate ?? existingStep.emailTemplate,
    };

    // Validation: Délai positif
    if (updatedStep.delay <= 0) {
      throw new Error("Le délai doit être supérieur à 0");
    }

    // Validation: Délai unique (sauf si c'est le même délai)
    const otherSteps = currentSteps.filter((s) => s.id !== args.stepId);
    const existingDelays = otherSteps.map((s) => s.delay);
    if (existingDelays.includes(updatedStep.delay)) {
      throw new Error("Une autre étape existe déjà pour ce délai");
    }

    // Validation: Email doit avoir sujet et template
    if (updatedStep.type === "email") {
      if (!updatedStep.emailSubject || !updatedStep.emailTemplate) {
        throw new Error("Les étapes de type email doivent avoir un sujet et un contenu");
      }
    }

    // Remplacer l'étape et trier
    const updatedSteps = [
      ...otherSteps,
      updatedStep,
    ].sort((a, b) => a.delay - b.delay);

    await ctx.db.patch(user.organizationId, { reminderSteps: updatedSteps });

    return updatedSteps;
  },
});

/**
 * Mutation pour supprimer une étape de relance
 */
export const deleteReminderStep = mutation({
  args: {
    stepId: v.string(),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      delay: v.number(),
      type: v.union(v.literal("email"), v.literal("phone")),
      name: v.string(),
      emailSubject: v.optional(v.string()),
      emailTemplate: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent supprimer des étapes de relance");
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      throw new Error("Organisation introuvable");
    }

    // Vérifier que l'étape existe
    const currentSteps = organization.reminderSteps || [];
    const stepExists = currentSteps.some((s) => s.id === args.stepId);
    if (!stepExists) {
      throw new Error("Étape introuvable");
    }

    // Filtrer l'étape à supprimer
    const updatedSteps = currentSteps.filter((s) => s.id !== args.stepId);

    await ctx.db.patch(user.organizationId, { reminderSteps: updatedSteps });

    return updatedSteps;
  },
});

/**
 * Mutation pour mettre à jour le nom d'affichage de l'expéditeur
 */
export const updateSenderName = mutation({
  args: {
    senderName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier ce paramètre");
    }

    await ctx.db.patch(user.organizationId, { senderName: args.senderName });

    return null;
  },
});

/**
 * Mutation pour mettre à jour l'heure d'envoi quotidienne des relances
 */
export const updateReminderSendTime = mutation({
  args: {
    sendTime: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier ce paramètre");
    }

    // Validation du format HH:MM
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(args.sendTime)) {
      throw new Error("Format d'heure invalide. Utilisez le format HH:MM (ex: 10:00)");
    }

    // Validation de la plage horaire (06:00 - 21:59)
    const [hours] = args.sendTime.split(":").map(Number);
    if (hours < 6 || hours >= 22) {
      throw new Error("L'heure d'envoi doit être entre 06:00 et 21:59");
    }

    await ctx.db.patch(user.organizationId, { reminderSendTime: args.sendTime });

    return null;
  },
});

/**
 * Query publique pour récupérer les détails d'une invitation par token
 */
export const getInvitationByToken = query({
  args: {
    token: v.string(),
  },
  returns: v.union(
    v.object({
      email: v.string(),
      organizationName: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired")
      ),
      expiresAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    const organization = await ctx.db.get(invitation.organizationId);
    if (!organization) {
      // Ne devrait pas arriver, mais bonne pratique
      return null;
    }

    return {
      email: invitation.email,
      organizationName: organization.name,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
    };
  },
});

/**
 * Mutation pour supprimer une invitation
 */
export const deleteInvitation = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") {
      throw new Error("Seuls les admins peuvent supprimer des invitations");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation introuvable");
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new Error("Permission refusée");
    }

    await ctx.db.delete(args.invitationId);
  },
});

/**
 * Mutation pour regénérer le token d'une invitation
 */
export const regenerateInvitationToken = mutation({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.object({
    token: v.string(),
    invitationId: v.id("invitations"),
    organizationId: v.id("organizations"),
    inviterUserId: v.id("users"),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") {
      throw new Error("Seuls les admins peuvent regénérer des invitations");
    }
    if (!user.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation introuvable");
    }

    if (invitation.organizationId !== user.organizationId) {
      throw new Error("Permission refusée");
    }

    const newToken = crypto.randomUUID();
    const newExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 jours

    await ctx.db.patch(args.invitationId, {
      token: newToken,
      expiresAt: newExpiresAt,
      status: "pending", // Réinitialiser le statut au cas où il était expiré
    });

    // Story 7.2: Return all info needed for frontend to call sendInvitationEmail action
    return {
      token: newToken,
      invitationId: args.invitationId,
      organizationId: user.organizationId,
      inviterUserId: userId,
    };
  },
});

/**
 * Story 7.1: Mutation pour mettre à jour le template d'email d'envoi de facture
 * Admin-only
 */
export const updateInvoiceEmailTemplate = mutation({
  args: {
    subject: v.string(),
    template: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier les modèles d'email");
    }

    // Validation: subject et template ne doivent pas être vides
    if (!args.subject.trim()) {
      throw new Error("L'objet de l'email ne peut pas être vide");
    }
    if (!args.template.trim()) {
      throw new Error("Le contenu de l'email ne peut pas être vide");
    }

    await ctx.db.patch(user.organizationId, {
      invoiceEmailSubject: args.subject.trim(),
      invoiceEmailTemplate: args.template.trim(),
    });

    return null;
  },
});

/**
 * Story 7.1: Query pour récupérer le template d'email d'envoi de facture
 * Retourne les valeurs par défaut si non configuré
 */
export const getInvoiceEmailTemplate = query({
  args: {},
  returns: v.object({
    subject: v.string(),
    template: v.string(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Retourner les valeurs par défaut si non authentifié
      return {
        subject: DEFAULT_INVOICE_EMAIL_SUBJECT,
        template: DEFAULT_INVOICE_EMAIL_TEMPLATE,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return {
        subject: DEFAULT_INVOICE_EMAIL_SUBJECT,
        template: DEFAULT_INVOICE_EMAIL_TEMPLATE,
      };
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      return {
        subject: DEFAULT_INVOICE_EMAIL_SUBJECT,
        template: DEFAULT_INVOICE_EMAIL_TEMPLATE,
      };
    }

    return {
      subject: organization.invoiceEmailSubject || DEFAULT_INVOICE_EMAIL_SUBJECT,
      template: organization.invoiceEmailTemplate || DEFAULT_INVOICE_EMAIL_TEMPLATE,
    };
  },
});

/**
 * Story 7.2: Mutation pour mettre à jour le template d'email d'invitation
 * Admin-only access
 */
export const updateInvitationEmailTemplate = mutation({
  args: {
    subject: v.string(),
    template: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }

    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier les modèles d'email");
    }

    // Validation: subject et template ne doivent pas être vides
    if (!args.subject.trim()) {
      throw new Error("L'objet de l'email ne peut pas être vide");
    }
    if (!args.template.trim()) {
      throw new Error("Le contenu de l'email ne peut pas être vide");
    }

    await ctx.db.patch(user.organizationId, {
      invitationEmailSubject: args.subject.trim(),
      invitationEmailTemplate: args.template.trim(),
    });

    return null;
  },
});

/**
 * Story 7.2: Query pour récupérer le template d'email d'invitation
 * Retourne les valeurs par défaut si non configuré
 */
export const getInvitationEmailTemplate = query({
  args: {},
  returns: v.object({
    subject: v.string(),
    template: v.string(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Retourner les valeurs par défaut si non authentifié
      return {
        subject: DEFAULT_INVITATION_EMAIL_SUBJECT,
        template: DEFAULT_INVITATION_EMAIL_TEMPLATE,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      return {
        subject: DEFAULT_INVITATION_EMAIL_SUBJECT,
        template: DEFAULT_INVITATION_EMAIL_TEMPLATE,
      };
    }

    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      return {
        subject: DEFAULT_INVITATION_EMAIL_SUBJECT,
        template: DEFAULT_INVITATION_EMAIL_TEMPLATE,
      };
    }

    return {
      subject: organization.invitationEmailSubject || DEFAULT_INVITATION_EMAIL_SUBJECT,
      template: organization.invitationEmailTemplate || DEFAULT_INVITATION_EMAIL_TEMPLATE,
    };
  },
});

/**
 * Mutation pour changer le rôle d'un utilisateur
 */
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(v.literal("admin"), v.literal("technicien")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Non authentifié");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }
    if (currentUser.role !== "admin") {
      throw new Error("Seuls les admins peuvent changer les rôles");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Utilisateur introuvable");
    }

    if (targetUser.organizationId !== currentUser.organizationId) {
      throw new Error("Cet utilisateur n'appartient pas à votre organisation");
    }

    // Empêcher de retirer le dernier admin
    if (targetUser.role === "admin" && args.newRole === "technicien") {
      const allAdmins = await ctx.db
        .query("users")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", currentUser.organizationId)
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (allAdmins.length <= 1) {
        throw new Error(
          "Impossible de retirer le dernier admin de l'organisation"
        );
      }
    }

    await ctx.db.patch(args.userId, { role: args.newRole });

    return null;
  },
});

/**
 * Mutation pour supprimer un utilisateur de l'organisation
 */
export const removeUser = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Non authentifié");
    }

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser?.organizationId) {
      throw new Error("Vous n'appartenez à aucune organisation");
    }
    if (currentUser.role !== "admin") {
      throw new Error("Seuls les admins peuvent supprimer des utilisateurs");
    }

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("Utilisateur introuvable");
    }

    if (targetUser.organizationId !== currentUser.organizationId) {
      throw new Error("Cet utilisateur n'appartient pas à votre organisation");
    }

    // Empêcher de supprimer le dernier admin
    if (targetUser.role === "admin") {
      const allAdmins = await ctx.db
        .query("users")
        .withIndex("by_organizationId", (q) =>
          q.eq("organizationId", currentUser.organizationId)
        )
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (allAdmins.length <= 1) {
        throw new Error(
          "Impossible de supprimer le dernier admin de l'organisation"
        );
      }
    }

    // Retirer l'utilisateur de l'organisation (soft delete)
    await ctx.db.patch(args.userId, {
      organizationId: undefined,
      role: undefined,
      invitedBy: undefined,
    });

    return null;
  },
});
