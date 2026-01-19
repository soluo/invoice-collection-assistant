import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { MessageSquare, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
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

  const latestNote = notes?.[0]; // Most recent (already sorted DESC by backend)

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

  // Don't show loading state for compact - just show input ready
  if (notes === undefined) {
    return (
      <div className="space-y-2 pt-4 border-t">
        <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
          <MessageSquare className="h-4 w-4" />
          Notes
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            placeholder="Ajouter une note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            className="flex-1 h-9 text-sm"
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

  return (
    <div className="space-y-2 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
        <MessageSquare className="h-4 w-4" />
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Ajouter une note..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          className="flex-1 h-9 text-sm"
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
