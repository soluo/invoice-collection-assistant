import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  invoices: defineTable({
    userId: v.id("users"),
    clientName: v.string(),
    clientEmail: v.string(),
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    status: v.union(
      v.literal("sent"),
      v.literal("overdue"),
      v.literal("first_reminder"),
      v.literal("second_reminder"),
      v.literal("third_reminder"),
      v.literal("litigation"),
      v.literal("paid")
    ),
    pdfStorageId: v.optional(v.id("_storage")),
    lastReminderDate: v.optional(v.string()),
    paidDate: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_due_date", ["dueDate"]),

  reminderSettings: defineTable({
    userId: v.id("users"),
    firstReminderDelay: v.number(), // jours après échéance
    secondReminderDelay: v.number(),
    thirdReminderDelay: v.number(),
    litigationDelay: v.number(),
    firstReminderTemplate: v.string(),
    secondReminderTemplate: v.string(),
    thirdReminderTemplate: v.string(),
    signature: v.string(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
