import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, CheckCircle, Banknote, FileText } from "lucide-react";
import { toast } from "sonner";
import { addYears, addDays, format, formatISO } from "date-fns";
import { fr } from "date-fns/locale";

// Helper to get today's date in local timezone as YYYY-MM-DD
const getTodayLocalDate = () => formatISO(new Date(), { representation: "date" });

interface RecordPaymentModalProps {
  invoiceId: Id<"invoices">;
  invoiceNumber: string;
  amountTTC: number;
  outstandingBalance: number;
  onClose: () => void;
}

type PaymentType = "bank_transfer" | "check";

type ModalState = "form" | "success";

export function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  amountTTC,
  outstandingBalance,
  onClose,
}: RecordPaymentModalProps) {
  // Modal state
  const [modalState, setModalState] = useState<ModalState>("form");
  const [currentBalance, setCurrentBalance] = useState(outstandingBalance);

  // Form state
  const [paymentType, setPaymentType] = useState<PaymentType>("bank_transfer");
  const [amount, setAmount] = useState(outstandingBalance.toFixed(2));
  const [receivedDate, setReceivedDate] = useState(getTodayLocalDate);
  const [checkIssueDate, setCheckIssueDate] = useState(getTodayLocalDate);
  const [expectedDepositDate, setExpectedDepositDate] = useState(getTodayLocalDate);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const recordPayment = useMutation(api.payments.recordPayment);

  // Calculate check expiration (issue date + 1 year + 8 days)
  const checkExpirationDate = checkIssueDate
    ? addDays(addYears(new Date(checkIssueDate), 1), 8)
    : null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);

    // Validation
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (parsedAmount > currentBalance + 0.01) {
      toast.error(
        `Le montant ne peut pas dépasser le solde restant (${formatCurrency(currentBalance)})`
      );
      return;
    }

    if (paymentType === "check" && !checkIssueDate) {
      toast.error("Veuillez entrer la date d'émission du chèque");
      return;
    }

    if (paymentType === "check" && !expectedDepositDate) {
      toast.error("Veuillez entrer la date d'encaissement souhaitée");
      return;
    }

    setIsSubmitting(true);
    try {
      await recordPayment({
        invoiceId,
        payments: [
          {
            type: paymentType,
            amount: parsedAmount,
            receivedDate:
              paymentType === "bank_transfer" ? receivedDate : undefined,
            checkIssueDate:
              paymentType === "check" ? checkIssueDate : undefined,
            expectedDepositDate:
              paymentType === "check" ? expectedDepositDate : undefined,
          },
        ],
      });

      // Calculate remaining balance after this payment
      const newBalance = currentBalance - parsedAmount;
      setCurrentBalance(newBalance);

      if (newBalance > 0.01) {
        // Partial payment - show success state with option to add more
        setModalState("success");
      } else {
        // Fully paid
        toast.success("Paiement enregistré - Facture payée !");
        onClose();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'enregistrement du paiement"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAnother = () => {
    // Reset form for another payment
    setPaymentType("bank_transfer");
    setAmount(currentBalance.toFixed(2));
    setReceivedDate(getTodayLocalDate());
    setCheckIssueDate(getTodayLocalDate());
    setExpectedDepositDate(getTodayLocalDate());
    setModalState("form");
  };

  const handleClose = () => {
    if (currentBalance < outstandingBalance) {
      // Some payment was made
      toast.success("Paiement(s) enregistré(s)");
    }
    onClose();
  };

  // Success state view
  if (modalState === "success") {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="space-y-4 text-center py-4">
            <div className="text-green-600">
              <CheckCircle className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium text-lg">Paiement enregistré !</p>
            </div>
            <p className="text-gray-600">
              Solde restant : {formatCurrency(currentBalance)}
            </p>
            <div className="flex gap-2 justify-center pt-4">
              <Button variant="outline" onClick={handleAddAnother}>
                Ajouter un autre paiement
              </Button>
              <Button onClick={handleClose}>Terminé</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Form view
  return (
    <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Enregistrer un paiement
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Invoice info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">
              Facture{" "}
              <span className="font-medium text-gray-900">#{invoiceNumber}</span>
            </p>
            <div className="flex justify-between items-center mt-1">
              <span className="text-sm text-gray-500">Montant total :</span>
              <span className="font-medium">{formatCurrency(amountTTC)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Solde restant :</span>
              <span className="font-semibold text-brand-600">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Payment type selection */}
          <div>
            <Label className="mb-3 block">Type de paiement</Label>
            <RadioGroup
              value={paymentType}
              onValueChange={(v) => setPaymentType(v as PaymentType)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label
                  htmlFor="bank_transfer"
                  className="flex-1 cursor-pointer"
                >
                  <span className="font-medium flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-blue-600" />
                    Virement bancaire
                  </span>
                  <span className="block text-sm text-gray-500">
                    Paiement reçu sur le compte
                  </span>
                </Label>
              </div>
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <RadioGroupItem value="check" id="check" />
                <Label htmlFor="check" className="flex-1 cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-600" />
                    Chèque
                  </span>
                  <span className="block text-sm text-gray-500">
                    Chèque reçu (validité 1 an)
                  </span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount input */}
          <div>
            <Label htmlFor="amount">Montant *</Label>
            <div className="relative mt-1">
              <Input
                type="number"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0.01"
                max={currentBalance}
                required
                disabled={isSubmitting}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                €
              </span>
            </div>
          </div>

          {/* Bank transfer specific fields */}
          {paymentType === "bank_transfer" && (
            <div>
              <Label htmlFor="receivedDate">Date de réception *</Label>
              <Input
                type="date"
                id="receivedDate"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
                disabled={isSubmitting}
                className="mt-1"
              />
            </div>
          )}

          {/* Check specific fields */}
          {paymentType === "check" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="checkIssueDate">Date d'émission du chèque *</Label>
                <Input
                  type="date"
                  id="checkIssueDate"
                  value={checkIssueDate}
                  onChange={(e) => setCheckIssueDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="expectedDepositDate">
                  Date d'encaissement souhaitée *
                </Label>
                <Input
                  type="date"
                  id="expectedDepositDate"
                  value={expectedDepositDate}
                  onChange={(e) => setExpectedDepositDate(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>

              {checkExpirationDate && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm text-amber-800">
                    <span className="font-medium">Date d'expiration :</span>{" "}
                    {format(checkExpirationDate, "d MMMM yyyy", { locale: fr })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    (date d'émission + 1 an + 8 jours)
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-500 hover:bg-brand-600"
            >
              {isSubmitting ? "En cours..." : "Enregistrer le paiement"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
