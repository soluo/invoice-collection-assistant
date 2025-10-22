import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id, Doc } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { StatsNavigation } from "@components/StatsNavigation";
import { ReminderModal } from "@components/ReminderModal";
import { useState } from "react";

type InvoiceStatus = "sent" | "overdue" | "first_reminder" | "second_reminder" | "third_reminder" | "litigation" | "paid";

type InvoiceWithDays = Doc<"invoices"> & {
  daysOverdue: number;
  priority: number;
};

const statusConfig: Record<InvoiceStatus, { label: string; color: string; actionColor: string }> = {
  litigation: { label: "Contentieux", color: "bg-red-100 text-red-800", actionColor: "bg-red-600 hover:bg-red-700" },
  third_reminder: { label: "3e relance", color: "bg-orange-100 text-orange-800", actionColor: "bg-orange-600 hover:bg-orange-700" },
  second_reminder: { label: "2e relance", color: "bg-yellow-100 text-yellow-800", actionColor: "bg-yellow-600 hover:bg-yellow-700" },
  first_reminder: { label: "1re relance", color: "bg-blue-100 text-blue-800", actionColor: "bg-blue-600 hover:bg-blue-700" },
  overdue: { label: "En retard", color: "bg-gray-100 text-gray-800", actionColor: "bg-gray-600 hover:bg-gray-700" },
  sent: { label: "Envoyée", color: "bg-gray-100 text-gray-800", actionColor: "bg-gray-600 hover:bg-gray-700" },
  paid: { label: "Payée", color: "bg-emerald-100 text-emerald-800", actionColor: "bg-emerald-600 hover:bg-emerald-700" },
};

export function Dashboard() {
  const stats = useQuery(api.dashboard.getDashboardStats);
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const currentUser = useQuery(api.auth.loggedInUser);
  const settings = organization; // Alias pour compatibilité
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const navigate = useNavigate();
  const [reminderModal, setReminderModal] = useState<{ invoice: InvoiceWithDays; status: InvoiceStatus } | null>(null);

  const isAdmin = currentUser?.role === "admin";

  const handleMarkAsPaid = async (invoiceId: Id<"invoices">) => {
    try {
      await markAsPaid({ invoiceId });
      toast.success("Facture marquée comme payée");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleSendReminder = (invoice: InvoiceWithDays) => {
    setReminderModal({ invoice, status: invoice.status });
  };

  const getOverdueColorClass = (daysOverdue: number) => {
    if (!settings) return 'text-red-600';

    if (daysOverdue <= settings.firstReminderDelay) {
      return 'text-blue-600';
    } else if (daysOverdue <= settings.secondReminderDelay) {
      return 'text-yellow-600';
    } else if (daysOverdue <= settings.thirdReminderDelay) {
      return 'text-orange-600';
    } else {
      return 'text-red-600 font-semibold';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (stats === undefined) {
    return (
      <div className="space-y-8">
        <StatsNavigation />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bouton Ajouter une facture */}
      <div className="w-full md:flex md:justify-end">
        <button
          onClick={() => void navigate("/upload")}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Ajouter une facture
        </button>
      </div>

      {/* Navigation avec stats */}
      <StatsNavigation />

      {/* Section factures urgentes */}
      {stats.facturesUrgentes.length > 0 ? (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Factures urgentes à traiter
              </h2>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {stats.facturesUrgentes.length} facture{stats.facturesUrgentes.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Agissez rapidement pour améliorer votre trésorerie.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {stats.facturesUrgentes.map((invoice) => (
              <div key={invoice._id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoice.status].color}`}>
                        {statusConfig[invoice.status].label}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-6 text-sm text-gray-500">
                      <span>#{invoice.invoiceNumber}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                      <span>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                      {invoice.daysOverdue > 0 ? (
                        <span className={`font-medium ${getOverdueColorClass(invoice.daysOverdue)}`}>
                          {invoice.daysOverdue} jour{invoice.daysOverdue > 1 ? 's' : ''} de retard
                        </span>
                      ) : (
                        <span></span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="mt-2 text-xs text-gray-500">
                        Créé par: <span className="text-gray-700 font-medium">{invoice.creatorName}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 sm:flex-shrink-0">
                    {invoice.status !== "litigation" && (
                      <button
                        onClick={() => handleSendReminder(invoice)}
                        className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        Relancer
                      </button>
                    )}
                    <button
                      onClick={() => void handleMarkAsPaid(invoice._id)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200 border border-gray-300 transition-colors"
                    >
                      Marquer payé
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="mx-auto h-16 w-16 text-green-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Félicitations, vous gérez bien votre tréso !</h3>
          <p className="text-gray-500">Aucune facture urgente à traiter.</p>
        </div>
      )}

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
