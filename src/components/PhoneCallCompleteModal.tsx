import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Phone } from "lucide-react";
import { toast } from "sonner";

type PhoneCallOutcome =
  | "no_answer"
  | "voicemail"
  | "will_pay"
  | "dispute";

const outcomeOptions: { value: PhoneCallOutcome; label: string }[] = [
  { value: "will_pay", label: "Client s'engage à payer" },
  { value: "dispute", label: "Litige / Contestation" },
  { value: "no_answer", label: "Pas de réponse → rappel demain" },
  { value: "voicemail", label: "Message vocal → rappel demain" },
];

interface PhoneCallCompleteModalProps {
  reminder: {
    _id: Id<"reminders">;
    invoice?: {
      clientName?: string;
      invoiceNumber?: string;
      amountTTC?: number;
    };
  };
  onClose: () => void;
  onSuccess?: () => void;
}

export function PhoneCallCompleteModal({
  reminder,
  onClose,
  onSuccess,
}: PhoneCallCompleteModalProps) {
  const [outcome, setOutcome] = useState<PhoneCallOutcome>("will_pay");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completePhoneReminder = useMutation(api.followUp.completePhoneReminder);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await completePhoneReminder({
        reminderId: reminder._id,
        outcome,
        notes: notes.trim() || undefined,
      });

      toast.success("Appel marqué comme effectué");
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error("Erreur:", error);
      toast.error(error?.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Marquer l'appel comme fait</DialogTitle>
              <DialogDescription>
                {reminder.invoice?.clientName || "Client"} -{" "}
                {reminder.invoice?.invoiceNumber || "N/A"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="space-y-4">
          {/* Outcome select */}
          <div className="space-y-2">
            <Label htmlFor="outcome">Résultat de l'appel</Label>
            <Select
              value={outcome}
              onValueChange={(value) => setOutcome(value as PhoneCallOutcome)}
            >
              <SelectTrigger id="outcome">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {outcomeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes textarea */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Client confirme paiement sous 48h..."
              rows={3}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
