import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { X, Calendar } from "lucide-react";
import { toast } from "sonner";

interface SnoozeInvoiceModalProps {
  invoiceId: Id<"invoices">;
  invoiceNumber: string;
  currentDueDate: string;
  onClose: () => void;
}

export function SnoozeInvoiceModal({
  invoiceId,
  invoiceNumber,
  currentDueDate,
  onClose,
}: SnoozeInvoiceModalProps) {
  const [newDueDate, setNewDueDate] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const snooze = useMutation(api.invoices.snooze);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newDueDate) {
      toast.error("Veuillez sélectionner une nouvelle date d'échéance");
      return;
    }

    // Vérifier que la nouvelle date est dans le futur
    const selectedDate = new Date(newDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      toast.error("La nouvelle échéance doit être dans le futur");
      return;
    }

    setIsSubmitting(true);
    try {
      await snooze({
        invoiceId,
        newDueDate,
        reason: reason.trim() || undefined,
      });

      const formattedDate = selectedDate.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      toast.success(`Échéance reportée au ${formattedDate}`);
      onClose();
    } catch (error) {
      console.error("Erreur lors du report d'échéance:", error);
      toast.error("Erreur lors du report d'échéance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Calendar className="h-5 w-5" />
            Reporter l'échéance
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-4">
              Facture <span className="font-medium">#{invoiceNumber}</span>
            </p>
            <p className="text-sm text-gray-500 mb-1">
              Échéance actuelle :{" "}
              <span className="font-medium">
                {new Date(currentDueDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </p>
          </div>

          <div className="mb-4">
            <label
              htmlFor="newDueDate"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Nouvelle date d'échéance *
            </label>
            <input
              type="date"
              id="newDueDate"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="reason"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Raison (optionnel)
            </label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Accord client pour un délai de 30 jours supplémentaires"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px]"
              disabled={isSubmitting}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? "Report..." : "Confirmer le report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
