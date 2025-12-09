import { Calendar, CheckCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Reminder {
  _id: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  scheduledDate: string;
  reminderType: string;
  status: "scheduled" | "sent";
  sentDate?: string;
  emailSubject?: string;
  emailContent?: string;
}

interface AutoRemindersViewProps {
  reminders: Reminder[];
  onPreview: (reminder: Reminder) => void;
}

export default function AutoRemindersView({
  reminders,
  onPreview,
}: AutoRemindersViewProps) {
  const scheduledReminders = reminders.filter((r) => r.status === "scheduled");
  const sentReminders = reminders.filter((r) => r.status === "sent");

  const formatDate = (dateStr: string) => {
    // Format: "YYYY-MM-DD HH:mm:ss" ou "YYYY-MM-DD"
    const date = new Date(dateStr.replace(" ", "T"));
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Section 1 : Relances planifiées */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-700" />
          <h2 className="text-sm font-semibold text-blue-900">
            Relances planifiées ({scheduledReminders.length})
          </h2>
        </div>

        {scheduledReminders.length === 0 ? (
          <p className="text-sm text-blue-700/70">Aucune relance planifiée pour le moment</p>
        ) : (
          <div className="space-y-3">
            {scheduledReminders.map((reminder) => (
              <div
                key={reminder._id}
                className="bg-white rounded-lg p-4 border border-blue-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{reminder.clientName}</h3>
                      <span className="text-xs text-gray-500">#{reminder.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{reminder.amount.toLocaleString("fr-FR")} €</span>
                      <span>•</span>
                      <span>{reminder.reminderType}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-2">Envoi prévu le</p>
                    <p className="text-sm font-medium text-blue-700">
                      {formatDate(reminder.scheduledDate)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPreview(reminder)}
                      className="mt-2"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Prévisualiser
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2 : Relances envoyées */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-5 h-5 text-green-700" />
          <h2 className="text-sm font-semibold text-gray-900">
            Relances envoyées récemment ({sentReminders.length})
          </h2>
        </div>

        {sentReminders.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune relance envoyée dans les 30 derniers jours</p>
        ) : (
          <div className="space-y-3">
            {sentReminders.map((reminder) => (
              <div
                key={reminder._id}
                className="bg-white rounded-lg p-4 border border-gray-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium text-gray-900">{reminder.clientName}</h3>
                      <span className="text-xs text-gray-500">#{reminder.invoiceNumber}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span>{reminder.amount.toLocaleString("fr-FR")} €</span>
                      <span>•</span>
                      <span>{reminder.reminderType}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Envoyée le</p>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-green-700">
                        {reminder.sentDate ? formatDate(reminder.sentDate) : "—"}
                      </p>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
