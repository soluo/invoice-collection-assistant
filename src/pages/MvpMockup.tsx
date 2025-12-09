import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Phone, CheckCircle2, Send, Mail } from "lucide-react";

// Données d'exemple statiques
const MOCK_INVOICES = [
  {
    id: 1,
    clientName: "Jean Dupont",
    invoiceNumber: "FAC-2024-001",
    amount: 2450.00,
    dueDate: "2024-12-01",
    status: "urgent", // >15j retard
    daysLate: 23,
  },
  {
    id: 2,
    clientName: "Marie Martin",
    invoiceNumber: "FAC-2024-002",
    amount: 1250.50,
    dueDate: "2024-12-08",
    status: "late", // en retard 1-15j
    daysLate: 5,
  },
  {
    id: 3,
    clientName: "Pierre Leroy",
    invoiceNumber: "FAC-2024-003",
    amount: 890.00,
    dueDate: "2024-12-15",
    status: "waiting", // envoyée, en attente
    daysLate: 0,
  },
  {
    id: 4,
    clientName: "Sophie Bernard",
    invoiceNumber: "FAC-2024-004",
    amount: 3200.00,
    dueDate: "2024-12-20",
    status: "to_send", // à envoyer
    daysLate: 0,
  },
  {
    id: 5,
    clientName: "Luc Petit",
    invoiceNumber: "FAC-2024-005",
    amount: 750.00,
    dueDate: "2024-11-25",
    status: "paid", // payée
    daysLate: 0,
  },
  {
    id: 6,
    clientName: "Annie Dubois",
    invoiceNumber: "FAC-2024-006",
    amount: 1890.00,
    dueDate: "2024-12-10",
    status: "waiting",
    daysLate: 0,
  },
];

type TabType = "to_handle" | "waiting" | "paid";

