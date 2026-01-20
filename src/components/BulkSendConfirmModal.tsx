import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface BulkSendConfirmModalProps {
  reminders: any[]; // Liste des reminders sélectionnés
  onClose: () => void;
  onSuccess?: () => void; // Callback après envoi réussi
}

export function BulkSendConfirmModal({
  reminders,
  onClose,
  onSuccess,
}: BulkSendConfirmModalProps) {
  const [isSending, setIsSending] = useState(false);
  const sendMultipleReminders = useAction(api.reminders.sendMultipleReminders);

  // Filter out simulated reminders (defensive check)
  const realReminders = reminders.filter(
    (r) => !("isSimulation" in r && r.isSimulation === true)
  );

  const totalAmount = realReminders.reduce(
    (sum, r) => sum + (r.invoice?.amountTTC || 0),
    0
  );

  const handleConfirm = async () => {
    if (realReminders.length === 0) {
      toast.error("Aucune relance réelle à envoyer");
      return;
    }

    setIsSending(true);
    try {
      const reminderIds = realReminders.map((r) => r._id as Id<"reminders">);
      const result = await sendMultipleReminders({ reminderIds });

      // Show appropriate toast based on actual results
      if (result.failed === 0) {
        toast.success(
          `${result.sent} relance${result.sent > 1 ? "s" : ""} envoyée${result.sent > 1 ? "s" : ""} avec succès`
        );
      } else if (result.sent === 0) {
        toast.error(
          `Échec de l'envoi des ${result.failed} relance${result.failed > 1 ? "s" : ""}`
        );
        console.error("Erreurs d'envoi:", result.errors);
      } else {
        // Partial success
        toast.warning(
          `${result.sent} envoyée${result.sent > 1 ? "s" : ""}, ${result.failed} échouée${result.failed > 1 ? "s" : ""}`
        );
        console.error("Erreurs d'envoi partiel:", result.errors);
      }

      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Erreur lors de l'envoi en masse:", error);
      toast.error(error?.message || "Erreur lors de l'envoi des relances");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isSending && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirmer l'envoi en masse</DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">
                Vous êtes sur le point d'envoyer {realReminders.length} email{realReminders.length > 1 ? "s" : ""} de relance.
              </p>
              <p>Cette action est irréversible.</p>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">
              Récapitulatif
            </h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Nombre de relances :</span>
                <span className="font-semibold">{realReminders.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Montant total :</span>
                <span className="font-semibold">{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {/* List of reminders */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2">
              Relances concernées
            </h4>
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
              {realReminders.map((reminder) => (
                <div
                  key={reminder._id}
                  className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {reminder.invoice?.clientName || "Client inconnu"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Facture #{reminder.invoice?.invoiceNumber || "N/A"}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {reminder.invoice?.amountTTC?.toFixed(2) || "0.00"} €
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSending}
          >
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSending || realReminders.length === 0}
            className="bg-primary hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSending
              ? "Envoi en cours..."
              : `Confirmer l'envoi (${realReminders.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
