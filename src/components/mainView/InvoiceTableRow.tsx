import { NavLink } from "react-router-dom";
import { Bot, Send, MoreVertical } from "lucide-react";
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

interface InvoiceTableRowProps {
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

export default function InvoiceTableRow({ invoice, onAction, onInvoiceClick }: InvoiceTableRowProps) {
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

  const handleRowClick = () => {
    onInvoiceClick?.(invoice._id);
  };

  // Stop propagation pour les actions qui ne doivent pas ouvrir le drawer
  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onAction(action, invoice._id);
  };

  return (
    <div
      onClick={handleRowClick}
      className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1.2fr_1.5fr] gap-4 px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors items-center cursor-pointer"
    >
      {/* Col 1: Facture / Client */}
      <div>
        <span className="font-bold text-gray-900">
          {invoice.invoiceNumber}
        </span>
        <div className="text-sm text-gray-500">{invoice.clientName}</div>
      </div>

      {/* Col 2: Date facture */}
      <div className="text-sm text-gray-700">
        {formatDate(invoice.invoiceDate)}
      </div>

      {/* Col 3: État */}
      <div>
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

      {/* Col 4: Montant + échéance */}
      <div>
        <div className="font-bold text-gray-900">
          {formatCurrency(invoice.amountTTC)}
        </div>
        <div className="text-xs text-gray-500">
          Échéance: {formatDate(invoice.dueDate)}
        </div>
      </div>

      {/* Col 5: Prochain rappel */}
      <div>
        {(status === "en-retard" || status === "envoyee") && invoice.nextReminderDate ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-500 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-700">
                {getReminderName(invoice.reminderStatus)}
              </div>
              <div className="text-[10px] text-slate-400">
                {formatDate(invoice.nextReminderDate)}
              </div>
            </div>
          </div>
        ) : status === "payee" ? (
          <div className="text-xs text-slate-400 italic">Complete</div>
        ) : status === "a-envoyer" ? (
          <div className="text-xs text-slate-400">Pas encore envoyée</div>
        ) : (
          <div className="text-xs text-slate-400">—</div>
        )}
      </div>

      {/* Col 6: Actions */}
      <div className="flex items-center gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
        {/* Bouton "Envoyer" pour brouillons */}
        {status === "a-envoyer" && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => handleActionClick(e, "markAsSent")}
            className="whitespace-nowrap"
          >
            <Send className="w-4 h-4 mr-1" />
            Envoyer
          </Button>
        )}

        {/* Bouton "Paiement" pour envoyée/en-retard */}
        {(status === "envoyee" || status === "en-retard") && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => handleActionClick(e, "recordPayment")}
            className="whitespace-nowrap"
          >
            Paiement
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
