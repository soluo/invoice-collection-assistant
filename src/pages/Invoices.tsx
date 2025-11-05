import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { InvoicesList } from "@components/InvoicesList";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Invoices() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.organizations.listUsers);

  // ✅ V2 : États des filtres
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [amountFilter, setAmountFilter] = useState<string>("");
  const [appliedFilters, setAppliedFilters] = useState({
    searchQuery: "",
    status: "all",
    amountFilter: undefined as number | undefined,
    userId: undefined as Id<"users"> | undefined,
  });

  const isAdmin = currentUser?.role === "admin";

  // ✅ V2 : Convertir amountFilter en nombre (ou undefined si vide)
  const amountValue = amountFilter && !isNaN(parseFloat(amountFilter)) ? parseFloat(amountFilter) : undefined;

  // Appliquer les filtres via le formulaire
  const handleSubmitFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      searchQuery,
      status: statusFilter,
      amountFilter: amountValue,
      userId: selectedUserId,
    });
  };

  // Utiliser la bonne query selon le rôle et le filtre appliqué
  const invoices = useQuery(
    isAdmin ? api.invoices.listWithFilter : api.invoices.list,
    isAdmin
      ? {
          filterByUserId: appliedFilters.userId,
          searchQuery: appliedFilters.searchQuery || undefined,
          status: appliedFilters.status !== "all" ? appliedFilters.status : undefined,
          amountFilter: appliedFilters.amountFilter,
        }
      : {}
  );

  // ✅ V2 : Garder les résultats précédents pendant le rechargement
  const [previousInvoices, setPreviousInvoices] = useState<any[] | undefined>(undefined);

  useEffect(() => {
    if (invoices !== undefined) {
      setPreviousInvoices(invoices);
    }
  }, [invoices]);

  const displayedInvoices = invoices !== undefined ? invoices : previousInvoices;

  if ((displayedInvoices === undefined && invoices === undefined) || (isAdmin && allUsers === undefined)) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-6">
      {/* Header avec titre */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Toutes les factures</h1>
          <p className="text-gray-600 mt-1">
            Vue complète de {isAdmin ? "toutes les factures de l'organisation" : "vos factures"}
          </p>
        </div>

        <button
          onClick={() => void navigate("/upload?returnTo=/invoices")}
          className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une facture
        </button>
      </div>

      {/* ✅ V2 : Section Filtres enrichis */}
      <form onSubmit={handleSubmitFilters} className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche N° facture ou client */}
          <div className="lg:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="N° facture, client, dossier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtre Statut */}
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Statut
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="overdue">En retard</SelectItem>
                <SelectItem value="partial_payment">Paiement partiel</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="paid">Payée</SelectItem>
                <SelectItem value="litigation">En litige</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bouton Appliquer ou Filtre Responsable */}
          {isAdmin && allUsers ? (
            <div>
              <label htmlFor="responsable" className="block text-sm font-medium text-gray-700 mb-2">
                Technicien
              </label>
              <Select
                value={selectedUserId || "all"}
                onValueChange={(value) => setSelectedUserId(value === "all" ? undefined : (value as Id<"users">))}
              >
                <SelectTrigger id="responsable">
                  <SelectValue placeholder="Tous les techniciens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les techniciens</SelectItem>
                  {allUsers.map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.name || user.email || "Utilisateur"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div /> // Placeholder pour maintenir la grille
          )}
        </div>

        {/* Deuxième ligne : Montant et Bouton */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant (±5%)
            </label>
            <Input
              id="amount"
              type="number"
              placeholder="Ex: 1500"
              value={amountFilter}
              onChange={(e) => setAmountFilter(e.target.value)}
              step="0.01"
              min="0"
            />
          </div>

          {/* Bouton Appliquer */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Appliquer les filtres
            </button>
          </div>
        </div>
      </form>

      <InvoicesList
        invoices={displayedInvoices || []}
        emptyState={
          <div className="p-12 text-center text-gray-500">
            <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune facture</h3>
            <p className="text-gray-500">Aucune facture ne correspond aux critères sélectionnés.</p>
          </div>
        }
      />
    </div>
  );
}
