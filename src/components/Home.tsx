import { NavLink } from "react-router-dom";

interface HomeProps {
  isAuthenticated: boolean;
}

export function Home({ isAuthenticated }: HomeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-8 max-w-2xl px-4">
        <h1 className="text-4xl font-bold text-gray-900">
          Gestion de Relances de Factures
        </h1>

        <p className="text-xl text-gray-600">
          Simplifiez le suivi de vos paiements et automatisez vos relances clients
        </p>

        <div className="pt-4">
          {isAuthenticated ? (
            <NavLink
              to="/follow-up"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Accéder à mes relances
            </NavLink>
          ) : (
            <NavLink
              to="/login"
              className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Se connecter
            </NavLink>
          )}
        </div>
      </div>
    </div>
  );
}
