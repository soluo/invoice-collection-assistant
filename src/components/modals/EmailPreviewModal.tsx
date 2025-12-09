import { Info, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router";

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  reminder: {
    invoiceNumber: string;
    clientName: string;
    amount: number;
    emailSubject?: string;
    emailContent?: string;
  } | null;
  onConfirm: () => void;
}

export default function EmailPreviewModal({
  open,
  onClose,
  reminder,
  onConfirm,
}: EmailPreviewModalProps) {
  if (!reminder) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Prévisualisation de l'email</DialogTitle>
          <DialogDescription>
            Vérifiez le contenu de l'email avant de l'envoyer
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Destinataire */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">DESTINATAIRE</p>
            <p className="text-sm text-gray-900">{reminder.clientName}</p>
          </div>

          {/* Objet */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">OBJET</p>
            <p className="text-sm text-gray-900">
              {reminder.emailSubject || `Relance facture ${reminder.invoiceNumber}`}
            </p>
          </div>

          {/* Message */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">MESSAGE</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-900 whitespace-pre-wrap max-h-64 overflow-y-auto">
              {reminder.emailContent ||
                `Bonjour,\n\nNous constatons que la facture ${reminder.invoiceNumber} d'un montant de ${reminder.amount.toLocaleString("fr-FR")} € n'a pas encore été réglée.\n\nMerci de bien vouloir procéder au paiement dans les meilleurs délais.\n\nCordialement`}
            </div>
          </div>

          {/* Info paramètres */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-blue-900">
                Vous pouvez modifier les templates dans les{" "}
                <Link
                  to="/settings"
                  onClick={onClose}
                  className="underline font-medium hover:text-blue-700"
                >
                  paramètres
                </Link>
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={onConfirm}>
            <Send className="w-4 h-4 mr-2" />
            Confirmer l'envoi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
