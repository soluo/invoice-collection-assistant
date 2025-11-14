/**
 * Tests unitaires pour la génération automatique de rappels
 *
 * Ces tests valident le comportement de la génération anticipée (J+1) des rappels.
 *
 * Pour exécuter les tests :
 * 1. Aller dans le dashboard Convex
 * 2. Functions > reminders.test > runAllTests
 * 3. Cliquer sur "Run"
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Setup : Créer les données de test
 */
export const setupTestData = internalMutation({
  args: {},
  returns: v.object({
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    invoiceIds: v.array(v.id("invoices")),
  }),
  handler: async (ctx) => {
    // Créer un utilisateur de test
    const userId = await ctx.db.insert("users", {
      email: "test@example.com",
      name: "Test User",
      emailVerificationTime: Date.now(),
      isAnonymous: false,
    });

    // Créer une organisation de test
    const organizationId = await ctx.db.insert("organizations", {
      name: "Test Organization",
      createdAt: Date.now(),
      signature: "Cordialement, Test Organization",
      reminderSteps: [
        {
          id: "step1",
          delay: 1,
          type: "email",
          name: "Premier rappel (J+1)",
          emailSubject: "Rappel de paiement",
          emailTemplate: "Bonjour {nom_client}, facture {numero_facture}",
        },
        {
          id: "step2",
          delay: 7,
          type: "email",
          name: "Deuxième rappel (J+7)",
          emailSubject: "Rappel urgent",
          emailTemplate: "Bonjour {nom_client}, 2e rappel",
        },
        {
          id: "step3",
          delay: 14,
          type: "email",
          name: "Troisième rappel (J+14)",
          emailSubject: "Dernière relance",
          emailTemplate: "Bonjour {nom_client}, dernier rappel",
        },
      ],
      reminderSendTime: "10:00",
    });

    // Lier l'utilisateur à l'organisation
    await ctx.db.patch(userId, { organizationId });

    const invoiceIds: Id<"invoices">[] = [];

    // Test 1 : Facture échue aujourd'hui (2025-11-09)
    const invoice1 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-001",
      clientName: "Client Test 1",
      contactEmail: "client1@test.com",
      amountTTC: 1200,
      invoiceDate: "2025-11-01",
      dueDate: "2025-11-09", // Échéance aujourd'hui
      sendStatus: "sent",
      paymentStatus: "unpaid",
      reminderStatus: "none",
    });
    invoiceIds.push(invoice1);

    // Test 2 : Deuxième rappel avec délai J+7 (après avoir envoyé le premier rappel à J+1)
    const invoice2 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-002",
      clientName: "Client Test 2",
      contactEmail: "client2@test.com",
      amountTTC: 2400,
      invoiceDate: "2025-11-01",
      dueDate: "2025-11-03", // Échéance il y a 6 jours (demain = J+7)
      sendStatus: "sent",
      paymentStatus: "unpaid",
      overdueDetectedDate: "2025-11-03", // Détectée comme en retard il y a 6 jours
      reminderStatus: "reminder_1", // Premier rappel déjà envoyé (à J+1)
      lastReminderDate: "2025-11-04", // Envoyé il y a 5 jours
    });
    invoiceIds.push(invoice2);

    // Test 3 : Troisième rappel avec délai J+14 (après avoir envoyé le 2e rappel à J+7)
    const invoice3 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-003",
      clientName: "Client Test 3",
      contactEmail: "client3@test.com",
      amountTTC: 3600,
      invoiceDate: "2025-10-15",
      dueDate: "2025-10-27", // Échéance il y a 13 jours (demain = J+14)
      sendStatus: "sent",
      paymentStatus: "unpaid",
      overdueDetectedDate: "2025-10-27", // Détectée comme en retard il y a 13 jours
      reminderStatus: "reminder_2", // Deux rappels déjà envoyés (J+1 et J+7)
      lastReminderDate: "2025-11-03", // Deuxième rappel envoyé il y a 6 jours (J+7)
    });
    invoiceIds.push(invoice3);

    // Test 4 : Facture pas encore échue (2025-11-10)
    const invoice4 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-004",
      clientName: "Client Test 4",
      contactEmail: "client4@test.com",
      amountTTC: 4800,
      invoiceDate: "2025-11-01",
      dueDate: "2025-11-10", // Échéance demain
      sendStatus: "sent",
      paymentStatus: "unpaid",
      reminderStatus: "none",
    });
    invoiceIds.push(invoice4);

    // Test 5 : Facture échue mais payée
    const invoice5 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-005",
      clientName: "Client Test 5",
      contactEmail: "client5@test.com",
      amountTTC: 6000,
      invoiceDate: "2025-11-01",
      dueDate: "2025-11-05",
      sendStatus: "sent",
      paymentStatus: "paid", // Payée
      paidDate: "2025-11-08",
      reminderStatus: "none",
    });
    invoiceIds.push(invoice5);

    // Test 6 : Facture échue mais non envoyée
    const invoice6 = await ctx.db.insert("invoices", {
      userId,
      organizationId,
      createdBy: userId,
      invoiceNumber: "TEST-006",
      clientName: "Client Test 6",
      contactEmail: "client6@test.com",
      amountTTC: 7200,
      invoiceDate: "2025-11-01",
      dueDate: "2025-11-09",
      sendStatus: "pending", // Pas encore envoyée
      paymentStatus: "unpaid",
      reminderStatus: "none",
    });
    invoiceIds.push(invoice6);

    console.log(`[TEST SETUP] Created ${invoiceIds.length} test invoices`);

    return {
      userId,
      organizationId,
      invoiceIds,
    };
  },
});

