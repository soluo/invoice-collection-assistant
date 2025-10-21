import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { StatsNavigation } from "@components/StatsNavigation";

export function PaidInvoices() {
  const invoices = useQuery(api.invoices.listPaid);
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const settings = organization; // Alias pour compatibilité
  const navigate = useNavigate();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getPaymentDelayInfo = (invoice: any) => {
    if (!invoice.paidDate || !settings) return null;

    const dueDate = new Date(invoice.dueDate);
    const paidDate = new Date(invoice.paidDate);
    const daysPaid = Math.floor((paidDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let colorClass = '';
    if (daysPaid <= settings.firstReminderDelay) {
      colorClass = 'text-green-600';
    } else if (daysPaid <= settings.secondReminderDelay) {
      colorClass = 'text-yellow-600';
    } else if (daysPaid <= settings.thirdReminderDelay) {
      colorClass = 'text-orange-600';
    } else {
      colorClass = 'text-red-600';
    }

    return {
      daysPaid,
      colorClass,
      text: daysPaid <= 0 ? `en ${Math.abs(daysPaid)} jour${Math.abs(daysPaid) > 1 ? 's' : ''} d'avance` : `en ${daysPaid} jour${daysPaid > 1 ? 's' : ''}`
    };
  };

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
      {invoices.length > 0 ? (
        <div className="bg-white rounded-lg border">
          <div className="p-6 border-b">
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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-6 text-sm text-gray-500">
                      <span>#{invoice.invoiceNumber}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                      <span>Échéance: {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</span>
                      {invoice.paidDateFormatted ? (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">
                            Payée le {invoice.paidDateFormatted}
                          </span>
                          {(() => {
                            const delayInfo = getPaymentDelayInfo(invoice);
                            return delayInfo && (
                              <span className={`font-medium ${delayInfo.colorClass}`}>
                                {delayInfo.text}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center text-green-600">
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
