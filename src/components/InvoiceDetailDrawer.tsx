import { NavLink } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText, Calendar, User, Mail, Phone, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const invoice = useQuery(
    api.invoices.getById,
    invoiceId ? { invoiceId } : "skip"
  );

  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    invoice?.pdfStorageId ? { storageId: invoice.pdfStorageId } : "skip"
  );

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

  // Get send status badge styling
  const getSendStatusBadge = () => {
    if (!invoice) return null;

    if (invoice.sendStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          A envoyer
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Envoyée
      </Badge>
    );
  };

  // Get payment status badge styling
  const getPaymentStatusBadge = () => {
    if (!invoice) return null;

    switch (invoice.paymentStatus) {
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Payée
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            Partielle
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            En attente
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Non payée
          </Badge>
        );
    }
  };

  // Get reminder status badge
  const getReminderStatusBadge = () => {
    if (!invoice?.reminderStatus) return null;

    const reminderLabels: Record<string, string> = {
      reminder_1: "Relance 1",
      reminder_2: "Relance 2",
      reminder_3: "Relance 3",
      reminder_4: "Relance 4",
      manual_followup: "Suivi manuel",
    };

    const label = reminderLabels[invoice.reminderStatus];
    if (!label) return null;

    return (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        {label}
      </Badge>
    );
  };

  const daysOverdue = getDaysOverdue();

  // Titre et description pour l'accessibilité
  const title = invoice?.invoiceNumber ? `#${invoice.invoiceNumber}` : "Détails facture";
  const description = invoice?.clientName || "Chargement...";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-y-auto"
      >
        {/* Always render header for accessibility */}
        <SheetHeader className="space-y-4 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <SheetTitle className="text-2xl font-bold">
                {title}
              </SheetTitle>
              <SheetDescription className="text-base text-gray-600 mt-1">
                {description}
              </SheetDescription>
            </div>
            {invoice && (
              <NavLink
                to={`/invoices/${invoice._id}`}
                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 hover:underline whitespace-nowrap"
              >
                <ExternalLink className="h-4 w-4" />
                Page complète
              </NavLink>
            )}
          </div>

          {/* Status Badges Row - only when loaded */}
          {invoice && (
            <div className="flex flex-wrap gap-2">
              {getSendStatusBadge()}
              {getPaymentStatusBadge()}
              {getReminderStatusBadge()}
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

        {/* Content states */}
        {invoice === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
          </div>
        ) : invoice === null ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Facture introuvable</p>
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
                  <Calendar className="h-4 w-4" />
                  Date de facture
                </p>
                <p className="text-gray-900">{formatDate(invoice.invoiceDate)}</p>
              </div>
              <div className="space-y-1">
                <p className={cn(
                  "text-sm font-medium flex items-center gap-1.5",
                  daysOverdue && daysOverdue > 0 ? "text-red-600" : "text-gray-500"
                )}>
                  <Calendar className="h-4 w-4" />
                  Échéance
                </p>
                <p className={cn(
                  daysOverdue && daysOverdue > 0 ? "text-red-700 font-semibold" : "text-gray-900"
                )}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            </div>

            {/* Contact Info */}
            {(invoice.contactName || invoice.contactEmail || invoice.contactPhone) && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm text-gray-500 font-medium">Contact</p>
                {invoice.contactName && (
                  <div className="flex items-center gap-2 text-gray-900">
                    <User className="h-4 w-4 text-gray-400" />
                    {invoice.contactName}
                  </div>
                )}
                {invoice.contactEmail && (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <a
                      href={`mailto:${invoice.contactEmail}`}
                      className="text-brand-600 hover:underline"
                    >
                      {invoice.contactEmail}
                    </a>
                  </div>
                )}
                {invoice.contactPhone && (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a
                      href={`tel:${invoice.contactPhone}`}
                      className="text-brand-600 hover:underline"
                    >
                      {invoice.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* PDF Button */}
            {pdfUrl && (
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full"
                  asChild
                >
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Voir le PDF
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
