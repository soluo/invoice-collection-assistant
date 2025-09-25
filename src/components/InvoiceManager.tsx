import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { InvoiceList } from "./InvoiceList";
import { InvoiceUpload } from "./InvoiceUpload";
import { ReminderSettings } from "./ReminderSettings";

export function InvoiceManager() {
  const [activeTab, setActiveTab] = useState<"invoices" | "upload" | "settings">("invoices");
  const invoices = useQuery(api.invoices.list);

  const tabs = [
    { id: "invoices", label: "Factures", count: invoices?.length || 0 },
    { id: "upload", label: "Nouvelle facture" },
    { id: "settings", label: "Paramètres" },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {"count" in tab && tab.count > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenu */}
      <div className="min-h-[600px]">
        {activeTab === "invoices" && <InvoiceList />}
        {activeTab === "upload" && <InvoiceUpload onSuccess={() => setActiveTab("invoices")} />}
        {activeTab === "settings" && <ReminderSettings />}
      </div>
    </div>
  );
}
