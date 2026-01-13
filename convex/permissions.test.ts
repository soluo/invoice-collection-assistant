import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";
import { canModifyInvoice, canAccessInvoice, isAdmin } from "./permissions";
import type { UserWithOrg } from "./permissions";
import type { Doc, Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

/**
 * Tests for Story 6.3: Edit and Reassign Invoice
 *
 * Business Rules:
 * - No one can modify paid invoices (paymentStatus === "paid")
 * - Admin can modify any unpaid invoice in their organization
 * - Technician can only modify their own unpaid invoices
 */

describe("canModifyInvoice - Story 6.3", () => {
  describe("AC5: No Edit for Paid Invoices", () => {
    it("admin cannot modify a paid invoice", async () => {
      const t = convexTest(schema, modules);

      // Setup org
      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      // Create admin
      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin User",
          role: "admin",
          organizationId: orgId,
        });
      });

      // Create paid invoice
      const paidInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-PAID",
          clientName: "Paid Client",
          amountTTC: 1000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: adminId,
          createdBy: adminId,
          sendStatus: "sent",
          paymentStatus: "paid", // PAID - immutable
        });
        return await ctx.db.get(invoiceId);
      });

      const adminUser: UserWithOrg = {
        userId: adminId,
        role: "admin",
        organizationId: orgId,
        email: "admin@test.com",
        name: "Admin User",
      };

      // Admin cannot modify paid invoice
      const result = canModifyInvoice(adminUser, paidInvoice as Doc<"invoices">);
      expect(result).toBe(false);
    });

    it("technician cannot modify a paid invoice (even their own)", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech User",
          role: "technicien",
          organizationId: orgId,
        });
      });

      // Technician's own paid invoice
      const paidInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-TECH-PAID",
          clientName: "Tech Paid Client",
          amountTTC: 500,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: techId,
          createdBy: techId,
          sendStatus: "sent",
          paymentStatus: "paid", // PAID - immutable
        });
        return await ctx.db.get(invoiceId);
      });

      const techUser: UserWithOrg = {
        userId: techId,
        role: "technicien",
        organizationId: orgId,
        email: "tech@test.com",
        name: "Tech User",
      };

      // Technician cannot modify their own paid invoice
      const result = canModifyInvoice(techUser, paidInvoice as Doc<"invoices">);
      expect(result).toBe(false);
    });
  });

  describe("AC1 & AC2: Admin Can Edit Unpaid Invoices", () => {
    it("admin can modify any unpaid invoice in their organization", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin User",
          role: "admin",
          organizationId: orgId,
        });
      });

      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech User",
          role: "technicien",
          organizationId: orgId,
        });
      });

      // Invoice created by technician
      const techInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-TECH",
          clientName: "Tech Client",
          amountTTC: 2000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: techId,
          createdBy: techId,
          sendStatus: "pending",
          paymentStatus: "unpaid", // UNPAID - editable
        });
        return await ctx.db.get(invoiceId);
      });

      const adminUser: UserWithOrg = {
        userId: adminId,
        role: "admin",
        organizationId: orgId,
        email: "admin@test.com",
        name: "Admin User",
      };

      // Admin can modify technician's unpaid invoice
      const result = canModifyInvoice(adminUser, techInvoice as Doc<"invoices">);
      expect(result).toBe(true);
    });

    it("admin can modify invoices with partial payment status", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin User",
          role: "admin",
          organizationId: orgId,
        });
      });

      // Invoice with partial payment (not fully paid)
      const partialInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-PARTIAL",
          clientName: "Partial Client",
          amountTTC: 1000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: adminId,
          createdBy: adminId,
          sendStatus: "sent",
          paymentStatus: "partial", // PARTIAL - should be editable
        });
        return await ctx.db.get(invoiceId);
      });

      const adminUser: UserWithOrg = {
        userId: adminId,
        role: "admin",
        organizationId: orgId,
        email: "admin@test.com",
        name: "Admin User",
      };

      // Admin can modify partial payment invoice
      const result = canModifyInvoice(adminUser, partialInvoice as Doc<"invoices">);
      expect(result).toBe(true);
    });
  });

  describe("AC2 & AC4: Technician Can Only Edit Own Unpaid Invoices", () => {
    it("technician can modify their own unpaid invoice", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech User",
          role: "technicien",
          organizationId: orgId,
        });
      });

      // Technician's own unpaid invoice
      const ownInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-OWN",
          clientName: "Own Client",
          amountTTC: 1500,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: techId,
          createdBy: techId,
          sendStatus: "pending",
          paymentStatus: "unpaid",
        });
        return await ctx.db.get(invoiceId);
      });

      const techUser: UserWithOrg = {
        userId: techId,
        role: "technicien",
        organizationId: orgId,
        email: "tech@test.com",
        name: "Tech User",
      };

      // Technician can modify their own unpaid invoice
      const result = canModifyInvoice(techUser, ownInvoice as Doc<"invoices">);
      expect(result).toBe(true);
    });

    it("technician cannot modify another technician's invoice", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const tech1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech1@test.com",
          name: "Tech 1",
          role: "technicien",
          organizationId: orgId,
        });
      });

      const tech2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech2@test.com",
          name: "Tech 2",
          role: "technicien",
          organizationId: orgId,
        });
      });

      // Invoice created by tech1
      const tech1Invoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-TECH1",
          clientName: "Tech1 Client",
          amountTTC: 1000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: tech1Id,
          createdBy: tech1Id,
          sendStatus: "pending",
          paymentStatus: "unpaid",
        });
        return await ctx.db.get(invoiceId);
      });

      const tech2User: UserWithOrg = {
        userId: tech2Id,
        role: "technicien",
        organizationId: orgId,
        email: "tech2@test.com",
        name: "Tech 2",
      };

      // Tech2 cannot modify Tech1's invoice
      const result = canModifyInvoice(tech2User, tech1Invoice as Doc<"invoices">);
      expect(result).toBe(false);
    });

    it("technician can modify invoice assigned to them (userId match)", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin",
          role: "admin",
          organizationId: orgId,
        });
      });

      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech",
          role: "technicien",
          organizationId: orgId,
        });
      });

      // Invoice created by admin but assigned to technician
      const assignedInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-ASSIGNED",
          clientName: "Assigned Client",
          amountTTC: 3000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: techId, // Assigned to tech
          createdBy: adminId, // Created by admin
          sendStatus: "pending",
          paymentStatus: "unpaid",
        });
        return await ctx.db.get(invoiceId);
      });

      const techUser: UserWithOrg = {
        userId: techId,
        role: "technicien",
        organizationId: orgId,
        email: "tech@test.com",
        name: "Tech",
      };

      // Technician can modify invoice assigned to them
      const result = canModifyInvoice(techUser, assignedInvoice as Doc<"invoices">);
      expect(result).toBe(true);
    });
  });

  describe("Cross-organization security", () => {
    it("admin cannot modify invoice from another organization", async () => {
      const t = convexTest(schema, modules);

      // Org 1
      const org1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Org 1",
          createdAt: Date.now(),
          signature: "Signature 1",
        });
      });

      // Org 2
      const org2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Org 2",
          createdAt: Date.now(),
          signature: "Signature 2",
        });
      });

      const admin1Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin1@test.com",
          name: "Admin 1",
          role: "admin",
          organizationId: org1Id,
        });
      });

      const admin2Id = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin2@test.com",
          name: "Admin 2",
          role: "admin",
          organizationId: org2Id,
        });
      });

      // Invoice in Org 2
      const org2Invoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-ORG2",
          clientName: "Org2 Client",
          amountTTC: 5000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: org2Id,
          userId: admin2Id,
          createdBy: admin2Id,
          sendStatus: "pending",
          paymentStatus: "unpaid",
        });
        return await ctx.db.get(invoiceId);
      });

      const admin1User: UserWithOrg = {
        userId: admin1Id,
        role: "admin",
        organizationId: org1Id,
        email: "admin1@test.com",
        name: "Admin 1",
      };

      // Admin from Org1 cannot modify Org2's invoice
      const result = canModifyInvoice(admin1User, org2Invoice as Doc<"invoices">);
      expect(result).toBe(false);
    });
  });

  describe("Payment status edge cases", () => {
    it("allows modification for pending_payment status", async () => {
      const t = convexTest(schema, modules);

      const orgId = await t.run(async (ctx) => {
        return await ctx.db.insert("organizations", {
          name: "Test Org",
          createdAt: Date.now(),
          signature: "Test Signature",
        });
      });

      const adminId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "admin@test.com",
          name: "Admin",
          role: "admin",
          organizationId: orgId,
        });
      });

      const pendingPaymentInvoice = await t.run(async (ctx) => {
        const invoiceId = await ctx.db.insert("invoices", {
          invoiceNumber: "INV-PENDING-PAYMENT",
          clientName: "Pending Payment Client",
          amountTTC: 1000,
          invoiceDate: "2026-01-01",
          dueDate: "2026-01-31",
          organizationId: orgId,
          userId: adminId,
          createdBy: adminId,
          sendStatus: "sent",
          paymentStatus: "pending_payment",
        });
        return await ctx.db.get(invoiceId);
      });

      const adminUser: UserWithOrg = {
        userId: adminId,
        role: "admin",
        organizationId: orgId,
        email: "admin@test.com",
        name: "Admin",
      };

      // pending_payment is editable
      const result = canModifyInvoice(adminUser, pendingPaymentInvoice as Doc<"invoices">);
      expect(result).toBe(true);
    });
  });
});


