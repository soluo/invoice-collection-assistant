import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { InvoicesList } from "@components/InvoicesList";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type SortField = "invoiceDate" | "amountTTC" | "outstandingBalance" | "dueDate";
type SortOrder = "asc" | "desc";

export function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.organizations.listUsers);

  // ✅ V2 : États des filtres initialisés depuis l'URL
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | undefined>(() => {
    const urlUserId = searchParams.get("userId");
    return urlUserId ? (urlUserId as Id<"users">) : undefined;
  });
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get("status") || "all");
  const [amountFilter, setAmountFilter] = useState<string>(() => searchParams.get("amount") || "");
  const [appliedFilters, setAppliedFilters] = useState(() => {
    const urlAmount = searchParams.get("amount");
    const urlUserId = searchParams.get("userId");
    return {
      searchQuery: searchParams.get("search") || "",
      status: searchParams.get("status") || "all",
      amountFilter: urlAmount && !isNaN(parseFloat(urlAmount)) ? parseFloat(urlAmount) : undefined,
      userId: urlUserId ? (urlUserId as Id<"users">) : undefined,
    };
  });

  // États du tri initialisés depuis l'URL
  const [sortBy, setSortBy] = useState<SortField>(() => {
    const urlSortBy = searchParams.get("sortBy");
    if (urlSortBy === "invoiceDate" || urlSortBy === "amountTTC" ||
        urlSortBy === "outstandingBalance" || urlSortBy === "dueDate") {
      return urlSortBy;
    }
    return "invoiceDate";
  });
  const [sortOrder, setSortOrder] = useState<SortOrder>(() => {
    const urlSortOrder = searchParams.get("sortOrder");
    return urlSortOrder === "asc" ? "asc" : "desc";
  });

  const isAdmin = currentUser?.role === "admin";

  // ✅ V2 : Convertir amountFilter en nombre (ou undefined si vide)
  const amountValue = amountFilter && !isNaN(parseFloat(amountFilter)) ? parseFloat(amountFilter) : undefined;

  // Appliquer les filtres via le formulaire avec synchronisation URL
  const handleSubmitFilters = (e: React.FormEvent) => {
    e.preventDefault();

    const newFilters = {
      searchQuery,
      status: statusFilter,
      amountFilter: amountValue,
      userId: selectedUserId,
    };

    setAppliedFilters(newFilters);

    // Construire les paramètres d'URL
    const params: Record<string, string> = {
      sortBy,
      sortOrder,
    };

    if (searchQuery) params.search = searchQuery;
    if (statusFilter && statusFilter !== "all") params.status = statusFilter;
    if (amountFilter) params.amount = amountFilter;
    if (selectedUserId) params.userId = selectedUserId;

    setSearchParams(params);
  };

  // Gestionnaire de tri avec synchronisation URL (préserve les filtres)
  const handleSort = (field: SortField) => {
    let newSortOrder: SortOrder;
    if (sortBy === field) {
      // Toggle entre DESC et ASC
      newSortOrder = sortOrder === "desc" ? "asc" : "desc";
    } else {
      // Nouvelle colonne : commencer par DESC
      newSortOrder = "desc";
    }

    // Mettre à jour l'état
    setSortBy(field);
    setSortOrder(newSortOrder);

    // Synchroniser avec l'URL en préservant les filtres
    const params: Record<string, string> = {
      sortBy: field,
      sortOrder: newSortOrder,
    };

    // Conserver les filtres appliqués
    if (appliedFilters.searchQuery) params.search = appliedFilters.searchQuery;
    if (appliedFilters.status && appliedFilters.status !== "all") params.status = appliedFilters.status;
    if (appliedFilters.amountFilter) params.amount = appliedFilters.amountFilter.toString();
    if (appliedFilters.userId) params.userId = appliedFilters.userId;

    setSearchParams(params);
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
          sortBy,
          sortOrder,
        }
      : { sortBy, sortOrder }
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

        <Button
          onClick={() => void navigate("/upload?returnTo=/invoices")}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Ajouter une facture
        </Button>
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
            <Button
              type="submit"
              className="w-full"
            >
              Appliquer les filtres
            </Button>
          </div>
        </div>
      </form>

      <InvoicesList
        invoices={displayedInvoices || []}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
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
