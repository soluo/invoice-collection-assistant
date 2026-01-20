import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

/**
 * Story 7.4: Route publique pour servir l'image de signature
 * URL: /signature-image/{storageId}
 * L'ID dans le path permet d'éviter les problèmes de cache lors des mises à jour
 */
http.route({
  pathPrefix: "/signature-image/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // Extract storageId from path after prefix
    const url = new URL(request.url);
    const storageId = url.pathname.split("/signature-image/")[1];

    if (!storageId) {
      return new Response("Storage ID required", { status: 400 });
    }

    try {
      // Fetch image directly from storage
      const imageBlob = await ctx.storage.get(storageId as Id<"_storage">);
      if (!imageBlob) {
        return new Response("Not found", { status: 404 });
      }

      // Determine content type from blob type or default to PNG
      const contentType = imageBlob.type || "image/png";

      return new Response(imageBlob, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }),
});

/**
 * Route callback OAuth Microsoft
 * Appelée par Microsoft après l'autorisation de l'utilisateur
 */
http.route({
  path: "/oauth/microsoft/callback",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state"); // state contient userId
    const error = url.searchParams.get("error");

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

    // Gestion des erreurs OAuth
    if (error) {
      const errorDescription = url.searchParams.get("error_description");
      console.error("OAuth error:", error, errorDescription);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/settings?tab=organization&oauth=error&message=${encodeURIComponent(errorDescription || error)}`,
        },
      });
    }

    // Vérifier que le code et le state sont présents
    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/settings?tab=organization&oauth=error&message=Missing+code+or+state`,
        },
      });
    }

    try {
      // Échanger le code contre des tokens
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
      const tenantId = process.env.MICROSOFT_TENANT_ID || "common";
      const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new Error("Configuration OAuth incomplète");
      }

      const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();

      // Récupérer les informations du compte Microsoft via Graph API
      const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });

      if (!graphResponse.ok) {
        const errorText = await graphResponse.text();
        throw new Error(`Graph API failed: ${errorText}`);
      }

      const userData = await graphResponse.json();

      // Calculer l'expiration du token (expires_in est en secondes)
      const expiresAt = Date.now() + tokenData.expires_in * 1000;

      // Mettre à jour l'organisation avec les tokens OAuth
      // state contient l'userId en string, on le cast vers Id<"users">
      await ctx.runMutation(internal.oauth.saveOAuthTokens, {
        userId: state as any, // Conversion de string vers Id<"users">
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt,
        email: userData.mail || userData.userPrincipalName,
        name: userData.displayName,
      });

      // Rediriger vers la page des paramètres avec succès
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/settings?tab=organization&oauth=success`,
        },
      });
    } catch (error: any) {
      console.error("OAuth callback error:", error);
      return new Response(null, {
        status: 302,
        headers: {
          Location: `${frontendUrl}/settings?tab=organization&oauth=error&message=${encodeURIComponent(error.message)}`,
        },
      });
    }
  }),
});

export default http;
