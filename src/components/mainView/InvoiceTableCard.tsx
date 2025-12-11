import { NavLink } from "react-router-dom";
import { MoreVertical, Calendar, Euro } from "lucide-react";
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

interface InvoiceTableCardProps {
  invoice: any; // Enriched with nextReminderDate
  onAction: (action: string, invoiceId: string) => void;
}

export default function InvoiceTableCard({ invoice, onAction }: InvoiceTableCardProps) {
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
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      {/* Header: Facture + Status */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <NavLink
            to={`/invoices/${invoice._id}`}
            className="font-bold text-gray-900 hover:text-primary hover:underline"
          >
            {invoice.invoiceNumber}
          </NavLink>
          <p className="text-sm text-gray-500 mt-1">{invoice.clientName}</p>
        </div>
        <Badge
          variant="outline"
          className={`${getStatusBadgeColor(status)} border`}
        >
          {getStatusLabel(status)}
        </Badge>
      </div>

      {/* Montant */}
      <div className="text-2xl font-bold text-gray-900 mb-3">
        {formatCurrency(invoice.amountTTC)}
      </div>

      {/* Infos supplémentaires */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2 text-gray-400" />
          <span>
            Facture: {formatDate(invoice.invoiceDate)} • Échéance:{" "}
            {formatDate(invoice.dueDate)}
          </span>
        </div>
        {invoice.nextReminderDate && (
          <div className="flex items-center text-sm text-gray-600">
            <Euro className="w-4 h-4 mr-2 text-gray-400" />
            <span>Prochain rappel: {formatDate(invoice.nextReminderDate)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {primaryAction && (
          <Button
            variant={primaryAction.variant}
            size="sm"
            onClick={() => onAction(primaryAction.action, invoice._id)}
            className="flex-1"
          >
            <primaryAction.icon className="w-4 h-4 mr-1" />
            {primaryAction.label}
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
