import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Edit, Mail, Send, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { isAdminRole } from "@/lib/utils";

interface EmailPreviewModalFollowUpProps {
  reminder: any; // Le reminder complet passé depuis FollowUp
  organization: any; // Organisation info
  onClose: () => void;
  onEdit?: () => void; // Callback pour ouvrir le modal d'édition
  onTestSent?: (reminderId: string) => void; // Callback when test email is sent
}

export function EmailPreviewModalFollowUp({
  reminder,
  organization,
  onClose,
  onEdit,
  onTestSent,
}: EmailPreviewModalFollowUpProps) {
  const sendReminder = useAction(api.reminders.sendReminderEmail);
  const sendSimulatedTestEmail = useAction(api.emails.sendSimulatedTestEmail);
  const currentUser = useQuery(api.auth.loggedInUser);
  // Story 7.3: Get PDF URL for clickable badge
  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    reminder.invoice?.pdfStorageId ? { storageId: reminder.invoice.pdfStorageId } : "skip"
  );
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // Test email dialog state
  const [showTestEmailDialog, setShowTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const isPending = reminder.completionStatus === "pending";
  const alreadySent = reminder.completionStatus === "completed";
  const isSimulation = "isSimulation" in reminder && reminder.isSimulation === true;
  const canSend = Boolean(reminder.invoice?.contactEmail) && !alreadySent && !isSimulation;

  // Permissions : admin OU createdBy de la facture
  const isAdmin = isAdminRole(currentUser?.role);
  const isCreator = currentUser?._id === reminder.invoice?.createdBy;
  const canEdit = isPending && (isAdmin || isCreator) && !isSimulation;

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

  // Handler for sending test email (simulation mode)
  const handleSendTest = async () => {
    if (!testEmailAddress) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmailAddress)) {
      toast.error("Format d'adresse email invalide");
      return;
    }

    setIsSendingTest(true);
    try {
      // Extract reminder step index from reminderStatus (e.g., "reminder_1" -> 0)
      const reminderStatusMatch = reminder.reminderStatus?.match(/reminder_(\d+)/);
      const reminderStepIndex = reminderStatusMatch
        ? parseInt(reminderStatusMatch[1]) - 1
        : 0;

      await sendSimulatedTestEmail({
        recipientEmail: testEmailAddress,
        invoiceId: reminder.invoice._id as Id<"invoices">,
        reminderStepIndex,
      });

      toast.success(`Email de test envoyé à ${testEmailAddress}`);

      // Notify parent that test was sent (for badge tracking)
      if (onTestSent && reminder._id) {
        onTestSent(reminder._id);
      }

      setShowTestEmailDialog(false);
      onClose();
    } catch (error: any) {
      console.error("Erreur envoi test:", error);
      toast.error(error?.message || "Échec de l'envoi du test");
    } finally {
      setIsSendingTest(false);
    }
  };

  // Pre-fill test email with user's email if admin
  const handleOpenTestEmailDialog = () => {
    if (currentUser?.email && !testEmailAddress) {
      setTestEmailAddress(currentUser.email);
    }
    setShowTestEmailDialog(true);
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

          {/* Story 7.3: PDF attachment indicator (AC4) - clickable badge */}
          {organization?.attachPdfToReminders !== false && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">Pièce jointe</span>
              {reminder.invoice?.pdfStorageId ? (
                <Tooltip content="Afficher la facture">
                  <a
                    href={pdfUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={pdfUrl ? "inline-block" : "inline-block pointer-events-none"}
                  >
                    <Badge variant="secondary" className="gap-2 py-1.5 px-3 hover:bg-gray-200 transition-colors cursor-pointer">
                      <FileText className="h-4 w-4" />
                      facture-{reminder.invoice?.invoiceNumber || "N/A"}.pdf
                    </Badge>
                  </a>
                </Tooltip>
              ) : (
                <span className="text-sm text-gray-400 italic">
                  Aucun PDF disponible
                </span>
              )}
            </div>
          )}

          {/* Status messages */}
          {isSimulation && (
            <div className="text-sm text-purple-600 bg-purple-50 p-3 rounded-lg">
              🔮 Mode simulation — vous pouvez envoyer un test à votre adresse email.
            </div>
          )}

          {alreadySent && !isSimulation && (
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

          {!isSimulation && (
            <Button
              type="button"
              disabled={sending || !canSend}
              onClick={handleSend}
              className="bg-primary hover:bg-primary/90"
            >
              <Mail className="h-4 w-4 mr-2" />
              {sending ? "Envoi..." : "Envoyer"}
            </Button>
          )}

          {/* Test send button for simulations - admin only */}
          {isSimulation && isAdmin && (
            <Button
              type="button"
              onClick={handleOpenTestEmailDialog}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Envoyer en test
            </Button>
          )}
        </div>
      </div>

      {/* Test Email Dialog */}
      <Dialog open={showTestEmailDialog} onOpenChange={setShowTestEmailDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un email de test</DialogTitle>
            <DialogDescription>
              L'email sera envoyé à l'adresse ci-dessous, pas au client réel ({recipientEmail}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Adresse email de test</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="test@exemple.com"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && testEmailAddress) {
                    handleSendTest();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestEmailDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSendTest}
              disabled={!testEmailAddress || isSendingTest}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSendingTest ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
