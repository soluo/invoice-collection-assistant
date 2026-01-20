import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useInvoiceDrawerUrl } from "@/hooks/useInvoiceDrawerUrl";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";

// Types inférés depuis les queries Convex
type Invoice = NonNullable<FunctionReturnType<typeof api.invoices.listInvoicesWithFilters>>[number];
import StatsCards from "@/components/mainView/StatsCards";
import TabFilterBar from "@/components/mainView/TabFilterBar";
import InvoiceTableRow from "@/components/mainView/InvoiceTableRow";
import InvoiceTableCard from "@/components/mainView/InvoiceTableCard";
import EmailPreviewModal from "@/components/modals/EmailPreviewModal";
import MarkAsPaidModal from "@/components/modals/MarkAsPaidModal";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import { MarkAsSentModal } from "@/components/MarkAsSentModal";
import { InvoiceDetailDrawer } from "@/components/InvoiceDetailDrawer";
import { InvoiceEditModal } from "@/components/InvoiceEditModal";
import { SendInvoiceEmailModal } from "@/components/SendInvoiceEmailModal";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isAdminRole } from "@/lib/utils";

export default function MainView() {
  const navigate = useNavigate();

  // URL-synced drawer state (shareable URLs, back/forward navigation)
  const { selectedInvoiceId: selectedInvoiceForDrawer, setSelectedInvoiceId: setSelectedInvoiceForDrawer } = useInvoiceDrawerUrl();

  // États
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");
  const [selectedUserId, setSelectedUserId] = useState("all");

  // Debounce de la recherche (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // États pour les modals
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [markAsPaidOpen, setMarkAsPaidOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [markAsSentOpen, setMarkAsSentOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [sendInvoiceEmailOpen, setSendInvoiceEmailOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReminder, setSelectedReminder] = useState<{ emailSubject?: string; emailContent?: string } | null>(null);

  // Mutations
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const markAsSent = useMutation(api.invoices.markAsSent);
  const sendReminder = useMutation(api.invoices.sendReminder);

  // Queries
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const isAdmin = isAdminRole(loggedInUser?.role);

  const stats = useQuery(api.invoices.getStatsForMainView);

  const invoices = useQuery(api.invoices.listInvoicesWithFilters, {
    searchQuery: debouncedSearchQuery || undefined,
    statusFilter: statusFilter !== "all" ? (statusFilter as any) : undefined,
    sortBy: sortBy as any,
    filterByUserId:
      isAdmin && selectedUserId !== "all" ? (selectedUserId as any) : undefined,
  });

  const teamMembers = useQuery(api.users.listTeamMembers, isAdmin ? {} : "skip");

  // Handlers
  const handleAction = (action: string, invoiceId: string) => {
    const invoice = invoices?.find((inv) => inv._id === invoiceId);
    if (!invoice) return;

    setSelectedInvoice(invoice);

    if (action === "markAsSent") {
      setMarkAsSentOpen(true);
    } else if (action === "sendInvoiceEmail") {
      setSendInvoiceEmailOpen(true);
    } else if (action === "recordPayment") {
      setRecordPaymentOpen(true);
    } else if (action === "edit") {
      setEditModalOpen(true);
    }
  };

  const handleInvoiceClick = (invoiceId: string) => {
    setSelectedInvoiceForDrawer(invoiceId as Id<"invoices">);
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

  const handleConfirmMarkAsSent = async (sentDate: string) => {
    if (!selectedInvoice) return;

    try {
      await markAsSent({
        invoiceId: selectedInvoice._id,
        sentDate,
      });
      toast.success("Facture marquée comme envoyée");
      setMarkAsSentOpen(false);
      setSelectedInvoice(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      toast.error(errorMessage);
    }
  };

  const handleCloseRecordPayment = () => {
    setRecordPaymentOpen(false);
    setSelectedInvoice(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Factures</h1>
          <p className="text-slate-500 mt-1">Gérez vos paiements et automatisez vos relances clients.</p>
        </div>
        <button
          onClick={() => navigate("/upload?returnTo=/invoices")}
          className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle facture
        </button>
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
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_220px] gap-4 px-6 py-4 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div>Facture / Client</div>
                  <div>Date facture</div>
                  <div>État</div>
                  <div className="text-right">Montant / Échéance</div>
                  <div>Prochain rappel</div>
                  <div className="text-right">Actions</div>
                </div>

                {/* Rows */}
                {invoices.map((invoice) => (
                  <InvoiceTableRow
                    key={invoice._id}
                    invoice={invoice}
                    onAction={handleAction}
                    onInvoiceClick={handleInvoiceClick}
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
        <div>
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
                  onInvoiceClick={handleInvoiceClick}
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

      {/* Record Payment Modal - Story 1.5 */}
      {recordPaymentOpen && selectedInvoice && (
        <RecordPaymentModal
          invoiceId={selectedInvoice._id}
          invoiceNumber={selectedInvoice.invoiceNumber}
          amountTTC={selectedInvoice.amountTTC}
          outstandingBalance={selectedInvoice.outstandingBalance}
          onClose={handleCloseRecordPayment}
        />
      )}

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

      {/* Mark as Sent Modal */}
      {selectedInvoice && (
        <MarkAsSentModal
          isOpen={markAsSentOpen}
          onClose={() => {
            setMarkAsSentOpen(false);
            setSelectedInvoice(null);
          }}
          onConfirm={handleConfirmMarkAsSent}
          defaultDate={selectedInvoice.invoiceDate}
        />
      )}

      {/* Edit Invoice Modal */}
      {editModalOpen && selectedInvoice && (
        <InvoiceEditModal
          invoice={selectedInvoice}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Send Invoice Email Modal - Story 7.1 */}
      {sendInvoiceEmailOpen && selectedInvoice && (
        <SendInvoiceEmailModal
          invoiceId={selectedInvoice._id}
          onClose={() => {
            setSendInvoiceEmailOpen(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        invoiceId={selectedInvoiceForDrawer}
        open={selectedInvoiceForDrawer !== null}
        onOpenChange={(open) => !open && setSelectedInvoiceForDrawer(null)}
      />
    </div>
  );
}
