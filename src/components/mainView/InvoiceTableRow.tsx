import { NavLink } from "react-router-dom";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "@/lib/invoiceStatus";
import { getPrimaryActionForStatus } from "@/lib/invoiceActions";

interface InvoiceTableRowProps {
  invoice: any; // Enriched with nextReminderDate
  onAction: (action: string, invoiceId: string) => void;
}

export default function InvoiceTableRow({ invoice, onAction }: InvoiceTableRowProps) {
  const status = getInvoiceSimplifiedStatus(invoice);
  const primaryAction = getPrimaryActionForStatus(status);

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

  return (
    <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center">
      {/* Col 1: Facture / Client */}
      <div>
        <NavLink
          to={`/invoices/${invoice._id}`}
          className="font-bold text-gray-900 hover:text-primary hover:underline"
        >
          {invoice.invoiceNumber}
        </NavLink>
        <div className="text-sm text-gray-500">{invoice.clientName}</div>
      </div>

      {/* Col 2: Date facture */}
      <div className="text-sm text-gray-700">
        {formatDate(invoice.invoiceDate)}
      </div>

      {/* Col 3: État */}
      <div>
        <Badge
          variant="outline"
          className={`${getStatusBadgeColor(status)} border`}
        >
          {getStatusLabel(status)}
        </Badge>
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
      <div className="text-sm text-gray-700">
        {invoice.nextReminderDate
          ? formatDate(invoice.nextReminderDate)
          : "—"}
      </div>

      {/* Col 6: Actions */}
      <div className="flex items-center gap-2 justify-end">
        {primaryAction && (
          <Button
            variant={primaryAction.variant}
            size="sm"
            onClick={() => onAction(primaryAction.action, invoice._id)}
            className="whitespace-nowrap"
          >
            <primaryAction.icon className="w-4 h-4 mr-1" />
            {primaryAction.label}
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
            <DropdownMenuItem>Relancer maintenant</DropdownMenuItem>
            <DropdownMenuItem>Modifier</DropdownMenuItem>
            <DropdownMenuItem className="text-red-600">
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
