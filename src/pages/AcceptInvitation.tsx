import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const invitationDetails = useQuery(
    api.organizations.getInvitationByToken,
    token ? { token } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !invitationDetails) return;
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = invitationDetails.email; // Utiliser l'email de l'invitation, pas du formulaire
    const password = formData.get("password") as string;
    const userName = formData.get("userName") as string;

    try {
      // 1. Stocker les données pour accepter l'invitation une fois authentifié
      sessionStorage.setItem(
        "pendingInvitationData",
        JSON.stringify({ token, userName })
      );

      // 2. Créer le compte avec email/password via Convex Auth
      const signInFormData = new FormData();
      signInFormData.set("email", email);
      signInFormData.set("password", password);
      signInFormData.set("flow", "signUp");
      signInFormData.set("name", userName);

      await signIn("password", signInFormData);

      // La redirection et l'acceptation de l'invitation sont gérées dans App.tsx
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
      setSubmitting(false);
      sessionStorage.removeItem("pendingInvitationData");
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Lien invalide</h2>
          <p className="text-red-600">
            Le lien d'invitation est invalide ou manquant. Veuillez vérifier l'URL.
          </p>
        </div>
      </div>
    );
  }

  if (invitationDetails === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isExpired = invitationDetails && invitationDetails.expiresAt < Date.now();
  const isInvalid = !invitationDetails || invitationDetails.status !== "pending" || isExpired;

  if (isInvalid) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-semibold mb-2">Invitation invalide</h2>
          <p className="text-red-600">
            Cette invitation n'existe pas, a déjà été utilisée ou a expiré.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Rejoindre {invitationDetails.organizationName}
        </h1>
        <p className="text-gray-600">
          Vous avez été invité à rejoindre l'organisation. Créez votre compte pour continuer.
        </p>
      </div>

      <div className="bg-white rounded-lg border p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
              type="email"
              name="email"
              defaultValue={invitationDetails.email}
              readOnly
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Cet email est lié à l'invitation et ne peut pas être modifié.
            </p>
          </div>

          <div>
            <label
              htmlFor="userName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Votre nom
            </label>
            <input
              id="userName"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              name="userName"
              placeholder="Votre nom complet"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Mot de passe
            </label>
            <input
              id="password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button
            className="w-full bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Rejoindre..." : "Rejoindre l'organisation"}
          </button>

          <div className="text-center text-sm text-gray-600">
            <span>Vous avez déjà un compte ? </span>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
              onClick={() => navigate("/login")}
            >
              Se connecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