describe("AC3 & AC4: Admin-only reassignment security", () => {
  it("isAdmin returns true for admin role (required for reassignment)", () => {
    const adminUser: UserWithOrg = {
      userId: "dummy" as Id<"users">,
      role: "admin",
      organizationId: "dummy" as Id<"organizations">,
    };
    expect(isAdmin(adminUser)).toBe(true);
  });

  it("isAdmin returns false for technicien role (blocks reassignment)", () => {
    const techUser: UserWithOrg = {
      userId: "dummy" as Id<"users">,
      role: "technicien",
      organizationId: "dummy" as Id<"organizations">,
    };
    expect(isAdmin(techUser)).toBe(false);
  });

  it("technician can modify own invoice but backend blocks reassignment via isAdmin check", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    const techId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech@test.com",
        name: "Tech User",
        role: "technicien",
        organizationId: orgId,
      });
    });

    const ownInvoice = await t.run(async (ctx) => {
      const invoiceId = await ctx.db.insert("invoices", {
        invoiceNumber: "INV-REASSIGN-TEST",
        clientName: "Reassign Test Client",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: techId,
        createdBy: techId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      return await ctx.db.get(invoiceId);
    });

    const techUser: UserWithOrg = {
      userId: techId,
      role: "technicien",
      organizationId: orgId,
      email: "tech@test.com",
      name: "Tech User",
    };

    // Technician CAN modify their own unpaid invoice (edit fields)
    expect(canModifyInvoice(techUser, ownInvoice as Doc<"invoices">)).toBe(true);

    // But isAdmin check in update mutation will BLOCK reassignment
    expect(isAdmin(techUser)).toBe(false);
  });
});

