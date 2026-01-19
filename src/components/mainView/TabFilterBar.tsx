import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TabFilterBarProps {
  // Status filter (tabs)
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;

  // Search (mobile only within this component)
  searchQuery: string;
  onSearchChange: (value: string) => void;

  // Technicien filter (admin only)
  showUserFilter?: boolean;
  selectedUserId?: string;
  onUserFilterChange?: (value: string) => void;
  users?: Array<{ _id: string; name: string }>;

  // Sort dropdown
  sortBy: string;
  onSortByChange: (value: string) => void;
}

export default function TabFilterBar({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  showUserFilter = false,
  selectedUserId = "all",
  onUserFilterChange,
  users = [],
  sortBy,
  onSortByChange,
}: TabFilterBarProps) {
  // Onglets principaux par priorité d'action
  const mainStatusTabs = [
    { value: "all", label: "Toutes" },
    { value: "en-retard", label: "En retard" },
    { value: "suivi-manuel", label: "Suivi manuel" },
    { value: "envoyee", label: "Envoyées" },
    { value: "payee", label: "Payées" },
  ];

  // Onglet séparé (pré-workflow)
  const draftTab = { value: "a-envoyer", label: "À envoyer" };

  return (
    <div className="p-0 md:p-5 md:border-b md:border-slate-100 flex flex-col xl:flex-row xl:items-center xl:flex-wrap justify-between gap-4">
      {/* Status Tabs (Toggle style) */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Main tabs group */}
        <div className="flex p-1 bg-slate-100 rounded-lg">
          {mainStatusTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              className={cn(
                "px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all",
                statusFilter === tab.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Brouillons tab - séparé sur lg+ */}
        <button
          onClick={() => onStatusFilterChange(draftTab.value)}
          className={cn(
            "hidden lg:flex px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-bold transition-all border",
            statusFilter === draftTab.value
              ? "bg-slate-800 text-white border-slate-800"
              : "bg-white text-slate-500 border-slate-200 hover:text-slate-700 hover:border-slate-300"
          )}
        >
          {draftTab.label}
        </button>

        {/* Brouillons dans le groupe principal sur mobile/tablet */}
        <button
          onClick={() => onStatusFilterChange(draftTab.value)}
          className={cn(
            "lg:hidden p-1 bg-slate-100 rounded-lg px-3 md:px-4 py-1.5 text-xs md:text-sm font-bold transition-all",
            statusFilter === draftTab.value
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {draftTab.label}
        </button>
      </div>

      {/* Right side: Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
        {/* Search bar */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Client, n° facture, montant..."
            className="w-full bg-white border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm"
          />
        </div>

        {/* Technicien Filter (admin only) */}
        {showUserFilter && (
          <Select value={selectedUserId} onValueChange={onUserFilterChange}>
            <SelectTrigger className="w-48 h-9 text-sm">
              <SelectValue placeholder="Technicien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les techniciens</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="w-48 h-9 text-sm hidden md:flex">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Trier par échéance</SelectItem>
            <SelectItem value="invoiceDate">Trier par date</SelectItem>
            <SelectItem value="amountTTC">Trier par montant</SelectItem>
            <SelectItem value="clientName">Trier par client</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
