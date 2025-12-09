import { Phone, Eye, Send, DollarSign, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InvoiceRowProps {
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

export default function InvoiceRow({
  invoice,
  onPrimaryAction,
  onRecordPayment,
  onMarkPaid,
}: InvoiceRowProps) {
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

  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString("fr-FR");
  const retardText = invoice.daysPastDue && invoice.daysPastDue > 0
    ? `${invoice.daysPastDue} jour${invoice.daysPastDue > 1 ? "s" : ""} de retard`
    : "";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      {/* Ligne 1 : Client + Badge */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-gray-900">{invoice.clientName}</h3>
        </div>
        <Badge className={badgeColor}>{badgeText}</Badge>
      </div>

      {/* Ligne 2 : Détails */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
        <span>#{invoice.invoiceNumber}</span>
        <span>•</span>
        <span>Échéance: {dueDateFormatted}</span>
        {retardText && (
          <>
            <span>•</span>
            <span className="text-red-600 font-medium">{retardText}</span>
          </>
        )}
      </div>

      {/* Ligne 3 : Montant + Actions */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-900">
          {invoice.amountTTC.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}
        </div>

        <div className="flex items-center gap-2">
          {/* Actions secondaires */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRecordPayment(invoice._id)}
            className="text-xs"
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Enregistrer paiement
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkPaid(invoice._id)}
            className="text-xs"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Marquer payée
          </Button>

          {/* Action principale */}
          {primaryActionText && (
            <Button
              variant={primaryActionVariant}
              size="sm"
              onClick={() => onPrimaryAction(invoice._id)}
            >
              {primaryActionIcon}
              {primaryActionText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
