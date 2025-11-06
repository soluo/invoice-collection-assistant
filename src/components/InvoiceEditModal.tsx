import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface InvoiceEditModalProps {
  invoice: any;
  onClose: () => void;
}

export function InvoiceEditModal({ invoice, onClose }: InvoiceEditModalProps) {
  const [formData, setFormData] = useState({
    clientName: invoice.clientName,
    contactName: invoice.contactName || invoice.clientName || "", // ✅ V2 Phase 2.6
    contactEmail: invoice.contactEmail || "", // ✅ V2 Phase 2.6 : Renommé de clientEmail
    contactPhone: invoice.contactPhone || "", // ✅ V2 Phase 2.6
    invoiceNumber: invoice.invoiceNumber,
    amountTTC: invoice.amountTTC.toString(),
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
  });

  // ✅ Récupérer l'utilisateur actuel et la liste des utilisateurs
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<string>(invoice.createdBy);

  const isAdmin = loggedInUser?.role === "admin";

  const updateInvoice = useMutation(api.invoices.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: any = {
        invoiceId: invoice._id,
        clientName: formData.clientName,
        contactName: formData.contactName || formData.clientName, // ✅ V2 Phase 2.6 : Fallback sur clientName
        invoiceNumber: formData.invoiceNumber,
        amountTTC: parseFloat(formData.amountTTC),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
      };

      // ✅ V2 Phase 2.6 : Inclure contactEmail uniquement s'il est fourni
      if (formData.contactEmail) {
        updateData.contactEmail = formData.contactEmail;
      }

      // ✅ V2 Phase 2.6 : Inclure contactPhone uniquement s'il est fourni
      if (formData.contactPhone) {
        updateData.contactPhone = formData.contactPhone;
      }

      // ✅ Envoyer assignToUserId si un utilisateur différent est sélectionné
      if (selectedUserId && selectedUserId !== invoice.createdBy) {
        updateData.assignToUserId = selectedUserId;
      }

      await updateInvoice(updateData);

      toast.success("Facture mise à jour");
      onClose();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Modifier la facture
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du client
              </label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email du contact
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="email@exemple.fr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone du contact
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="01 23 45 67 89"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° de facture
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Montant TTC (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amountTTC}
                onChange={(e) => setFormData({ ...formData, amountTTC: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de facture
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date d'échéance
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* ✅ Dropdown pour sélectionner le responsable (admins uniquement) */}
            {isAdmin && users && users.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Responsable de la facture
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name || user.email} {user.role === "admin" ? "(Admin)" : "(Technicien)"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Sauvegarder
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
