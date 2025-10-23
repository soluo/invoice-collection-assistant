import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { StatsNavigation } from "@components/StatsNavigation";
import { InvoicesList } from "@components/InvoicesList";

export function Dashboard() {
  const stats = useQuery(api.dashboard.getDashboardStats);
  const navigate = useNavigate();

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
      <div className="space-y-4">
        <div className="bg-white p-6 border rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Factures urgentes à traiter
            </h2>
            {stats.facturesUrgentes.length > 0 && (
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {stats.facturesUrgentes.length} facture{stats.facturesUrgentes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Agissez rapidement pour améliorer votre trésorerie.
          </p>
        </div>

        <InvoicesList
          invoices={stats.facturesUrgentes}
          emptyState={
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 text-green-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Félicitations, vous gérez bien votre tréso !</h3>
              <p className="text-gray-500">Aucune facture urgente à traiter.</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
