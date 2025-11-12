export function CallPlan() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-6">
      {/* Header avec titre */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plan d'appels</h1>
          <p className="text-gray-600 mt-1">
            Organisez vos relances téléphoniques
          </p>
        </div>
      </div>

      {/* Contenu à venir */}
      <div className="bg-white rounded-lg border p-12">
        <div className="text-center text-gray-500">
          <div className="mx-auto h-16 w-16 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Plan d'appels à venir</h3>
          <p className="text-gray-500">La fonctionnalité de plan d'appels sera bientôt disponible.</p>
        </div>
      </div>
    </div>
  );
}
