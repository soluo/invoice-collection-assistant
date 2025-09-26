import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";

const statusConfig = {
  litigation: { label: "Contentieux", color: "bg-red-100 text-red-800", actionColor: "bg-red-600 hover:bg-red-700" },
  third_reminder: { label: "3e relance", color: "bg-orange-100 text-orange-800", actionColor: "bg-orange-600 hover:bg-orange-700" },
  second_reminder: { label: "2e relance", color: "bg-yellow-100 text-yellow-800", actionColor: "bg-yellow-600 hover:bg-yellow-700" },
  first_reminder: { label: "1re relance", color: "bg-blue-100 text-blue-800", actionColor: "bg-blue-600 hover:bg-blue-700" },
  overdue: { label: "En retard", color: "bg-gray-100 text-gray-800", actionColor: "bg-gray-600 hover:bg-gray-700" },
  sent: { label: "Envoyée", color: "bg-gray-100 text-gray-800", actionColor: "bg-gray-600 hover:bg-gray-700" },
  paid: { label: "Payée", color: "bg-emerald-100 text-emerald-800", actionColor: "bg-emerald-600 hover:bg-emerald-700" },
};

type Route = "/" | "/ongoing" | "/paid" | "/settings";

interface DashboardProps {
  onNavigate: (route: Route) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const stats = useQuery(api.dashboard.getDashboardStats);
  const markAsPaid = useMutation(api.invoices.markAsPaid);

  if (stats === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleMarkAsPaid = async (invoiceId: Id<"invoices">) => {
    try {
      await markAsPaid({ invoiceId });
      toast.success("Facture marquée comme payée");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleSendReminder = (invoice: any) => {
    // Pour l'instant, on redirige vers la liste des factures
    // Plus tard on pourra implémenter une modal de relance directement ici
    onNavigate("/");
    toast.info("Fonctionnalité de relance en cours de développement");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-8">

      {/* Métriques principales - Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Montant à recouvrir - Navigation vers Dashboard */}
        <button
          onClick={() => onNavigate("/")}
          className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">À recouvrir</h3>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totaux.montantARecouvrir)}</p>
              <p className="text-sm text-gray-500">{stats.nombreFacturesEnRetard} facture{stats.nombreFacturesEnRetard > 1 ? 's' : ''}</p>
            </div>
          </div>
        </button>

        {/* Montant en cours - Navigation vers /ongoing */}
        <button
          onClick={() => onNavigate("/ongoing")}
          className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">En cours</h3>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totaux.montantEnCours)}</p>
              <p className="text-sm text-gray-500">À venir</p>
            </div>
          </div>
        </button>

        {/* Montant payé - Navigation vers /paid */}
        <button
          onClick={() => onNavigate("/paid")}
          className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Payé</h3>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totaux.montantPaye)}</p>
              <p className="text-sm text-gray-500">Encaissé</p>
            </div>
          </div>
        </button>
      </div>

      {/* Grille desktop : Factures urgentes (2/3) + Actions rapides (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Section factures urgentes - 2/3 sur desktop */}
        <div className="lg:col-span-2">
          {stats.facturesUrgentes.length > 0 ? (
            <div className="bg-white rounded-lg border">
              <div className="p-6 border-b border-gray-200">
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
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-500">
                          <span>Facture #{invoice.invoiceNumber}</span>
                          <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                          {invoice.daysOverdue > 0 && (
                            <span className="font-medium text-red-600">
                              {invoice.daysOverdue} jour{invoice.daysOverdue > 1 ? 's' : ''} de retard
                            </span>
                          )}
                        </div>
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
                          onClick={() => handleMarkAsPaid(invoice._id)}
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
        </div>

        {/* Actions rapides - 1/3 sur desktop */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => onNavigate("/ongoing")}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Factures en cours
              </button>
              <button
                onClick={() => onNavigate("/paid")}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Factures payées
              </button>
              <button
                onClick={() => onNavigate("/settings")}
                className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Paramètres
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
