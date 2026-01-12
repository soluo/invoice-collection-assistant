import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReminderHistorySectionProps {
  invoiceId: Id<"invoices">;
}

type ReminderStatus = "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4";
type CompletionStatus = "pending" | "completed" | "failed";
type ReminderType = "email" | "phone";
type PhoneOutcome = "no_answer" | "voicemail" | "will_pay" | "dispute";

interface Reminder {
  _id: Id<"reminders">;
  reminderDate: string;
  reminderStatus: ReminderStatus;
  reminderType: ReminderType;
  completionStatus: CompletionStatus;
  completedAt?: number;
  data?: {
    emailSubject?: string;
    emailContent?: string;
    sendError?: string;
    phoneCallNotes?: string;
    phoneCallOutcome?: PhoneOutcome;
  };
}

// Icône selon le type (toujours gris neutre)
function getReminderIcon(reminderType: ReminderType) {
  return reminderType === "email" ? Mail : Phone;
}

// Labels pour le statut de relance
const REMINDER_STATUS_LABELS: Record<ReminderStatus, string> = {
  reminder_1: "Relance 1",
  reminder_2: "Relance 2",
  reminder_3: "Relance 3",
  reminder_4: "Relance 4",
};

// Labels et styles pour le statut de complétion (minimaliste)
function getCompletionInfo(reminder: Reminder): { label: string; className: string } {
  const { completionStatus, reminderType, data } = reminder;

  if (completionStatus === "pending") {
    return { label: "En attente", className: "text-gray-500" };
  }

  if (completionStatus === "failed") {
    return { label: "Échec", className: "text-red-600" };
  }

  // Completed
  if (reminderType === "phone" && data?.phoneCallOutcome) {
    const outcomeLabels: Record<PhoneOutcome, { label: string; className: string }> = {
      will_pay: { label: "Promet de payer", className: "text-green-600" },
      no_answer: { label: "Pas de réponse", className: "text-gray-500" },
      voicemail: { label: "Messagerie", className: "text-gray-500" },
      dispute: { label: "Litige", className: "text-red-600" },
    };
    return outcomeLabels[data.phoneCallOutcome];
  }

  return { label: "Envoyée", className: "text-gray-500" };
}

// Formater la date de reminder (format court)
function formatReminderDate(reminderDate: string): string {
  // Format attendu: "2025-09-26 10:00:00"
  const date = new Date(reminderDate.replace(" ", "T"));
  const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const fullDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return `${timeAgo} • ${fullDate}`;
}

export function ReminderHistorySection({ invoiceId }: ReminderHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const reminders = useQuery(api.reminders.getByInvoice, { invoiceId });

  // Loading state
  if (reminders === undefined) {
    return (
      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique des relances
        </p>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
        </div>
      </div>
    );
  }

  // Empty state
  if (reminders.length === 0) {
    return (
      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique des relances
        </p>
        <p className="text-sm text-gray-500">Aucune relance pour cette facture</p>
      </div>
    );
  }

  // Sort reminders by date (most recent first)
  const sortedReminders = [...reminders].sort((a, b) => {
    const dateA = new Date(a.reminderDate.replace(" ", "T"));
    const dateB = new Date(b.reminderDate.replace(" ", "T"));
    return dateB.getTime() - dateA.getTime();
  }) as Reminder[];

  // Apply show more/less logic
  const displayedReminders = showAll ? sortedReminders : sortedReminders.slice(0, 5);
  const hasMore = sortedReminders.length > 5;

  return (
    <div className="space-y-3 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
        <History className="h-4 w-4" />
        Historique des relances
      </p>

      <ul className="space-y-3">
        {displayedReminders.map((reminder) => {
          const Icon = getReminderIcon(reminder.reminderType);
          const completionInfo = getCompletionInfo(reminder);

          return (
            <li key={reminder._id} className="flex gap-3 items-start">
              {/* Icon neutre */}
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                <Icon className="h-4 w-4 text-gray-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {REMINDER_STATUS_LABELS[reminder.reminderStatus]}
                  <span className={`ml-2 ${completionInfo.className}`}>
                    • {completionInfo.label}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  {formatReminderDate(reminder.reminderDate)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Show more/less button */}
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-600 hover:text-gray-900"
          onClick={() => setShowAll(!showAll)}
          aria-expanded={showAll}
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Voir tout ({sortedReminders.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
