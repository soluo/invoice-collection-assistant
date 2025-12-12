import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import StatsCards from "@/components/mainView/StatsCards";
import TabFilterBar from "@/components/mainView/TabFilterBar";
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
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Invoices</h1>
          <p className="text-slate-500 mt-1">Manage your payments and automate client reminders.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export
          </button>
          <button className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards
        totalOngoing={stats?.totalOngoing || 0}
        totalOverdue={stats?.totalOverdue || 0}
        totalPaidLast30Days={stats?.totalPaidLast30Days || 0}
      />

      {/* Desktop: Table Container */}
      <div className="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        {/* Toolbar intégrée */}
        <TabFilterBar
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showUserFilter={isAdmin}
          selectedUserId={selectedUserId}
          onUserFilterChange={setSelectedUserId}
          users={teamMembers}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />

        {/* Loading / Empty states */}
        {invoices === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune facture trouvée
          </div>
        ) : (
          <>
            {/* Table desktop */}
            <div className="overflow-x-auto custom-scrollbar">
              <div className="min-w-[900px]">
                {/* Header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1.2fr_1.5fr] gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div>Facture / Client</div>
                  <div>Date facture</div>
                  <div>État</div>
                  <div>Montant</div>
                  <div>Prochain rappel</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Rows */}
                {invoices.map((invoice) => (
                  <InvoiceTableRow
                    key={invoice._id}
                    invoice={invoice}
                    onAction={handleAction}
                  />
                ))}
              </div>
            </div>

            {/* Pagination */}
            <div className="bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Affichage de <span className="font-bold text-slate-800">{invoices?.length || 0}</span> résultats
              </p>
            </div>
          </>
        )}
      </div>

      {/* Mobile: Filters + Cards (no container) */}
      <div className="md:hidden space-y-4">
        {/* Toolbar mobile */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
          <TabFilterBar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            showUserFilter={isAdmin}
            selectedUserId={selectedUserId}
            onUserFilterChange={setSelectedUserId}
            users={teamMembers}
            sortBy={sortBy}
            onSortByChange={setSortBy}
          />
        </div>

        {/* Loading / Empty states */}
        {invoices === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune facture trouvée
          </div>
        ) : (
          <>
            {/* Cards mobile */}
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <InvoiceTableCard
                  key={invoice._id}
                  invoice={invoice}
                  onAction={handleAction}
                />
              ))}
            </div>

            {/* Pagination mobile */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-card px-4 py-3">
              <p className="text-sm text-slate-500 text-center">
                Affichage de <span className="font-bold text-slate-800">{invoices?.length || 0}</span> résultats
              </p>
            </div>
          </>
        )}
      </div>

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
