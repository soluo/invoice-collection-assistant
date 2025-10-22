import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ReminderModal } from "@components/ReminderModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type InvoiceStatus = "sent" | "overdue" | "first_reminder" | "second_reminder" | "third_reminder" | "litigation" | "paid";

const overdueStatuses = new Set<InvoiceStatus>([
  "overdue",
  "first_reminder",
  "second_reminder",
  "third_reminder",
  "litigation",
]);

const DAY_IN_MS = 1000 * 60 * 60 * 24;

type StatusDisplay = {
  badgeLabel: string;
  complement?: string;
  colorClass: string;
};

const pluralizeDays = (days: number): string => `jour${Math.abs(days) > 1 ? "s" : ""}`;

const formatComplementDue = (days: number): string => {
  if (days <= 0) {
    return "aujourd'hui";
  }
  return `dans ${days} ${pluralizeDays(days)}`;
};

const formatComplementOverdue = (days: number): string => {
  if (days <= 0) {
    return "aujourd'hui";
  }
  return `de ${days} ${pluralizeDays(days)}`;
};

const formatComplementPaid = (days: number): string => {
  if (days <= 0) {
    return "le jour même";
  }
  return `en ${days} ${pluralizeDays(days)}`;
};

const getStatusDisplay = (invoice: any): StatusDisplay => {
  const status: InvoiceStatus = invoice.status;
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : undefined;
  const now = new Date();

  if (status === "paid") {
    const invoiceDate = invoice.invoiceDate ? new Date(invoice.invoiceDate) : undefined;
    const paidDate = invoice.paidDate ? new Date(invoice.paidDate) : undefined;
    if (invoiceDate && paidDate) {
      const days = Math.max(0, Math.round((paidDate.getTime() - invoiceDate.getTime()) / DAY_IN_MS));
      return {
        badgeLabel: "Payée",
        complement: formatComplementPaid(days),
        colorClass: "bg-emerald-100 text-emerald-800",
      };
    }
    return {
      badgeLabel: "Payée",
      colorClass: "bg-emerald-100 text-emerald-800",
    };
  }

  if (dueDate && !Number.isNaN(dueDate.getTime())) {
    const remainingRaw = Math.ceil((dueDate.getTime() - now.getTime()) / DAY_IN_MS);
    const daysOverdue = invoice.daysOverdue ?? Math.max(0, Math.ceil((now.getTime() - dueDate.getTime()) / DAY_IN_MS));

    if (status === "sent" && remainingRaw >= 0) {
      const daysRemaining = Math.max(0, remainingRaw);
      return {
        badgeLabel: "Due",
        complement: formatComplementDue(daysRemaining),
        colorClass: "bg-blue-100 text-blue-800",
      };
    }

    if (status === "sent" && remainingRaw < 0) {
      const overdueDays = Math.max(1, Math.abs(remainingRaw));
      return {
        badgeLabel: "En retard",
        complement: formatComplementOverdue(overdueDays),
        colorClass: "bg-red-100 text-red-800",
      };
    }

    if (overdueStatuses.has(status)) {
      const overdueDays = Math.max(1, daysOverdue);
      return {
        badgeLabel: "En retard",
        complement: formatComplementOverdue(overdueDays),
        colorClass: "bg-red-100 text-red-800",
      };
    }
  }

  return {
    badgeLabel: "À envoyer",
    colorClass: "bg-gray-100 text-gray-800",
  };
};

