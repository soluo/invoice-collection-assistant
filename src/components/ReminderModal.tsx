import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Id } from "../../convex/_generated/dataModel";

interface ReminderModalProps {
  invoice: any;
  currentStatus: string;
  onClose: () => void;
}

export function ReminderModal({ invoice, currentStatus, onClose }: ReminderModalProps) {
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const settings = organization; // Alias pour compatibilité
  const reminders = useQuery(api.reminders.getByInvoice, { invoiceId: invoice._id });
  const sendReminder = useMutation(api.invoices.sendReminder);

  const [formData, setFormData] = useState({
    subject: "",
    content: "",
  });

  // Déterminer le template selon le nombre de relances déjà envoyées
  const getTemplateFromReminderCount = (reminderCount: number) => {
    if (!settings) return "";

    switch (reminderCount) {
      case 0:
        return settings.firstReminderTemplate;
      case 1:
        return settings.secondReminderTemplate;
      case 2:
        return settings.thirdReminderTemplate;
      default:
        return ""; // 3+ relances = contentieux
    }
  };

  // Déterminer le nouveau statut selon le nombre de relances
  const getNextStatusFromCount = (reminderCount: number) => {
    switch (reminderCount) {
      case 0:
        return "first_reminder";
      case 1:
        return "second_reminder";
      case 2:
        return "third_reminder";
      default:
        return "litigation";
    }
  };

  // Remplacer les variables dans le template
  const replaceVariables = (template: string) => {
    if (!template) return "";

    // Formater les dates en français (DD/MM/YYYY)
    const formatDateFr = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('fr-FR');
    };

    return template
      .replace(/\{numero_facture\}/g, invoice.invoiceNumber)
      .replace(/\{nom_client\}/g, invoice.clientName)
      .replace(/\{montant\}/g, invoice.amountTTC.toString())
      .replace(/\{date_facture\}/g, formatDateFr(invoice.invoiceDate))
      .replace(/\{date_echeance\}/g, formatDateFr(invoice.dueDate))
      .replace(/\{jours_retard\}/g, invoice.daysOverdue?.toString() || "0");
  };

  // Initialiser le formulaire quand les settings et reminders sont chargées
  useEffect(() => {
    if (settings && reminders !== undefined) {
      const reminderCount = reminders.length;
      const template = getTemplateFromReminderCount(reminderCount);
      const contentWithVariables = replaceVariables(template);
      const contentWithSignature = `${contentWithVariables}\n\n${settings.signature}`;

      setFormData({
        subject: `Relance facture ${invoice.invoiceNumber}`,
        content: contentWithSignature,
      });
    }
  }, [settings, reminders, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const reminderCount = reminders?.length || 0;
      const nextStatus = getNextStatusFromCount(reminderCount);
      await sendReminder({
        invoiceId: invoice._id,
        newStatus: nextStatus,
        emailSubject: formData.subject,
        emailContent: formData.content,
      });

      toast.success("Relance envoyée");
      onClose();
    } catch (error) {
      console.error("Erreur envoi relance:", error);
      toast.error("Erreur lors de l'envoi de la relance");
    }
  };

  if (!settings || reminders === undefined) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 !m-0 z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 !m-0 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Envoyer une relance
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Informations facture</h4>
            <div className="text-sm text-gray-600">
              <p><strong>Client:</strong> {invoice.clientName} ({invoice.clientEmail})</p>
              <p><strong>Facture:</strong> #{invoice.invoiceNumber}</p>
              <p><strong>Montant:</strong> {invoice.amountTTC.toFixed(2)} €</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sujet du mail
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contenu du mail
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Envoyer la relance
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
