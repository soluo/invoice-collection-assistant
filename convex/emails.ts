import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { hasAdminRole } from "./permissions";
import { arrayBufferToBase64 } from "./lib/encoding";

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
    if (!hasAdminRole(user.role)) {
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

/**
 * Internal query to get invoice data for simulated test email
 */
export const getInvoiceForTestEmail = internalQuery({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.union(
    v.object({
      _id: v.id("invoices"),
      clientName: v.string(),
      contactEmail: v.optional(v.string()),
      invoiceNumber: v.string(),
      amountTTC: v.number(),
      dueDate: v.string(),
      invoiceDate: v.string(),
      // Story 7.3: Include PDF storage ID for attachments
      pdfStorageId: v.optional(v.id("_storage")),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) {
      return null;
    }
    return {
      _id: invoice._id,
      clientName: invoice.clientName,
      contactEmail: invoice.contactEmail,
      invoiceNumber: invoice.invoiceNumber,
      amountTTC: invoice.amountTTC,
      dueDate: invoice.dueDate,
      invoiceDate: invoice.invoiceDate,
      // Story 7.3: Include PDF storage ID for attachments
      pdfStorageId: invoice.pdfStorageId,
    };
  },
});

/**
 * Internal query to get organization with OAuth tokens and reminder steps
 */
export const getOrgWithTokensAndSteps = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.union(
    v.object({
      emailAccessToken: v.optional(v.string()),
      emailRefreshToken: v.optional(v.string()),
      emailTokenExpiresAt: v.optional(v.number()),
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
      // Story 7.3: Include PDF attachment setting
      attachPdfToReminders: v.optional(v.boolean()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.organizationId);
    if (!org) {
      return null;
    }
    return {
      emailAccessToken: org.emailAccessToken,
      emailRefreshToken: org.emailRefreshToken,
      emailTokenExpiresAt: org.emailTokenExpiresAt,
      reminderSteps: org.reminderSteps || [],
      // Story 7.3: Include PDF attachment setting (default true)
      attachPdfToReminders: org.attachPdfToReminders,
    };
  },
});

// Type definitions for internal queries (to avoid circular references)
type InvoiceForTestEmail = {
  _id: string;
  clientName: string;
  contactEmail?: string;
  invoiceNumber: string;
  amountTTC: number;
  dueDate: string;
  invoiceDate: string;
  // Story 7.3: Include PDF storage ID for attachments
  pdfStorageId?: string;
} | null;

type ReminderStep = {
  id: string;
  delay: number;
  type: "email" | "phone";
  name: string;
  emailSubject?: string;
  emailTemplate?: string;
};

type OrgWithTokensAndSteps = {
  emailAccessToken?: string;
  emailRefreshToken?: string;
  emailTokenExpiresAt?: number;
  reminderSteps: ReminderStep[];
  // Story 7.3: Include PDF attachment setting
  attachPdfToReminders?: boolean;
} | null;

/**
 * Send a simulated reminder email to a test address (not the real client)
 * Admin only - for testing simulation mode
 */
export const sendSimulatedTestEmail = action({
  args: {
    recipientEmail: v.string(),
    invoiceId: v.id("invoices"),
    reminderStepIndex: v.number(),
  },
  returns: v.object({
    success: v.boolean(),
    emailSubject: v.string(),
  }),
  handler: async (ctx, { recipientEmail, invoiceId, reminderStepIndex }): Promise<{ success: boolean; emailSubject: string }> => {
    // 1. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      throw new Error("Format d'adresse email invalide");
    }

    // 2. Get authenticated user
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

    // 3. Verify user is admin
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Accès refusé: réservé aux administrateurs");
    }

    if (!user.organizationId) {
      throw new Error("Utilisateur sans organisation");
    }

    // 4. Get invoice data
    const invoice: InvoiceForTestEmail = await ctx.runQuery(internal.emails.getInvoiceForTestEmail, {
      invoiceId,
    });

    if (!invoice) {
      throw new Error("Facture introuvable");
    }

    // 5. Get organization with OAuth tokens and reminder steps
    const org: OrgWithTokensAndSteps = await ctx.runQuery(internal.emails.getOrgWithTokensAndSteps, {
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

    // 6. Get reminder step template
    const reminderSteps: ReminderStep[] = org.reminderSteps || [];
    if (reminderStepIndex < 0 || reminderStepIndex >= reminderSteps.length) {
      throw new Error("Étape de relance invalide");
    }
    const step: ReminderStep = reminderSteps[reminderStepIndex];

    // 7. Generate email content from template
    // Use the same placeholder format as reminderDefaults.ts and reminders.ts

    // Calculate days past due
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    const daysPastDue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    // Format amount in French locale (123,45€)
    const formattedAmount = invoice.amountTTC.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const emailSubject: string = (step.emailSubject || "Relance facture {numero_facture}")
      .replace(/{numero_facture}/g, invoice.invoiceNumber)
      .replace(/{nom_client}/g, invoice.clientName)
      .replace(/{montant}/g, formattedAmount)
      .replace(/{date_echeance}/g, invoice.dueDate)
      .replace(/{date_facture}/g, invoice.invoiceDate)
      .replace(/{jours_retard}/g, daysPastDue.toString());

    const emailContent: string = (step.emailTemplate || "Bonjour {nom_client},\n\nCeci est un rappel pour la facture {numero_facture}.")
      .replace(/{numero_facture}/g, invoice.invoiceNumber)
      .replace(/{nom_client}/g, invoice.clientName)
      .replace(/{montant}/g, formattedAmount)
      .replace(/{date_echeance}/g, invoice.dueDate)
      .replace(/{date_facture}/g, invoice.invoiceDate)
      .replace(/{jours_retard}/g, daysPastDue.toString());

    // 8. Refresh token if needed
    const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
    let accessToken: string = org.emailAccessToken;

    const needsRefresh =
      !org.emailTokenExpiresAt ||
      org.emailTokenExpiresAt - Date.now() <= TOKEN_REFRESH_THRESHOLD_MS;

    if (needsRefresh) {
      const result = await ctx.runAction(internal.oauth.performTokenRefresh, {
        organizationId: user.organizationId,
        refreshToken: org.emailRefreshToken,
      });
      accessToken = result.accessToken;
    }

    // ===== Story 7.3: Prepare PDF attachment if enabled (AC5: Simulated emails also respect setting) =====
    const attachments: Array<{
      "@odata.type": string;
      name: string;
      contentType: string;
      contentBytes: string;
    }> = [];

    // Check if PDF attachment is enabled (default true if undefined)
    const attachPdfEnabled = org.attachPdfToReminders !== false;

    if (attachPdfEnabled && invoice.pdfStorageId) {
      try {
        // Get PDF URL from storage
        const pdfUrl = await ctx.storage.getUrl(invoice.pdfStorageId);
        if (pdfUrl) {
          // Fetch PDF content
          const pdfResponse = await fetch(pdfUrl);
          if (pdfResponse.ok) {
            const pdfBuffer = await pdfResponse.arrayBuffer();
            const base64Content = arrayBufferToBase64(pdfBuffer);

            attachments.push({
              "@odata.type": "#microsoft.graph.fileAttachment",
              name: `facture-${invoice.invoiceNumber}.pdf`,
              contentType: "application/pdf",
              contentBytes: base64Content,
            });
          }
        }
      } catch (error) {
        // Continue without attachment if PDF fetch fails - graceful handling
        console.error("Failed to attach PDF to simulated test email:", error);
      }
    }

    // 9. Send via Microsoft Graph API
    const graphBody: {
      message: {
        subject: string;
        body: { contentType: string; content: string };
        toRecipients: Array<{ emailAddress: { address: string } }>;
        attachments?: typeof attachments;
      };
      saveToSentItems: boolean;
    } = {
      message: {
        subject: `[TEST] ${emailSubject}`,
        body: {
          contentType: "Text",
          content: `--- EMAIL DE TEST (SIMULATION) ---\n\nDestinataire réel: ${invoice.contactEmail || "Non spécifié"}\n\n--- CONTENU DE L'EMAIL ---\n\n${emailContent}`,
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
    };

    // Only add attachments if there are any
    if (attachments.length > 0) {
      graphBody.message.attachments = attachments;
    }

    const graphResponse = await fetch(
      "https://graph.microsoft.com/v1.0/me/sendMail",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(graphBody),
      }
    );

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      throw new Error(`Échec de l'envoi: ${graphResponse.status} - ${errorText}`);
    }

    return { success: true, emailSubject };
  },
});
