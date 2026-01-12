import { action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Send a test email to verify OAuth configuration is working
 * Admin only - uses Microsoft Graph API via connected OAuth account
 */
export const sendTestEmail = action({
  args: {
    recipientEmail: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
  }),
  handler: async (ctx, { recipientEmail }) => {
    // 0. Validate email format (server-side validation - frontend can be bypassed)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Format d'adresse email invalide");
    }

    // 1. Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Non authentifié");
    }

    const user = await ctx.runQuery(internal.oauth.getUserForOAuth, {
      userId,
    });

    if (!user) {
      throw new Error("Utilisateur introuvable");
    }

    // 2. Verify user is admin
    if (user.role !== "admin") {
      throw new Error("Accès refusé: réservé aux administrateurs");
    }

    if (!user.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }

    // 3. Get organization with OAuth tokens
    const org = await ctx.runQuery(internal.oauth.getOrganization, {
      organizationId: user.organizationId,
    });

    if (!org) {
      throw new Error("Organisation introuvable");
    }

    if (!org.emailAccessToken || !org.emailRefreshToken) {
      throw new Error(
        "Compte email non connecté. Connectez votre compte Microsoft dans les paramètres."
      );
    }

    // 4. Refresh token if needed (within 10 minutes of expiry - same threshold as oauth.ts)
    const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
    let accessToken = org.emailAccessToken;

    const needsRefresh =
      !org.emailTokenExpiresAt ||
      org.emailTokenExpiresAt - Date.now() <= TOKEN_REFRESH_THRESHOLD_MS;

    if (needsRefresh) {
      // Use shared internal action for token refresh (DRY + type validation)
      const result = await ctx.runAction(internal.oauth.performTokenRefresh, {
        organizationId: user.organizationId,
        refreshToken: org.emailRefreshToken,
      });
      accessToken = result.accessToken;
    }

    // 5. Send test email via Microsoft Graph
    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject: "Email de test - RelanceZen",
            body: {
              contentType: "Text",
              content:
                "Ceci est un email de test envoyé depuis RelanceZen.\n\nSi vous recevez ce message, votre configuration email fonctionne correctement.",
            },
            toRecipients: [
              {
                emailAddress: {
                  address: recipientEmail,
                },
              },
            ],
          },
          saveToSentItems: true,
        }),
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      throw new Error(`Échec de l'envoi: ${graphResponse.status} - ${errorText}`);
    }

    return { success: true };
  },
});
