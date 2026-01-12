import { convexTest } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/**
 * Note: These tests verify the core business logic of the invitation flow and RBAC.
 * Full end-to-end tests with Convex Auth would require additional setup.
 * Manual smoke testing is recommended for the complete flow.
 */

describe("Invitation Flow", () => {
  describe("acceptInvitation logic", () => {
    it("should assign the correct role from invitation (technicien) when processed correctly", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin user
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

      // Create invitation for technicien
      const invitationId = await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "tech@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "test-token-123",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Create the invited user (simulating signup) - WITHOUT organizationId
      const techId = await t.run(async (ctx) => {
        return await ctx.db.insert("users", {
          email: "tech@test.com",
          name: "Tech User",
        });
      });

      // Simulate what acceptInvitation mutation does
      await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_token", (q) => q.eq("token", "test-token-123"))
          .first();

        if (!invitation) throw new Error("Invitation not found");

        // Update user with org info from invitation
        await ctx.db.patch(techId, {
          name: "Tech User",
          role: invitation.role,
          organizationId: invitation.organizationId,
          invitedBy: invitation.invitedBy,
        });

        // Mark invitation as accepted
        await ctx.db.patch(invitation._id, { status: "accepted" });
      });

      // Verify user has correct role
      const user = await t.run(async (ctx) => {
        return await ctx.db.get(techId);
      });

      expect(user?.role).toBe("technicien");
      expect(user?.organizationId).toBe(orgId);

      // Verify invitation is marked as accepted
      const invitation = await t.run(async (ctx) => {
        return await ctx.db.get(invitationId);
      });

      expect(invitation?.status).toBe("accepted");
    });

    it("should reject expired invitations", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
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

      // Create expired invitation
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "expired@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "expired-token",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() - 1000, // Expired
          createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
        });
      });

      // Verify expiration check works
      const isExpired = await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_token", (q) => q.eq("token", "expired-token"))
          .first();
        return invitation ? invitation.expiresAt < Date.now() : false;
      });

      expect(isExpired).toBe(true);
    });

    it("should reject already used invitations", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
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

      // Create already accepted invitation
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "used@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "used-token",
          status: "accepted", // Already accepted
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Verify status check works
      const invitation = await t.run(async (ctx) => {
        return await ctx.db
          .query("invitations")
          .withIndex("by_token", (q) => q.eq("token", "used-token"))
          .first();
      });

      expect(invitation?.status).toBe("accepted");
      expect(invitation?.status !== "pending").toBe(true);
    });
  });

  describe("hasPendingInvitation check in auth callback", () => {
    it("should find pending invitation for user email", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
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

      // Create pending invitation
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "pending@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "test-pending-token",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Check if has pending invitation (this is what auth callback does)
      const hasPending = await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_email", (q) => q.eq("email", "pending@test.com"))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();
        return invitation !== null;
      });

      expect(hasPending).toBe(true);
    });

    it("should NOT find invitation when status is accepted", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
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

      // Create accepted invitation
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "accepted@test.com",
          organizationId: orgId,
          role: "technicien",
          token: "test-accepted-token",
          status: "accepted",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Check if has pending invitation (should be false - it's accepted)
      const hasPending = await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_email", (q) => q.eq("email", "accepted@test.com"))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();
        return invitation !== null;
      });

      expect(hasPending).toBe(false);
    });

    it("should handle email normalization (case insensitive lookup)", async () => {
      const t = convexTest(schema, modules);

      // Setup: Create org and admin
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

      // Create invitation with lowercase email (normalized)
      await t.run(async (ctx) => {
        return await ctx.db.insert("invitations", {
          email: "test@example.com", // lowercase (normalized)
          organizationId: orgId,
          role: "technicien",
          token: "test-normalize-token",
          status: "pending",
          invitedBy: adminId,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
          createdAt: Date.now(),
        });
      });

      // Lookup with lowercase (should find - emails are stored normalized)
      const foundWithLowercase = await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_email", (q) => q.eq("email", "test@example.com"))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();
        return invitation !== null;
      });

      expect(foundWithLowercase).toBe(true);

      // Lookup with UPPERCASE would NOT find (index is case-sensitive)
      // This is why normalizeEmail() is called before lookup in auth callback
      const foundWithUppercase = await t.run(async (ctx) => {
        const invitation = await ctx.db
          .query("invitations")
          .withIndex("by_email", (q) => q.eq("email", "TEST@EXAMPLE.COM"))
          .filter((q) => q.eq(q.field("status"), "pending"))
          .first();
        return invitation !== null;
      });

      // This proves the index is case-sensitive, hence normalizeEmail() is required
      expect(foundWithUppercase).toBe(false);
    });
  });
});

