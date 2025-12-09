import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell,
  Phone,
  CheckCircle2,
  Send,
  Mail,
  Search,
  ArrowUpDown,
  Eye,
  Calendar,
  Wallet,
  Settings,
  X,
} from "lucide-react";

// Données d'exemple statiques
const MOCK_INVOICES = [
  {
    id: 1,
    clientName: "Jean Dupont",
    invoiceNumber: "FAC-2024-001",
    amount: 2450.00,
    dueDate: "2024-12-01",
    status: "urgent",
    daysLate: 23,
    nextReminderDate: "2024-12-10",
  },
  {
    id: 2,
    clientName: "Marie Martin",
    invoiceNumber: "FAC-2024-002",
    amount: 1250.50,
    dueDate: "2024-12-08",
    status: "late",
    daysLate: 5,
    nextReminderDate: "2024-12-12",
  },
  {
    id: 3,
    clientName: "Pierre Leroy",
    invoiceNumber: "FAC-2024-003",
    amount: 890.00,
    dueDate: "2024-12-15",
    status: "waiting",
    daysLate: 0,
  },
  {
    id: 4,
    clientName: "Sophie Bernard",
    invoiceNumber: "FAC-2024-004",
    amount: 3200.00,
    dueDate: "2024-12-20",
    status: "to_send",
    daysLate: 0,
  },
  {
    id: 5,
    clientName: "Luc Petit",
    invoiceNumber: "FAC-2024-005",
    amount: 750.00,
    dueDate: "2024-11-25",
    status: "paid",
    daysLate: 0,
    paidDate: "2024-12-08",
  },
];

const MOCK_AUTO_REMINDERS = [
  {
    id: 1,
    invoiceNumber: "FAC-2024-001",
    clientName: "Jean Dupont",
    amount: 2450.00,
    scheduledDate: "2024-12-10",
    reminderType: "Relance 2 - Sérieuse",
    status: "scheduled",
  },
  {
    id: 2,
    invoiceNumber: "FAC-2024-002",
    clientName: "Marie Martin",
    amount: 1250.50,
    scheduledDate: "2024-12-12",
    reminderType: "Relance 1 - Amicale",
    status: "scheduled",
  },
  {
    id: 3,
    invoiceNumber: "FAC-2023-089",
    clientName: "Paul Durand",
    amount: 1890.00,
    scheduledDate: "2024-12-08",
    reminderType: "Relance 1 - Amicale",
    status: "sent",
    sentDate: "2024-12-08",
  },
];

type TabType = "to_handle" | "waiting" | "paid" | "auto_reminders";
type SortField = "amount" | "dueDate" | "client";

