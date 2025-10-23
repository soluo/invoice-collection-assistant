import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { StatsNavigation } from "@components/StatsNavigation";
import { InvoicesList } from "@components/InvoicesList";

export function OngoingInvoices() {
  const invoices = useQuery(api.invoices.listOngoing);
  const navigate = useNavigate();

  if (invoices === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Bouton Ajouter une facture */}
      <div className="w-full md:flex md:justify-end">
        <button
          onClick={() => navigate("/upload")}
          className="w-full md:w-auto bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Ajouter une facture
        </button>
      </div>

      {/* Navigation avec stats */}
      <StatsNavigation />

      {/* Liste des factures */}
      <div className="space-y-4">
        <div className="bg-white p-6 border rounded-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Factures en cours
            </h2>
            {invoices.length > 0 && (
              <span className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {invoices.length} facture{invoices.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Vos factures en attente de paiement
          </p>
        </div>

        <InvoicesList
          invoices={invoices}
          emptyState={
            <div className="p-8 text-center">
              <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture en attente</h3>
              <p className="text-gray-500">Aucune facture en attente de paiement pour le moment.</p>
            </div>
          }
        />
      </div>
    </div>
  );
}
