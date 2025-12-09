import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import StatsCards from "@/components/mainView/StatsCards";
import FilterBar from "@/components/mainView/FilterBar";
import InvoiceRow from "@/components/mainView/InvoiceRow";
import InvoiceCard from "@/components/mainView/InvoiceCard";
import AutoRemindersView from "@/components/mainView/AutoRemindersView";
import EmailPreviewModal from "@/components/modals/EmailPreviewModal";
import MarkAsPaidModal from "@/components/modals/MarkAsPaidModal";
import RecordPaymentModal from "@/components/modals/RecordPaymentModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function MainView() {
  const [activeTab, setActiveTab] = useState("to_handle");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("dueDate");

  // États pour les modals
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [markAsPaidOpen, setMarkAsPaidOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedReminder, setSelectedReminder] = useState<any>(null);

  // Mutations
  const markAsPaid = useMutation(api.invoices.markAsPaid);
  const sendReminder = useMutation(api.invoices.sendReminder);

  // Queries pour les factures
  const toHandleInvoices = useQuery(api.invoices.listForMainView, {
    tab: "to_handle",
    searchQuery: searchQuery || undefined,
    filterStatus: filterStatus !== "all" ? (filterStatus as any) : undefined,
    sortBy: sortBy as any,
  });

  const waitingInvoices = useQuery(api.invoices.listForMainView, {
    tab: "waiting",
    searchQuery: searchQuery || undefined,
    sortBy: sortBy as any,
  });

  const paidInvoices = useQuery(api.invoices.listForMainView, {
    tab: "paid",
    searchQuery: searchQuery || undefined,
    sortBy: sortBy as any,
  });

  // Query pour les relances auto
  const reminders = useQuery(api.followUp.getRemindersForAutoTab);

  // Calculer les stats
  const urgentCount =
    toHandleInvoices?.filter((inv: any) => inv.isOverdue && inv.daysPastDue > 15).length || 0;
  const waitingCount = waitingInvoices?.length || 0;
  const totalOutstanding =
    toHandleInvoices?.reduce((sum: number, inv: any) => sum + inv.outstandingBalance, 0) || 0;
  const autoRemindersCount = reminders?.filter((r) => r.status === "scheduled").length || 0;

  const handleCardClick = (tab: string) => {
    setActiveTab(tab);
  };

  const handlePrimaryAction = (invoiceId: string) => {
    // Trouver la facture pour ouvrir le modal de relance/envoi
    const allInvoices = [...(toHandleInvoices || []), ...(waitingInvoices || []), ...(paidInvoices || [])];
    const invoice = allInvoices.find((inv: any) => inv._id === invoiceId);

    if (!invoice) return;

    // Simuler une relance avec template par défaut
    setSelectedReminder({
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      amount: invoice.amountTTC,
      emailSubject: `Relance facture ${invoice.invoiceNumber}`,
      emailContent: `Bonjour,\n\nNous constatons que la facture ${invoice.invoiceNumber} d'un montant de ${invoice.amountTTC.toLocaleString("fr-FR")} € n'a pas encore été réglée.\n\nMerci de bien vouloir procéder au paiement dans les meilleurs délais.\n\nCordialement`,
    });
    setSelectedInvoice(invoice);
    setEmailPreviewOpen(true);
  };

  const handleRecordPayment = (invoiceId: string) => {
    const allInvoices = [...(toHandleInvoices || []), ...(waitingInvoices || []), ...(paidInvoices || [])];
    const invoice = allInvoices.find((inv: any) => inv._id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setRecordPaymentOpen(true);
    }
  };

  const handleMarkPaid = (invoiceId: string) => {
    const allInvoices = [...(toHandleInvoices || []), ...(waitingInvoices || []), ...(paidInvoices || [])];
    const invoice = allInvoices.find((inv: any) => inv._id === invoiceId);
    if (invoice) {
      setSelectedInvoice(invoice);
      setMarkAsPaidOpen(true);
    }
  };

  const handlePreviewReminder = (reminder: any) => {
    setSelectedReminder(reminder);
    setEmailPreviewOpen(true);
  };

  // Handlers pour les confirmations des modals
  const handleConfirmEmailSend = async () => {
    if (!selectedInvoice) return;

    try {
      await sendReminder({
        invoiceId: selectedInvoice._id,
        emailSubject: selectedReminder?.emailSubject || `Relance facture ${selectedInvoice.invoiceNumber}`,
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

  // Déterminer quelles factures afficher selon l'onglet actif
  let currentInvoices: any[] = [];
  let isLoading = false;

  if (activeTab === "to_handle") {
    currentInvoices = toHandleInvoices || [];
    isLoading = toHandleInvoices === undefined;
  } else if (activeTab === "waiting") {
    currentInvoices = waitingInvoices || [];
    isLoading = waitingInvoices === undefined;
  } else if (activeTab === "paid") {
    currentInvoices = paidInvoices || [];
    isLoading = paidInvoices === undefined;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <StatsCards
        urgentCount={urgentCount}
        waitingCount={waitingCount}
        totalOutstanding={totalOutstanding}
        autoRemindersCount={autoRemindersCount}
        onCardClick={handleCardClick}
        activeTab={activeTab}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="to_handle">À traiter</TabsTrigger>
          <TabsTrigger value="waiting">En attente</TabsTrigger>
          <TabsTrigger value="paid">Payées</TabsTrigger>
          <TabsTrigger value="auto_reminders">Relances auto</TabsTrigger>
        </TabsList>

        {/* Onglet À traiter */}
        <TabsContent value="to_handle" className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            showStatusFilter={true}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : currentInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune facture à traiter
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop : InvoiceRow */}
              <div className="hidden md:block space-y-3">
                {currentInvoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice._id}
                    invoice={invoice}
                    onPrimaryAction={handlePrimaryAction}
                    onRecordPayment={handleRecordPayment}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </div>

              {/* Mobile : InvoiceCard */}
              <div className="md:hidden space-y-3">
                {currentInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice._id}
                    invoice={invoice}
                    onPrimaryAction={handlePrimaryAction}
                    onRecordPayment={handleRecordPayment}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Onglet En attente */}
        <TabsContent value="waiting" className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            showStatusFilter={false}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : currentInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune facture en attente
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop : InvoiceRow */}
              <div className="hidden md:block space-y-3">
                {currentInvoices.map((invoice) => (
                  <InvoiceRow
                    key={invoice._id}
                    invoice={invoice}
                    onPrimaryAction={handlePrimaryAction}
                    onRecordPayment={handleRecordPayment}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </div>

              {/* Mobile : InvoiceCard */}
              <div className="md:hidden space-y-3">
                {currentInvoices.map((invoice) => (
                  <InvoiceCard
                    key={invoice._id}
                    invoice={invoice}
                    onPrimaryAction={handlePrimaryAction}
                    onRecordPayment={handleRecordPayment}
                    onMarkPaid={handleMarkPaid}
                  />
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Onglet Payées */}
        <TabsContent value="paid" className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            showStatusFilter={false}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : currentInvoices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Aucune facture payée
            </div>
          ) : (
            <div className="space-y-3">
              {/* Desktop : InvoiceRow (sans actions) */}
              <div className="hidden md:block space-y-3">
                {currentInvoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                      </div>
                      <div className="bg-green-50 text-green-700 border-green-200 border rounded-md px-3 py-1 text-sm">
                        Payée
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>#{invoice.invoiceNumber}</span>
                      <span>•</span>
                      <span>
                        Payée le{" "}
                        {invoice.paidDate
                          ? new Date(invoice.paidDate).toLocaleDateString("fr-FR")
                          : "—"}
                      </span>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-gray-900">
                      {invoice.amountTTC.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile : Cards */}
              <div className="md:hidden space-y-3">
                {currentInvoices.map((invoice) => (
                  <div
                    key={invoice._id}
                    className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
                        <p className="text-xs text-gray-500 mt-1">#{invoice.invoiceNumber}</p>
                      </div>
                      <div className="bg-green-50 text-green-700 border-green-200 border rounded-md px-3 py-1 text-sm">
                        Payée
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {invoice.amountTTC.toLocaleString("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Payée le{" "}
                      {invoice.paidDate
                        ? new Date(invoice.paidDate).toLocaleDateString("fr-FR")
                        : "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Onglet Relances auto */}
        <TabsContent value="auto_reminders">
          {reminders === undefined ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <AutoRemindersView
              reminders={reminders}
              onPreview={handlePreviewReminder}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
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

      <MarkAsPaidModal
        open={markAsPaidOpen}
        onClose={() => {
          setMarkAsPaidOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onConfirm={handleConfirmMarkAsPaid}
      />

      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => {
          setRecordPaymentOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onConfirm={handleConfirmRecordPayment}
      />
    </div>
  );
}
