import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { InvoiceManager } from "./components/InvoiceManager";
import { LogOut, Settings } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

type Route = "/" | "/ongoing" | "/paid" | "/settings";

export default function App() {
  const { signOut } = useAuthActions();
  const [currentRoute, setCurrentRoute] = useState<Route>("/");

  const handleSignOut = () => {
    signOut();
  };

  const navigate = (route: Route) => {
    setCurrentRoute(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm px-4">
        <div className="max-w-7xl mx-auto h-16 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-blue-600">Gestion Factures</h2>
          <Authenticated>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/settings")}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Réglages"
              >
                <Settings size={20} />
                <span className="hidden sm:inline">Réglages</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Se déconnecter"
              >
                <LogOut size={20} />
                <span className="hidden max-sm:hidden sm:inline">Se déconnecter</span>
              </button>
            </div>
          </Authenticated>
        </div>
      </header>
      <main className="flex-1 p-4">
        <Content currentRoute={currentRoute} onNavigate={navigate} />
      </main>
      <Toaster />
    </div>
  );
}

interface ContentProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

function Content({ currentRoute, onNavigate }: ContentProps) {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Authenticated>
        <InvoiceManager currentRoute={currentRoute} onNavigate={onNavigate} />
      </Authenticated>
      <Unauthenticated>
        <div className="max-w-md mx-auto mt-20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Gestion de Factures
            </h1>
            <p className="text-gray-600">
              Connectez-vous pour gérer vos factures et relances
            </p>
          </div>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  );
}
