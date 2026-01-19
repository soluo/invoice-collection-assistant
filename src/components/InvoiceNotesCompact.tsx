import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface InvoiceNotesCompactProps {
  invoiceId: Id<"invoices">;
}

export function InvoiceNotesCompact({ invoiceId }: InvoiceNotesCompactProps) {
  const notes = useQuery(api.invoiceNotes.listForInvoice, { invoiceId });
  const createNote = useMutation(api.invoiceNotes.create);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const latestNote = notes?.[0]; // Most recent (already sorted DESC by backend)

  // Autosize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const maxHeight = 168; // ~7 lignes
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    }
  }, [newNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createNote({ invoiceId, content: newNote.trim() });
      setNewNote("");
      toast.success("Note ajoutée");
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show form immediately even while loading - input is always usable
  return (
    <div className="space-y-2 pt-4 border-t border-gray-100">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4 text-gray-300" />
        Notes
      </p>

      {/* Latest note (if exists) - AC #1, #3 */}
      {latestNote && (
        <div className="p-2 bg-gray-50 rounded text-sm">
          <p className="text-gray-700 line-clamp-2">{latestNote.content}</p>
          <p className="text-xs text-gray-400 mt-1">
            {latestNote.createdByName} ·{" "}
            {formatDistanceToNow(latestNote._creationTime, {
              addSuffix: true,
              locale: fr,
            })}
          </p>
        </div>
      )}

      {/* Compact input - AC #2 */}
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          placeholder="Ajouter une note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={2}
          className="flex-1 text-sm resize-none min-h-[60px]"
          disabled={isSubmitting}
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newNote.trim() || isSubmitting}
          className="h-9 px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
