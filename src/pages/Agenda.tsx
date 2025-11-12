export function Agenda() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pt-6">
      {/* Header avec titre */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-600 mt-1">
            Planifiez et suivez vos actions de recouvrement
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Agenda à venir</h3>
          <p className="text-gray-500">La fonctionnalité d'agenda sera bientôt disponible.</p>
        </div>
      </div>
    </div>
  );
}
