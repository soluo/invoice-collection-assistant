import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { X, Mail, AlertTriangle } from "lucide-react";
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

  const totalAmount = reminders.reduce(
    (sum, r) => sum + (r.invoice?.amountTTC || 0),
    0
  );

  const handleConfirm = async () => {
    setIsSending(true);
    try {
      const reminderIds = reminders.map((r) => r._id as Id<"reminders">);
      await sendMultipleReminders({ reminderIds });

      toast.success(
        `${reminders.length} relance${reminders.length > 1 ? "s" : ""} envoyée${reminders.length > 1 ? "s" : ""} avec succès`
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Confirmer l'envoi en masse
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSending}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">
                Vous êtes sur le point d'envoyer {reminders.length} email{reminders.length > 1 ? "s" : ""} de relance.
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
                <span className="font-semibold">{reminders.length}</span>
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
              {reminders.map((reminder) => (
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
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
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
            disabled={isSending}
            className="bg-primary hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            {isSending
              ? "Envoi en cours..."
              : `Confirmer l'envoi (${reminders.length})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