export function Invoices() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | undefined>(undefined);
  const [reminderModal, setReminderModal] = useState<{ invoice: any; status: InvoiceStatus } | null>(null);

  const isAdmin = currentUser?.role === "admin";

  // Utiliser la bonne query selon le rôle et le filtre
  const invoices = useQuery(
    isAdmin ? api.invoices.listWithFilter : api.invoices.list,
    isAdmin ? { filterByUserId: selectedUserId } : {}
  );

  const markAsPaid = useMutation(api.invoices.markAsPaid);

  // Vérifier si on peut envoyer une relance
  const canSendReminder = (invoice: any): boolean => {
    return invoice.status !== "paid" && new Date(invoice.dueDate) < new Date();
  };

  // Vérifier si on peut marquer comme payée
  const canMarkAsPaid = (invoice: any): boolean => {
    return invoice.status !== "paid";
  };

  const handleMarkAsPaid = async (invoiceId: Id<"invoices">) => {
    try {
      await markAsPaid({ invoiceId });
      toast.success("Facture marquée comme payée");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleSendReminder = (invoice: any) => {
    setReminderModal({ invoice, status: invoice.status });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  if (invoices === undefined || (isAdmin && allUsers === undefined)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Header avec titre */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toutes les factures</h1>
          <p className="text-gray-600 mt-1">
            Vue complète de {isAdmin ? "toutes les factures de l'organisation" : "vos factures"}
          </p>
        </div>

        <button
          onClick={() => void navigate("/upload?returnTo=/invoices")}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une facture
        </button>
      </div>

      {/* Section Filtres */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtre Responsable (Admin uniquement) */}
          {isAdmin && allUsers && (
            <div className="flex-1">
              <label htmlFor="responsable" className="block text-sm font-medium text-gray-700 mb-2">
                Responsable
              </label>
              <select
                id="responsable"
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value ? (e.target.value as Id<"users">) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les techniciens</option>
                {allUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name || user.email || "Utilisateur"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Placeholders pour filtres futurs */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
            <input
              type="text"
              disabled
              placeholder="À venir..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">Montant</label>
            <input
              type="text"
              disabled
              placeholder="À venir..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Tableau Desktop */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        {invoices && invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Facture client
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Émission
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Échéance
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    État
                  </th>
                  {isAdmin && (
                    <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsable
                    </th>
                  )}
                  <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoices.map((invoice) => {
                  const statusDisplay = getStatusDisplay(invoice);
                  return (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">#{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-600">{invoice.clientName}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(invoice.invoiceDate)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap font-medium text-gray-900">
                        {formatCurrency(invoice.amountTTC)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-gray-500">
                        {formatDate(invoice.dueDate)}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.75 rounded-full text-xs font-medium ${statusDisplay.colorClass}`}
                          >
                            {statusDisplay.badgeLabel}
                          </span>
                          {statusDisplay.complement && (
                            <span className="text-sm text-gray-500 pl-2.5">{statusDisplay.complement}</span>
                          )}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-3 whitespace-nowrap text-gray-700">
                          {invoice.creatorName}
                        </td>
                      )}
                      <td className="px-5 py-3 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        {canSendReminder(invoice) && (
                          <button
                            onClick={() => handleSendReminder(invoice)}
                            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                          >
                            Relancer
                          </button>
                        )}
                        {canMarkAsPaid(invoice) && (
                          <button
                            onClick={() => void handleMarkAsPaid(invoice._id)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300 transition-colors"
                          >
                            Marquer payée
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
            <p className="text-gray-500">Aucune facture ne correspond aux critères sélectionnés.</p>
          </div>
        )}
      </div>

      {/* Vue Mobile (Cards) */}
      <div className="block md:hidden space-y-3">
        {invoices && invoices.length > 0 ? (
          invoices.map((invoice) => {
              const statusDisplay = getStatusDisplay(invoice);
              return (
              <div key={invoice._id} className="bg-white rounded-lg border p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">#{invoice.invoiceNumber}</h3>
                    <p className="text-sm text-gray-500">{invoice.clientName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusDisplay.colorClass}`}
                  >
                    {statusDisplay.badgeLabel}
                  </span>
                  {statusDisplay.complement && (
                    <p className="text-xs text-gray-500">{statusDisplay.complement}</p>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span className="text-gray-900">{formatDate(invoice.invoiceDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Montant:</span>
                    <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Échéance:</span>
                    <span className="text-gray-900">{formatDate(invoice.dueDate)}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Responsable:</span>
                      <span className="text-gray-700">{invoice.creatorName}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <div className="flex-1">
                    {canSendReminder(invoice) && (
                      <button
                        onClick={() => handleSendReminder(invoice)}
                        className="w-full bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                      >
                        Relancer
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    {canMarkAsPaid(invoice) && (
                      <button
                        onClick={() => void handleMarkAsPaid(invoice._id)}
                        className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300 transition-colors"
                      >
                        Marquer payée
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
            })
        ) : (
          <div className="bg-white rounded-lg border p-8 text-center">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
            <p className="text-gray-500">Aucune facture ne correspond aux critères sélectionnés.</p>
          </div>
        )}
      </div>

      {/* Modal de relance */}
      {reminderModal && (
        <ReminderModal
          invoice={reminderModal.invoice}
          currentStatus={reminderModal.status}
          onClose={() => setReminderModal(null)}
        />
      )}
    </div>
  );
}
