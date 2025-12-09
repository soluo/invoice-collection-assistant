import { useState } from "react";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoiceNumber: string;
    amountTTC: number;
  } | null;
  onConfirm: (data: {
    invoiceId: string;
    type: "bank_transfer" | "check";
    amount: number;
    receivedDate?: string;
    expectedDepositDate?: string;
    notes?: string;
  }) => void;
}

export default function RecordPaymentModal({
  open,
  onClose,
  invoice,
  onConfirm,
}: RecordPaymentModalProps) {
  const [paymentType, setPaymentType] = useState<"bank_transfer" | "check">(
    "bank_transfer"
  );
  const [amount, setAmount] = useState("");
  const [receivedDate, setReceivedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDepositDate, setExpectedDepositDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  if (!invoice) return null;

  const handleConfirm = () => {
    const amountNumber = parseFloat(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      alert("Veuillez entrer un montant valide");
      return;
    }

    onConfirm({
      invoiceId: invoice._id,
      type: paymentType,
      amount: amountNumber,
      receivedDate: paymentType === "check" ? receivedDate : undefined,
      expectedDepositDate: paymentType === "check" ? expectedDepositDate : undefined,
      notes: notes.trim() || undefined,
    });

    // Reset form
    setPaymentType("bank_transfer");
    setAmount("");
    setReceivedDate(new Date().toISOString().split("T")[0]);
    setExpectedDepositDate(new Date().toISOString().split("T")[0]);
    setNotes("");

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
          <DialogDescription>
            Enregistrez un paiement reçu pour cette facture
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Infos facture */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Facture:</span>
              <span className="font-medium text-gray-900">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Montant total:</span>
              <span className="font-medium text-gray-900">
                {invoice.amountTTC.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          </div>

          {/* Type de paiement */}
          <div className="space-y-2">
            <Label>Type de paiement</Label>
            <RadioGroup value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                <Label htmlFor="bank_transfer" className="font-normal cursor-pointer">
                  Virement bancaire
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="check" id="check" />
                <Label htmlFor="check" className="font-normal cursor-pointer">
                  Chèque
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Montant */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              Montant <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                €
              </span>
            </div>
          </div>

          {/* Champs spécifiques pour les chèques */}
          {paymentType === "check" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="receivedDate">Date de réception</Label>
                <Input
                  id="receivedDate"
                  type="date"
                  value={receivedDate}
                  onChange={(e) => setReceivedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedDepositDate">Date de dépôt prévue</Label>
                <Input
                  id="expectedDepositDate"
                  type="date"
                  value={expectedDepositDate}
                  onChange={(e) => setExpectedDepositDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            <DollarSign className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
