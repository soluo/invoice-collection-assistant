import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignupForm } from "@pages/SignupForm";
import { AcceptInvitation } from "@pages/AcceptInvitation";
import { Toaster } from "sonner";
import { LogOut, Settings, Users, Home, FileText, Bell } from "lucide-react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { Dashboard } from "@pages/Dashboard";
import { OngoingInvoices } from "@pages/OngoingInvoices";
import { PaidInvoices } from "@pages/PaidInvoices";
import { InvoiceUpload } from "@pages/InvoiceUpload";
import { TeamManagement } from "@pages/TeamManagement";
import { OrganizationSettings } from "@pages/OrganizationSettings";
import { Invoices } from "@pages/Invoices";
import { Reminders } from "@pages/Reminders";
import { useState, useEffect, useRef } from "react";
import type { Doc } from "../convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { toast } from "sonner";

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
  const location = useLocation();
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleSignOut = () => {
    setIsMenuOpen(false);
    signOut();
  };

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  const initials = getUserInitials(loggedInUser);
  const displayName = loggedInUser?.name || loggedInUser?.email || "Utilisateur";

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  const getButtonClass = (path: string) => {
    const baseClass = "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors";
    if (isActive(path)) {
      return `${baseClass} bg-blue-100 text-blue-700 font-medium`;
    }
    return `${baseClass} text-gray-600 hover:text-gray-900 hover:bg-gray-100`;
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b shadow-sm px-4">
      <div className="max-w-7xl mx-auto h-16 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Gestion Factures</h2>
          <Authenticated>
            <button
              onClick={() => navigate("/")}
              className={getButtonClass("/")}
              title="Tableau de bord"
            >
              <Home size={20} />
              <span className="hidden sm:inline">Tableau de bord</span>
            </button>
            <button
              onClick={() => navigate("/invoices")}
              className={getButtonClass("/invoices")}
              title="Factures"
            >
              <FileText size={20} />
              <span className="hidden sm:inline">Factures</span>
            </button>
            <button
              onClick={() => navigate("/reminders")}
              className={getButtonClass("/reminders")}
              title="Relances"
            >
              <Bell size={20} />
              <span className="hidden sm:inline">Relances</span>
            </button>
          </Authenticated>
        </div>
        <Authenticated>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className={getButtonClass("/settings")}
              title="Réglages"
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Réglages</span>
            </button>
            <button
              onClick={() => navigate("/team")}
              className={getButtonClass("/team")}
              title="Équipe"
            >
              <Users size={20} />
              <span className="hidden sm:inline">Équipe</span>
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Menu utilisateur"
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
              >
                {initials}
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 z-20 mt-3 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                    {loggedInUser?.email && (
                      <p className="mt-1 text-sm text-gray-500">{loggedInUser.email}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
                  >
                    <LogOut size={18} />
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </Authenticated>
      </div>
    </header>
  );
}

type MaybeUser = Doc<"users"> | null | undefined;

function getUserInitials(user: MaybeUser) {
  const name = user?.name?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  const email = user?.email;
  if (email) {
    const localPart = email.split("@")[0];
    return localPart.slice(0, 2).toUpperCase();
  }
  return "?";
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const createOrganization = useMutation(api.organizations.createOrganizationWithAdmin);
  const acceptInvitation = useMutation(api.organizations.acceptInvitation);
  const { signOut } = useAuthActions();
  const [orgSetupError, setOrgSetupError] = useState<string | null>(null);
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  useEffect(() => {
    // Flow d'inscription : création de l'organisation
    const pendingOrgDataRaw = sessionStorage.getItem("pendingOrgData");
    if (loggedInUser && pendingOrgDataRaw && !loggedInUser.organizationId) {
      const pendingOrgData = JSON.parse(pendingOrgDataRaw);
      const createOrg = async () => {
        setIsCreatingOrg(true);
        try {
          await createOrganization(pendingOrgData);
          toast.success("Organisation créée avec succès !");
          sessionStorage.removeItem("pendingOrgData");
          setOrgSetupError(null);
          setIsCreatingOrg(false);
        } catch (error: any) {
          console.error("Erreur lors de la création de l'organisation:", error);
          const errorMessage = error.message || "Erreur lors de la création de l'organisation";
          toast.error(errorMessage);
          setOrgSetupError(errorMessage);
          setIsCreatingOrg(false);
          // Déconnecter l'utilisateur pour permettre une nouvelle tentative
          sessionStorage.removeItem("pendingOrgData");
          setTimeout(() => signOut(), 2000);
        }
      };
      void createOrg();
      return; // Un seul flow à la fois
    }

    // Flow d'invitation : accepter l'invitation
    const pendingInvitationDataRaw =
      sessionStorage.getItem("pendingInvitationData");
    if (
      loggedInUser &&
      pendingInvitationDataRaw &&
      !loggedInUser.organizationId
    ) {
      const pendingInvitationData = JSON.parse(pendingInvitationDataRaw);
      const acceptInv = async () => {
        setIsCreatingOrg(true);
        try {
          await acceptInvitation(pendingInvitationData);
          toast.success("Vous avez rejoint l'organisation avec succès !");
          sessionStorage.removeItem("pendingInvitationData");
          setOrgSetupError(null);
          setIsCreatingOrg(false);
        } catch (error: any) {
          console.error("Erreur lors de l'acceptation de l'invitation:", error);
          const errorMessage = error.message || "Erreur lors de l'acceptation de l'invitation";
          toast.error(errorMessage);
          setOrgSetupError(errorMessage);
          setIsCreatingOrg(false);
          // Déconnecter l'utilisateur pour permettre une nouvelle tentative
          sessionStorage.removeItem("pendingInvitationData");
          setTimeout(() => signOut(), 2000);
        }
      };
      void acceptInv();
    }
  }, [loggedInUser, createOrganization, acceptInvitation, signOut]);

  if (loggedInUser === undefined || isCreatingOrg) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[400px] gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        {isCreatingOrg && (
          <p className="text-gray-600">
            {sessionStorage.getItem("pendingOrgData")
              ? "Création de votre organisation..."
              : "Acceptation de l'invitation..."}
          </p>
        )}
        {orgSetupError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
            <p className="text-red-800 text-sm">{orgSetupError}</p>
            <p className="text-red-600 text-xs mt-2">Vous allez être déconnecté pour réessayer...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Routes>
        {loggedInUser ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/ongoing" element={<OngoingInvoices />} />
            <Route path="/paid" element={<PaidInvoices />} />
            <Route path="/upload" element={<InvoiceUploadPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/team" element={<TeamManagement />} />
            {/* Les routes d'auth ne sont plus accessibles une fois connecté */}
            <Route path="/login" element={<Navigate to="/" />} />
            <Route path="/signup" element={<Navigate to="/" />} />
            <Route path="/accept-invitation/:token" element={<Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        ) : (
          <>
            <Route path="/login" element={<SignInPage />} />
            <Route path="/signup" element={<SignupForm />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}
      </Routes>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Gestion de Factures
        </h1>
        <p className="text-gray-600">
          Connectez-vous pour gérer vos factures et relances
        </p>
      </div>
      <div className="bg-white rounded-lg border p-8">
        <SignInForm />
      </div>
    </div>
  );
}

function InvoiceUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSuccess = () => {
    const returnTo = searchParams.get("returnTo") || "/";
    navigate(returnTo);
  };

  return <InvoiceUpload onSuccess={handleSuccess} />;
}

function SettingsPage() {
  return <OrganizationSettings />;
}