export function MvpMockupV2() {
  const [activeTab, setActiveTab] = useState<TabType>("to_handle");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("dueDate");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<typeof MOCK_INVOICES[0] | null>(null);

  // Stats
  const urgentCount = MOCK_INVOICES.filter(i => i.status === "urgent").length;
  const waitingCount = MOCK_INVOICES.filter(i => i.status === "waiting").length;
  const totalAmount = MOCK_INVOICES
    .filter(i => i.status !== "paid")
    .reduce((sum, i) => sum + i.amount, 0);
  const scheduledRemindersCount = MOCK_AUTO_REMINDERS.filter(r => r.status === "scheduled").length;

  // Filtrage
  const filteredInvoices = MOCK_INVOICES.filter(invoice => {
    // Filtre par onglet
    if (activeTab === "to_handle" && !["urgent", "late", "to_send"].includes(invoice.status)) return false;
    if (activeTab === "waiting" && invoice.status !== "waiting") return false;
    if (activeTab === "paid" && invoice.status !== "paid") return false;

    // Recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!invoice.clientName.toLowerCase().includes(query) &&
          !invoice.invoiceNumber.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Filtre statut
    if (filterStatus !== "all" && invoice.status !== filterStatus) {
      return false;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header sobre */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Maquette V2 - Sobre et Complète</h1>
              <p className="text-sm text-gray-500 mt-0.5">Interface épurée avec toutes les fonctionnalités essentielles</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              Retour
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats discrètes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Urgentes"
            value={urgentCount}
            icon={<Bell className="h-5 w-5" />}
            color="red"
            onClick={() => setActiveTab("to_handle")}
          />
          <StatCard
            label="En attente"
            value={waitingCount}
            icon={<Mail className="h-5 w-5" />}
            color="blue"
            onClick={() => setActiveTab("waiting")}
          />
          <StatCard
            label="À encaisser"
            value={`${totalAmount.toLocaleString('fr-FR')} €`}
            icon={<Wallet className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            label="Relances auto"
            value={scheduledRemindersCount}
            icon={<Calendar className="h-5 w-5" />}
            color="purple"
            onClick={() => setActiveTab("auto_reminders")}
          />
        </div>

        {/* Navigation par onglets sobre */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="border-b bg-gray-50">
            <nav className="flex">
              <TabButton
                active={activeTab === "to_handle"}
                onClick={() => setActiveTab("to_handle")}
                label="À traiter"
                count={MOCK_INVOICES.filter(i => ["urgent", "late", "to_send"].includes(i.status)).length}
              />
              <TabButton
                active={activeTab === "waiting"}
                onClick={() => setActiveTab("waiting")}
                label="En attente"
                count={waitingCount}
              />
              <TabButton
                active={activeTab === "paid"}
                onClick={() => setActiveTab("paid")}
                label="Payées"
                count={MOCK_INVOICES.filter(i => i.status === "paid").length}
              />
              <TabButton
                active={activeTab === "auto_reminders"}
                onClick={() => setActiveTab("auto_reminders")}
                label="Relances auto"
                count={scheduledRemindersCount}
                icon={<Settings className="h-4 w-4" />}
              />
            </nav>
          </div>

          {/* Filtres et tri (visible uniquement pour les factures) */}
          {activeTab !== "auto_reminders" && (
            <div className="p-4 bg-gray-50 border-b">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher client ou N° facture..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {/* Filtre statut */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="urgent">Urgent uniquement</SelectItem>
                    <SelectItem value="late">En retard</SelectItem>
                    <SelectItem value="to_send">À envoyer</SelectItem>
                  </SelectContent>
                </Select>

                {/* Tri */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortField)}>
                  <SelectTrigger className="h-9 text-sm">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dueDate">Trier par échéance</SelectItem>
                    <SelectItem value="amount">Trier par montant</SelectItem>
                    <SelectItem value="client">Trier par client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Contenu selon onglet */}
          <div className="divide-y">
            {activeTab === "auto_reminders" ? (
              // Vue des relances automatiques
              <AutoRemindersView
                reminders={MOCK_AUTO_REMINDERS}
                onPreview={(reminder) => {
                  // Trouver la facture correspondante
                  const invoice = MOCK_INVOICES.find(i => i.invoiceNumber === reminder.invoiceNumber);
                  if (invoice) {
                    setSelectedInvoice(invoice);
                    setShowEmailPreview(true);
                  }
                }}
              />
            ) : (
              // Vue des factures
              filteredInvoices.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onPreviewEmail={() => {
                    setSelectedInvoice(invoice);
                    setShowEmailPreview(true);
                  }}
                />
              ))
            )}

            {filteredInvoices.length === 0 && activeTab !== "auto_reminders" && (
              <div className="p-12 text-center text-gray-500">
                <p>Aucune facture trouvée</p>
              </div>
            )}
          </div>
        </div>

        {/* Encadré explicatif */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 text-sm mb-2">💡 Améliorations de cette V2</h3>
          <ul className="space-y-1 text-xs text-blue-800">
            <li>✅ <strong>Design sobre</strong> - Palette de couleurs apaisée, tailles cohérentes</li>
            <li>✅ <strong>Filtres et tri</strong> - Recherche, filtre par statut, tri par montant/date/client</li>
            <li>✅ <strong>Onglet "Relances auto"</strong> - Voir ce que le système fait automatiquement</li>
            <li>✅ <strong>2 actions paiement</strong> - "Enregistrer paiement" (chèque) OU "Marquer payée" (simple)</li>
            <li>✅ <strong>Preview email avant envoi</strong> - Voir le contenu exact avant validation</li>
            <li>✅ <strong>Actions sur factures en retard</strong> - Peut relancer ET enregistrer paiement</li>
            <li>✅ <strong>Gestion templates</strong> - Mentionné dans les paramètres (icône Settings)</li>
          </ul>
        </div>
      </div>

      {/* Modal Preview Email */}
      {showEmailPreview && selectedInvoice && (
        <EmailPreviewModal
          invoice={selectedInvoice}
          onClose={() => setShowEmailPreview(false)}
          onConfirmSend={() => {
            setShowEmailPreview(false);
            // Action d'envoi
          }}
        />
      )}
    </div>
  );
}

// Composant StatCard sobre
function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "red" | "blue" | "green" | "purple";
  onClick?: () => void;
}) {
  const colorClasses = {
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    green: "bg-green-50 text-green-700 border-green-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <div
      className={`rounded-lg border p-4 ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-2xl font-semibold mt-1">{value}</p>
        </div>
        <div className="opacity-50">{icon}</div>
      </div>
    </div>
  );
}

// Composant TabButton sobre
function TabButton({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600 bg-white"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      <span className="flex items-center gap-2">
        {icon}
        {label}
        {count !== undefined && (
          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs ${
            active ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
          }`}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
}

// Ligne de facture sobre et fonctionnelle
function InvoiceRow({
  invoice,
  onPreviewEmail,
}: {
  invoice: typeof MOCK_INVOICES[0];
  onPreviewEmail: () => void;
}) {
  const getStatusBadge = () => {
    switch (invoice.status) {
      case "urgent":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Urgent</Badge>;
      case "late":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">En retard</Badge>;
      case "waiting":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En attente</Badge>;
      case "to_send":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">À envoyer</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Payée</Badge>;
      default:
        return null;
    }
  };

  const getPrimaryAction = () => {
    if (invoice.status === "paid") {
      return null;
    }

    if (invoice.status === "urgent") {
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50">
            <Phone className="h-4 w-4 mr-1" />
            Appeler
          </Button>
          <Button size="sm" variant="outline" onClick={onPreviewEmail}>
            <Eye className="h-4 w-4 mr-1" />
            Relancer
          </Button>
        </div>
      );
    }

    if (invoice.status === "late") {
      return (
        <Button size="sm" variant="outline" className="border-orange-600 text-orange-600 hover:bg-orange-50" onClick={onPreviewEmail}>
          <Bell className="h-4 w-4 mr-1" />
          Relancer
        </Button>
      );
    }

    if (invoice.status === "to_send") {
      return (
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
          <Send className="h-4 w-4 mr-1" />
          Envoyer
        </Button>
      );
    }

    return null;
  };

  const getSecondaryActions = () => {
    if (invoice.status === "paid") {
      return (
        <span className="text-xs text-gray-500">
          Payée le {new Date(invoice.paidDate || "").toLocaleDateString("fr-FR")}
        </span>
      );
    }

    return (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-900">
          <Wallet className="h-4 w-4 mr-1" />
          Enregistrer paiement
        </Button>
        <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
          <CheckCircle2 className="h-4 w-4 mr-1" />
          Marquer payée
        </Button>
      </div>
    );
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Infos facture */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <p className="font-medium text-gray-900">{invoice.clientName}</p>
            {getStatusBadge()}
          </div>
          <p className="text-sm text-gray-500">
            #{invoice.invoiceNumber} • Échéance : {new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
            {invoice.daysLate > 0 && (
              <span className="text-red-600 font-medium ml-2">
                • {invoice.daysLate} jour{invoice.daysLate > 1 ? "s" : ""} de retard
              </span>
            )}
          </p>
        </div>

        {/* Montant */}
        <div className="text-right md:w-32">
          <p className="text-lg font-semibold text-gray-900">
            {invoice.amount.toFixed(2)} €
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 md:w-80">
          <div className="flex justify-end">
            {getPrimaryAction()}
          </div>
          <div className="flex justify-end">
            {getSecondaryActions()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Vue des relances automatiques
function AutoRemindersView({
  reminders,
  onPreview,
}: {
  reminders: typeof MOCK_AUTO_REMINDERS;
  onPreview: (reminder: typeof MOCK_AUTO_REMINDERS[0]) => void;
}) {
  const scheduled = reminders.filter(r => r.status === "scheduled");
  const sent = reminders.filter(r => r.status === "sent");

  return (
    <div className="divide-y">
      {/* Section planifiées */}
      {scheduled.length > 0 && (
        <div className="p-4 bg-blue-50">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Relances planifiées ({scheduled.length})
          </h3>
          <div className="space-y-2">
            {scheduled.map((reminder) => (
              <div key={reminder.id} className="bg-white rounded-lg border border-blue-200 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{reminder.clientName}</p>
                    <p className="text-xs text-gray-500">
                      #{reminder.invoiceNumber} • {reminder.amount.toFixed(2)} € • {reminder.reminderType}
                    </p>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Envoi prévu le</p>
                      <p className="text-sm font-medium text-blue-700">
                        {new Date(reminder.scheduledDate).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => onPreview(reminder)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Prévisualiser
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section envoyées */}
      {sent.length > 0 && (
        <div className="p-4 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Relances envoyées récemment ({sent.length})
          </h3>
          <div className="space-y-2">
            {sent.map((reminder) => (
              <div key={reminder.id} className="bg-white rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{reminder.clientName}</p>
                    <p className="text-xs text-gray-500">
                      #{reminder.invoiceNumber} • {reminder.amount.toFixed(2)} € • {reminder.reminderType}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Envoyée le</p>
                    <p className="text-sm text-green-700 font-medium">
                      {new Date(reminder.sentDate || "").toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Modal de preview d'email
function EmailPreviewModal({
  invoice,
  onClose,
  onConfirmSend,
}: {
  invoice: typeof MOCK_INVOICES[0];
  onClose: () => void;
  onConfirmSend: () => void;
}) {
  const emailSubject = `Relance facture ${invoice.invoiceNumber}`;
  const emailContent = `Bonjour ${invoice.clientName},

Nous constatons que la facture ${invoice.invoiceNumber} d'un montant de ${invoice.amount.toFixed(2)} € n'a pas encore été réglée.

Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString("fr-FR")}
Jours de retard : ${invoice.daysLate}

Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.

Cordialement,
Votre entreprise`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Prévisualisation de l'email</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Destinataire</label>
            <p className="text-sm text-gray-900 mt-1">{invoice.clientName} (client@example.com)</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Objet</label>
            <p className="text-sm text-gray-900 mt-1">{emailSubject}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Message</label>
            <div className="mt-2 p-4 bg-gray-50 rounded-lg border text-sm text-gray-900 whitespace-pre-wrap font-mono">
              {emailContent}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs text-yellow-800">
              💡 <strong>Astuce :</strong> Vous pouvez modifier les templates de relances dans les paramètres
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onConfirmSend}>
            <Send className="h-4 w-4 mr-2" />
            Confirmer l'envoi
          </Button>
        </div>
      </div>
    </div>
  );
}
