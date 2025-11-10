import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Récupère tous les paiements d'une facture
 */
export const getPaymentsByInvoice = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      _creationTime: v.number(),
      organizationId: v.id("organizations"),
      invoiceId: v.id("invoices"),
      userId: v.id("users"),
      type: v.union(v.literal("bank_transfer"), v.literal("check")),
      amount: v.number(),
      status: v.union(v.literal("received"), v.literal("pending")),
      recordedDate: v.string(),
      receivedDate: v.optional(v.string()),
      expectedDepositDate: v.optional(v.string()),
      notes: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  handler: async (ctx, { invoiceId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    // Vérifier que la facture existe et appartient à l'organisation
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId || user.organizationId !== invoice.organizationId) {
      throw new Error("Unauthorized");
    }

    return await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
      .collect();
  },
});

/**
 * Récupère tous les chèques en attente d'encaissement pour une organisation
 */
export const getPendingChecks = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("payments"),
      invoiceId: v.id("invoices"),
      invoiceNumber: v.string(),
      clientName: v.string(),
      amount: v.number(),
      expectedDepositDate: v.optional(v.string()),
      recordedDate: v.string(),
      notes: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("User not in an organization");
    }

    const organizationId = user.organizationId;

    const pendingChecks = await ctx.db
      .query("payments")
      .withIndex("by_organization_and_status", (q) =>
        q.eq("organizationId", organizationId).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("type"), "check"))
      .collect();

    // Enrichir avec les données de facture
    const enrichedChecks = await Promise.all(
      pendingChecks.map(async (payment) => {
        const invoice = await ctx.db.get(payment.invoiceId);
        return {
          _id: payment._id,
          invoiceId: payment.invoiceId,
          invoiceNumber: invoice?.invoiceNumber ?? "N/A",
          clientName: invoice?.clientName ?? "N/A",
          amount: payment.amount,
          expectedDepositDate: payment.expectedDepositDate,
          recordedDate: payment.recordedDate,
          notes: payment.notes,
        };
      })
    );

    return enrichedChecks;
  },
});

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Enregistre un ou plusieurs paiements pour une facture
 */
