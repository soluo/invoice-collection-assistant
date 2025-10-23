import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    // Créer l'organisation avec les paramètres de relances par défaut
    const organizationId = await ctx.db.insert("organizations", {
      name: args.organizationName,
      senderEmail: existingUser?.email || "",
      createdAt: Date.now(),
      // Paramètres de relances par défaut (en jours)
      firstReminderDelay: 7,
      secondReminderDelay: 15,
      thirdReminderDelay: 30,
      litigationDelay: 45,
      // Templates par défaut
      firstReminderTemplate: `Bonjour,\n\nNous constatons que notre facture n°{numero_facture} d'un montant de {montant}€ TTC émise le {date_facture} est arrivée à échéance le {date_echeance}.\n\nPourriez-vous nous confirmer la réception de cette facture et nous indiquer la date de règlement prévue ?\n\nCordialement,`,
      secondReminderTemplate: `Bonjour,\n\nMalgré notre première relance, nous constatons que notre facture n°{numero_facture} d'un montant de {montant}€ TTC reste impayée (échue depuis {jours_retard} jours).\n\nNous vous remercions de procéder au règlement dans les plus brefs délais.\n\nCordialement,`,
      thirdReminderTemplate: `Bonjour,\n\nNous vous informons que notre facture n°{numero_facture} d'un montant de {montant}€ TTC demeure impayée malgré nos précédentes relances ({jours_retard} jours de retard).\n\nSans règlement sous 7 jours, nous serons contraints d'engager une procédure de recouvrement.\n\nCordialement,`,
      signature: `L'équipe ${args.organizationName}`,
      // Paramètres d'envoi automatique (Phase 3)
      autoSendReminders: false, // Par défaut : nécessite approbation manuelle
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
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Valider le format de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Format d'email invalide");
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
    const existingUserWithEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (
      existingUserWithEmail &&
      existingUserWithEmail.organizationId === user.organizationId
    ) {
      throw new Error("Un utilisateur avec cet email existe déjà dans votre organisation");
    }

    // Vérifier qu'il n'y a pas déjà une invitation en attente pour cet email
    const existingInvitation = await ctx.db
      .query("invitations")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), user.organizationId),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();

    if (existingInvitation) {
      throw new Error("Une invitation est déjà en attente pour cet email");
    }

    // Générer un token unique
    const token = crypto.randomUUID();

    // Créer l'invitation (expire dans 7 jours)
    const invitationId = await ctx.db.insert("invitations", {
      email: args.email,
      organizationId: user.organizationId,
      role: args.role,
      token,
      status: "pending",
      invitedBy: userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 jours
      createdAt: Date.now(),
    });

    // TODO: Envoyer l'email d'invitation avec le token
    // Pour l'instant, on retourne juste le token

    return {
      invitationId,
      token,
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
    if (user?.email !== invitation.email) {
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
      senderEmail: v.string(),
      firstReminderDelay: v.number(),
      secondReminderDelay: v.number(),
      thirdReminderDelay: v.number(),
      litigationDelay: v.number(),
      firstReminderTemplate: v.string(),
      secondReminderTemplate: v.string(),
      thirdReminderTemplate: v.string(),
      signature: v.string(),
      autoSendReminders: v.optional(v.boolean()),
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
      _id: organization._id,
      name: organization.name,
      senderEmail: organization.senderEmail,
      firstReminderDelay: organization.firstReminderDelay,
      secondReminderDelay: organization.secondReminderDelay,
      thirdReminderDelay: organization.thirdReminderDelay,
      litigationDelay: organization.litigationDelay,
      firstReminderTemplate: organization.firstReminderTemplate,
      secondReminderTemplate: organization.secondReminderTemplate,
      thirdReminderTemplate: organization.thirdReminderTemplate,
      signature: organization.signature,
      autoSendReminders: organization.autoSendReminders,
      emailProvider: organization.emailProvider,
      emailConnectedAt: organization.emailConnectedAt,
      emailTokenExpiresAt: organization.emailTokenExpiresAt,
      emailAccountInfo: organization.emailAccountInfo,
    };
  },
});

/**
 * Mutation pour mettre à jour les paramètres de l'organisation
 */
export const updateOrganizationSettings = mutation({
  args: {
    name: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
    firstReminderDelay: v.optional(v.number()),
    secondReminderDelay: v.optional(v.number()),
    thirdReminderDelay: v.optional(v.number()),
    litigationDelay: v.optional(v.number()),
    firstReminderTemplate: v.optional(v.string()),
    secondReminderTemplate: v.optional(v.string()),
    thirdReminderTemplate: v.optional(v.string()),
    signature: v.optional(v.string()),
    autoSendReminders: v.optional(v.boolean()),
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

    // Seuls les admins peuvent modifier les paramètres
    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent modifier les paramètres de l'organisation");
    }

    // Mettre à jour uniquement les champs fournis
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.senderEmail !== undefined) updates.senderEmail = args.senderEmail;
    if (args.firstReminderDelay !== undefined)
      updates.firstReminderDelay = args.firstReminderDelay;
    if (args.secondReminderDelay !== undefined)
      updates.secondReminderDelay = args.secondReminderDelay;
    if (args.thirdReminderDelay !== undefined)
      updates.thirdReminderDelay = args.thirdReminderDelay;
    if (args.litigationDelay !== undefined) updates.litigationDelay = args.litigationDelay;
    if (args.firstReminderTemplate !== undefined)
      updates.firstReminderTemplate = args.firstReminderTemplate;
    if (args.secondReminderTemplate !== undefined)
      updates.secondReminderTemplate = args.secondReminderTemplate;
    if (args.thirdReminderTemplate !== undefined)
      updates.thirdReminderTemplate = args.thirdReminderTemplate;
    if (args.signature !== undefined) updates.signature = args.signature;
    if (args.autoSendReminders !== undefined)
      updates.autoSendReminders = args.autoSendReminders;

    await ctx.db.patch(user.organizationId, updates);

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
  returns: v.string(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }
    const user = await ctx.db.get(userId);
    if (user?.role !== "admin") {
      throw new Error("Seuls les admins peuvent regénérer des invitations");
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

    return newToken;
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
