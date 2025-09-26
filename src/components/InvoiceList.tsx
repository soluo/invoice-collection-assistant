import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { InvoiceEditModal } from "./InvoiceEditModal";
import { ReminderModal } from "./ReminderModal";
import { toast } from "sonner";

const statusConfig = {
  litigation: { label: "Contentieux", color: "bg-red-100 text-red-800", priority: 0 },
  third_reminder: { label: "3e relance", color: "bg-orange-100 text-orange-800", priority: 1 },
  second_reminder: { label: "2e relance", color: "bg-yellow-100 text-yellow-800", priority: 2 },
  first_reminder: { label: "1re relance", color: "bg-blue-100 text-blue-800", priority: 3 },
  overdue: { label: "En retard", color: "bg-gray-100 text-gray-800", priority: 4 },
  sent: { label: "Envoyée", color: "bg-gray-100 text-gray-800", priority: 5 },
  paid: { label: "Payée", color: "bg-emerald-100 text-emerald-800", priority: 6 },
};

export function InvoiceList() {
  const invoices = useQuery(api.invoices.list);
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const updateStatus = useMutation(api.invoices.updateStatus);
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [reminderModal, setReminderModal] = useState<{ invoice: any; status: string } | null>(null);

  if (invoices === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400 mb-4">
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
        <p className="text-gray-500">Commencez par ajouter votre première facture.</p>
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
    setReminderModal({ invoice, status: invoice.status });
  };

  const handleDelete = async (invoiceId: Id<"invoices">) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.")) {
      try {
        await deleteInvoice({ invoiceId });
        toast.success("Facture supprimée");
      } catch (error) {
        toast.error("Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Version mobile */}
      <div className="block md:hidden space-y-3">
        {invoices.map((invoice) => (
          <div key={invoice._id} className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                <p className="text-sm text-gray-500">Facture #{invoice.invoiceNumber}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[invoice.status].color}`}>
                {statusConfig[invoice.status].label}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Montant:</span>
              <span className="font-medium">{invoice.amountTTC.toFixed(2)} €</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Échéance:</span>
              {invoice.daysOverdue > 0 ? (
                <span className="font-medium text-red-600">{invoice.daysOverdue} jours</span>
              ) : (
                <span className="text-gray-500">
                  {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {invoice.status !== "paid" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleMarkAsPaid(invoice._id)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-green-700"
                  >
                    Marquer payé
                  </button>
                  {invoice.status !== "litigation" && (
                    <button
                      onClick={() => handleSendReminder(invoice)}
                      className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Relancer
                    </button>
                  )}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingInvoice(invoice)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Modifier
                </button>
                <button
                  onClick={() => handleDelete(invoice._id)}
                  className="px-3 py-2 border border-red-300 rounded text-sm font-medium text-red-700 hover:bg-red-50"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Version desktop */}
      <div className="hidden md:block bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facture #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Echéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{invoice.clientName}</div>
                      <div className="text-sm text-gray-500">{invoice.clientEmail}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.amountTTC.toFixed(2)} €
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {invoice.daysOverdue > 0 ? (
                      <span className="text-red-600 font-medium">{invoice.daysOverdue} jours</span>
                    ) : (
                      <span className="text-gray-500">
                        {new Date(invoice.dueDate).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusConfig[invoice.status].color}`}>
                      {statusConfig[invoice.status].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    {invoice.status !== "paid" && (
                      <>
                        <button
                          onClick={() => handleMarkAsPaid(invoice._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Marquer payé
                        </button>
                        {invoice.status !== "litigation" && (
                          <button
                            onClick={() => handleSendReminder(invoice)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Relancer
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => setEditingInvoice(invoice)}
                      className="text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded text-xs"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(invoice._id)}
                      className="text-red-600 hover:text-red-900 px-2 py-1 border border-red-300 rounded text-xs hover:bg-red-50"
                      title="Supprimer"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingInvoice && (
        <InvoiceEditModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
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