export function MvpMockup() {
  const [activeTab, setActiveTab] = useState<TabType>("to_handle");

  // Calcul des stats
  const urgentCount = MOCK_INVOICES.filter(i => i.status === "urgent").length;
  const waitingCount = MOCK_INVOICES.filter(i => i.status === "waiting" || i.status === "late").length;
  const totalAmount = MOCK_INVOICES
    .filter(i => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  // Filtrage selon l'onglet
  const filteredInvoices = MOCK_INVOICES.filter(invoice => {
    if (activeTab === "to_handle") {
      return ["urgent", "late", "to_send"].includes(invoice.status);
    }
    if (activeTab === "waiting") {
      return invoice.status === "waiting";
    }
    return invoice.status === "paid";
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header fixe */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💡 Maquette Simplifiée</h1>
              <p className="text-sm text-gray-500 mt-1">Nouveau concept UX ultra-simple pour artisans</p>
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 📊 GROSSES CARDS DE STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card Urgentes */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
               onClick={() => setActiveTab("to_handle")}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">🔴 URGENTES</p>
                <p className="text-4xl font-bold mt-2">{urgentCount}</p>
                <p className="text-red-100 text-sm mt-1">factures à traiter</p>
              </div>
              <div className="bg-red-400 bg-opacity-30 rounded-full p-3">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card En Attente */}
          <div className="bg-gradient-to-br from-orange-400 to-orange-500 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
               onClick={() => setActiveTab("waiting")}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">⏰ EN ATTENTE</p>
                <p className="text-4xl font-bold mt-2">{waitingCount}</p>
                <p className="text-orange-100 text-sm mt-1">factures envoyées</p>
              </div>
              <div className="bg-orange-300 bg-opacity-30 rounded-full p-3">
                <Mail className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Card Total à Encaisser */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">💰 À ENCAISSER</p>
                <p className="text-4xl font-bold mt-2">{totalAmount.toLocaleString('fr-FR')} €</p>
                <p className="text-blue-100 text-sm mt-1">total en cours</p>
              </div>
              <div className="bg-blue-400 bg-opacity-30 rounded-full p-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* 📑 ONGLETS SIMPLES */}
        <div className="bg-white rounded-lg border shadow-sm">
          {/* Tabs Header */}
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("to_handle")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "to_handle"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-lg">🎯 À traiter</span>
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  {MOCK_INVOICES.filter(i => ["urgent", "late", "to_send"].includes(i.status)).length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("waiting")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "waiting"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-lg">⏰ En attente</span>
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {MOCK_INVOICES.filter(i => i.status === "waiting").length}
                </span>
              </button>
              <button
                onClick={() => setActiveTab("paid")}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === "paid"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="text-lg">✅ Payées</span>
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {MOCK_INVOICES.filter(i => i.status === "paid").length}
                </span>
              </button>
            </nav>
          </div>

          {/* Tab Content - Liste Desktop */}
          <div className="hidden md:block">
            <div className="divide-y">
              {filteredInvoices.map((invoice) => (
                <InvoiceRowDesktop key={invoice.id} invoice={invoice} />
              ))}
            </div>
          </div>

          {/* Tab Content - Liste Mobile */}
          <div className="md:hidden p-4 space-y-4">
            {filteredInvoices.map((invoice) => (
              <InvoiceCardMobile key={invoice.id} invoice={invoice} />
            ))}
          </div>
        </div>

        {/* 📝 Légende */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">💡 Concept clé de cette maquette</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>✅ <strong>3 onglets simples</strong> au lieu de 10 pages différentes</li>
            <li>✅ <strong>1 gros bouton par facture</strong> selon son état (ENVOYER / RELANCER / APPELER / MARQUER PAYÉE)</li>
            <li>✅ <strong>Badges avec émojis</strong> pour comprendre en un coup d'œil</li>
            <li>✅ <strong>Cards extra-larges sur mobile</strong> avec boutons tactiles XXL</li>
            <li>✅ <strong>Moins d'infos, plus d'actions</strong> - focus sur ce qu'il faut faire</li>
            <li>✅ <strong>Couleurs cohérentes</strong> : Rouge = urgent, Orange = attention, Vert = OK, Bleu = info</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// 🖥️ Ligne Desktop
function InvoiceRowDesktop({ invoice }: { invoice: typeof MOCK_INVOICES[0] }) {
  const { badge, button } = getInvoiceDisplayConfig(invoice);

  return (
    <div className="px-6 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-6">
        {/* Client + Numéro */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-lg">{invoice.clientName}</p>
          <p className="text-sm text-gray-500">#{invoice.invoiceNumber}</p>
        </div>

        {/* Montant */}
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{invoice.amount.toFixed(2)} €</p>
          {invoice.daysLate > 0 && (
            <p className="text-sm text-red-600 font-medium">⏰ Retard : {invoice.daysLate} jours</p>
          )}
        </div>

        {/* Badge État */}
        <div className="w-32">
          <Badge className={`${badge.className} text-sm py-1 px-3 w-full justify-center`}>
            {badge.icon} {badge.label}
          </Badge>
        </div>

        {/* Bouton Action Principal */}
        <div className="w-48">
          <Button
            className={`${button.className} w-full h-12 text-base font-semibold shadow-sm hover:shadow-md transition-all`}
          >
            {button.icon && <span className="mr-2">{button.icon}</span>}
            {button.label}
          </Button>
        </div>
      </div>
    </div>
  );
}

// 📱 Card Mobile XXL
function InvoiceCardMobile({ invoice }: { invoice: typeof MOCK_INVOICES[0] }) {
  const { badge, button } = getInvoiceDisplayConfig(invoice);

  return (
    <div className="bg-white border-2 rounded-2xl p-6 shadow-sm active:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="font-bold text-xl text-gray-900 mb-1">{invoice.clientName}</p>
          <p className="text-sm text-gray-500">#{invoice.invoiceNumber}</p>
        </div>
        <Badge className={`${badge.className} text-sm py-1 px-3 ml-2`}>
          {badge.icon} {badge.label}
        </Badge>
      </div>

      {/* Montant XXL */}
      <div className="mb-4">
        <p className="text-4xl font-bold text-gray-900">{invoice.amount.toFixed(2)} €</p>
        {invoice.daysLate > 0 && (
          <p className="text-base text-red-600 font-semibold mt-1">⏰ Retard : {invoice.daysLate} jours</p>
        )}
      </div>

      {/* Bouton Action XXL */}
      <Button
        className={`${button.className} w-full h-16 text-xl font-bold shadow-md active:shadow-xl transition-all`}
      >
        {button.icon && <span className="mr-3 text-2xl">{button.icon}</span>}
        {button.label}
      </Button>

      {/* Lien secondaire discret */}
      <button className="w-full mt-3 text-sm text-blue-600 hover:underline">
        Voir les détails →
      </button>
    </div>
  );
}

// 🎨 Configuration visuelle selon l'état
function getInvoiceDisplayConfig(invoice: typeof MOCK_INVOICES[0]) {
  switch (invoice.status) {
    case "urgent":
      return {
        badge: {
          icon: "🔴",
          label: "URGENT",
          className: "bg-red-100 text-red-800 border-red-200",
        },
        button: {
          icon: <Phone className="h-5 w-5" />,
          label: "APPELER",
          className: "bg-red-600 hover:bg-red-700 text-white",
        },
      };

    case "late":
      return {
        badge: {
          icon: "⚠️",
          label: "En retard",
          className: "bg-orange-100 text-orange-800 border-orange-200",
        },
        button: {
          icon: <Bell className="h-5 w-5" />,
          label: "RELANCER",
          className: "bg-orange-500 hover:bg-orange-600 text-white",
        },
      };

    case "waiting":
      return {
        badge: {
          icon: "⏰",
          label: "En attente",
          className: "bg-blue-100 text-blue-800 border-blue-200",
        },
        button: {
          icon: <CheckCircle2 className="h-5 w-5" />,
          label: "MARQUER PAYÉE",
          className: "bg-green-600 hover:bg-green-700 text-white",
        },
      };

    case "to_send":
      return {
        badge: {
          icon: "📝",
          label: "À envoyer",
          className: "bg-purple-100 text-purple-800 border-purple-200",
        },
        button: {
          icon: <Send className="h-5 w-5" />,
          label: "ENVOYER",
          className: "bg-blue-600 hover:bg-blue-700 text-white",
        },
      };

    case "paid":
      return {
        badge: {
          icon: "✅",
          label: "Payée",
          className: "bg-green-100 text-green-800 border-green-200",
        },
        button: {
          icon: null,
          label: "Archivée",
          className: "bg-gray-200 text-gray-600 cursor-default",
        },
      };

    default:
      return {
        badge: {
          icon: "",
          label: "Inconnu",
          className: "bg-gray-100 text-gray-800",
        },
        button: {
          icon: null,
          label: "Aucune action",
          className: "bg-gray-200 text-gray-600",
        },
      };
  }
}
