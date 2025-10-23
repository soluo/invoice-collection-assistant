import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useNavigate } from "react-router-dom";
import { InvoicesList } from "@components/InvoicesList";

export function Invoices() {
  const navigate = useNavigate();
  const currentUser = useQuery(api.auth.loggedInUser);
  const allUsers = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | undefined>(undefined);

  const isAdmin = currentUser?.role === "admin";

  // Utiliser la bonne query selon le rôle et le filtre
  const invoices = useQuery(
    isAdmin ? api.invoices.listWithFilter : api.invoices.list,
    isAdmin ? { filterByUserId: selectedUserId } : {}
  );

  if (invoices === undefined || (isAdmin && allUsers === undefined)) {
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter une facture
        </button>
      </div>

      {/* Section Filtres */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Filtre Responsable (Admin uniquement) */}
          {isAdmin && allUsers && (
            <div className="flex-1">
              <label htmlFor="responsable" className="block text-sm font-medium text-gray-700 mb-2">
                Responsable
              </label>
              <select
                id="responsable"
                value={selectedUserId || ""}
                onChange={(e) => setSelectedUserId(e.target.value ? (e.target.value as Id<"users">) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les techniciens</option>
                {allUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name || user.email || "Utilisateur"}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Placeholders pour filtres futurs */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
            <input
              type="text"
              disabled
              placeholder="À venir..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-400 mb-2">Montant</label>
            <input
              type="text"
              disabled
              placeholder="À venir..."
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-400 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      <InvoicesList
        invoices={invoices}
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
