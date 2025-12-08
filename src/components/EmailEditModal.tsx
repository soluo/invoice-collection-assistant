import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

interface EmailEditModalProps {
  reminderId: Id<"reminders">;
  initialSubject: string;
  initialContent: string;
  onClose: () => void;
  onSave?: () => void; // Callback après sauvegarde réussie
}

export function EmailEditModal({
  reminderId,
  initialSubject,
  initialContent,
  onClose,
  onSave,
}: EmailEditModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const updateEmailContent = useMutation(api.reminders.updateEmailContent);

  const handleSave = async () => {
    if (!subject.trim()) {
      toast.error("Le sujet ne peut pas être vide");
      return;
    }

    if (!content.trim()) {
      toast.error("Le contenu ne peut pas être vide");
      return;
    }

    setIsSaving(true);
    try {
      await updateEmailContent({
        reminderId,
        subject: subject.trim(),
        content: content.trim(),
      });

      toast.success("Email modifié avec succès");
      onSave?.();
      onClose();
    } catch (error: any) {
      console.error("Erreur lors de la modification:", error);
      toast.error(error?.message || "Erreur lors de la modification");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            Modifier l'email de relance
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isSaving}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Subject input */}
          <div>
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Objet de l'email *
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Relance pour facture en retard"
              disabled={isSaving}
            />
          </div>

          {/* Content textarea */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Contenu de l'email *
            </label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-h-[300px]"
              placeholder="Bonjour,&#10;&#10;Nous constatons que..."
              disabled={isSaving}
            />
            <p className="mt-1 text-xs text-gray-500">
              Vous pouvez modifier librement le contenu de l'email.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            disabled={isSaving}
          >
            Annuler
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
