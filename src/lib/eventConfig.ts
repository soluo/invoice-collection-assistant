import {
  FileUp,
  Mail,
  Phone,
  Check,
  CreditCard,
  Bell,
  History,
  Upload,
  AlertTriangle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Centralized event type configuration
 * Used across EventHistorySection, InvoiceTimeline, and FollowUp page
 */

export type EventType =
  | "invoice_imported"
  | "invoice_marked_sent"
  | "invoice_sent"
  | "payment_registered"
  | "invoice_marked_paid"
  | "reminder_sent";

export interface EventConfig {
  icon: LucideIcon;
  label: string;
  bgColor: string;
  iconColor: string;
}

/**
 * Configuration for each event type with icon, label, and colors
 */
export const EVENT_CONFIG: Record<EventType, EventConfig> = {
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

/**
 * Default config for unknown event types
 */
export const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: History,
  label: "Événement",
  bgColor: "bg-gray-100",
  iconColor: "text-gray-600",
};

/**
 * Get event configuration by type, with fallback for unknown types
 */
export function getEventConfig(eventType: string): EventConfig {
  return EVENT_CONFIG[eventType as EventType] || DEFAULT_EVENT_CONFIG;
}

/**
 * Get the appropriate icon for reminder events
 * Returns Phone icon for phone reminders, Bell for email reminders
 */
export function getReminderIcon(reminderType?: string): LucideIcon {
  return reminderType === "phone" ? Phone : Bell;
}

/**
 * Check if an event type represents a payment
 */
export function isPaymentEvent(eventType: string): boolean {
  return eventType === "payment_registered" || eventType === "invoice_marked_paid";
}

/**
 * Alternative config used by InvoiceTimeline (slightly different icons)
 * Kept for backwards compatibility
 */
export const TIMELINE_EVENT_CONFIG: Record<EventType, EventConfig> = {
  invoice_imported: {
    icon: Upload,
    label: "Facture importée",
    bgColor: "bg-gray-100",
    iconColor: "text-gray-600",
  },
  invoice_marked_sent: {
    icon: Mail,
    label: "Facture marquée envoyée",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  invoice_sent: {
    icon: Mail,
    label: "Facture envoyée",
    bgColor: "bg-blue-100",
    iconColor: "text-blue-600",
  },
  payment_registered: {
    icon: Check,
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
    icon: Mail,
    label: "Relance envoyée",
    bgColor: "bg-orange-100",
    iconColor: "text-orange-600",
  },
};

/**
 * Default config for timeline (unknown event types)
 */
export const DEFAULT_TIMELINE_CONFIG: EventConfig = {
  icon: AlertTriangle,
  label: "Événement",
  bgColor: "bg-gray-100",
  iconColor: "text-gray-600",
};

/**
 * Get timeline event configuration by type
 */
export function getTimelineEventConfig(eventType: string): EventConfig {
  return TIMELINE_EVENT_CONFIG[eventType as EventType] || DEFAULT_TIMELINE_CONFIG;
}