/**
 * Cleanup : Supprimer les données de test
 */
export const cleanupTestData = internalMutation({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Supprimer toutes les factures de test
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .collect();

    for (const invoice of invoices) {
      // Supprimer les rappels associés
      const reminders = await ctx.db
        .query("reminders")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoice._id))
        .collect();

      for (const reminder of reminders) {
        await ctx.db.delete(reminder._id);
      }

      await ctx.db.delete(invoice._id);
    }

    // Supprimer l'organisation
    await ctx.db.delete(args.organizationId);

    // Supprimer l'utilisateur
    await ctx.db.delete(args.userId);

    console.log("[TEST CLEANUP] Test data deleted");
    return null;
  },
});

/**
 * Test 1 : Facture échue aujourd'hui avec délai J+1
 * Devrait générer un rappel pour demain
 */
export const runTest1_InvoiceDueTodayDelay1 = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 1: Facture échue aujourd'hui (J+1)";

    // Exécuter la génération de rappels au 2025-11-09
    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    // Vérifier qu'un rappel a été généré
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const passed = reminders.length === 1 &&
                   reminders[0].reminderDate === "2025-11-10 10:00:00" &&
                   reminders[0].reminderStatus === "reminder_1";

    const details = passed
      ? `✅ Rappel généré pour 2025-11-10 10:00:00`
      : `❌ Expected 1 reminder for 2025-11-10, got ${reminders.length} reminders. ${reminders.length > 0 ? `Date: ${reminders[0].reminderDate}` : ''}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Test 2 : Deuxième rappel avec délai J+7
 * Devrait générer le deuxième rappel pour demain
 */
export const runTest2_InvoiceDueYesterdayDelay2 = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 2: Deuxième rappel à J+7";

    // Exécuter la génération de rappels au 2025-11-09
    // L'invoice a échéance le 2025-11-03 (6 jours avant), détection le 2025-11-03
    // Premier rappel déjà envoyé (reminder_1)
    // Demain (2025-11-10) sera 7 jours après détection → devrait générer reminder_2
    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Devrait avoir généré le reminder_2 pour demain
    const passed = reminders.length === 1 &&
                   reminders[0].reminderDate === "2025-11-10 10:00:00" &&
                   reminders[0].reminderStatus === "reminder_2";

    const details = passed
      ? `✅ Reminder_2 généré pour 2025-11-10 (J+7)`
      : `❌ Expected reminder_2 for 2025-11-10, got ${reminders.length} reminders. ${reminders.length > 0 ? `Status: ${reminders[0].reminderStatus}, Date: ${reminders[0].reminderDate}` : ''}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Test 3 : Troisième rappel avec délai J+14
 * Devrait générer le 3e rappel pour demain (J+14 depuis détection)
 */
export const runTest3_SubsequentReminderDelay7 = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 3: Troisième rappel à J+14";

    // Exécuter la génération au 2025-11-09
    // Invoice détectée le 2025-10-27 (13 jours avant)
    // Deux rappels déjà envoyés (reminder_1 et reminder_2)
    // Demain (2025-11-10) sera 14 jours après détection → devrait générer reminder_3
    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const passed = reminders.length === 1 &&
                   reminders[0].reminderDate === "2025-11-10 10:00:00" &&
                   reminders[0].reminderStatus === "reminder_3";

    const details = passed
      ? `✅ Reminder_3 généré pour 2025-11-10 (J+14 depuis détection)`
      : `❌ Expected reminder_3 for 2025-11-10, got ${reminders.length} reminders. ${reminders.length > 0 ? `Status: ${reminders[0].reminderStatus}, Date: ${reminders[0].reminderDate}` : ''}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Test 4 : Facture pas encore échue
 * Ne devrait PAS générer de rappel
 */
export const runTest4_NotYetDue = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 4: Facture pas encore échue";

    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const passed = reminders.length === 0;

    const details = passed
      ? `✅ Aucun rappel généré (attendu)`
      : `❌ Expected 0 reminders, got ${reminders.length}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Test 5 : Facture échue mais payée
 * Ne devrait PAS générer de rappel
 */
