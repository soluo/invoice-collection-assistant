import { action, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import {
  DEFAULT_INVOICE_EMAIL_SUBJECT,
  DEFAULT_INVOICE_EMAIL_TEMPLATE,
} from "./reminderDefaults";
import { arrayBufferToBase64 } from "./lib/encoding";

/**
 * Story 7.1: Internal query to get invoice data for sending
 */
export const getInvoiceForEmail = internalQuery({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.union(
    v.object({
      _id: v.id("invoices"),
      organizationId: v.id("organizations"),
      clientName: v.string(),
      contactName: v.optional(v.string()),
      contactEmail: v.optional(v.string()),
      invoiceNumber: v.string(),
      amountTTC: v.number(),
      dueDate: v.string(),
      invoiceDate: v.string(),
      pdfStorageId: v.optional(v.id("_storage")),
      sendStatus: v.union(v.literal("pending"), v.literal("sent")),
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
      organizationId: invoice.organizationId,
      clientName: invoice.clientName,
      contactName: invoice.contactName,
      contactEmail: invoice.contactEmail,
      invoiceNumber: invoice.invoiceNumber,
      amountTTC: invoice.amountTTC,
      dueDate: invoice.dueDate,
      invoiceDate: invoice.invoiceDate,
      pdfStorageId: invoice.pdfStorageId,
      sendStatus: invoice.sendStatus,
    };
  },
});

/**
 * Story 7.1: Internal query to get organization with OAuth tokens and invoice template
 */
export const getOrgForInvoiceEmail = internalQuery({
  args: {
    organizationId: v.id("organizations"),
  },
  returns: v.union(
    v.object({
      emailAccessToken: v.optional(v.string()),
      emailRefreshToken: v.optional(v.string()),
      emailTokenExpiresAt: v.optional(v.number()),
      invoiceEmailSubject: v.optional(v.string()),
      invoiceEmailTemplate: v.optional(v.string()),
      signature: v.string(),
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
      invoiceEmailSubject: org.invoiceEmailSubject,
      invoiceEmailTemplate: org.invoiceEmailTemplate,
      signature: org.signature,
    };
  },
});

// Type definitions
type InvoiceForEmail = {
  _id: string;
  organizationId: string;
  clientName: string;
  contactName?: string;
  contactEmail?: string;
  invoiceNumber: string;
  amountTTC: number;
  dueDate: string;
  invoiceDate: string;
  pdfStorageId?: string;
  sendStatus: "pending" | "sent";
} | null;

type OrgForInvoiceEmail = {
  emailAccessToken?: string;
  emailRefreshToken?: string;
  emailTokenExpiresAt?: number;
  invoiceEmailSubject?: string;
  invoiceEmailTemplate?: string;
  signature: string;
} | null;

/**
 * Story 7.1: Send initial invoice email with PDF attachment
 * AC: #4, #8, #9
 */
export const sendInvoiceEmail = action({
  args: {
    invoiceId: v.id("invoices"),
    skipPdf: v.optional(v.boolean()), // AC6: Send without PDF if user confirms
    customSubject: v.optional(v.string()), // User-edited subject
    customBody: v.optional(v.string()), // User-edited body
  },
  returns: v.object({
    success: v.boolean(),
    error: v.optional(v.string()),
  }),
  handler: async (ctx, { invoiceId, skipPdf, customSubject, customBody }): Promise<{ success: boolean; error?: string }> => {
    // 1. Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { success: false, error: "Non authentifié" };
    }

    const user = await ctx.runQuery(internal.oauth.getUserForOAuth, {
      userId,
    });

    if (!user) {
      return { success: false, error: "Utilisateur introuvable" };
    }

    if (!user.organizationId) {
      return { success: false, error: "Utilisateur sans organisation" };
    }

    // 2. Get invoice data
    const invoice: InvoiceForEmail = await ctx.runQuery(
      internal.invoiceEmails.getInvoiceForEmail,
      { invoiceId }
    );

    if (!invoice) {
      return { success: false, error: "Facture introuvable" };
    }

    // Verify invoice belongs to user's organization
    if (invoice.organizationId !== user.organizationId) {
      return { success: false, error: "Accès refusé à cette facture" };
    }

    // AC5: Check if contact email is present
    if (!invoice.contactEmail) {
      return {
        success: false,
        error: "Ajoutez un email de contact avant d'envoyer",
      };
    }

    // 3. Get organization with OAuth tokens and template
    const org: OrgForInvoiceEmail = await ctx.runQuery(
      internal.invoiceEmails.getOrgForInvoiceEmail,
      { organizationId: user.organizationId }
    );

    if (!org) {
      return { success: false, error: "Organisation introuvable" };
    }

    // AC8: Check OAuth connection
    if (!org.emailAccessToken || !org.emailRefreshToken) {
      return {
        success: false,
        error: "Connectez votre compte email dans les paramètres",
      };
    }

    // 4. Refresh token if needed
    const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;
    let accessToken = org.emailAccessToken;

    const needsRefresh =
      !org.emailTokenExpiresAt ||
      org.emailTokenExpiresAt - Date.now() <= TOKEN_REFRESH_THRESHOLD_MS;

    if (needsRefresh) {
      try {
        const result = await ctx.runAction(internal.oauth.performTokenRefresh, {
          organizationId: user.organizationId,
          refreshToken: org.emailRefreshToken,
        });
        accessToken = result.accessToken;
      } catch (error) {
        return {
          success: false,
          error: "Impossible de rafraîchir le token. Reconnectez votre compte email.",
        };
      }
    }

    // 5. Generate email content from template or use custom values
    let emailSubject: string;
    let emailContent: string;

    if (customSubject && customBody) {
      // Use user-edited values directly (already have variables replaced)
      emailSubject = customSubject;
      emailContent = customBody;
    } else {
      // Generate from templates
      const subjectTemplate =
        org.invoiceEmailSubject || DEFAULT_INVOICE_EMAIL_SUBJECT;
      const bodyTemplate =
        org.invoiceEmailTemplate || DEFAULT_INVOICE_EMAIL_TEMPLATE;

      // Format amount in French locale
      const formattedAmount = invoice.amountTTC.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      // Format dates in French locale (e.g., "12 janvier 2026")
      const formatDateFr = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      };

      emailSubject = subjectTemplate
        .replace(/{numero_facture}/g, invoice.invoiceNumber)
        .replace(/{nom_client}/g, invoice.clientName)
        .replace(/{montant}/g, formattedAmount)
        .replace(/{date_facture}/g, formatDateFr(invoice.invoiceDate))
        .replace(/{date_echeance}/g, formatDateFr(invoice.dueDate));

      emailContent = bodyTemplate
        .replace(/{numero_facture}/g, invoice.invoiceNumber)
        .replace(/{nom_client}/g, invoice.clientName)
        .replace(/{montant}/g, formattedAmount)
        .replace(/{date_facture}/g, formatDateFr(invoice.invoiceDate))
        .replace(/{date_echeance}/g, formatDateFr(invoice.dueDate));
    }

    // Story 7.4: Signature is now added when wrapping as HTML (not concatenated to text)

    // 6. Prepare attachments
    const attachments: Array<{
      "@odata.type": string;
      name: string;
      contentType: string;
      contentBytes: string;
    }> = [];

    // AC6: Handle PDF attachment
    if (invoice.pdfStorageId && !skipPdf) {
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
        console.error("Failed to attach PDF:", error);
        // Continue without attachment if PDF fetch fails
      }
    }

    // 7. Send email via Microsoft Graph API
    // Use contact name if available for better email display
    const recipientName = invoice.contactName || invoice.clientName;

    // Story 7.4: Wrap email content as HTML with signature
    const { wrapEmailAsHtml } = await import("./lib/emailHtml");
    const htmlContent = wrapEmailAsHtml(
      emailContent,
      org.signature,
      invoice.organizationId.toString(),
      process.env.CONVEX_SITE_URL
    );

    const graphBody: {
      message: {
        subject: string;
        body: { contentType: string; content: string };
        toRecipients: Array<{ emailAddress: { address: string; name?: string } }>;
        attachments?: typeof attachments;
      };
      saveToSentItems: boolean;
    } = {
      message: {
        subject: emailSubject,
        body: {
          contentType: "HTML",
          content: htmlContent,
        },
        toRecipients: [
          {
            emailAddress: {
              address: invoice.contactEmail,
              name: recipientName,
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

    try {
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
        console.error("Graph API error:", errorText);
        return {
          success: false,
          error: `Échec de l'envoi: ${graphResponse.status}`,
        };
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      return {
        success: false,
        error: "Erreur réseau lors de l'envoi de l'email",
      };
    }

    // 8. Update invoice status
    const today = new Date().toISOString().split("T")[0];
    await ctx.runMutation(internal.invoiceEmails.updateInvoiceAfterSend, {
      invoiceId,
      sentDate: today,
    });

    // 9. Create event
    await ctx.runMutation(internal.invoiceEmails.createInvoiceSentEvent, {
      organizationId: user.organizationId,
      userId: user._id,
      invoiceId,
      contactEmail: invoice.contactEmail,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to update invoice after sending
 */
import { internalMutation } from "./_generated/server";

export const updateInvoiceAfterSend = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    sentDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invoiceId, {
      sendStatus: "sent",
      sentDate: args.sentDate,
    });
    return null;
  },
});

/**
 * Internal mutation to create invoice_sent event
 */
export const createInvoiceSentEvent = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    invoiceId: v.id("invoices"),
    contactEmail: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("events", {
      organizationId: args.organizationId,
      userId: args.userId,
      invoiceId: args.invoiceId,
      eventType: "invoice_sent",
      eventDate: Date.now(),
      description: `Facture envoyée par email à ${args.contactEmail}`,
      metadata: { isAutomatic: false },
    });
    return null;
  },
});
