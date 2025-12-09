import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignupForm } from "@pages/SignupForm";
import { AcceptInvitation } from "@pages/AcceptInvitation";
import { Toaster } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { BrowserRouter, Routes, Route, useNavigate, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { Dashboard } from "@pages/Dashboard";
import { OngoingInvoices } from "@pages/OngoingInvoices";
import { PaidInvoices } from "@pages/PaidInvoices";
import { InvoiceUpload } from "@pages/InvoiceUpload";
import { TeamManagement } from "@pages/TeamManagement";
import { OrganizationSettings } from "@pages/OrganizationSettings";
import { Invoices } from "@pages/Invoices";
import { InvoiceDetail } from "@pages/InvoiceDetail";
import { Reminders } from "@pages/Reminders";
import { FollowUp } from "@pages/FollowUp";
import { CallPlan } from "@pages/CallPlan";
import { MvpMockup } from "@pages/MvpMockup";
import { MvpMockupV2 } from "@pages/MvpMockupV2";
import { Home } from "@/components/Home";
import MainView from "@pages/MainView";
import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Content />
      <Toaster />
    </BrowserRouter>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const createOrganization = useMutation(api.organizations.createOrganizationWithAdmin);
  const acceptInvitation = useMutation(api.organizations.acceptInvitation);
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
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
          // Rediriger vers /invoices après la création de l'organisation
          void navigate("/invoices");
        } catch (error: any) {
          console.error("Erreur lors de la création de l'organisation:", error);
          const errorMessage = error.message || "Erreur lors de la création de l'organisation";
          toast.error(errorMessage);
          setOrgSetupError(errorMessage);
          setIsCreatingOrg(false);
          // Déconnecter l'utilisateur pour permettre une nouvelle tentative
          sessionStorage.removeItem("pendingOrgData");
          setTimeout(() => void signOut(), 2000);
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
          // Rediriger vers /invoices après l'acceptation de l'invitation
          void navigate("/invoices");
        } catch (error: any) {
          console.error("Erreur lors de l'acceptation de l'invitation:", error);
          const errorMessage = error.message || "Erreur lors de l'acceptation de l'invitation";
          toast.error(errorMessage);
          setOrgSetupError(errorMessage);
          setIsCreatingOrg(false);
          // Déconnecter l'utilisateur pour permettre une nouvelle tentative
          sessionStorage.removeItem("pendingInvitationData");
          setTimeout(() => void signOut(), 2000);
        }
      };
      void acceptInv();
    }
  }, [loggedInUser, createOrganization, acceptInvitation, signOut, navigate]);

  // Rediriger automatiquement vers /invoices si l'utilisateur est déjà connecté
  // et se trouve sur /login ou /signup
  useEffect(() => {
    if (loggedInUser && loggedInUser.organizationId &&
        (location.pathname === "/login" || location.pathname === "/signup")) {
      void navigate("/invoices");
    }
  }, [loggedInUser, location.pathname, navigate]);

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
    <Routes>
      {loggedInUser ? (
        <>
          {/* Redirect home to invoices (new main view) */}
          <Route path="/" element={<Navigate to="/invoices" replace />} />

          {/* New V2 Interface */}
          <Route path="/invoices" element={<AppLayout><MainView /></AppLayout>} />
          <Route path="/invoices/:id" element={<AppLayout><InvoiceDetail /></AppLayout>} />

          {/* Other pages */}
          <Route path="/upload" element={<AppLayout><InvoiceUploadPage /></AppLayout>} />
          <Route path="/settings" element={<AppLayout><SettingsPage /></AppLayout>} />
          <Route path="/team" element={<AppLayout><TeamManagement /></AppLayout>} />

          {/* Legacy routes (kept for backward compatibility) */}
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/follow-up" element={<Navigate to="/invoices" replace />} />
          <Route path="/call-plan" element={<AppLayout><CallPlan /></AppLayout>} />
          <Route path="/reminders" element={<AppLayout><Reminders /></AppLayout>} />
          <Route path="/ongoing" element={<Navigate to="/invoices" replace />} />
          <Route path="/paid" element={<Navigate to="/invoices" replace />} />

          {/* Mockups */}
          <Route path="/mvp" element={<MvpMockup />} />
          <Route path="/mvp-v2" element={<MvpMockupV2 />} />

          {/* Auth routes redirect */}
          <Route path="/login" element={<Navigate to="/invoices" replace />} />
          <Route path="/signup" element={<Navigate to="/invoices" replace />} />
          <Route path="/accept-invitation/:token" element={<Navigate to="/invoices" replace />} />
          <Route path="*" element={<Navigate to="/invoices" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Home isAuthenticated={false} />} />
          <Route path="/login" element={<SignInPage />} />
          <Route path="/signup" element={<SignupForm />} />
          <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
          <Route path="*" element={<Navigate to="/" />} />
        </>
      )}
    </Routes>
  );
}

function SignInPage() {
  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RelanceFactures
        </h1>
      </div>
      <SignInForm />
    </div>
  );
}

function InvoiceUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSuccess = () => {
    const returnTo = searchParams.get("returnTo") || "/";
    void navigate(returnTo);
  };

  return <InvoiceUpload onSuccess={handleSuccess} />;
}

function SettingsPage() {
  return <OrganizationSettings />;
}
