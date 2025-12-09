import { useState } from "react";
import { CheckCircle } from "lucide-react";
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

interface MarkAsPaidModalProps {
  open: boolean;
  onClose: () => void;
  invoice: {
    _id: string;
    invoiceNumber: string;
    amountTTC: number;
  } | null;
  onConfirm: (invoiceId: string, paidDate: string) => void;
}

export default function MarkAsPaidModal({
  open,
  onClose,
  invoice,
  onConfirm,
}: MarkAsPaidModalProps) {
  const [paidDate, setPaidDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  if (!invoice) return null;

  const handleConfirm = () => {
    onConfirm(invoice._id, paidDate);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Marquer comme payée</DialogTitle>
          <DialogDescription>
            Confirmez le paiement de cette facture
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
              <span className="text-gray-600">Montant:</span>
              <span className="font-medium text-gray-900">
                {invoice.amountTTC.toLocaleString("fr-FR", {
                  style: "currency",
                  currency: "EUR",
                })}
              </span>
            </div>
          </div>

          {/* Date de paiement */}
          <div className="space-y-2">
            <Label htmlFor="paidDate">Date de paiement</Label>
            <Input
              id="paidDate"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Par défaut: aujourd'hui
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleConfirm}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
