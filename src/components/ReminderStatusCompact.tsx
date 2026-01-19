import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, Mail, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReminderStatusCompactProps {
  invoiceId: Id<"invoices">;
}

type PhoneOutcome = "no_answer" | "voicemail" | "will_pay" | "dispute";

interface Reminder {
  _id: Id<"reminders">;
  reminderDate: string;
  reminderType: "email" | "phone";
  completionStatus: "pending" | "completed" | "failed";
  completedAt?: number;
  data?: {
    phoneCallOutcome?: PhoneOutcome;
  };
}

function LastReminderLine({ reminder }: { reminder: Reminder }) {
  const Icon = reminder.reminderType === "email" ? Mail : Phone;
  const typeLabel = reminder.reminderType === "email" ? "Email" : "Appel";

  // Get outcome text
  let outcome = "✓";
  if (reminder.reminderType === "phone" && reminder.data?.phoneCallOutcome) {
    const outcomes: Record<PhoneOutcome, string> = {
      will_pay: "✓ Promet paiement",
      no_answer: "Pas de réponse",
      voicemail: "Messagerie",
      dispute: "Litige",
    };
    outcome = outcomes[reminder.data.phoneCallOutcome];
  }

  const date = reminder.completedAt
    ? new Date(reminder.completedAt)
    : new Date(reminder.reminderDate.replace(" ", "T"));

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-gray-600">Dernière :</span>
      <span className="text-gray-900">{typeLabel}</span>
      <span className="text-gray-400">·</span>
      <span className="text-gray-500">
        {formatDistanceToNow(date, { addSuffix: true, locale: fr })}
      </span>
      <span
        className={cn(
          "text-xs",
          outcome.startsWith("✓") ? "text-green-600" : "text-gray-500"
        )}
      >
        {outcome}
      </span>
    </div>
  );
}

function NextReminderLine({ reminder }: { reminder: Reminder }) {
  const Icon = reminder.reminderType === "email" ? Mail : Phone;
  const typeLabel = reminder.reminderType === "email" ? "Email" : "Appel";
  const date = new Date(reminder.reminderDate.replace(" ", "T"));

  // Check if it's in the past (overdue)
  const isOverdue = date < new Date();

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-gray-400" />
      <span className="text-gray-600">Prochaine :</span>
      <span className="text-gray-900">{typeLabel}</span>
      <span className="text-gray-400">·</span>
      <span className={isOverdue ? "text-red-600 font-medium" : "text-gray-500"}>
        {isOverdue
          ? `En retard (${formatDistanceToNow(date, { locale: fr })})`
          : format(date, "d MMM", { locale: fr })}
      </span>
    </div>
  );
}

export function ReminderStatusCompact({
  invoiceId,
}: ReminderStatusCompactProps) {
  const reminders = useQuery(api.reminders.getByInvoice, { invoiceId });

  if (reminders === undefined) {
    return null; // Loading - don't show skeleton for compact section
  }

  // Find last completed reminder (most recent by completedAt or reminderDate)
  const completedReminders = (reminders as Reminder[])
    .filter((r) => r.completionStatus === "completed")
    .sort((a, b) => {
      const dateA =
        a.completedAt || new Date(a.reminderDate.replace(" ", "T")).getTime();
      const dateB =
        b.completedAt || new Date(b.reminderDate.replace(" ", "T")).getTime();
      return dateB - dateA; // DESC
    });
  const lastCompleted = completedReminders[0];

  // Find next pending reminder (earliest by reminderDate)
  const pendingReminders = (reminders as Reminder[])
    .filter((r) => r.completionStatus === "pending")
    .sort((a, b) => {
      const dateA = new Date(a.reminderDate.replace(" ", "T")).getTime();
      const dateB = new Date(b.reminderDate.replace(" ", "T")).getTime();
      return dateA - dateB; // ASC
    });
  const nextPending = pendingReminders[0];

  // If no reminders at all, don't show section (AC #7)
  if (!lastCompleted && !nextPending) {
    return null;
  }

  return (
    <div className="space-y-1.5 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
        <Bell className="h-4 w-4" />
        Relances
      </p>

      {lastCompleted && <LastReminderLine reminder={lastCompleted} />}

      {nextPending && <NextReminderLine reminder={nextPending} />}
    </div>
  );
}
