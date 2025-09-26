import { Dashboard } from "./Dashboard";
import { OngoingInvoices } from "./OngoingInvoices";
import { PaidInvoices } from "./PaidInvoices";
import { ReminderSettings } from "./ReminderSettings";

type Route = "/" | "/ongoing" | "/paid" | "/settings";

interface InvoiceManagerProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export function InvoiceManager({ currentRoute, onNavigate }: InvoiceManagerProps) {
  return (
    <div>
      {/* Contenu basé sur la route */}
      {currentRoute === "/" && <Dashboard onNavigate={onNavigate} />}
      {currentRoute === "/ongoing" && <OngoingInvoices onNavigate={onNavigate} />}
      {currentRoute === "/paid" && <PaidInvoices onNavigate={onNavigate} />}
      {currentRoute === "/settings" && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate("/")} className="text-blue-600 hover:underline">
              ← Retour au dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          </div>
          <ReminderSettings />
        </div>
      )}
    </div>
  );
}
