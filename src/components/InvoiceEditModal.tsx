import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Doc } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InvoiceEditModalProps {
  invoice: Doc<"invoices">;
  onClose: () => void;
}

export function InvoiceEditModal({ invoice, onClose }: InvoiceEditModalProps) {
  const [formData, setFormData] = useState({
    clientName: invoice.clientName,
    contactName: invoice.contactName || invoice.clientName || "",
    contactEmail: invoice.contactEmail || "",
    contactPhone: invoice.contactPhone || "",
    invoiceNumber: invoice.invoiceNumber,
    amountTTC: invoice.amountTTC.toString(),
    invoiceDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
  });

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<string>(invoice.createdBy);

  const isAdmin = loggedInUser?.role === "admin";

  const updateInvoice = useMutation(api.invoices.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const updateData: Parameters<typeof updateInvoice>[0] = {
        invoiceId: invoice._id,
        clientName: formData.clientName,
        contactName: formData.contactName || formData.clientName,
        invoiceNumber: formData.invoiceNumber,
        amountTTC: parseFloat(formData.amountTTC),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
      };

      if (formData.contactEmail) {
        updateData.contactEmail = formData.contactEmail;
      }

      if (formData.contactPhone) {
        updateData.contactPhone = formData.contactPhone;
      }

      // Admin can reassign invoice to another user
      if (isAdmin && selectedUserId && selectedUserId !== invoice.createdBy) {
        updateData.assignToUserId = selectedUserId;
      }

      await updateInvoice(updateData);

      toast.success("Facture mise à jour");
      onClose();
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la facture</DialogTitle>
          <DialogDescription>
            Modifiez les informations de la facture #{invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nom du client</Label>
            <Input
              id="clientName"
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactName">Nom du contact</Label>
            <Input
              id="contactName"
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              placeholder="Nom de la personne à contacter"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Email du contact</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              placeholder="email@exemple.fr"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">Téléphone du contact</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="01 23 45 67 89"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">N° de facture</Label>
            <Input
              id="invoiceNumber"
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountTTC">Montant TTC (€)</Label>
            <Input
              id="amountTTC"
              type="number"
              step="0.01"
              value={formData.amountTTC}
              onChange={(e) => setFormData({ ...formData, amountTTC: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoiceDate">Date de facture</Label>
            <Input
              id="invoiceDate"
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Date d'échéance</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          {/* Admin-only: Reassignment dropdown */}
          {isAdmin && users && users.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable de la facture</Label>
              <select
                id="responsable"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Annuler
            </Button>
            <Button type="submit" className="flex-1">
              Sauvegarder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
