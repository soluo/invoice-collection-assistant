import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  sortBy: string;
  onSortByChange: (value: string) => void;
  showStatusFilter?: boolean;
  showUserFilter?: boolean;
  selectedUserId?: string;
  onUserFilterChange?: (value: string) => void;
  users?: Array<{ _id: string; name: string }>;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  sortBy,
  onSortByChange,
  showStatusFilter = true,
  showUserFilter = false,
  selectedUserId = "all",
  onUserFilterChange,
  users = [],
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
      {/* Recherche */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Rechercher client ou N° facture..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-9 text-sm"
        />
      </div>

      {/* Filtre Statut */}
      {showStatusFilter && (
        <div className="w-full md:w-48">
          <Select value={filterStatus} onValueChange={onFilterStatusChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Filtre statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="a-envoyer">A envoyer</SelectItem>
              <SelectItem value="envoyee">Envoyée</SelectItem>
              <SelectItem value="en-retard">En retard</SelectItem>
              <SelectItem value="payee">Payée</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Filtre Technicien (admin uniquement) */}
      {showUserFilter && (
        <div className="w-full md:w-48">
          <Select value={selectedUserId} onValueChange={onUserFilterChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Technicien" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les techniciens</SelectItem>
              {users.map((user) => (
                <SelectItem key={user._id} value={user._id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tri */}
      <div className="w-full md:w-48">
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="h-9 text-sm">
            <SelectValue placeholder="Trier par" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dueDate">Trier par échéance</SelectItem>
            <SelectItem value="invoiceDate">Trier par date de facture</SelectItem>
            <SelectItem value="amountTTC">Trier par montant</SelectItem>
            <SelectItem value="clientName">Trier par client</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
