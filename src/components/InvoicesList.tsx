import { Badge } from '@components/ui/badge.tsx'
import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { ReminderModal } from "./ReminderModal";
import { MarkAsSentModal } from "./MarkAsSentModal";
import { PaymentRecordModal } from "./PaymentRecordModal";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { getStatusDisplay, type InvoiceStatus } from "@/lib/invoiceStatus";
import { canSendReminder, canMarkAsPaid } from "@/lib/invoiceHelpers";
import { ArrowUpDown, ArrowUp, ArrowDown, MoreVertical } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortField = "invoiceDate" | "amountTTC" | "outstandingBalance" | "dueDate";
type SortOrder = "asc" | "desc";

interface InvoicesListProps {
  invoices: any[];
  sortBy: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  emptyState: React.ReactNode;
}

const ITEMS_PER_PAGE = 20;

export function InvoicesList({ invoices, sortBy, sortOrder, onSort, emptyState }: InvoicesListProps) {
  const currentUser = useQuery(api.auth.loggedInUser);
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const markAsSent = useMutation(api.invoices.markAsSent);
  const recordPayment = useMutation(api.payments.recordPayment);
  const [reminderModal, setReminderModal] = useState<{ invoice: any; status: InvoiceStatus } | null>(null);
  const [markAsSentModal, setMarkAsSentModal] = useState<{ invoice: any } | null>(null);
  const [paymentModal, setPaymentModal] = useState<{ invoice: any } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = currentUser?.role === "admin";

  // Composant pour afficher l'icône de tri
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortOrder === "desc" ? (
      <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
    ) : (
      <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
    );
  };

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

  const handleMarkAsSent = (invoice: any) => {
    setMarkAsSentModal({ invoice });
  };

  const handleConfirmMarkAsSent = async (sentDate: string) => {
    if (!markAsSentModal) return;

    try {
      await markAsSent({
        invoiceId: markAsSentModal.invoice._id,
        sentDate
      });
      toast.success("Facture marquée comme envoyée");
      setMarkAsSentModal(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleRecordPayment = (invoice: any) => {
    setPaymentModal({ invoice });
  };

  const handleConfirmPayment = async (payments: Array<{
    type: "bank_transfer" | "check";
    amount: number;
    receivedDate?: string;
    expectedDepositDate?: string;
    notes?: string;
  }>) => {
    if (!paymentModal) return;

    try {
      await recordPayment({
        invoiceId: paymentModal.invoice._id,
        payments,
      });
      toast.success("Paiement enregistré avec succès");
      setPaymentModal(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement du paiement");
    }
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
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => onSort("invoiceDate")}
                >
                  <div className="flex items-center">
                    Émission
                    <SortIcon field="invoiceDate" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => onSort("amountTTC")}
                >
                  <div className="flex items-center">
                    Montant TTC
                    <SortIcon field="amountTTC" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => onSort("outstandingBalance")}
                >
                  <div className="flex items-center">
                    Solde Dû
                    <SortIcon field="outstandingBalance" />
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => onSort("dueDate")}
                >
                  <div className="flex items-center">
                    Échéance
                    <SortIcon field="dueDate" />
                  </div>
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
                // Solde dû vient du backend
                const outstandingBalance = invoice.outstandingBalance ?? 0;

                return (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        #{invoice.invoiceNumber}
                      </Link>
                      <div className="text-sm text-gray-500">{invoice.clientName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(invoice.invoiceDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(invoice.amountTTC)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={
                        invoice.paymentStatus === "paid"
                          ? "text-green-700"
                          : invoice.isOverdue
                            ? "text-red-700"
                            : "text-gray-900"
                      }>
                        {formatCurrency(outstandingBalance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(invoice.dueDate)}
                      </div>
                      {invoice.isOverdue && invoice.paymentStatus !== "paid" && invoice.daysPastDue > 0 && (
                        <div className="text-sm text-red-700">
                          En retard de {invoice.daysPastDue} jour{invoice.daysPastDue > 1 ? "s" : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline"
                        className={`${statusDisplay.colorClass}`}
                      >
                        {statusDisplay.badgeLabel}
                      </Badge>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {invoice.creatorName}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/invoices/${invoice._id}`}
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Voir
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-gray-100 rounded-md transition-colors">
                              <MoreVertical className="h-4 w-4 text-gray-500" />
                              <span className="sr-only">Actions</span>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleMarkAsSent(invoice)}
                              disabled={invoice.sendStatus === "sent"}
                            >
                              Marquer comme envoyée
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleRecordPayment(invoice)}
                              disabled={invoice.paymentStatus === "paid"}
                            >
                              Enregistrer un paiement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => void handleMarkAsPaid(invoice._id)}
                              disabled={!canMarkAsPaid(invoice)}
                            >
                              Marquer comme payée
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
          // ✅ V2 : Solde dû vient du backend
          const outstandingBalance = invoice.outstandingBalance ?? 0;

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
                    invoice.paymentStatus === "paid"
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
                  <div className="text-right">
                    <div className="font-medium">
                      {formatDate(invoice.dueDate)}
                    </div>
                    {invoice.isOverdue && invoice.paymentStatus !== "paid" && invoice.daysPastDue > 0 && (
                      <div className="text-xs text-red-600">
                        En retard de {invoice.daysPastDue} jour{invoice.daysPastDue > 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
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
        <div className="mt-6 flex flex-col lg:flex-row gap-3 items-center justify-between bg-white border rounded-lg p-4">
          <div className="text-sm text-gray-700 w-full max-lg:text-center">
            Page {currentPage} sur {totalPages} ({invoices.length} factures au total)
          </div>
          <Pagination className="w-auto">
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

      {/* Modal "Marquer comme envoyée" */}
      {markAsSentModal && (
        <MarkAsSentModal
          isOpen={true}
          onClose={() => setMarkAsSentModal(null)}
          onConfirm={handleConfirmMarkAsSent}
          defaultDate={markAsSentModal.invoice.invoiceDate}
        />
      )}

      {/* Modal "Enregistrer un paiement" */}
      {paymentModal && (
        <PaymentRecordModal
          isOpen={true}
          onClose={() => setPaymentModal(null)}
          invoice={paymentModal.invoice}
          onConfirm={handleConfirmPayment}
        />
      )}
    </>
  );
}