export const recordPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    payments: v.array(
      v.object({
        type: v.union(v.literal("bank_transfer"), v.literal("check")),
        amount: v.number(),
        receivedDate: v.optional(v.string()), // Pour bank_transfer (date de réception)
        expectedDepositDate: v.optional(v.string()), // Pour check (date souhaitée)
        notes: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  handler: async (ctx, { invoiceId, payments }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("User not in an organization");
    }

    // Récupérer la facture
    const invoice = await ctx.db.get(invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    if (invoice.organizationId !== user.organizationId) {
      throw new Error("Unauthorized");
    }

    // Calculer le solde dû
    const currentPaidAmount = invoice.paidAmount ?? 0;
    const balanceDue = invoice.amountTTC - currentPaidAmount;

    // Calculer le total des nouveaux paiements
    const totalNewPayments = payments.reduce((sum, p) => sum + p.amount, 0);

    // Validation : le total ne doit pas dépasser le solde dû
    if (totalNewPayments > balanceDue + 0.01) {
      // +0.01 pour gérer les erreurs d'arrondi
      throw new Error(
        `Le total des paiements (${totalNewPayments.toFixed(2)} €) dépasse le solde dû (${balanceDue.toFixed(2)} €)`
      );
    }

    // Créer les enregistrements de paiement
    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    let totalReceived = 0;
    let totalPending = 0;

    for (const payment of payments) {
      const status: "received" | "pending" =
        payment.type === "bank_transfer" ? "received" : "pending";

      await ctx.db.insert("payments", {
        organizationId: user.organizationId,
        invoiceId,
        userId,
        type: payment.type,
        amount: payment.amount,
        status,
        recordedDate: today,
        receivedDate: payment.type === "bank_transfer" ? payment.receivedDate : undefined,
        expectedDepositDate: payment.type === "check" ? payment.expectedDepositDate : undefined,
        notes: payment.notes,
        createdAt: now,
      });

      if (status === "received") {
        totalReceived += payment.amount;
      } else {
        totalPending += payment.amount;
      }
    }

    // Mettre à jour le montant payé de la facture (uniquement les paiements "received")
    const newPaidAmount = currentPaidAmount + totalReceived;

    // Calculer le nouveau statut de paiement
    let newPaymentStatus: "unpaid" | "partial" | "pending_payment" | "paid";

    if (newPaidAmount >= invoice.amountTTC - 0.01) {
      // Facture entièrement payée
      newPaymentStatus = "paid";
    } else if (newPaidAmount + totalPending >= invoice.amountTTC - 0.01) {
      // Chèques en attente qui couvrent le reste
      newPaymentStatus = "pending_payment";
    } else if (newPaidAmount > 0) {
      // Paiement partiel
      newPaymentStatus = "partial";
    } else {
      // Pas encore payé (uniquement des chèques pending ne couvrant pas le total)
      newPaymentStatus = "unpaid";
    }

    // Mettre à jour la facture
    await ctx.db.patch(invoiceId, {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      paidDate:
        newPaymentStatus === "paid"
          ? today
          : invoice.paidDate, // Conserver la date existante si pas encore complètement payée
    });

    // Créer un événement dans l'historique
    await ctx.db.insert("events", {
      organizationId: user.organizationId,
      userId,
      invoiceId,
      eventType: newPaymentStatus === "paid" ? "invoice_marked_paid" : "payment_registered",
      eventDate: now,
      metadata: {
        amount: totalNewPayments,
        previousPaymentStatus: invoice.paymentStatus,
      },
      description:
        newPaymentStatus === "paid"
          ? `Facture ${invoice.invoiceNumber} marquée comme payée (${totalNewPayments.toFixed(2)} €)`
          : `Paiement enregistré pour la facture ${invoice.invoiceNumber} (${totalNewPayments.toFixed(2)} €)`,
    });
  },
});

/**
 * Confirme l'encaissement d'un chèque
 */
export const confirmCheckDeposit = mutation({
  args: {
    paymentId: v.id("payments"),
    actualDepositDate: v.string(), // YYYY-MM-DD
  },
  returns: v.null(),
  handler: async (ctx, { paymentId, actualDepositDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db.get(userId);
    if (!user?.organizationId) {
      throw new Error("User not in an organization");
    }

    // Récupérer le paiement
    const payment = await ctx.db.get(paymentId);
    if (!payment) {
      throw new Error("Payment not found");
    }

    if (payment.organizationId !== user.organizationId) {
      throw new Error("Unauthorized");
    }

    if (payment.type !== "check") {
      throw new Error("Only checks can be deposited");
    }

    if (payment.status !== "pending") {
      throw new Error("This check has already been deposited");
    }

    // Récupérer la facture
    const invoice = await ctx.db.get(payment.invoiceId);
    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Mettre à jour le paiement
    await ctx.db.patch(paymentId, {
      status: "received",
      receivedDate: actualDepositDate,
    });

    // Mettre à jour le montant payé de la facture
    const newPaidAmount = (invoice.paidAmount ?? 0) + payment.amount;

    // Recalculer le statut de paiement
    // On doit vérifier s'il reste des chèques pending
    const allPayments = await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
      .collect();

    const totalPending = allPayments
      .filter((p) => p.status === "pending")
      .reduce((sum, p) => sum + p.amount, 0);

    let newPaymentStatus: "unpaid" | "partial" | "pending_payment" | "paid";

    if (newPaidAmount >= invoice.amountTTC - 0.01) {
      newPaymentStatus = "paid";
    } else if (newPaidAmount + totalPending >= invoice.amountTTC - 0.01) {
      newPaymentStatus = "pending_payment";
    } else if (newPaidAmount > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "unpaid";
    }

    const now = Date.now();
    const today = new Date().toISOString().split("T")[0];

    // Mettre à jour la facture
    await ctx.db.patch(invoice._id, {
      paidAmount: newPaidAmount,
      paymentStatus: newPaymentStatus,
      paidDate: newPaymentStatus === "paid" ? today : invoice.paidDate,
    });

    // Créer un événement
    await ctx.db.insert("events", {
      organizationId: user.organizationId,
      userId,
      invoiceId: invoice._id,
      eventType: newPaymentStatus === "paid" ? "invoice_marked_paid" : "payment_registered",
      eventDate: now,
      metadata: {
        amount: payment.amount,
        previousPaymentStatus: invoice.paymentStatus,
      },
      description:
        newPaymentStatus === "paid"
          ? `Chèque encaissé - Facture ${invoice.invoiceNumber} payée (${payment.amount.toFixed(2)} €)`
          : `Chèque encaissé pour la facture ${invoice.invoiceNumber} (${payment.amount.toFixed(2)} €)`,
    });
  },
});
