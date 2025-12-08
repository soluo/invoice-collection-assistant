import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getStatusDisplay } from "@/lib/invoiceStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { InvoiceTimeline } from "@/components/InvoiceTimeline";
import { PaymentRecordModal } from "@/components/PaymentRecordModal";
import { useState } from "react";

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const invoice = useQuery(
    api.invoices.getById,
    id ? { invoiceId: id as Id<"invoices"> } : "skip"
  );

  const events = useQuery(
    api.events.getByInvoice,
    id ? { invoiceId: id as Id<"invoices"> } : "skip"
  );

  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    invoice?.pdfStorageId ? { storageId: invoice.pdfStorageId } : "skip"
  );

  if (invoice === undefined || events === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Facture introuvable</p>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(invoice);

  // Get reminder badge if applicable
  const reminderBadge = invoice.reminderStatus
    ? invoice.reminderStatus.replace("reminder_", "Relance ")
    : null;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Back button */}
      <Link
        to="/invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la liste
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            Facture #{invoice.invoiceNumber}
          </h1>
          <p className="mt-1 text-lg text-gray-600">{invoice.clientName}</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          {/* Main status badge */}
          <Badge variant="outline" className={`${statusDisplay.colorClass} text-base font-medium px-3 py-1.5`}>
            {statusDisplay.badgeLabel}
            {invoice.isOverdue && invoice.daysPastDue > 0 && (
              <span className="ml-1">({invoice.daysPastDue} jours)</span>
            )}
          </Badge>
          {/* Reminder badge if applicable */}
          {reminderBadge && (
            <Badge className="bg-yellow-100 text-yellow-800 text-sm px-3 py-1">
              {reminderBadge}
            </Badge>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setIsPaymentModalOpen(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          Enregistrer un paiement
        </Button>
        {pdfUrl && (
          <Button
            variant="outline"
            asChild
          >
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </a>
          </Button>
        )}
      </div>

      {/* 2-column layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Left column: Invoice details (35%) */}
        <div className="lg:w-1/3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Détails</h2>
            <dl className="space-y-3">
              {/* Amount */}
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">
                  {invoice.hasPartialPayment ? "Solde dû" : "Montant TTC"}
                </dt>
                <dd className="text-2xl font-bold text-gray-900">
                  {invoice.hasPartialPayment
                    ? `${invoice.outstandingBalance.toFixed(2)} €`
                    : `${invoice.amountTTC.toFixed(2)} €`}
                </dd>
                {invoice.hasPartialPayment && (
                  <dd className="text-xs text-gray-500 mt-1">
                    Montant initial : {invoice.amountTTC.toFixed(2)} €
                  </dd>
                )}
              </div>

              {/* Due date */}
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">Date d'échéance</dt>
                <dd className={`font-medium ${invoice.isOverdue ? "text-red-600" : "text-gray-700"}`}>
                  {new Date(invoice.dueDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>

              {/* Invoice date */}
              <div className="flex flex-col">
                <dt className="text-sm font-medium text-gray-500">Date d'émission</dt>
                <dd className="font-medium text-gray-700">
                  {new Date(invoice.invoiceDate).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </dd>
              </div>

              {/* Contact info */}
              {(invoice.contactName || invoice.contactEmail || invoice.contactPhone) && (
                <div className="flex flex-col pt-3 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-500 mb-2">Contact</dt>
                  {invoice.contactName && (
                    <dd className="font-medium text-gray-700">{invoice.contactName}</dd>
                  )}
                  {invoice.contactEmail && (
                    <dd className="text-sm text-gray-600">{invoice.contactEmail}</dd>
                  )}
                  {invoice.contactPhone && (
                    <dd className="text-sm text-gray-600">{invoice.contactPhone}</dd>
                  )}
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Right column: Activity timeline (65%) */}
        <div className="lg:w-2/3">
          <InvoiceTimeline events={events} />
        </div>
      </div>

      {/* Payment modal */}
      {isPaymentModalOpen && (
        <PaymentRecordModal
          invoiceId={id as Id<"invoices">}
          invoiceNumber={invoice.invoiceNumber}
          clientName={invoice.clientName}
          outstandingBalance={invoice.outstandingBalance}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}
    </div>
  );
}
