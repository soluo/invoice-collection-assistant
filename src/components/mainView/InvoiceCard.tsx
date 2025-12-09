import { Phone, Eye, Send, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InvoiceCardProps {
  invoice: {
    _id: string;
    clientName: string;
    invoiceNumber: string;
    amountTTC: number;
    dueDate: string;
    daysPastDue?: number;
    isOverdue: boolean;
    sendStatus: "pending" | "sent";
  };
  onPrimaryAction: (invoiceId: string) => void;
  onRecordPayment: (invoiceId: string) => void;
  onMarkPaid: (invoiceId: string) => void;
}

export default function InvoiceCard({
  invoice,
  onPrimaryAction,
  onRecordPayment,
  onMarkPaid,
}: InvoiceCardProps) {
  // Déterminer le badge et les actions selon le statut
  const isUrgent = invoice.isOverdue && invoice.daysPastDue && invoice.daysPastDue > 15;
  const isLate = invoice.isOverdue && invoice.daysPastDue && invoice.daysPastDue >= 1 && invoice.daysPastDue <= 15;
  const isToSend = invoice.sendStatus === "pending";

  let badgeColor = "";
  let badgeText = "";
  let primaryActionIcon = null;
  let primaryActionText = "";
  let primaryActionVariant: "default" | "outline" | "destructive" = "outline";

  if (isUrgent) {
    badgeColor = "bg-red-50 text-red-700 border-red-200";
    badgeText = "Urgent";
    primaryActionIcon = <Phone className="w-4 h-4 mr-1" />;
    primaryActionText = "Appeler";
    primaryActionVariant = "destructive";
  } else if (isLate) {
    badgeColor = "bg-orange-50 text-orange-700 border-orange-200";
    badgeText = "En retard";
    primaryActionIcon = <Eye className="w-4 h-4 mr-1" />;
    primaryActionText = "Relancer";
    primaryActionVariant = "outline";
  } else if (isToSend) {
    badgeColor = "bg-gray-50 text-gray-700 border-gray-200";
    badgeText = "À envoyer";
    primaryActionIcon = <Send className="w-4 h-4 mr-1" />;
    primaryActionText = "Envoyer";
    primaryActionVariant = "default";
  }

  const retardText = invoice.daysPastDue && invoice.daysPastDue > 0
    ? `⏰ Retard : ${invoice.daysPastDue} jour${invoice.daysPastDue > 1 ? "s" : ""}`
    : "";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header : Client + Badge */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
          <p className="text-xs text-gray-500 mt-1">#{invoice.invoiceNumber}</p>
        </div>
        <Badge className={badgeColor}>{badgeText}</Badge>
      </div>

      {/* Montant en gros */}
      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">
          {invoice.amountTTC.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}
        </div>
        {retardText && (
          <p className="text-sm text-red-600 font-medium mt-1">{retardText}</p>
        )}
      </div>

      {/* Action principale (gros bouton) */}
      {primaryActionText && (
        <Button
          variant={primaryActionVariant}
          size="default"
          onClick={() => onPrimaryAction(invoice._id)}
          className="w-full mb-3"
        >
          {primaryActionIcon}
          {primaryActionText}
        </Button>
      )}

      {/* Actions secondaires (petits boutons) */}
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRecordPayment(invoice._id)}
          className="flex-1 text-xs"
        >
          <DollarSign className="w-3 h-3 mr-1" />
          Paiement
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onMarkPaid(invoice._id)}
          className="flex-1 text-xs"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Payée
        </Button>
      </div>
    </div>
  );
}
