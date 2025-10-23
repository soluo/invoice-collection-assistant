import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Query pour générer l'URL d'autorisation OAuth Microsoft
 * Utilise PKCE pour plus de sécurité
 * Retourne null si la configuration OAuth n'est pas complète
 */
export const getOAuthUrl = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null; // Utilisateur non authentifié
    }

    // Récupérer les variables d'environnement
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

    // Retourner null si la configuration n'est pas complète
    if (!clientId || !redirectUri) {
      return null;
    }

    // Construire l'URL d'autorisation Microsoft
    const scopes = [
      "https://graph.microsoft.com/Mail.Send",
      "https://graph.microsoft.com/User.Read",
      "offline_access",
    ];

    const authUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    );

    authUrl.searchParams.append("client_id", clientId);
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("redirect_uri", redirectUri);
    authUrl.searchParams.append("scope", scopes.join(" "));
    authUrl.searchParams.append("response_mode", "query");
    authUrl.searchParams.append("state", userId); // Utiliser userId comme state pour retrouver l'utilisateur
    authUrl.searchParams.append("prompt", "select_account");

    return authUrl.toString();
  },
});

/**
 * Mutation pour déconnecter le compte email OAuth
 */
export const disconnectEmailProvider = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    // Récupérer l'utilisateur et son organisation
    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }

    // Vérifier que l'utilisateur est admin
    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent gérer la connexion email");
    }

    // Supprimer les informations OAuth de l'organisation
    await ctx.db.patch(user.organizationId, {
      emailProvider: undefined,
      emailConnectedAt: undefined,
      emailAccessToken: undefined,
      emailRefreshToken: undefined,
      emailTokenExpiresAt: undefined,
      emailConnectedBy: undefined,
      emailAccountInfo: undefined,
    });
  },
});

/**
 * Query interne pour récupérer les informations utilisateur nécessaires au refresh
 */
export const getUserForOAuth = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("users"),
      role: v.optional(v.union(v.literal("admin"), v.literal("technicien"))),
      organizationId: v.optional(v.id("organizations")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      role: user.role,
      organizationId: user.organizationId,
    };
  },
});

/**
 * Helper queries et mutations internes
 */

/**
 * Action publique : rafraîchir l'access token si proche de l'expiration
 */
export const refreshTokenIfNeeded = action({
  args: {},
  returns: v.object({
    refreshed: v.boolean(),
    expiresAt: v.optional(v.number()),
  }),
  handler: async (ctx): Promise<{ refreshed: boolean; expiresAt?: number }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const userInfo = await ctx.runQuery(internal.oauth.getUserForOAuth, {
      userId,
    });

    if (!userInfo?.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }
    if (userInfo.role !== "admin") {
      throw new Error("Seuls les admins peuvent gérer la connexion email");
    }

    const organization = await ctx.runQuery(internal.oauth.getOrganization, {
      organizationId: userInfo.organizationId,
    });

    if (!organization?.emailRefreshToken) {
      throw new Error("Aucun compte email connecté");
    }

    const now = Date.now();
    const threshold = 10 * 60 * 1000; // 10 minutes
    const expiresAt = organization.emailTokenExpiresAt ?? undefined;
    const shouldRefresh =
      !organization.emailTokenExpiresAt ||
      organization.emailTokenExpiresAt - now <= threshold;

    if (!shouldRefresh) {
      return {
        refreshed: false,
        expiresAt,
      };
    }

    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    const tenantId = process.env.MICROSOFT_TENANT_ID || "common";

    if (!clientId || !clientSecret) {
      throw new Error("Configuration OAuth incomplète");
    }

    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const response: Response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: organization.emailRefreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Échec du refresh du token: ${error}`);
    }

    const data: any = await response.json();
    const newExpiresAt = Date.now() + data.expires_in * 1000;

    await ctx.runMutation(internal.oauth.updateAccessToken, {
      organizationId: userInfo.organizationId,
      accessToken: data.access_token,
      expiresAt: newExpiresAt,
    });

    return {
      refreshed: true,
      expiresAt: newExpiresAt,
    };
  },
});

// Query interne pour récupérer une organisation avec ses tokens
export const getOrganization = internalQuery({
  args: { organizationId: v.id("organizations") },
  returns: v.union(
    v.object({
      emailAccessToken: v.optional(v.string()),
      emailRefreshToken: v.optional(v.string()),
      emailTokenExpiresAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) return null;
    return {
      emailAccessToken: org.emailAccessToken,
      emailRefreshToken: org.emailRefreshToken,
      emailTokenExpiresAt: org.emailTokenExpiresAt,
    };
  },
});

// Mutation interne pour mettre à jour l'access token
export const updateAccessToken = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    accessToken: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, {
      emailAccessToken: args.accessToken,
      emailTokenExpiresAt: args.expiresAt,
    });
  },
});

// Mutation interne pour sauvegarder les tokens OAuth après callback
export const saveOAuthTokens = internalMutation({
  args: {
    userId: v.id("users"), // Id typé correctement
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresAt: v.number(),
    email: v.string(),
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Récupérer l'utilisateur
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    if (!user.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }

    // Vérifier que l'utilisateur est admin
    if (user.role !== "admin") {
      throw new Error("Seuls les admins peuvent connecter un compte email");
    }

    // Mettre à jour l'organisation avec les tokens OAuth
    await ctx.db.patch(user.organizationId, {
      emailProvider: "microsoft",
      emailConnectedAt: Date.now(),
      emailAccessToken: args.accessToken,
      emailRefreshToken: args.refreshToken,
      emailTokenExpiresAt: args.expiresAt,
      emailConnectedBy: args.userId,
      emailAccountInfo: {
        email: args.email,
        name: args.name,
      },
    });
  },
});
