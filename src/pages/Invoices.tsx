import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search, Plus } from "lucide-react";
import { InvoicesList } from "@components/InvoicesList";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { isAdminRole } from "@/lib/utils";

type SortField = "invoiceDate" | "amountTTC" | "outstandingBalance" | "dueDate";
type SortOrder = "asc" | "desc";

export function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.organizations.listUsers);

  // ===== LIRE DEPUIS L'URL (source de vérité unique) =====
  const search = searchParams.get("search") || "";
  const mainStatus = searchParams.get("mainStatus") || "all";
  const amount = searchParams.get("amount") || "";
  const userId = searchParams.get("userId") || "";

  const amountValue = amount && !isNaN(parseFloat(amount))
    ? parseFloat(amount)
    : undefined;

  const urlSortBy = searchParams.get("sortBy");
  const sortBy: SortField =
    (urlSortBy === "invoiceDate" || urlSortBy === "amountTTC" ||
     urlSortBy === "outstandingBalance" || urlSortBy === "dueDate")
      ? urlSortBy
      : "invoiceDate";

  const urlSortOrder = searchParams.get("sortOrder");
  const sortOrder: SortOrder = urlSortOrder === "asc" ? "asc" : "desc";

  const isAdmin = isAdminRole(currentUser?.role);

  // ===== HANDLERS =====

  const handleSort = (field: SortField) => {
    // Toggle entre DESC et ASC si même champ, sinon commencer par DESC
    const newSortOrder: SortOrder =
      sortBy === field ? (sortOrder === "desc" ? "asc" : "desc") : "desc";

    // Mettre à jour l'URL en préservant tous les paramètres existants
    setSearchParams({
      ...Object.fromEntries(searchParams),
      sortBy: field,
      sortOrder: newSortOrder,
    });
  };

  // ===== DATA QUERY =====
  const invoices = useQuery(
    api.invoices.listWithFilter,
    isAdmin
      ? {
          filterByUserId: userId ? (userId as Id<"users">) : undefined,
          searchQuery: search || undefined,
          mainStatus: mainStatus !== "all" ? (mainStatus as any) : undefined,
          amountFilter: amountValue,
          sortBy,
          sortOrder,
        }
      : {
          sortBy,
          sortOrder,
        }
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
    <div className="max-w-6xl mx-auto space-y-6 pt-6">
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

      {/* Section Filtres */}
      <div className="bg-white rounded-lg border p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Recherche N° facture ou client */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Rechercher
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                key={`search-${search}`}
                id="search"
                type="text"
                placeholder="N° facture, client, dossier..."
                defaultValue={search}
                onBlur={(e) => {
                  const params = Object.fromEntries(searchParams);
                  if (e.target.value) {
                    params.search = e.target.value;
                  } else {
                    delete params.search;
                  }
                  setSearchParams(params);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const params = Object.fromEntries(searchParams);
                    if (e.currentTarget.value) {
                      params.search = e.currentTarget.value;
                    } else {
                      delete params.search;
                    }
                    setSearchParams(params);
                  }
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant (±5%)
            </label>
            <Input
              key={`amount-${amount}`}
              id="amount"
              type="number"
              placeholder="Ex: 1500"
              defaultValue={amount}
              onBlur={(e) => {
                const params = Object.fromEntries(searchParams);
                if (e.target.value) {
                  params.amount = e.target.value;
                } else {
                  delete params.amount;
                }
                setSearchParams(params);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const params = Object.fromEntries(searchParams);
                  if (e.currentTarget.value) {
                    params.amount = e.currentTarget.value;
                  } else {
                    delete params.amount;
                  }
                  setSearchParams(params);
                }
              }}
              step="0.01"
              min="0"
            />
          </div>

          {/* Filtre État */}
          <div>
            <label htmlFor="mainStatus" className="block text-sm font-medium text-gray-700 mb-2">
              État
            </label>
            <Select
              value={mainStatus}
              onValueChange={(value) => {
                const params = Object.fromEntries(searchParams);
                if (value !== "all") {
                  params.mainStatus = value;
                } else {
                  delete params.mainStatus;
                }
                setSearchParams(params);
              }}
            >
              <SelectTrigger id="mainStatus">
                <SelectValue placeholder="Tous les états" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les états</SelectItem>

                <SelectGroup>
                  <SelectLabel>Par envoi</SelectLabel>
                  <SelectItem value="a-envoyer">À envoyer</SelectItem>
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Par paiement</SelectLabel>
                  <SelectItem value="non-payee">En attente</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                  <SelectItem value="en-retard">En retard</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel>Par relance</SelectLabel>
                  <SelectItem value="relance">Relance en cours</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Filtre Responsable */}
          {isAdmin && allUsers ? (
            <div>
              <label htmlFor="responsable" className="block text-sm font-medium text-gray-700 mb-2">
                Technicien
              </label>
              <Select
                value={userId || "all"}
                onValueChange={(value) => {
                  const params = Object.fromEntries(searchParams);
                  if (value !== "all") {
                    params.userId = value;
                  } else {
                    delete params.userId;
                  }
                  setSearchParams(params);
                }}
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
      </div>

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
