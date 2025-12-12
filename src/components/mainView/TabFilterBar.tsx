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
  const statusTabs = [
    { value: "all", label: "Toutes" },
    { value: "payee", label: "Payées" },
    { value: "en-retard", label: "En retard" },
    { value: "a-envoyer", label: "Brouillons" },
  ];

  return (
    <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Status Tabs (Toggle style) */}
      <div className="flex p-1 bg-slate-100 rounded-lg self-start">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onStatusFilterChange(tab.value)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-bold transition-all",
              statusFilter === tab.value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right side: Search (mobile) + Filters */}
      <div className="flex items-center gap-3">
        {/* Search bar (mobile only) */}
        <div className="md:hidden relative w-full">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher..."
            className="w-full bg-slate-50 border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm"
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
