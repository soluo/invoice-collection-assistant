import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { CreditCard, Banknote, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { format, addYears, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PaymentHistorySectionProps {
  invoiceId: Id<"invoices">;
  defaultExpanded?: boolean;
}

export function PaymentHistorySection({
  invoiceId,
  defaultExpanded = true,
}: PaymentHistorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const payments = useQuery(api.payments.getPaymentsByInvoice, { invoiceId });

  if (payments === undefined) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
        <div className="h-20 bg-gray-100 rounded" />
      </div>
    );
  }

  if (payments.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: fr });
  };

  // Calculate check expiration (issue date + 1 year + 8 days)
  const getCheckExpirationDate = (checkIssueDate: string) => {
    return addDays(addYears(new Date(checkIssueDate), 1), 8);
  };

  const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="pt-4 border-t">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Paiements ({payments.length})
          </span>
          <span className="text-sm font-semibold text-green-600">
            {formatCurrency(totalPayments)}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {payments.map((payment) => (
            <div
              key={payment._id}
              className={cn(
                "p-3 rounded-lg border",
                payment.type === "check"
                  ? "bg-amber-50 border-amber-200"
                  : "bg-blue-50 border-blue-200"
              )}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  {payment.type === "check" ? (
                    <FileText className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Banknote className="h-4 w-4 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {payment.type === "check" ? "Chèque" : "Virement"}
                  </span>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(payment.amount)}
                </span>
              </div>

              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {/* Date enregistrement/réception */}
                <div className="flex justify-between">
                  <span>{payment.type === "check" ? "Enregistré le :" : "Reçu le :"}</span>
                  <span className="font-medium">
                    {formatDate(payment.recordedDate)}
                  </span>
                </div>

                {/* Check specific fields */}
                {payment.type === "check" && (
                  <>
                    {payment.checkIssueDate && (
                      <div className="flex justify-between">
                        <span>Date d'émission :</span>
                        <span className="font-medium">
                          {formatDate(payment.checkIssueDate)}
                        </span>
                      </div>
                    )}
                    {payment.expectedDepositDate && (
                      <div className="flex justify-between">
                        <span>Encaissement souhaité :</span>
                        <span className="font-medium">
                          {formatDate(payment.expectedDepositDate)}
                        </span>
                      </div>
                    )}
                    {payment.checkIssueDate && (
                      <div className="flex justify-between text-amber-700">
                        <span>Expire le :</span>
                        <span className="font-medium">
                          {format(
                            getCheckExpirationDate(payment.checkIssueDate),
                            "d MMM yyyy",
                            { locale: fr }
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {/* Notes */}
                {payment.notes && (
                  <div className="pt-1 border-t border-gray-200 mt-2">
                    <span className="italic text-gray-500">{payment.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