describe("canAccessInvoice", () => {
  it("admin can access any invoice in their org", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "admin@test.com",
        name: "Admin",
        role: "admin",
        organizationId: orgId,
      });
    });

    const techId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech@test.com",
        name: "Tech",
        role: "technicien",
        organizationId: orgId,
      });
    });

    const techInvoice = await t.run(async (ctx) => {
      const invoiceId = await ctx.db.insert("invoices", {
        invoiceNumber: "INV-ACCESS",
        clientName: "Access Client",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: techId,
        createdBy: techId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      return await ctx.db.get(invoiceId);
    });

    const adminUser: UserWithOrg = {
      userId: adminId,
      role: "admin",
      organizationId: orgId,
      email: "admin@test.com",
      name: "Admin",
    };

    const result = canAccessInvoice(adminUser, techInvoice as Doc<"invoices">);
    expect(result).toBe(true);
  });

  it("technician can only access their own invoices", async () => {
    const t = convexTest(schema, modules);

    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    const tech1Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech1@test.com",
        name: "Tech 1",
        role: "technicien",
        organizationId: orgId,
      });
    });

    const tech2Id = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "tech2@test.com",
        name: "Tech 2",
        role: "technicien",
        organizationId: orgId,
      });
    });

    const tech1Invoice = await t.run(async (ctx) => {
      const invoiceId = await ctx.db.insert("invoices", {
        invoiceNumber: "INV-TECH1-ACCESS",
        clientName: "Tech1 Access Client",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech1Id,
        createdBy: tech1Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      return await ctx.db.get(invoiceId);
    });

    const tech2User: UserWithOrg = {
      userId: tech2Id,
      role: "technicien",
      organizationId: orgId,
      email: "tech2@test.com",
      name: "Tech 2",
    };

    // Tech2 cannot access Tech1's invoice
    const result = canAccessInvoice(tech2User, tech1Invoice as Doc<"invoices">);
    expect(result).toBe(false);
  });
});
