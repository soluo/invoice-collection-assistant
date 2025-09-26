import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ArrowLeft } from "lucide-react";

type Route = "/" | "/ongoing" | "/paid" | "/settings";

interface PaidInvoicesProps {
  onNavigate: (route: Route) => void;
}

export function PaidInvoices({ onNavigate }: PaidInvoicesProps) {
  const invoices = useQuery(api.invoices.listPaid);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (invoices === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onNavigate("/")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Retour au dashboard</span>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures payées</h1>
          <p className="text-gray-600">Vos factures réglées</p>
        </div>
      </div>

      {/* Liste des factures */}
      {invoices.length > 0 ? (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Factures payées
              </h2>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full">
                {invoices.length} facture{invoices.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Vos factures réglées
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {invoices.map((invoice) => (
              <div key={invoice._id} className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Payée
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-gray-500">
                      <span>Facture #{invoice.invoiceNumber}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                      <span>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                      {invoice.paidDateFormatted && (
                        <span className="text-green-600 font-medium">
                          Payée le {invoice.paidDateFormatted}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture payée</h3>
          <p className="text-gray-500">Aucune facture payée pour le moment.</p>
        </div>
      )}
    </div>
  );
}