import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserWithOrg, isAdmin } from "./permissions";

/**
 * Récupère les statistiques du dashboard
 * - Technicien : stats uniquement sur ses propres factures
 * - Admin : stats sur toutes les factures de l'org (ou filtrées par technicien)
 *
 * @param filterByUserId - (Admins uniquement) ID d'un technicien pour filtrer les stats
 */
export const getDashboardStats = query({
  args: {
    filterByUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const user = await getUserWithOrg(ctx);

    // Si un filtre est fourni, vérifier que l'utilisateur est admin
    if (args.filterByUserId && !isAdmin(user)) {
      throw new Error("Seuls les admins peuvent filtrer les statistiques");
    }

    let invoices;

    if (isAdmin(user)) {
      if (args.filterByUserId) {
        // Admin : filtrer par technicien spécifique
        const filterUserId = args.filterByUserId; // TypeScript narrowing
        invoices = await ctx.db
          .query("invoices")
          .withIndex("by_organization_and_creator", (q) =>
            q.eq("organizationId", user.organizationId).eq("createdBy", filterUserId)
          )
          .collect();
      } else {
        // Admin : toutes les factures de l'organisation
        invoices = await ctx.db
          .query("invoices")
          .withIndex("by_organization", (q) => q.eq("organizationId", user.organizationId))
          .collect();
      }
    } else {
      // Technicien : uniquement ses propres factures
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_organization_and_creator", (q) =>
          q.eq("organizationId", user.organizationId).eq("createdBy", user.userId)
        )
        .collect();
    }

    // Calculer les totaux par catégorie
    const now = new Date();

    let montantARecouvrir = 0;
    let montantEnCours = 0;
    let montantPaye = 0;

    const factunesUrgentes: any[] = [];

    invoices.forEach((invoice) => {
      const dueDate = new Date(invoice.dueDate);
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

      const invoiceWithDays = {
        ...invoice,
        daysOverdue,
        priority: getStatusPriority(invoice.status),
      };

      if (invoice.status === "paid") {
        montantPaye += invoice.amountTTC;
      } else if (
        daysOverdue > 0 ||
        ["first_reminder", "second_reminder", "third_reminder", "litigation"].includes(invoice.status)
      ) {
        // Factures à recouvrir (en retard ou avec relances)
        montantARecouvrir += invoice.amountTTC;
        factunesUrgentes.push(invoiceWithDays);
      } else if (invoice.status === "sent") {
        // Factures envoyées mais pas encore échues
        montantEnCours += invoice.amountTTC;
      }
    });

    // Trier les factures urgentes par priorité puis par jours de retard
    factunesUrgentes.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return b.daysOverdue - a.daysOverdue;
    });

    // Prendre les 5 plus urgentes
    const top5Urgentes = factunesUrgentes.slice(0, 5);

    return {
      totaux: {
        montantARecouvrir,
        montantEnCours,
        montantPaye,
      },
      facturesUrgentes: top5Urgentes,
      nombreFacturesTotal: invoices.length,
      nombreFacturesEnRetard: factunesUrgentes.length,
    };
  },
});

function getStatusPriority(status: string): number {
  const statusPriority: Record<string, number> = {
    litigation: 0,
    third_reminder: 1,
    second_reminder: 2,
    first_reminder: 3,
    overdue: 4,
    sent: 5,
    paid: 6,
  };
  return statusPriority[status] || 7;
}