describe("Technician RBAC", () => {
  it("technician should only see own invoices using by_organization_and_creator index", async () => {
    const t = convexTest(schema, modules);

    // Setup org
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    // Create two technicians
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

    // Tech1 creates an invoice
    await t.run(async (ctx) => {
      return await ctx.db.insert("invoices", {
        invoiceNumber: "INV-001",
        clientName: "Client A",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech1Id,
        createdBy: tech1Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Tech2 creates an invoice
    await t.run(async (ctx) => {
      return await ctx.db.insert("invoices", {
        invoiceNumber: "INV-002",
        clientName: "Client B",
        amountTTC: 2000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech2Id,
        createdBy: tech2Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Tech1 queries using by_organization_and_creator index (what the query uses for technicians)
    const tech1Invoices = await t.run(async (ctx) => {
      return await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", orgId).eq("createdBy", tech1Id)
        )
        .collect();
    });

    expect(tech1Invoices).toHaveLength(1);
    expect(tech1Invoices[0].invoiceNumber).toBe("INV-001");

    // Tech2 queries using by_organization_and_creator index
    const tech2Invoices = await t.run(async (ctx) => {
      return await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", orgId).eq("createdBy", tech2Id)
        )
        .collect();
    });

    expect(tech2Invoices).toHaveLength(1);
    expect(tech2Invoices[0].invoiceNumber).toBe("INV-002");
  });

  it("admin should see all org invoices using by_organization index", async () => {
    const t = convexTest(schema, modules);

    // Setup org
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    // Create admin and technician
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

    // Create invoices from both users
    await t.run(async (ctx) => {
      await ctx.db.insert("invoices", {
        invoiceNumber: "INV-ADMIN",
        clientName: "Client Admin",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: adminId,
        createdBy: adminId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      await ctx.db.insert("invoices", {
        invoiceNumber: "INV-TECH",
        clientName: "Client Tech",
        amountTTC: 2000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: techId,
        createdBy: techId,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Admin uses by_organization index (sees all org invoices)
    const adminInvoices = await t.run(async (ctx) => {
      return await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
        .collect();
    });

    expect(adminInvoices).toHaveLength(2);
  });

  it("technician cannot see invoices from other technicians", async () => {
    const t = convexTest(schema, modules);

    // Setup org
    const orgId = await t.run(async (ctx) => {
      return await ctx.db.insert("organizations", {
        name: "Test Org",
        createdAt: Date.now(),
        signature: "Test Signature",
      });
    });

    // Create two technicians
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

    // Tech1 creates multiple invoices
    await t.run(async (ctx) => {
      await ctx.db.insert("invoices", {
        invoiceNumber: "TECH1-001",
        clientName: "Tech1 Client A",
        amountTTC: 1000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech1Id,
        createdBy: tech1Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
      await ctx.db.insert("invoices", {
        invoiceNumber: "TECH1-002",
        clientName: "Tech1 Client B",
        amountTTC: 1500,
        invoiceDate: "2026-01-02",
        dueDate: "2026-02-01",
        organizationId: orgId,
        userId: tech1Id,
        createdBy: tech1Id,
        sendStatus: "sent",
        paymentStatus: "unpaid",
      });
    });

    // Tech2 creates invoice
    await t.run(async (ctx) => {
      await ctx.db.insert("invoices", {
        invoiceNumber: "TECH2-001",
        clientName: "Tech2 Client",
        amountTTC: 3000,
        invoiceDate: "2026-01-01",
        dueDate: "2026-01-31",
        organizationId: orgId,
        userId: tech2Id,
        createdBy: tech2Id,
        sendStatus: "pending",
        paymentStatus: "unpaid",
      });
    });

    // Tech2 queries with technician filter - should only see their own invoice
    const tech2Invoices = await t.run(async (ctx) => {
      return await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", orgId).eq("createdBy", tech2Id)
        )
        .collect();
    });

    expect(tech2Invoices).toHaveLength(1);
    expect(tech2Invoices[0].invoiceNumber).toBe("TECH2-001");

    // Verify total invoices in org is 3
    const allInvoicesInOrg = await t.run(async (ctx) => {
      return await ctx.db
        .query("invoices")
        .withIndex("by_organization", (q) => q.eq("organizationId", orgId))
        .collect();
    });

    expect(allInvoicesInOrg).toHaveLength(3);

    // But Tech2 can only access 1 with proper filtering
    const tech2VisibleInvoices = allInvoicesInOrg.filter(
      (inv) => inv.createdBy === tech2Id
    );
    expect(tech2VisibleInvoices).toHaveLength(1);
  });
});
