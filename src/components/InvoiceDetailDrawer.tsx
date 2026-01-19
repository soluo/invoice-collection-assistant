import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Calendar, User, Mail, Phone, AlertTriangle, Send, Pencil, Upload, MoreHorizontal, CreditCard, AlertCircle, type LucideIcon } from "lucide-react";
import { ReminderStatusCompact } from "@/components/ReminderStatusCompact";
import { InvoiceNotesCompact } from "@/components/InvoiceNotesCompact";
import { MarkAsSentModal } from "@/components/MarkAsSentModal";
import { InvoiceEditModal } from "@/components/InvoiceEditModal";
import { AttachPdfModal } from "@/components/AttachPdfModal";
import { SnoozeInvoiceModal } from "@/components/SnoozeInvoiceModal";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import { PaymentHistorySection } from "@/components/PaymentHistorySection";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Action configuration type for state-based buttons
interface ActionConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  href?: string;
}

interface InvoiceDetailDrawerProps {
  invoiceId: Id<"invoices"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoiceDetailDrawer({
  invoiceId,
  open,
  onOpenChange,
}: InvoiceDetailDrawerProps) {
  const [showMarkAsSentModal, setShowMarkAsSentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAttachPdfModal, setShowAttachPdfModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

  const invoice = useQuery(
    api.invoices.getById,
    invoiceId ? { invoiceId } : "skip"
  );

  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    invoice?.pdfStorageId ? { storageId: invoice.pdfStorageId } : "skip"
  );

  const markAsSent = useMutation(api.invoices.markAsSent);

  const handleConfirmMarkAsSent = async (sentDate: string) => {
    if (!invoice) return;

    try {
      await markAsSent({
        invoiceId: invoice._id,
        sentDate,
      });
      toast.success("Facture marquée comme envoyée");
      setShowMarkAsSentModal(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la mise à jour";
      toast.error(errorMessage);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Calculate days overdue
  const getDaysOverdue = () => {
    if (!invoice?.dueDate || invoice.paymentStatus === "paid") return null;

    const today = new Date();
    const due = new Date(invoice.dueDate);
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    return daysOverdue > 0 ? daysOverdue : null;
  };

  // Get primary actions based on invoice state
  const getPrimaryActions = (): ActionConfig[] => {
    if (!invoice) return [];

    const actions: ActionConfig[] = [];

    if (invoice.paymentStatus === "paid") {
      // PAID: Primary = View PDF (if available)
      if (pdfUrl) {
        actions.push({
          key: "pdf",
          label: "Voir le PDF",
          icon: FileText,
          onClick: () => {},
          href: pdfUrl,
        });
      }
    } else if (invoice.sendStatus === "sent") {
      // SENT BUT UNPAID: Primary = Record Payment + Snooze
      actions.push({
        key: "recordPayment",
        label: "Enregistrer paiement",
        icon: CreditCard,
        onClick: () => setShowRecordPaymentModal(true),
      });
      actions.push({
        key: "snooze",
        label: "Reporter échéance",
        icon: Calendar,
        onClick: () => setShowSnoozeModal(true),
      });
    } else {
      // NOT SENT: Primary = Mark as sent + Record Payment (chèque récupéré à la prestation)
      actions.push({
        key: "markSent",
        label: "Marquer envoyée",
        icon: Send,
        onClick: () => setShowMarkAsSentModal(true),
      });
      actions.push({
        key: "recordPayment",
        label: "Enregistrer paiement",
        icon: CreditCard,
        onClick: () => setShowRecordPaymentModal(true),
      });
    }

    return actions;
  };

  // Get secondary actions for dropdown menu based on invoice state
  const getSecondaryActions = (): ActionConfig[] => {
    if (!invoice) return [];

    const actions: ActionConfig[] = [];

    if (invoice.paymentStatus === "paid") {
      // PAID: Edit only (modifier facture)
      actions.push({
        key: "edit",
        label: "Modifier",
        icon: Pencil,
        onClick: () => setShowEditModal(true),
      });
    } else if (invoice.sendStatus === "sent") {
      // SENT BUT UNPAID: Edit, View PDF, Attach PDF
      actions.push({
        key: "edit",
        label: "Modifier",
        icon: Pencil,
        onClick: () => setShowEditModal(true),
      });
      if (pdfUrl) {
        actions.push({
          key: "pdf",
          label: "Voir le PDF",
          icon: FileText,
          onClick: () => {},
          href: pdfUrl,
        });
      }
      if (!invoice.pdfStorageId) {
        actions.push({
          key: "attachPdf",
          label: "Ajouter PDF",
          icon: Upload,
          onClick: () => setShowAttachPdfModal(true),
        });
      }
    } else {
      // NOT SENT: Edit, Attach PDF
      actions.push({
        key: "edit",
        label: "Modifier",
        icon: Pencil,
        onClick: () => setShowEditModal(true),
      });
      if (!invoice.pdfStorageId) {
        actions.push({
          key: "attachPdf",
          label: "Ajouter PDF",
          icon: Upload,
          onClick: () => setShowAttachPdfModal(true),
        });
      }
    }

    return actions;
  };

  const primaryActions = getPrimaryActions();
  const secondaryActions = getSecondaryActions();

  // Get send status badge styling
  const getSendStatusBadge = () => {
    if (!invoice) return null;

    if (invoice.sendStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-2.5 py-0.5">
          À envoyer
        </Badge>
      );
    }
    // "Envoyée" = état normal, discret
    return (
      <Badge variant="outline" className="text-gray-600 border-gray-300 text-sm px-2.5 py-0.5">
        Envoyée
      </Badge>
    );
  };

  // Get payment status badge styling
  const getPaymentStatusBadge = () => {
    if (!invoice) return null;

    switch (invoice.paymentStatus) {
      case "paid":
        // "Payée" = rassurance, vert
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-2.5 py-0.5">
            Payée
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-2.5 py-0.5">
            Partielle
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-2.5 py-0.5">
            En attente
          </Badge>
        );
      default:
        // "Non payée" = nécessite attention
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-sm px-2.5 py-0.5">
            Non payée
          </Badge>
        );
    }
  };

  // Get reminder status badge
  const getReminderStatusBadge = () => {
    if (!invoice?.reminderStatus) return null;

    // Saturation croissante pour les relances, violet pour suivi manuel
    const reminderConfig: Record<string, { label: string; className: string }> = {
      reminder_1: { label: "Relance 1", className: "bg-orange-50 text-orange-600 border-orange-200" },
      reminder_2: { label: "Relance 2", className: "bg-orange-100 text-orange-700 border-orange-300" },
      reminder_3: { label: "Relance 3", className: "bg-orange-200 text-orange-800 border-orange-400" },
      reminder_4: { label: "Relance 4", className: "bg-orange-300 text-orange-900 border-orange-500" },
      manual_followup: { label: "Suivi manuel", className: "bg-purple-100 text-purple-700 border-purple-300" },
    };

    const config = reminderConfig[invoice.reminderStatus];
    if (!config) return null;

    return (
      <Badge variant="outline" className={`${config.className} text-sm px-2.5 py-0.5`}>
        {config.label}
      </Badge>
    );
  };

  const daysOverdue = getDaysOverdue();

  // Titre et description pour l'accessibilité
  const title = invoice?.invoiceNumber ? `#${invoice.invoiceNumber}` : "Détails facture";
  const description = invoice?.clientName || "Chargement...";

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
      >
        {/* Always render header for accessibility */}
        <SheetHeader className="space-y-4 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-2xl font-bold">
                {title}
              </SheetTitle>
              <SheetDescription className="text-base text-gray-600 mt-1 text-left">
                {description}
              </SheetDescription>
            </div>
          </div>

          {/* Status Badges Row - only when loaded */}
          {invoice && (
            <div className="flex items-center justify-between gap-2">
              {/* Processus : envoi + relance */}
              <div className="flex flex-wrap gap-2">
                {getSendStatusBadge()}
                {getReminderStatusBadge()}
              </div>
              {/* Résultat : paiement */}
              {getPaymentStatusBadge()}
            </div>
          )}

          {/* Days Overdue Indicator */}
          {invoice && daysOverdue && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-red-700 font-semibold">
                {daysOverdue} jour{daysOverdue > 1 ? "s" : ""} de retard
              </span>
            </div>
          )}
        </SheetHeader>

