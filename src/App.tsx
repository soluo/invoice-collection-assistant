import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { Toaster } from "sonner";
import { LogOut, Settings } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
import { OngoingInvoices } from "./components/OngoingInvoices";
import { PaidInvoices } from "./components/PaidInvoices";
import { InvoiceUpload } from "./components/InvoiceUpload";
import { ReminderSettings } from "./components/ReminderSettings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 p-4">
          <Content />
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function Header() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
  };

  return (
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
  );
}

function Content() {
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
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ongoing" element={<OngoingInvoices />} />
          <Route path="/paid" element={<PaidInvoices />} />
          <Route path="/upload" element={<InvoiceUpload />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
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

function SettingsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <button onClick={() => navigate("/")} className="text-blue-600 hover:underline">
          ← Retour au dashboard
        </button>
      </div>
      <ReminderSettings />
    </div>
  );
}
