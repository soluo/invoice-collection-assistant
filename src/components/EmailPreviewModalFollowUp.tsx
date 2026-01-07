import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { X, Eye, Edit, Mail } from "lucide-react";
import { toast } from "sonner";

interface EmailPreviewModalFollowUpProps {
  reminder: any; // Le reminder complet passé depuis FollowUp
  organization: any; // Organisation info
  onClose: () => void;
  onEdit?: () => void; // Callback pour ouvrir le modal d'édition
}

export function EmailPreviewModalFollowUp({
  reminder,
  organization,
  onClose,
  onEdit,
}: EmailPreviewModalFollowUpProps) {
  const sendReminder = useAction(api.reminders.sendReminderEmail);
  const currentUser = useQuery(api.auth.loggedInUser);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const isPending = reminder.completionStatus === "pending";
  const alreadySent = reminder.completionStatus === "completed";
  const canSend = Boolean(reminder.invoice?.contactEmail) && !alreadySent;

  // Permissions : admin OU createdBy de la facture
  const isAdmin = currentUser?.role === "admin";
  const isCreator = currentUser?._id === reminder.invoice?.createdBy;
  const canEdit = isPending && (isAdmin || isCreator);

  const recipientName = reminder.invoice?.clientName ?? "Client inconnu";
  const recipientEmail = reminder.invoice?.contactEmail ?? "Email indisponible";
  const senderName =
    organization?.emailAccountInfo?.name ??
    organization?.name ??
    "Organisation";
  const senderEmail =
    organization?.emailAccountInfo?.email ??
    "Email expéditeur non configuré";

  const handleSend = async () => {
    if (!canSend) {
      setSendError(
        alreadySent
          ? "Cette relance a déjà été envoyée."
          : "Adresse email du client manquante."
      );
      return;
    }

    try {
      setSendError(null);
      setSending(true);
      await sendReminder({ reminderId: reminder._id as Id<"reminders"> });
      toast.success("Relance envoyée avec succès");
      onClose();
    } catch (error: any) {
      console.error("Erreur envoi relance:", error);
      const message = error?.message || "Échec de l'envoi de la relance";
      setSendError(message);
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Prévisualisation du mail
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Email metadata */}
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-900">À :</span>{" "}
              {recipientName} &lt;{recipientEmail}&gt;
            </p>
            <p>
              <span className="font-semibold text-gray-900">De :</span>{" "}
              {senderName} &lt;{senderEmail}&gt;
            </p>
            <p>
              <span className="font-semibold text-gray-900">Objet :</span>{" "}
              {reminder.data?.emailSubject || "Sans objet"}
            </p>
          </div>

          {/* Email content */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {reminder.data?.emailContent || "Contenu indisponible"}
            </div>
          </div>

          {/* Status messages */}
          {alreadySent && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-lg">
              ✅ Cette relance a déjà été envoyée avec succès.
            </div>
          )}

          {!reminder.invoice?.contactEmail && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              ⚠️ Adresse email du client manquante : impossible d'envoyer la relance.
            </div>
          )}

          {sendError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {sendError}
            </div>
          )}
        </div>

        {/* Footer with actions */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
          >
            Fermer
          </Button>

          {canEdit && onEdit && (
            <Button
              type="button"
              onClick={onEdit}
              variant="outline"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}

          <Button
            type="button"
            disabled={sending || !canSend}
            onClick={handleSend}
            className="bg-primary hover:bg-primary/90"
          >
            <Mail className="h-4 w-4 mr-2" />
            {sending ? "Envoi..." : "Envoyer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
