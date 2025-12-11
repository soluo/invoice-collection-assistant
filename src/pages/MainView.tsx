import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import StatsCards from "@/components/mainView/StatsCards";
import FilterBar from "@/components/mainView/FilterBar";
import InvoiceTableRow from "@/components/mainView/InvoiceTableRow";
import InvoiceTableCard from "@/components/mainView/InvoiceTableCard";
import EmailPreviewModal from "@/components/modals/EmailPreviewModal";
import MarkAsPaidModal from "@/components/modals/MarkAsPaidModal";
import RecordPaymentModal from "@/components/modals/RecordPaymentModal";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MainView() {
  // États
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedUserId, setSelectedUserId] = useState("all");

  // États pour les modals
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [markAsPaidOpen, setMarkAsPaidOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  // Mutations
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const sendReminder = useMutation(api.invoices.sendReminder);

  // Queries
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = loggedInUser?.role === "admin";

  const stats = useQuery(api.invoices.getStatsForMainView);

  const invoices = useQuery(api.invoices.listInvoicesWithFilters, {
    searchQuery: searchQuery || undefined,
    statusFilter: statusFilter !== "all" ? (statusFilter as any) : undefined,
    sortBy: sortBy as any,
    filterByUserId:
      isAdmin && selectedUserId !== "all" ? (selectedUserId as any) : undefined,
  });

  const teamMembers = useQuery(isAdmin ? api.users.listTeamMembers : "skip");

  // Handlers
  const handleAction = (action: string, invoiceId: string) => {
    const invoice = invoices?.find((inv) => inv._id === invoiceId);
    if (!invoice) return;

    setSelectedInvoice(invoice);

    if (action === "markAsSent") {
      // TODO: Ouvrir modal pour marquer comme envoyée
      toast.info("Fonctionnalité à implémenter : marquer comme envoyée");
    } else if (action === "recordPayment") {
      setRecordPaymentOpen(true);
    }
  };

  // Handlers pour les confirmations des modals
  const handleConfirmEmailSend = async () => {
    if (!selectedInvoice) return;

    try {
      await sendReminder({
        invoiceId: selectedInvoice._id,
        emailSubject:
          selectedReminder?.emailSubject ||
          `Relance facture ${selectedInvoice.invoiceNumber}`,
        emailContent: selectedReminder?.emailContent || "",
      });

      toast.success("Relance envoyée avec succès");
      setEmailPreviewOpen(false);
      setSelectedInvoice(null);
      setSelectedReminder(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de la relance");
    }
  };

  const handleConfirmMarkAsPaid = async (invoiceId: string, paidDate: string) => {
    try {
      await markAsPaid({ invoiceId: invoiceId as any });
      toast.success("Facture marquée comme payée");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleConfirmRecordPayment = async (data: any) => {
    try {
      // TODO: Implémenter la mutation recordPayment
      console.log("Record payment:", data);
      toast.success("Paiement enregistré avec succès");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <StatsCards
        totalOngoing={stats?.totalOngoing || 0}
        totalOverdue={stats?.totalOverdue || 0}
        totalPaidLast30Days={stats?.totalPaidLast30Days || 0}
      />

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterStatus={statusFilter}
        onFilterStatusChange={setStatusFilter}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        showStatusFilter={true}
        showUserFilter={isAdmin}
        selectedUserId={selectedUserId}
        onUserFilterChange={setSelectedUserId}
        users={teamMembers}
      />

      {/* Invoice Table */}
      {invoices === undefined ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucune facture trouvée
        </div>
      ) : (
        <div className="space-y-2">
          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
              <div>Facture / Client</div>
              <div>Date facture</div>
              <div>État</div>
              <div>Montant</div>
              <div>Prochain rappel</div>
              <div className="text-right">Actions</div>
            </div>

            {/* Table rows */}
            {invoices.map((invoice) => (
              <InvoiceTableRow
                key={invoice._id}
                invoice={invoice}
                onAction={handleAction}
              />
            ))}
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {invoices.map((invoice) => (
              <InvoiceTableCard
                key={invoice._id}
                invoice={invoice}
                onAction={handleAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals (réutiliser les existants) */}
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => {
          setRecordPaymentOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onConfirm={handleConfirmRecordPayment}
      />

      <MarkAsPaidModal
        open={markAsPaidOpen}
        onClose={() => {
          setMarkAsPaidOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onConfirm={handleConfirmMarkAsPaid}
      />

      <EmailPreviewModal
        open={emailPreviewOpen}
        onClose={() => {
          setEmailPreviewOpen(false);
          setSelectedReminder(null);
          setSelectedInvoice(null);
        }}
        reminder={selectedReminder}
        onConfirm={handleConfirmEmailSend}
      />
    </div>
  );
}
