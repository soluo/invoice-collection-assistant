import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  Calendar,
  Eye,
  FileText,
  Check,
  Bell,
  FileUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { EmailPreviewModalFollowUp } from "@/components/EmailPreviewModalFollowUp";
import { EmailEditModal } from "@/components/EmailEditModal";
import { BulkSendConfirmModal } from "@/components/BulkSendConfirmModal";
import { PhoneCallCompleteModal } from "@/components/PhoneCallCompleteModal";

export function FollowUp() {
  const upcomingReminders = useQuery(api.followUp.getUpcomingReminders);
  const reminderHistory = useQuery(api.followUp.getReminderHistory);
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const [previewReminder, setPreviewReminder] = useState<any | null>(null);
  const [editReminder, setEditReminder] = useState<any | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [phoneCallReminder, setPhoneCallReminder] = useState<any | null>(null);

  // Group upcoming reminders by date
  const groupedReminders = groupRemindersByDate(upcomingReminders || []);

  return (
    <div className="container mx-auto max-w-6xl py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Relances</h1>
        <p className="mt-2 text-lg text-gray-600">
          Suivez ce que le système fait pour vous et ce qui a été fait.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList>
          <TabsTrigger value="upcoming">
            En cours
            {upcomingReminders && upcomingReminders.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {upcomingReminders.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">
            Historique
          </TabsTrigger>
        </TabsList>

        {/* En cours Tab Content */}
        <TabsContent value="upcoming" className="mt-6">
          {upcomingReminders === undefined ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : upcomingReminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                Aucune relance en cours
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Toutes vos relances sont à jour.
              </p>
            </div>
          ) : (
            <div className={`space-y-6 ${selectedReminders.length > 0 ? "pb-24" : ""}`}>
              {groupedReminders.overdue.length > 0 && (
                <ReminderGroup
                  title="En retard"
                  reminders={groupedReminders.overdue}
                  selectedReminders={selectedReminders}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                />
              )}
              {groupedReminders.today.length > 0 && (
                <ReminderGroup
                  title="Aujourd'hui"
                  reminders={groupedReminders.today}
                  selectedReminders={selectedReminders}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                />
              )}
              {groupedReminders.tomorrow.length > 0 && (
                <ReminderGroup
                  title="Demain"
                  reminders={groupedReminders.tomorrow}
                  selectedReminders={selectedReminders}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                />
              )}
              {groupedReminders.later.length > 0 && (
                <ReminderGroup
                  title="Plus tard"
                  reminders={groupedReminders.later}
                  selectedReminders={selectedReminders}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                />
              )}
            </div>
          )}
        </TabsContent>

        {/* Historique Tab Content */}
        <TabsContent value="history" className="mt-6">
          {reminderHistory === undefined ? (
            <div className="text-center py-8 text-gray-500">Chargement...</div>
          ) : reminderHistory.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                Aucun historique
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                L'historique des événements apparaîtra ici.
              </p>
            </div>
          ) : (
            <EventTimeline events={reminderHistory} />
          )}
        </TabsContent>
      </Tabs>

      {/* Barre d'action fixe pour envoi en masse */}
      {selectedReminders.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-sm rounded-full shadow-lg border border-gray-200 px-2 py-2 pointer-events-auto">
            <Button
              onClick={() => setShowBulkConfirm(true)}
              className="bg-primary hover:bg-primary/90 rounded-full px-6 py-2.5"
            >
              <Mail className="h-4 w-4 mr-2" />
              Envoyer {selectedReminders.length} relance{selectedReminders.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      {/* Modaux */}
      {previewReminder && (
        <EmailPreviewModalFollowUp
          reminder={previewReminder}
          organization={organization}
          onClose={() => setPreviewReminder(null)}
          onEdit={() => {
            setEditReminder(previewReminder);
            setPreviewReminder(null);
          }}
        />
      )}

      {editReminder && (
        <EmailEditModal
          reminderId={editReminder._id}
          initialSubject={editReminder.data?.emailSubject || ""}
          initialContent={editReminder.data?.emailContent || ""}
          onClose={() => setEditReminder(null)}
          onSave={() => {
            setEditReminder(null);
            // Rafraîchir les données
          }}
        />
      )}

      {showBulkConfirm && upcomingReminders && (
        <BulkSendConfirmModal
          reminders={upcomingReminders.filter((r) => selectedReminders.includes(r._id))}
          onClose={() => setShowBulkConfirm(false)}
          onSuccess={() => {
            setSelectedReminders([]);
            setShowBulkConfirm(false);
          }}
        />
      )}

      {phoneCallReminder && (
        <PhoneCallCompleteModal
          reminder={phoneCallReminder}
          onClose={() => setPhoneCallReminder(null)}
        />
      )}
    </div>
  );
}

// Helper function to group reminders by date
function groupRemindersByDate(reminders: any[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

  return {
    overdue: reminders.filter((r) => {
      const reminderDate = new Date(r.reminderDate.replace(" ", "T"));
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() < today.getTime();
    }),
    today: reminders.filter((r) => {
      const reminderDate = new Date(r.reminderDate.replace(" ", "T"));
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() === today.getTime();
    }),
    tomorrow: reminders.filter((r) => {
      const reminderDate = new Date(r.reminderDate.replace(" ", "T"));
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() === tomorrow.getTime();
    }),
    later: reminders.filter((r) => {
      const reminderDate = new Date(r.reminderDate.replace(" ", "T"));
      reminderDate.setHours(0, 0, 0, 0);
      return reminderDate.getTime() >= dayAfterTomorrow.getTime();
    }),
  };
}

// Component for a group of reminders
function ReminderGroup({
  title,
  reminders,
  selectedReminders,
  onToggleSelect,
  onPreview,
  onPhoneComplete
}: {
  title: string;
  reminders: any[];
  selectedReminders: string[];
  onToggleSelect: (id: string) => void;
  onPreview: (reminder: any) => void;
  onPhoneComplete: (reminder: any) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-3">{title}</h2>
      <div className="space-y-4">
        {reminders.map((reminder) => (
          <ReminderCard
            key={reminder._id}
            reminder={reminder}
            isSelected={selectedReminders.includes(reminder._id)}
            onToggleSelect={() => onToggleSelect(reminder._id)}
            onPreview={() => onPreview(reminder)}
            onPhoneComplete={() => onPhoneComplete(reminder)}
          />
        ))}
      </div>
    </div>
  );
}

// Component for a single reminder card
function ReminderCard({
  reminder,
  isSelected,
  onToggleSelect,
  onPreview,
  onPhoneComplete
}: {
  reminder: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onPhoneComplete: () => void;
}) {
  const isEmail = reminder.reminderType === "email";
  const isPhone = reminder.reminderType === "phone";

  // Indicateur de sévérité subtil (petit dot)
  const getSeverityDot = () => {
    if (reminder.reminderStatus === "reminder_1") return "bg-gray-400";
    if (reminder.reminderStatus === "reminder_2") return "bg-amber-500";
    if (reminder.reminderStatus === "reminder_3" || reminder.reminderStatus === "reminder_4") return "bg-red-500";
    return "bg-gray-400";
  };

  const getSeverityLabel = () => {
    if (reminder.reminderStatus === "reminder_1") return "1ère relance";
    if (reminder.reminderStatus === "reminder_2") return "2ème relance";
    if (reminder.reminderStatus === "reminder_3") return "3ème relance";
    if (reminder.reminderStatus === "reminder_4") return "4ème relance";
    return "";
  };

  const reminderDate = new Date(reminder.reminderDate.replace(" ", "T"));
  const formattedDate = reminderDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors">
      {/* Mobile layout */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {/* Ligne 1: icône + facture/client + montant */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            {isEmail && <Mail className="h-4 w-4" />}
            {isPhone && <Phone className="h-4 w-4" />}
            <span className={`absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${getSeverityDot()}`} />
          </div>
          <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="min-w-0 truncate">
              <a
                href={`/invoices/${reminder.invoice?._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gray-900 hover:text-primary hover:underline"
              >
                {reminder.invoice?.invoiceNumber || "N/A"}
              </a>
              <span className="text-gray-500 ml-1.5">
                {reminder.invoice?.clientName || "Client inconnu"}
              </span>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="font-semibold text-gray-900">
                {reminder.invoice?.amountTTC.toFixed(2)} €
              </span>
              {reminder.daysOverdue !== undefined && reminder.daysOverdue > 0 && (
                <span className="text-red-600 font-medium ml-1.5">+{reminder.daysOverdue}j</span>
              )}
            </div>
          </div>
        </div>

        {/* Ligne 2: sujet email ou type + métadonnées */}
        <div className="pl-12 text-sm">
          {isEmail && (
            <p className="text-gray-600 truncate">"{reminder.data?.emailSubject || "Sans objet"}"</p>
          )}
          {isPhone && (
            <p className="text-gray-600">Appel téléphonique</p>
          )}
          <p className="text-gray-400 text-xs mt-0.5">
            {getSeverityLabel()} · {formattedDate}
          </p>
        </div>

        {/* Ligne 3: checkbox (si email) à gauche + action à droite */}
        <div className="pl-12 flex items-center justify-between">
          {isEmail ? (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
                className="h-4 w-4 rounded border-gray-300 accent-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-sm text-gray-500">Sélectionner</span>
            </label>
          ) : (
            <div />
          )}
          {isEmail && (
            <Button variant="outline" size="sm" onClick={onPreview}>
              <Eye className="h-4 w-4 mr-1" />
              Prévisualiser
            </Button>
          )}
          {isPhone && (
            <Button variant="outline" size="sm" onClick={onPhoneComplete}>
              <Check className="h-4 w-4 mr-1" />
              Marquer fait
            </Button>
          )}
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {isEmail ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="h-5 w-5 flex-shrink-0 rounded border-gray-300 accent-primary focus:ring-primary cursor-pointer"
            />
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}
          <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-600">
            {isEmail && <Mail className="h-5 w-5" />}
            {isPhone && <Phone className="h-5 w-5" />}
            <span className={`absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${getSeverityDot()}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 truncate">
              <a
                href={`/invoices/${reminder.invoice?._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-900 hover:text-primary hover:underline"
              >
                {reminder.invoice?.invoiceNumber || "N/A"}
              </a>
              <span className="text-gray-500 font-normal ml-2">
                {reminder.invoice?.clientName || "Client inconnu"}
              </span>
            </p>
            <p className="text-sm text-gray-600 truncate">
              {isEmail && (
                <>"{reminder.data?.emailSubject || "Sans objet"}"</>
              )}
              {isPhone && "Appel téléphonique"}
              <span className="text-gray-400 ml-2">· {getSeverityLabel()}</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right ml-4">
          <p className="text-base font-semibold text-gray-900">
            {reminder.invoice?.amountTTC.toFixed(2)} €
          </p>
          {reminder.daysOverdue !== undefined && reminder.daysOverdue > 0 && (
            <p className="text-sm text-red-600 font-medium">+{reminder.daysOverdue} j</p>
          )}
          <div className="mt-2 flex gap-2 justify-end">
            {isEmail && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-1" />
                Prévisualiser
              </Button>
            )}
            {isPhone && (
              <Button variant="outline" size="sm" onClick={onPhoneComplete}>
                <Check className="h-4 w-4 mr-1" />
                Marquer fait
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Component for event timeline
function EventTimeline({ events }: { events: any[] }) {
  // Group events by date
  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {Object.entries(groupedEvents).map(([date, dateEvents], dateIndex) => (
          <li key={date}>
            <div className="relative pb-8">
              {dateIndex !== Object.keys(groupedEvents).length - 1 && (
                <span
                  className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-start space-x-3">
                <div>
                  <div className="relative px-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-8 ring-white">
                      <span className="text-xs font-semibold text-gray-700">
                        {formatEventDate(date)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 py-1.5">
                  <div className="space-y-3">
                    {dateEvents.map((event: any) => (
                      <EventCard key={event._id} event={event} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Helper to group events by date
function groupEventsByDate(events: any[]) {
  const grouped: Record<string, any[]> = {};

  events.forEach((event) => {
    const date = new Date(event.eventDate);
    const dateKey = date.toISOString().split("T")[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  });

  return grouped;
}

// Format date for timeline
function formatEventDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }).toUpperCase();
}

// Component for a single event card
function EventCard({ event }: { event: any }) {
  const getEventIcon = () => {
    switch (event.eventType) {
      case "invoice_imported":
        return <FileUp className="h-4 w-4" />;
      case "invoice_sent":
      case "invoice_marked_sent":
        return <Mail className="h-4 w-4" />;
      case "reminder_sent":
        return event.metadata?.reminderType === "phone" ? (
          <Phone className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        );
      case "payment_registered":
      case "invoice_marked_paid":
        return <Check className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Couleurs simplifiées : vert pour paiement, gris pour le reste
  const isPayment = event.eventType === "payment_registered" || event.eventType === "invoice_marked_paid";
  const iconClasses = isPayment
    ? "bg-green-100 text-green-600"
    : "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300 transition-colors">
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
        {getEventIcon()}
      </div>
      <p className="text-sm text-gray-700">
        {event.description || getDefaultEventDescription(event)}
      </p>
    </div>
  );
}

// Get default description for event
function getDefaultEventDescription(event: any) {
  const invoiceInfo = event.invoice
    ? `${event.invoice.clientName} (${event.invoice.invoiceNumber})`
    : "";
  const amount = event.metadata?.amount ? ` pour ${event.metadata.amount.toFixed(2)} €` : "";

  switch (event.eventType) {
    case "invoice_imported":
      return `Facture ${invoiceInfo} importée${amount}`;
    case "invoice_sent":
      return `Facture ${invoiceInfo} envoyée${amount}`;
    case "invoice_marked_sent":
      return `Facture ${invoiceInfo} marquée comme envoyée${amount}`;
    case "reminder_sent":
      if (event.metadata?.reminderType === "phone") {
        return `Appel téléphonique effectué pour ${invoiceInfo}${amount}`;
      }
      return `Relance email envoyée à ${invoiceInfo}${amount}`;
    case "payment_registered":
      return `Paiement enregistré pour ${invoiceInfo}${amount}`;
    case "invoice_marked_paid":
      return `Facture ${invoiceInfo} marquée comme payée${amount}`;
    default:
      return event.eventType;
  }
}
