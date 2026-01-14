import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Phone, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEventConfig, getReminderIcon } from "@/lib/eventConfig";

interface EventHistorySectionProps {
  invoiceId: Id<"invoices">;
}

// Format event date with relative time and full date
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

// Get the author name for an event
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
    // Extract email prefix
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
                {/* Metadata: amount for payment events */}
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
