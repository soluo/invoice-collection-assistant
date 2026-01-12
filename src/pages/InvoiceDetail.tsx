import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, MessageSquare, Calendar } from "lucide-react";
import { InvoiceTimeline } from "@/components/InvoiceTimeline";
import { PaymentRecordModal } from "@/components/PaymentRecordModal";
import { SnoozeInvoiceModal } from "@/components/SnoozeInvoiceModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const invoice = useQuery(
    api.invoices.getById,
    id ? { invoiceId: id as Id<"invoices"> } : "skip"
  );

  const events = useQuery(
    api.events.getByInvoice,
    id ? { invoiceId: id as Id<"invoices"> } : "skip"
  );

  const notes = useQuery(
    api.invoiceNotes.listForInvoice,
    id ? { invoiceId: id as Id<"invoices"> } : "skip"
  );

  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    invoice?.pdfStorageId ? { storageId: invoice.pdfStorageId } : "skip"
  );

  const createNote = useMutation(api.invoiceNotes.create);

  const handleAddNote = async () => {
    if (!noteContent.trim() || !id) return;

    setIsAddingNote(true);
    try {
      await createNote({
        invoiceId: id as Id<"invoices">,
        content: noteContent.trim(),
      });
      setNoteContent("");
      toast.success("Note ajoutée avec succès");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la note:", error);
      toast.error("Erreur lors de l'ajout de la note");
    } finally {
      setIsAddingNote(false);
    }
  };

  if (invoice === undefined || events === undefined || notes === undefined) {
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

  // Badge statut envoi
  const getSendStatusBadge = () => {
    if (invoice.sendStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1">
          À envoyer
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-gray-600 border-gray-300 text-sm px-3 py-1">
        Envoyée
      </Badge>
    );
  };

  // Badge statut paiement
  const getPaymentStatusBadge = () => {
    switch (invoice.paymentStatus) {
      case "paid":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-sm px-3 py-1">
            Payée
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1">
            Partielle
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-sm px-3 py-1">
            En attente
          </Badge>
        );
      default:
        // Inclure le nombre de jours de retard si applicable
        const daysInfo = invoice.isOverdue && invoice.daysPastDue > 0
          ? ` • ${invoice.daysPastDue}j`
          : "";
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-sm px-3 py-1">
            Non payée{daysInfo}
          </Badge>
        );
    }
  };

  // Badge statut relance (saturation croissante)
  const getReminderStatusBadge = () => {
    if (!invoice.reminderStatus) return null;

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
      <Badge variant="outline" className={`${config.className} text-sm px-3 py-1`}>
        {config.label}
      </Badge>
    );
  };

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
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 md:text-3xl">
              Facture #{invoice.invoiceNumber}
            </h1>
            <p className="mt-1 text-base text-gray-600 md:text-lg">{invoice.clientName}</p>
          </div>

          {/* Badges : processus (envoi + relance) | résultat (paiement) */}
          <div className="flex flex-wrap items-center gap-2">
            {getSendStatusBadge()}
            {getReminderStatusBadge()}
            {getPaymentStatusBadge()}
          </div>
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
        <Button
          onClick={() => setIsSnoozeModalOpen(true)}
          variant="outline"
          className="inline-flex items-center gap-2"
        >
          <Calendar className="h-4 w-4" />
          Reporter l'échéance
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
        <div className="lg:w-[35%]">
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

        {/* Right column: Tabs for Historique & Notes (65%) */}
        <div className="lg:w-[65%]">
          <Tabs defaultValue="historique" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="historique">Historique des actions</TabsTrigger>
              <TabsTrigger value="notes">Notes & Commentaires</TabsTrigger>
            </TabsList>

            {/* Tab: Historique */}
            <TabsContent value="historique" className="mt-4">
              <InvoiceTimeline events={events} />
            </TabsContent>

            {/* Tab: Notes */}
            <TabsContent value="notes" className="mt-4">
              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MessageSquare className="h-5 w-5" />
                  Notes & Commentaires
                </h2>

                {/* Add note form */}
                <div className="mb-6">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Ajouter une note (ex: accord de paiement, discussion avec le client...)"
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[100px]"
                    disabled={isAddingNote}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button
                      onClick={handleAddNote}
                      disabled={!noteContent.trim() || isAddingNote}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isAddingNote ? "Ajout..." : "Ajouter une note"}
                    </Button>
                  </div>
                </div>

                {/* Notes list */}
                <div className="space-y-4">
                  {notes.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Aucune note pour le moment
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note._id}
                        className="rounded-lg bg-gray-50 p-4 border border-gray-200"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <span className="text-xs font-medium text-gray-900">
                            {note.createdByName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(note._creationTime).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
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

      {/* Snooze modal */}
      {isSnoozeModalOpen && (
        <SnoozeInvoiceModal
          invoiceId={id as Id<"invoices">}
          invoiceNumber={invoice.invoiceNumber}
          currentDueDate={invoice.dueDate}
          onClose={() => setIsSnoozeModalOpen(false)}
        />
      )}
    </div>
  );
}
