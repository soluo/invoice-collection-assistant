import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id, Doc } from "@convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";

// Type pour les reminders retournés par getUpcomingReminders
type UpcomingReminder = NonNullable<FunctionReturnType<typeof api.followUp.getUpcomingReminders>>[number];

// Type pour les simulated reminders (avec isSimulation flag)
type SimulatedReminder = NonNullable<FunctionReturnType<typeof api.followUp.generateSimulatedReminders>>[number];

// Union type pour tous les reminders (réels ou simulés)
type AnyReminder = UpcomingReminder | SimulatedReminder;
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
  FileUp,
  CalendarDays,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { useInvoiceDrawerUrl } from "@/hooks/useInvoiceDrawerUrl";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { EmailPreviewModalFollowUp } from "@/components/EmailPreviewModalFollowUp";
import { EmailEditModal } from "@/components/EmailEditModal";
import { BulkSendConfirmModal } from "@/components/BulkSendConfirmModal";
import { PhoneCallCompleteModal } from "@/components/PhoneCallCompleteModal";
import { InvoiceDetailDrawer } from "@/components/InvoiceDetailDrawer";

export function FollowUp() {
  // URL-synced drawer state (shareable URLs, back/forward navigation)
  const { selectedInvoiceId: selectedInvoiceForDrawer, setSelectedInvoiceId: setSelectedInvoiceForDrawer } = useInvoiceDrawerUrl();

  // User and organization data
  const currentUser = useQuery(api.auth.loggedInUser);
  const organization = useQuery(api.organizations.getCurrentOrganization);

  // Simulation state (admin only)
  const [simulationDate, setSimulationDate] = useState<Date | null>(null);
  const [testSentIds, setTestSentIds] = useState<Set<string>>(new Set());

  // Format date for backend (YYYY-MM-DD)
  const simulationDateString = simulationDate ? format(simulationDate, "yyyy-MM-dd") : null;

  // Conditional queries - real vs simulated
  const realReminders = useQuery(api.followUp.getUpcomingReminders);
  const simulatedReminders = useQuery(
    api.followUp.generateSimulatedReminders,
    simulationDateString ? { targetDate: simulationDateString } : "skip"
  );

  // Use simulated reminders if in simulation mode, otherwise real reminders
  const upcomingReminders = simulationDateString
    ? (simulatedReminders as AnyReminder[] | undefined)
    : (realReminders as AnyReminder[] | undefined);

  // ✅ Story 6.4: Utiliser la query filtrée pour n'afficher QUE les reminder_sent
  const reminderHistory = useQuery(api.followUp.getReminderHistoryFiltered);
  const [previewReminder, setPreviewReminder] = useState<AnyReminder | null>(null);
  const [editReminder, setEditReminder] = useState<AnyReminder | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);
  const [phoneCallReminder, setPhoneCallReminder] = useState<AnyReminder | null>(null);

  // Check if user is admin
  const isAdmin = currentUser?.role === "admin";

  // Handler for when a test email is sent
  const handleTestSent = (reminderId: string) => {
    setTestSentIds((prev) => new Set([...prev, reminderId]));
  };

  // Handler for exiting simulation mode
  const handleExitSimulation = () => {
    setSimulationDate(null);
    setTestSentIds(new Set());
    toast.success("Mode simulation terminé", {
      description: "Retour aux relances réelles",
    });
  };

  // Group upcoming reminders by date
  const groupedReminders = groupRemindersByDate(upcomingReminders || []);

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Relances</h1>
          <p className="text-slate-500 mt-1">
            Suivez ce que le système fait pour vous et ce qui a été fait.
          </p>
        </div>

        {/* Date picker for simulation (admin only) */}
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {simulationDate
                    ? format(simulationDate, "d MMM yyyy", { locale: fr })
                    : "Simuler une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={simulationDate ?? undefined}
                  onSelect={(date) => setSimulationDate(date ?? null)}
                  locale={fr}
                  style={{ ["--cell-size" as string]: "2.75rem" }}
                  classNames={{
                    weekday: "w-10 text-center text-muted-foreground text-sm font-normal",
                    day: "w-10 h-10 text-center p-0",
                    week: "flex w-full mt-1",
                    weekdays: "flex w-full",
                  }}
                />
              </PopoverContent>
            </Popover>
            {simulationDate && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExitSimulation}
                className="px-2"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Simulation mode banner */}
      {simulationDate && (
        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-2">
          <div className="flex items-center gap-2 text-purple-700">
            <CalendarDays className="h-4 w-4" />
            <span className="font-medium">Mode simulation</span>
            <span className="text-purple-600">
              Relances prévues pour le {format(simulationDate, "d MMMM yyyy", { locale: fr })}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExitSimulation}
            className="text-purple-700 hover:text-purple-900 hover:bg-purple-100"
          >
            Quitter simulation
          </Button>
        </div>
      )}

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
                {simulationDate
                  ? "Aucune relance simulée pour cette date"
                  : "Aucune relance en cours"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {simulationDate
                  ? `Aucune facture ne génère de relance le ${format(simulationDate, "d MMMM yyyy", { locale: fr })}.`
                  : "Toutes vos relances sont à jour."}
              </p>
            </div>
          ) : (
            <div className={`space-y-6 ${selectedReminders.length > 0 ? "pb-24" : ""}`}>
              {groupedReminders.overdue.length > 0 && (
                <ReminderGroup
                  title="En retard"
                  reminders={groupedReminders.overdue}
                  selectedReminders={selectedReminders}
                  testSentIds={testSentIds}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                  onInvoiceClick={(id) => setSelectedInvoiceForDrawer(id as Id<"invoices">)}
                />
              )}
              {groupedReminders.today.length > 0 && (
                <ReminderGroup
                  title="Aujourd'hui"
                  reminders={groupedReminders.today}
                  selectedReminders={selectedReminders}
                  testSentIds={testSentIds}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                  onInvoiceClick={(id) => setSelectedInvoiceForDrawer(id as Id<"invoices">)}
                />
              )}
              {groupedReminders.tomorrow.length > 0 && (
                <ReminderGroup
                  title="Demain"
                  reminders={groupedReminders.tomorrow}
                  selectedReminders={selectedReminders}
                  testSentIds={testSentIds}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                  onInvoiceClick={(id) => setSelectedInvoiceForDrawer(id as Id<"invoices">)}
                />
              )}
              {groupedReminders.later.length > 0 && (
                <ReminderGroup
                  title="Plus tard"
                  reminders={groupedReminders.later}
                  selectedReminders={selectedReminders}
                  testSentIds={testSentIds}
                  onToggleSelect={(id) => {
                    setSelectedReminders((prev) =>
                      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
                    );
                  }}
                  onPreview={setPreviewReminder}
                  onPhoneComplete={setPhoneCallReminder}
                  onInvoiceClick={(id) => setSelectedInvoiceForDrawer(id as Id<"invoices">)}
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
            <EventTimeline
              events={reminderHistory}
              onInvoiceClick={(id) => setSelectedInvoiceForDrawer(id as Id<"invoices">)}
            />
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
          onTestSent={handleTestSent}
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

      {/* Invoice Detail Drawer */}
      <InvoiceDetailDrawer
        invoiceId={selectedInvoiceForDrawer}
        open={selectedInvoiceForDrawer !== null}
        onOpenChange={(open) => !open && setSelectedInvoiceForDrawer(null)}
      />
    </div>
  );
}

// Helper function to group reminders by date
function groupRemindersByDate(reminders: AnyReminder[]) {
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
  testSentIds,
  onToggleSelect,
  onPreview,
  onPhoneComplete,
  onInvoiceClick
}: {
  title: string;
  reminders: AnyReminder[];
  selectedReminders: string[];
  testSentIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onPreview: (reminder: AnyReminder) => void;
  onPhoneComplete: (reminder: AnyReminder) => void;
  onInvoiceClick: (invoiceId: string) => void;
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
            testSent={testSentIds.has(reminder._id)}
            onToggleSelect={() => onToggleSelect(reminder._id)}
            onPreview={() => onPreview(reminder)}
            onPhoneComplete={() => onPhoneComplete(reminder)}
            onInvoiceClick={onInvoiceClick}
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
  testSent,
  onToggleSelect,
  onPreview,
  onPhoneComplete,
  onInvoiceClick
}: {
  reminder: AnyReminder;
  isSelected: boolean;
  testSent?: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onPhoneComplete: () => void;
  onInvoiceClick: (invoiceId: string) => void;
}) {
  const isEmail = reminder.reminderType === "email";
  const isPhone = reminder.reminderType === "phone";
  const isSimulation = "isSimulation" in reminder && reminder.isSimulation === true;

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

  const handleCardClick = () => {
    if (reminder.invoice?._id) {
      onInvoiceClick(reminder.invoice._id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`rounded-lg border p-4 transition-colors cursor-pointer active:bg-gray-50 ${
        isSimulation
          ? "border-purple-200 bg-purple-50/30 hover:border-purple-300"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      {/* Simulation and Test Sent badges */}
      {(isSimulation || testSent) && (
        <div className="flex gap-2 mb-2">
          {isSimulation && (
            <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs hover:bg-purple-100">
              Simulation
            </Badge>
          )}
          {testSent && (
            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs hover:bg-green-100">
              <Check className="h-3 w-3 mr-1" />
              Test envoyé
            </Badge>
          )}
        </div>
      )}

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
              <span className="font-semibold text-gray-900">
                {reminder.invoice?.invoiceNumber || "N/A"}
              </span>
              <span className="text-gray-500 ml-1.5">
                {reminder.invoice?.clientName || "Client inconnu"}
              </span>
            </div>
            <div className="flex-shrink-0 text-right">
              <span className="font-semibold text-gray-900">
                {reminder.invoice ? `${reminder.invoice.amountTTC.toFixed(2)} €` : "—"}
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

        {/* Ligne 3: checkbox (si email, non-simulation) à gauche + action à droite */}
        <div className="pl-12 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
          {isEmail && !isSimulation ? (
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
          {isPhone && !isSimulation && (
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
          {isEmail && !isSimulation ? (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              onClick={(e) => e.stopPropagation()}
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
              <span className="text-gray-900">
                {reminder.invoice?.invoiceNumber || "N/A"}
              </span>
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
            {reminder.invoice ? `${reminder.invoice.amountTTC.toFixed(2)} €` : "—"}
          </p>
          {reminder.daysOverdue !== undefined && reminder.daysOverdue > 0 && (
            <p className="text-sm text-red-600 font-medium">+{reminder.daysOverdue} j</p>
          )}
          <div className="mt-2 flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
            {isEmail && (
              <Button variant="outline" size="sm" onClick={onPreview}>
                <Eye className="h-4 w-4 mr-1" />
                Prévisualiser
              </Button>
            )}
            {isPhone && !isSimulation && (
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
function EventTimeline({ events, onInvoiceClick }: { events: any[]; onInvoiceClick: (invoiceId: string) => void }) {
  // Group events by date
  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-6 md:space-y-8">
      {Object.entries(groupedEvents).map(([date, dateEvents]) => (
        <div key={date} className="flex flex-col md:flex-row gap-2 md:gap-4">
          {/* Date - inline on mobile, column on desktop */}
          <div className="flex md:flex-col items-baseline md:items-center gap-2 md:gap-0 md:flex-shrink-0 md:w-14 md:text-center md:pt-1">
            <div className="text-lg font-bold text-primary leading-tight">
              {formatEventDateDay(date)}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase">
              {formatEventDateMonth(date)}
            </div>
          </div>
          {/* Events column */}
          <div className="flex-1 space-y-3">
            {dateEvents.map((event: any) => (
              <EventCard key={event._id} event={event} onInvoiceClick={onInvoiceClick} />
            ))}
          </div>
        </div>
      ))}
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

// Format date day for timeline
function formatEventDateDay(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", { day: "2-digit" });
}

// Format date month for timeline
function formatEventDateMonth(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("fr-FR", { month: "short" });
}

// Component for a single event card
function EventCard({ event, onInvoiceClick }: { event: any; onInvoiceClick: (invoiceId: string) => void }) {
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

  // Formater l'heure
  const eventTime = new Date(event.eventDate).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Déterminer qui a fait l'action
  const getActorName = () => {
    if (event.metadata?.isAutomatic) {
      return "Système";
    }
    if (event.user?.name) {
      return event.user.name;
    }
    if (event.user?.email) {
      return event.user.email.split("@")[0];
    }
    return "Système";
  };

  // Description courte de l'action (sans les infos de facture)
  const getActionDescription = () => {
    switch (event.eventType) {
      case "invoice_imported":
        return "Facture importée";
      case "invoice_sent":
        return "Facture envoyée";
      case "invoice_marked_sent":
        return "Facture marquée comme envoyée";
      case "reminder_sent":
        if (event.metadata?.reminderType === "phone") {
          // Extraire le résultat de l'appel depuis la description
          if (event.description) {
            const desc = event.description;
            if (desc.includes("Litige signalé")) return "Litige signalé";
            if (desc.includes("s'engage à payer")) return "Client s'engage à payer";
            if (desc.includes("Message vocal")) return "Tentative d'appel : Message vocal laissé";
            if (desc.includes("Pas de réponse")) return "Tentative d'appel : Pas de réponse";
            if (desc.includes("Appel téléphonique effectué")) return "Appel téléphonique effectué";
          }
          return "Appel téléphonique effectué";
        }
        const reminderNum = event.metadata?.reminderNumber || 1;
        const isManual = !event.metadata?.isAutomatic;
        return `${reminderNum}${reminderNum === 1 ? "ère" : "ème"} relance ${isManual ? "manuelle " : ""}envoyée`;
      case "payment_registered":
        return "Paiement enregistré";
      case "invoice_marked_paid":
        return "Facture marquée comme payée";
      default:
        return event.eventType;
    }
  };

  const handleCardClick = () => {
    if (event.invoice?._id) {
      onInvoiceClick(event.invoice._id);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 transition-colors cursor-pointer active:bg-gray-50"
    >
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconClasses}`}>
        {getEventIcon()}
      </div>
      <div className="min-w-0 flex-1">
        {/* Ligne 1: Facture + client */}
        {event.invoice && (
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900">
              {event.invoice.invoiceNumber}
            </span>
            <span className="text-gray-500 text-sm">
              {event.invoice.clientName}
            </span>
          </div>
        )}
        {/* Ligne 2: Description de l'action */}
        <p className="text-sm text-gray-700">
          {getActionDescription()}
        </p>
        {/* Ligne 3: Par qui + heure */}
        <p className="text-xs text-gray-400 mt-1">
          par {getActorName()} à {eventTime}
        </p>
      </div>
    </div>
  );
}

