import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ReminderModal } from "./ReminderModal";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getStatusDisplay, type InvoiceStatus } from "@/lib/invoiceStatus";
import { canSendReminder, canMarkAsPaid } from "@/lib/invoiceHelpers";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface InvoicesListProps {
  invoices: any[];
  emptyState: React.ReactNode;
}

const ITEMS_PER_PAGE = 20;

export function InvoicesList({ invoices, emptyState }: InvoicesListProps) {
  const currentUser = useQuery(api.auth.loggedInUser);
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const [reminderModal, setReminderModal] = useState<{ invoice: any; status: InvoiceStatus } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = currentUser?.role === "admin";

  // ✅ V2 : Pagination côté client
  const totalPages = Math.ceil(invoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return invoices.slice(startIndex, endIndex);
  }, [invoices, currentPage]);

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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Facture client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Émission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant TTC
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solde Dû
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                {isAdmin && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsable
                  </th>
                )}
                <th className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedInvoices.map((invoice) => {
                const statusDisplay = getStatusDisplay(invoice);
                // ✅ V2 : Calculer le solde dû
                const outstandingBalance = invoice.outstandingBalance ?? invoice.amountTTC - (invoice.paidAmount || 0);
                const isPartiallyPaid = invoice.status === "partial_payment" || (invoice.paidAmount && invoice.paidAmount > 0 && invoice.paidAmount < invoice.amountTTC);

                return (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    {/* ✅ V2 : Colonne N° Facture + Client regroupée */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">#{invoice.invoiceNumber}</div>
                      <div className="text-sm text-gray-500">{invoice.clientName}</div>
                    </td>
                    {/* ✅ V2 : Colonne Émission (Date d'émission) */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.amountTTC)}
                    </td>
                    {/* ✅ V2 : Colonne Solde dû */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={
                        invoice.status === "paid"
                          ? "text-green-700"
                          : isPartiallyPaid
                            ? "text-orange-700"
                            : (invoice.daysOverdue ?? 0) > 0
                              ? "text-red-700"
                              : "text-gray-900"
                      }>
                        {formatCurrency(outstandingBalance)}
                      </span>
                    </td>
                    {/* ✅ V2 : Colonne Échéance avec complément */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatDate(invoice.dueDate)}</div>
                      {statusDisplay.complement && (
                        <div className={`text-sm ${
                          invoice.status === "paid" || isPartiallyPaid
                            ? "text-gray-500"
                            : invoice.status === "litigation" || (invoice.daysOverdue ?? 0) > 0
                              ? "text-red-600"
                              : "text-blue-600"
                        }`}>
                          {statusDisplay.complement}
                        </div>
                      )}
                    </td>
                    {/* ✅ V2 : Colonne Statut avec juste le badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${statusDisplay.colorClass}`}
                      >
                        {statusDisplay.badgeLabel}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {invoice.creatorName}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <a href="#" className="text-indigo-600 hover:text-indigo-900">Voir</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ V2 : Vue Mobile (Cards) */}
      <div className="block md:hidden space-y-3">
        {paginatedInvoices.map((invoice) => {
          const statusDisplay = getStatusDisplay(invoice);
          // ✅ V2 : Calculer le solde dû
          const outstandingBalance = invoice.outstandingBalance ?? invoice.amountTTC - (invoice.paidAmount || 0);
          const isPartiallyPaid = invoice.status === "partial_payment" || (invoice.paidAmount && invoice.paidAmount > 0 && invoice.paidAmount < invoice.amountTTC);

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
                  <span className="text-gray-500">Montant TTC:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(invoice.amountTTC)}</span>
                </div>
                {/* ✅ V2 : Afficher le solde dû */}
                <div className="flex justify-between">
                  <span className="text-gray-500">Solde dû:</span>
                  <span className={`font-semibold ${
                    invoice.status === "paid"
                      ? "text-green-600"
                      : isPartiallyPaid
                        ? "text-orange-600"
                        : "text-gray-900"
                  }`}>
                    {formatCurrency(outstandingBalance)}
                  </span>
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

      {/* ✅ V2 : Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-700">
            Page {currentPage} sur {totalPages} ({invoices.length} factures au total)
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>

              {/* Pages numérotées */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Afficher la première page, la dernière page, et les pages autour de la page courante
                const showPage = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                const showEllipsis = (page === 2 && currentPage > 3) || (page === totalPages - 1 && currentPage < totalPages - 2);

                if (showEllipsis) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  );
                }

                if (!showPage) return null;

                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

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
