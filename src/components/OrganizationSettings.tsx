import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Building2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

export function OrganizationSettings() {
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const updateSettings = useMutation(api.organizations.updateOrganizationSettings);

  const [formData, setFormData] = useState({
    senderEmail: "",
    firstReminderDelay: 7,
    secondReminderDelay: 15,
    thirdReminderDelay: 30,
    litigationDelay: 45,
    firstReminderTemplate: "",
    secondReminderTemplate: "",
    thirdReminderTemplate: "",
    signature: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Mettre à jour le formulaire quand les données arrivent
  useEffect(() => {
    if (organization) {
      setFormData({
        senderEmail: organization.senderEmail,
        firstReminderDelay: organization.firstReminderDelay,
        secondReminderDelay: organization.secondReminderDelay,
        thirdReminderDelay: organization.thirdReminderDelay,
        litigationDelay: organization.litigationDelay,
        firstReminderTemplate: organization.firstReminderTemplate,
        secondReminderTemplate: organization.secondReminderTemplate,
        thirdReminderTemplate: organization.thirdReminderTemplate,
        signature: organization.signature,
      });
    }
  }, [organization]);

  if (organization === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          Vous n'appartenez à aucune organisation.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateSettings(formData);
      toast.success("Paramètres de l'organisation sauvegardés");
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 size={24} />
          Paramètres de l'organisation
        </h2>
        <p className="text-gray-600 mt-1">
          Organisation : <span className="font-semibold">{organization.name}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email expéditeur */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email expéditeur</h3>
          <div>
            <label
              htmlFor="senderEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adresse email
            </label>
            <input
              id="senderEmail"
              type="email"
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@monentreprise.fr"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cette adresse sera utilisée comme expéditeur pour les relances automatiques
            </p>
          </div>
        </div>

        {/* Délais de relance */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Délais de relance</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configurez les délais (en jours après la date d'échéance) pour chaque type de relance
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1ère relance (jours)
              </label>
              <input
                type="number"
                value={formData.firstReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, firstReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2ème relance (jours)
              </label>
              <input
                type="number"
                value={formData.secondReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, secondReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                3ème relance (jours)
              </label>
              <input
                type="number"
                value={formData.thirdReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, thirdReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contentieux (jours)
              </label>
              <input
                type="number"
                value={formData.litigationDelay}
                onChange={(e) =>
                  setFormData({ ...formData, litigationDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Templates d'emails */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Templates d'emails</h3>
          <p className="text-sm text-gray-600 mb-6">
            Variables disponibles : [INVOICE_NUMBER], [AMOUNT], [INVOICE_DATE], [DUE_DATE],
            [CLIENT_NAME]
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 1ère relance
              </label>
              <textarea
                value={formData.firstReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, firstReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de première relance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 2ème relance
              </label>
              <textarea
                value={formData.secondReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, secondReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de deuxième relance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 3ème relance
              </label>
              <textarea
                value={formData.thirdReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, thirdReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de troisième relance..."
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Signature</h3>
          <textarea
            value={formData.signature}
            onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre signature (nom, téléphone, email...)"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sauvegarde..." : "Sauvegarder les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}