export const runTest5_AlreadyPaid = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 5: Facture payée";

    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const passed = reminders.length === 0;

    const details = passed
      ? `✅ Aucun rappel généré (facture payée)`
      : `❌ Expected 0 reminders for paid invoice, got ${reminders.length}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Test 6 : Facture échue mais non envoyée
 * Ne devrait PAS générer de rappel
 */
export const runTest6_NotSent = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
  },
  returns: v.object({
    testName: v.string(),
    passed: v.boolean(),
    details: v.string(),
  }),
  handler: async (ctx, args) => {
    const testName = "Test 6: Facture non envoyée";

    const result = await ctx.runMutation(internal.reminders.generateDailyReminders, {
      currentDate: "2025-11-09",
    });

    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    const passed = reminders.length === 0;

    const details = passed
      ? `✅ Aucun rappel généré (facture non envoyée)`
      : `❌ Expected 0 reminders for unsent invoice, got ${reminders.length}`;

    console.log(`[${testName}] ${details}`);

    return {
      testName,
      passed,
      details,
    };
  },
});

/**
 * Exécuter tous les tests
 */
export const runAllTests = internalMutation({
  args: {},
  returns: v.object({
    total: v.number(),
    passed: v.number(),
    failed: v.number(),
    results: v.array(
      v.object({
        testName: v.string(),
        passed: v.boolean(),
        details: v.string(),
      })
    ),
  }),
  handler: async (ctx): Promise<any> => {
    console.log("========================================");
    console.log("🧪 DÉBUT DES TESTS DE GÉNÉRATION DE RAPPELS");
    console.log("========================================");

    // Setup
    console.log("\n📦 Setup des données de test...");
    const testData: any = await ctx.runMutation(internal.testReminders.setupTestData, {});
    console.log(`✅ Setup terminé : ${testData.invoiceIds.length} factures créées`);

    const results: any[] = [];

    try {
      // Test 1
      console.log("\n--- Test 1 ---");
      const test1: any = await ctx.runMutation(
        internal.testReminders.runTest1_InvoiceDueTodayDelay1,
        { invoiceId: testData.invoiceIds[0] }
      );
      results.push(test1);

      // Test 2
      console.log("\n--- Test 2 ---");
      const test2: any = await ctx.runMutation(
        internal.testReminders.runTest2_InvoiceDueYesterdayDelay2,
        { invoiceId: testData.invoiceIds[1] }
      );
      results.push(test2);

      // Test 3
      console.log("\n--- Test 3 ---");
      const test3: any = await ctx.runMutation(
        internal.testReminders.runTest3_SubsequentReminderDelay7,
        { invoiceId: testData.invoiceIds[2] }
      );
      results.push(test3);

      // Test 4
      console.log("\n--- Test 4 ---");
      const test4: any = await ctx.runMutation(
        internal.testReminders.runTest4_NotYetDue,
        { invoiceId: testData.invoiceIds[3] }
      );
      results.push(test4);

      // Test 5
      console.log("\n--- Test 5 ---");
      const test5: any = await ctx.runMutation(
        internal.testReminders.runTest5_AlreadyPaid,
        { invoiceId: testData.invoiceIds[4] }
      );
      results.push(test5);

      // Test 6
      console.log("\n--- Test 6 ---");
      const test6: any = await ctx.runMutation(
        internal.testReminders.runTest6_NotSent,
        { invoiceId: testData.invoiceIds[5] }
      );
      results.push(test6);
    } finally {
      // Cleanup
      console.log("\n🧹 Nettoyage des données de test...");
      await ctx.runMutation(internal.testReminders.cleanupTestData, {
        userId: testData.userId,
        organizationId: testData.organizationId,
      });
      console.log("✅ Nettoyage terminé");
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log("\n========================================");
    console.log("📊 RÉSULTATS DES TESTS");
    console.log("========================================");
    console.log(`Total: ${results.length}`);
    console.log(`✅ Passés: ${passed}`);
    console.log(`❌ Échoués: ${failed}`);
    console.log("========================================");

    return {
      total: results.length,
      passed,
      failed,
      results,
    };
  },
});
