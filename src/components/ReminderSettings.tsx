import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ReminderSettings() {
  const settings = useQuery(api.reminderSettings.get);
  const upsertSettings = useMutation(api.reminderSettings.upsert);
  
  const [formData, setFormData] = useState({
    firstReminderDelay: 30,
    secondReminderDelay: 45,
    thirdReminderDelay: 60,
    litigationDelay: 90,
    firstReminderTemplate: "",
    secondReminderTemplate: "",
    thirdReminderTemplate: "",
    signature: "",
  });

  // Mettre à jour le formulaire quand les données arrivent
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      console.log("✅ Données chargées depuis la base:", settings);
    }
  }, [settings]);

  if (settings === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Filtrer les champs système avant envoi
      const cleanData = {
        firstReminderDelay: formData.firstReminderDelay,
        secondReminderDelay: formData.secondReminderDelay,
        thirdReminderDelay: formData.thirdReminderDelay,
        litigationDelay: formData.litigationDelay,
        firstReminderTemplate: formData.firstReminderTemplate,
        secondReminderTemplate: formData.secondReminderTemplate,
        thirdReminderTemplate: formData.thirdReminderTemplate,
        signature: formData.signature,
      };

      console.log("💾 Sauvegarde des données:", cleanData);
      await upsertSettings(cleanData);
      console.log("✅ Sauvegarde réussie");
      toast.success("Paramètres sauvegardés");
    } catch (error) {
      console.error("❌ Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Paramètres de relance</h2>
        <p className="text-gray-600">Configurez vos délais et templates d'emails</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Délais */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Délais de relance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1ère relance (jours)
              </label>
              <input
                type="number"
                value={formData.firstReminderDelay}
                onChange={(e) => setFormData({ ...formData, firstReminderDelay: parseInt(e.target.value) || 1 })}
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
                onChange={(e) => setFormData({ ...formData, secondReminderDelay: parseInt(e.target.value) || 1 })}
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
                onChange={(e) => setFormData({ ...formData, thirdReminderDelay: parseInt(e.target.value) || 1 })}
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
                onChange={(e) => setFormData({ ...formData, litigationDelay: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Templates */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Templates d'emails</h3>
          <p className="text-sm text-gray-600 mb-6">
            Variables disponibles : {"{invoiceNumber}"}, {"{amount}"}, {"{daysOverdue}"}, {"{clientName}"}
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 1ère relance
              </label>
              <textarea
                value={formData.firstReminderTemplate}
                onChange={(e) => setFormData({ ...formData, firstReminderTemplate: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, secondReminderTemplate: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, thirdReminderTemplate: e.target.value })}
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
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Sauvegarder les paramètres
          </button>
        </div>
      </form>
    </div>
  );
}
