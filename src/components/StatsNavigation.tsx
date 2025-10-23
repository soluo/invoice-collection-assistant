import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate, useLocation } from "react-router-dom";

export function StatsNavigation() {
  const stats = useQuery(api.dashboard.getDashboardStats);
  const navigate = useNavigate();
  const location = useLocation();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  if (stats === undefined) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Skeleton loading */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
            <div className="flex items-center">
              <div className="p-3 bg-gray-100 rounded-full w-12 h-12"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-24 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
      {/* Montant à recouvrir - Navigation vers Dashboard */}
      <button
        onClick={() => void navigate("/")}
        className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group ${
          isActive("/") ? "ring-2 ring-red-500 border-red-200" : ""
        }`}
      >
        <div className="flex items-center">
          <div className={`p-3 bg-red-100 rounded-full group-hover:bg-red-200 transition-colors ${
            isActive("/") ? "bg-red-200" : ""
          }`}>
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">À recouvrir</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totaux.montantARecouvrir)}</p>
            <p className="text-sm text-gray-500">En retard</p>
          </div>
        </div>
      </button>

      {/* Montant en cours - Navigation vers /ongoing */}
      <button
        onClick={() => navigate("/ongoing")}
        className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group ${
          isActive("/ongoing") ? "ring-2 ring-blue-500 border-blue-200" : ""
        }`}
      >
        <div className="flex items-center">
          <div className={`p-3 bg-blue-100 rounded-full group-hover:bg-blue-200 transition-colors ${
            isActive("/ongoing") ? "bg-blue-200" : ""
          }`}>
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">En cours</h3>
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totaux.montantEnCours)}</p>
            <p className="text-sm text-gray-500">À venir</p>
          </div>
        </div>
      </button>

      {/* Montant payé - Navigation vers /paid */}
      <button
        onClick={() => navigate("/paid")}
        className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow text-left group ${
          isActive("/paid") ? "ring-2 ring-green-500 border-green-200" : ""
        }`}
      >
        <div className="flex items-center">
          <div className={`p-3 bg-green-100 rounded-full group-hover:bg-green-200 transition-colors ${
            isActive("/paid") ? "bg-green-200" : ""
          }`}>
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Payé</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totaux.montantPaye)}</p>
            <p className="text-sm text-gray-500">Encaissé</p>
          </div>
        </div>
      </button>
    </div>
  );
}
