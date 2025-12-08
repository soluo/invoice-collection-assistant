import { Upload, Mail, User, Check, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type EventType =
  | "invoice_imported"
  | "invoice_marked_sent"
  | "invoice_sent"
  | "payment_registered"
  | "invoice_marked_paid"
  | "reminder_sent";

type Event = {
  _id: string;
  eventType: string;
  eventDate: number;
  description?: string;
  metadata?: {
    amount?: number;
    reminderNumber?: number;
    isAutomatic?: boolean;
    previousSendStatus?: string;
    previousPaymentStatus?: string;
  };
  user: {
    _id: string;
    name?: string;
    email?: string;
  } | null;
};

type EventConfig = {
  icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
};

const EVENT_CONFIGS: Record<EventType, EventConfig> = {
  invoice_imported: {
    icon: Upload,
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  invoice_marked_sent: {
    icon: Mail,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  invoice_sent: {
    icon: Mail,
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  reminder_sent: {
    icon: Mail,
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  payment_registered: {
    icon: Check,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  invoice_marked_paid: {
    icon: Check,
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
};

function getEventConfig(eventType: string): EventConfig {
  return (
    EVENT_CONFIGS[eventType as EventType] || {
      icon: AlertTriangle,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
    }
  );
}

function formatEventDate(timestamp: number): string {
  const date = new Date(timestamp);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const fullDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${timeAgo} • ${fullDate}`;
}

function getUserName(user: Event["user"]): string {
  if (!user) return "Système";
  return user.name || user.email || "Utilisateur";
}

type InvoiceTimelineProps = {
  events: Event[];
};

export function InvoiceTimeline({ events }: InvoiceTimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Historique des actions
        </h2>
        <p className="text-sm text-gray-500">Aucun événement pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <h2 className="border-b border-gray-200 p-6 text-lg font-semibold text-gray-900">
        Historique des actions
      </h2>
      <ul className="divide-y divide-gray-200">
        {events.map((event) => {
          const config = getEventConfig(event.eventType);
          const Icon = config.icon;
          const userName = getUserName(event.user);

          return (
            <li key={event._id} className="flex gap-4 p-6">
              {/* Icon */}
              <div
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
              >
                <Icon className={`h-5 w-5 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1">
                <p className="text-sm text-gray-800">
                  {event.description ? (
                    <span>{event.description}</span>
                  ) : (
                    <>
                      <span className="font-medium">{userName}</span>
                      {" "}a effectué une action
                    </>
                  )}
                </p>

                {/* Metadata details */}
                {event.metadata && (
                  <div className="mt-1 text-xs text-gray-600">
                    {event.metadata.amount !== undefined && (
                      <span>Montant : {event.metadata.amount.toFixed(2)} €</span>
                    )}
                    {event.metadata.reminderNumber !== undefined && (
                      <span>
                        {" • "}Relance n°{event.metadata.reminderNumber}
                        {event.metadata.isAutomatic !== undefined &&
                          ` (${event.metadata.isAutomatic ? "automatique" : "manuelle"})`}
                      </span>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <p className="mt-1 text-xs text-gray-500">
                  {formatEventDate(event.eventDate)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
