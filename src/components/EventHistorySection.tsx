import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  FileUp,
  Mail,
  Phone,
  Check,
  CreditCard,
  Bell,
  History,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EventHistorySectionProps {
  invoiceId: Id<"invoices">;
}

type EventType =
  | "invoice_imported"
  | "invoice_marked_sent"
  | "invoice_sent"
  | "payment_registered"
  | "invoice_marked_paid"
  | "reminder_sent";

interface EventConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  bgColor: string;
  iconColor: string;
}

// Configuration des types d'événements avec icônes et labels français
const EVENT_CONFIG: Record<EventType, EventConfig> = {
  invoice_imported: {
    icon: FileUp,
    label: "Facture importée",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  invoice_marked_sent: {
    icon: Mail,
    label: "Facture marquée envoyée",
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  invoice_sent: {
    icon: Mail,
    label: "Facture envoyée",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  payment_registered: {
    icon: CreditCard,
    label: "Paiement enregistré",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  invoice_marked_paid: {
    icon: Check,
    label: "Facture payée",
    bgColor: "bg-green-100",
    iconColor: "text-green-600",
  },
  reminder_sent: {
    icon: Bell,
    label: "Relance envoyée",
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
};

function getEventConfig(eventType: string): EventConfig {
  return (
    EVENT_CONFIG[eventType as EventType] || {
      icon: History,
      label: eventType,
      bgColor: "bg-gray-100",
      iconColor: "text-gray-600",
    }
  );
}

// Formater la date de l'événement
function formatEventDate(timestamp: number): string {
  const date = new Date(timestamp);
  const timeAgo = formatDistanceToNow(date, { addSuffix: true, locale: fr });
  const fullDate = date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${timeAgo} • ${fullDate} à ${time}`;
}

// Obtenir le nom de l'auteur de l'action
function getAuthorName(
  user: { name?: string; email?: string } | null,
  isAutomatic?: boolean
): string {
  if (isAutomatic) {
    return "Système";
  }
  if (!user) {
    return "Système";
  }
  if (user.name) {
    return user.name;
  }
  if (user.email) {
    // Extraire le préfixe de l'email
    return user.email.split("@")[0];
  }
  return "Système";
}

export function EventHistorySection({ invoiceId }: EventHistorySectionProps) {
  const [showAll, setShowAll] = useState(false);
  const events = useQuery(api.events.getByInvoice, { invoiceId });

  // Loading state
  if (events === undefined) {
    return (
      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique complet
        </p>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500" />
        </div>
      </div>
    );
  }

  // Empty state
  if (events.length === 0) {
    return (
      <div className="space-y-3 pt-4 border-t">
        <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Historique complet
        </p>
        <p className="text-sm text-gray-500">Aucun événement pour cette facture</p>
      </div>
    );
  }

  // Events are already sorted DESC by the backend query
  // Apply show more/less logic
  const displayedEvents = showAll ? events : events.slice(0, 5);
  const hasMore = events.length > 5;

  return (
    <div className="space-y-3 pt-4 border-t">
      <p className="text-sm text-gray-500 font-medium flex items-center gap-2">
        <History className="h-4 w-4" />
        Historique complet
      </p>

      <ul className="space-y-3">
        {displayedEvents.map((event) => {
          const config = getEventConfig(event.eventType);
          const Icon = config.icon;
          // Use Phone icon for phone reminders
          const DisplayIcon =
            event.eventType === "reminder_sent" &&
            event.metadata?.reminderType === "phone"
              ? Phone
              : Icon;

          const authorName = getAuthorName(
            event.user,
            event.metadata?.isAutomatic
          );

          return (
            <li key={event._id} className="flex gap-3 items-start">
              {/* Icon */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}
              >
                <DisplayIcon className={`h-4 w-4 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {event.description || config.label}
                </p>
                {/* Metadata: montant pour les paiements */}
                {event.metadata?.amount !== undefined && (
                  <p className="text-xs text-gray-600">
                    Montant : {event.metadata.amount.toFixed(2)} €
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  par {authorName} • {formatEventDate(event.eventDate)}
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
              Voir tout ({events.length})
            </>
          )}
        </Button>
      )}
    </div>
  );
}
