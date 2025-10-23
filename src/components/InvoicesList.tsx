import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ReminderModal } from "./ReminderModal";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getStatusDisplay, type InvoiceStatus } from "@/lib/invoiceStatus";
import { canSendReminder, canMarkAsPaid } from "@/lib/invoiceHelpers";

interface InvoicesListProps {
  invoices: any[];
  emptyState: React.ReactNode;
}

export function InvoicesList({ invoices, emptyState }: InvoicesListProps) {
  const currentUser = useQuery(api.auth.loggedInUser);
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const [reminderModal, setReminderModal] = useState<{ invoice: any; status: InvoiceStatus } | null>(null);

  const isAdmin = currentUser?.role === "admin";

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

  if (invoices.length === 0) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Tableau Desktop */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
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
      </div>

      {/* Vue Mobile (Cards) */}
      <div className="block md:hidden space-y-3">
        {invoices.map((invoice) => {
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
        })}
      </div>

      {/* Modal de relance */}
      {reminderModal && (
        <ReminderModal
          invoice={reminderModal.invoice}
          currentStatus={reminderModal.status}
          onClose={() => setReminderModal(null)}
        />
      )}
    </>
  );
}