        {/* Action buttons - state-based with dropdown for secondary actions */}
        {invoice && (
          <div className="flex flex-wrap items-center gap-2 py-4 border-b border-gray-100">
            {/* Primary actions as visible buttons */}
            {primaryActions.map((action) =>
              action.href ? (
                <Button
                  key={action.key}
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <action.icon className="h-4 w-4 mr-2" />
                    {action.label}
                  </a>
                </Button>
              ) : (
                <Button
                  key={action.key}
                  variant="outline"
                  size="sm"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4 mr-2" />
                  {action.label}
                </Button>
              )
            )}

            {/* Secondary actions in dropdown menu */}
            {secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Plus d'actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {secondaryActions.map((action) =>
                    action.href ? (
                      <DropdownMenuItem key={action.key} asChild>
                        <a
                          href={action.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          <action.icon className="h-4 w-4 mr-2" />
                          {action.label}
                        </a>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        key={action.key}
                        onClick={action.onClick}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </DropdownMenuItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {/* Content states */}
        {invoice === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : invoice === null ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Facture introuvable
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Cette facture n'existe pas ou a été supprimée.
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            {/* Amount */}
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Montant TTC</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(invoice.amountTTC)}
              </p>
              {invoice.hasPartialPayment && invoice.outstandingBalance > 0 && (
                <p className="text-sm text-amber-600 font-medium">
                  Solde restant : {formatCurrency(invoice.outstandingBalance)}
                </p>
              )}
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-300" />
                  Date de facture
                </p>
                <p className="text-gray-900">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-gray-300" />
                  Échéance
                </p>
                <p className={cn(
                  daysOverdue && daysOverdue > 0 ? "text-red-600 font-semibold" : "text-gray-900"
                )}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
              {/* Sent Date (when invoice is sent) */}
              {invoice.sendStatus === "sent" && invoice.sentDate && (
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                    <Send className="h-4 w-4 text-gray-300" />
                    Date d'envoi
                  </p>
                  <p className="text-gray-900">{formatDate(invoice.sentDate)}</p>
                </div>
              )}
            </div>

            {/* Contact Info */}
            {(invoice.contactName || invoice.contactEmail || invoice.contactPhone) && (
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                  <User className="h-4 w-4 text-gray-300" />
                  Contact
                </p>
                {invoice.contactName && (
                  <div className="text-gray-900">
                    {invoice.contactName}
                  </div>
                )}
                {invoice.contactEmail && (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4 text-gray-300" />
                    <a
                      href={`mailto:${invoice.contactEmail}`}
                      className="hover:underline"
                    >
                      {invoice.contactEmail}
                    </a>
                  </div>
                )}
                {invoice.contactPhone && (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="h-4 w-4 text-gray-300" />
                    <a
                      href={`tel:${invoice.contactPhone}`}
                      className="hover:underline"
                    >
                      {invoice.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Reminder Status Compact */}
            <ReminderStatusCompact invoiceId={invoice._id} />

            {/* Payment History - Collapsed by default in drawer */}
            <PaymentHistorySection invoiceId={invoice._id} defaultExpanded={false} />

            {/* Notes Compact */}
            <InvoiceNotesCompact invoiceId={invoice._id} />

            {/* Prominent link to full page */}
            <div className="pt-4 border-t border-gray-100">
              <NavLink
                to={`/invoices/${invoice._id}`}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
              >
                Voir historique complet
                <ExternalLink className="h-4 w-4" />
              </NavLink>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

    {/* Mark as Sent Modal - Outside Sheet for proper animation */}
    {invoice && (
      <MarkAsSentModal
        isOpen={showMarkAsSentModal}
        onClose={() => setShowMarkAsSentModal(false)}
        onConfirm={handleConfirmMarkAsSent}
        defaultDate={invoice.invoiceDate}
      />
    )}

    {/* Edit Modal - Outside Sheet for proper z-index */}
    {invoice && showEditModal && (
      <InvoiceEditModal
        invoice={invoice}
        onClose={() => setShowEditModal(false)}
      />
    )}

    {/* Attach PDF Modal */}
    {invoice && showAttachPdfModal && (
      <AttachPdfModal
        invoiceId={invoice._id}
        invoiceNumber={invoice.invoiceNumber}
        onClose={() => setShowAttachPdfModal(false)}
      />
    )}

    {/* Snooze Invoice Modal - Edit due date */}
    {invoice && showSnoozeModal && (
      <SnoozeInvoiceModal
        invoiceId={invoice._id}
        invoiceNumber={invoice.invoiceNumber}
        currentDueDate={invoice.dueDate}
        onClose={() => setShowSnoozeModal(false)}
      />
    )}

    {/* Record Payment Modal - Story 1.5 */}
    {invoice && showRecordPaymentModal && (
      <RecordPaymentModal
        invoiceId={invoice._id}
        invoiceNumber={invoice.invoiceNumber}
        amountTTC={invoice.amountTTC}
        outstandingBalance={invoice.outstandingBalance}
        onClose={() => setShowRecordPaymentModal(false)}
      />
    )}
    </>
  );
}
