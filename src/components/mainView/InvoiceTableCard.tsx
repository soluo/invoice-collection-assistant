import { NavLink } from "react-router-dom";
import { Bot, Send, MoreVertical, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getInvoiceSimplifiedStatus,
  getStatusLabel,
  getStatusBadgeColor,
  getStatusDotColor,
} from "@/lib/invoiceStatus";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/simple-tooltip";

interface InvoiceTableCardProps {
  invoice: any; // Enriched with nextReminderDate
  onAction: (action: string, invoiceId: string) => void;
  onInvoiceClick?: (invoiceId: string) => void;
}

/**
 * Helper function pour obtenir le nom de la relance
 */
function getReminderName(reminderStatus: string | undefined): string {
  const names: Record<string, string> = {
    reminder_1: "Relance 1",
    reminder_2: "Relance 2",
    reminder_3: "Relance 3",
    reminder_4: "Relance 4",
    manual_followup: "Appeler",
  };
  return names[reminderStatus || ""] || "Relance prévue";
}

export default function InvoiceTableCard({ invoice, onAction, onInvoiceClick }: InvoiceTableCardProps) {
  const status = getInvoiceSimplifiedStatus(invoice);

  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
  };

  const handleCardClick = () => {
    onInvoiceClick?.(invoice._id);
  };

  // Stop propagation pour les actions qui ne doivent pas ouvrir le drawer
  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onAction(action, invoice._id);
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-card hover:border-brand-200 transition-colors cursor-pointer active:bg-slate-50"
    >
      {/* Header: Facture + Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="font-bold text-slate-900">
            {invoice.invoiceNumber}
          </span>
          <p className="text-sm text-slate-500 mt-1">{invoice.clientName}</p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border",
            getStatusBadgeColor(status)
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", getStatusDotColor(status))} />
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Montant */}
      <div className="text-2xl font-bold text-slate-900 mb-3">
        {formatCurrency(invoice.amountTTC)}
      </div>

      {/* Infos supplémentaires */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-slate-600">
          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
          <span>
            Facture: {formatDate(invoice.invoiceDate)} • Échéance:{" "}
            {formatDate(invoice.dueDate)}
          </span>
        </div>
        {(status === "en-retard" || status === "envoyee") && invoice.nextReminderDate ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
              <Bot className="w-3 h-3" />
            </div>
            <span className="text-slate-700 font-semibold">
              {getReminderName(invoice.reminderStatus)}
            </span>
            <span className="text-slate-400">
              • {formatDate(invoice.nextReminderDate)}
            </span>
          </div>
        ) : status === "suivi-manuel" ? (
          <div className="text-sm font-medium text-purple-600">À relancer manuellement</div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {/* Bouton "Envoyer" pour brouillons - Story 7.1: ouvre modal d'envoi d'email */}
        {status === "a-envoyer" && (
          <Tooltip content="Prévisualisez l'email avant envoi">
            <Button
              variant="default"
              size="sm"
              onClick={(e) => handleActionClick(e, "sendInvoiceEmail")}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-1" />
              Envoyer
            </Button>
          </Tooltip>
        )}

        {/* Bouton "Paiement" pour toutes les factures non payées */}
        {status !== "payee" && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleActionClick(e, "recordPayment")}
            className="flex-1"
          >
            Paiement
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <NavLink to={`/invoices/${invoice._id}`} className="w-full">
                Voir la facture
              </NavLink>
            </DropdownMenuItem>
            {invoice.sendStatus !== "sent" && (
              <DropdownMenuItem onClick={(e) => handleActionClick(e, "markAsSent")}>
                Marquer comme envoyée
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => handleActionClick(e, "edit")}>
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
