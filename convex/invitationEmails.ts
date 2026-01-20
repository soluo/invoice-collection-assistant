import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  DEFAULT_INVITATION_EMAIL_SUBJECT,
  DEFAULT_INVITATION_EMAIL_TEMPLATE,
} from "./reminderDefaults";

/**
 * Story 7.2: Internal query to get invitation data for sending
 */
export const getInvitationForEmail = internalQuery({
  args: {
    invitationId: v.id("invitations"),
  },
  returns: v.union(
    v.object({
      _id: v.id("invitations"),
      email: v.string(),
      organizationId: v.id("organizations"),
      role: v.union(v.literal("admin"), v.literal("technicien"), v.literal("superadmin")),
      token: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("expired")
      ),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      return null;
    }
    return {
      _id: invitation._id,
      email: invitation.email,
      organizationId: invitation.organizationId,
      role: invitation.role,
      token: invitation.token,
      status: invitation.status,
    };
  },
});

/**
 * Story 7.2: Internal query to get organization with OAuth tokens and invitation template
 */
export const getOrgForInvitationEmail = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.union(
    v.object({
      name: v.string(),
      emailAccessToken: v.optional(v.string()),
      emailRefreshToken: v.optional(v.string()),
      emailTokenExpiresAt: v.optional(v.number()),
      invitationEmailSubject: v.optional(v.string()),
      invitationEmailTemplate: v.optional(v.string()),
      signature: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }
    return {
      name: org.name,
      emailAccessToken: org.emailAccessToken,
      emailRefreshToken: org.emailRefreshToken,
      emailTokenExpiresAt: org.emailTokenExpiresAt,
      invitationEmailSubject: org.invitationEmailSubject,
      invitationEmailTemplate: org.invitationEmailTemplate,
      signature: org.signature,
    };
  },
});

/**
 * Story 7.2: Internal query to get inviter user name
 */
export const getInviterName = internalQuery({
  args: {
    userId: v.id("users"),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.name || "L'équipe";
  },
});

// Type definitions
type InvitationForEmail = {
  _id: string;
  email: string;
  organizationId: string;
  role: "admin" | "technicien" | "superadmin";
  token: string;
  status: "pending" | "accepted" | "expired";
} | null;

type OrgForInvitationEmail = {
  name: string;
  emailAccessToken?: string;
  emailRefreshToken?: string;
  emailTokenExpiresAt?: number;
  invitationEmailSubject?: string;
  invitationEmailTemplate?: string;
  signature?: string;
} | null;

/**
 * Story 7.2: Send invitation email
 * AC: #1, #5, #6
 *
 * Returns:
 * - sent: boolean - whether the email was sent successfully
 * - error: string | undefined - error code if email was not sent
 *   - "no_oauth": No OAuth tokens configured
 *   - "token_refresh_failed": Failed to refresh expired token
 *   - "send_failed": Failed to send email via Graph API
 *   - "network_error": Network error during send
 */
export const sendInvitationEmail = action({
  args: {
    invitationId: v.id("invitations"),
    organizationId: v.id("organizations"),
    inviterUserId: v.id("users"),
  },
  returns: v.object({
    sent: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<{ sent: boolean; error?: string }> => {
    // 1. Get invitation data
    const invitation: InvitationForEmail = await ctx.runQuery(
      internal.invitationEmails.getInvitationForEmail,
      { invitationId: args.invitationId }
    );

    if (!invitation) {
      return { sent: false, error: "invitation_not_found" };
    }

    // 2. Get organization data
    const org: OrgForInvitationEmail = await ctx.runQuery(
      internal.invitationEmails.getOrgForInvitationEmail,
      { organizationId: args.organizationId }
    );

    if (!org) {
      return { sent: false, error: "organization_not_found" };
    }

    // 3. Check OAuth connection (AC5)
    if (!org.emailAccessToken || !org.emailRefreshToken) {
      // No OAuth configured - this is not an error, just return that email wasn't sent
      return { sent: false, error: "no_oauth" };
    }

    // 4. Get inviter name
    const inviterName = await ctx.runQuery(
      internal.invitationEmails.getInviterName,
      { userId: args.inviterUserId }
    );

    // 5. Refresh token if needed
    const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
    let accessToken = org.emailAccessToken;

    const needsRefresh =
      !org.emailTokenExpiresAt ||
      org.emailTokenExpiresAt - Date.now() <= TOKEN_REFRESH_THRESHOLD_MS;

    if (needsRefresh) {
      try {
        const result = await ctx.runAction(internal.oauth.performTokenRefresh, {
          organizationId: args.organizationId,
          refreshToken: org.emailRefreshToken,
        });
        accessToken = result.accessToken;
      } catch (error) {
        console.error("Failed to refresh token for invitation email:", error);
        return { sent: false, error: "token_refresh_failed" };
      }
    }

    // 6. Generate invitation URL
    // Use SITE_URL env var if available, otherwise use production URL
    const baseUrl = process.env.SITE_URL || "https://relancezen.soluo.fr";
    const invitationUrl = `${baseUrl}/accept-invitation/${invitation.token}`;

    // 7. Generate email content from template
    const subjectTemplate =
      org.invitationEmailSubject || DEFAULT_INVITATION_EMAIL_SUBJECT;
    const bodyTemplate =
      org.invitationEmailTemplate || DEFAULT_INVITATION_EMAIL_TEMPLATE;

    // Format role for display
    const roleDisplay = invitation.role === "admin" ? "Administrateur" : "Technicien";

    const emailSubject = subjectTemplate
      .replace(/{email_invite}/g, invitation.email)
      .replace(/{nom_organisation}/g, org.name)
      .replace(/{role}/g, roleDisplay)
      .replace(/{lien_invitation}/g, invitationUrl)
      .replace(/{inviteur}/g, inviterName);

    let emailContent = bodyTemplate
      .replace(/{email_invite}/g, invitation.email)
      .replace(/{nom_organisation}/g, org.name)
      .replace(/{role}/g, roleDisplay)
      .replace(/{lien_invitation}/g, invitationUrl)
      .replace(/{inviteur}/g, inviterName);

    // Story 7.4: Wrap email as HTML with signature
    const { wrapEmailAsHtml } = await import("./lib/emailHtml");
    const htmlContent = wrapEmailAsHtml(
      emailContent,
      org.signature || "",
      invitation.organizationId.toString(),
      process.env.CONVEX_SITE_URL
    );

    // 8. Send email via Microsoft Graph API
    try {
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
              subject: emailSubject,
              body: {
                contentType: "HTML",
                content: htmlContent,
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: invitation.email,
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
        console.error("Graph API error sending invitation email:", errorText);
        return { sent: false, error: "send_failed" };
      }
    } catch (error) {
      console.error("Failed to send invitation email:", error);
      return { sent: false, error: "network_error" };
    }

    return { sent: true };
  },
});
