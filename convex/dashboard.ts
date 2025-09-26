import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getLoggedInUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getLoggedInUser(ctx);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

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
      } else if (daysOverdue > 0 || ["first_reminder", "second_reminder", "third_reminder", "litigation"].includes(invoice.status)) {
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