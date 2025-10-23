import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function SignupForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = (formData.get("email") as string).trim();
    const normalizedEmail = email.toLowerCase();
    const password = formData.get("password") as string;
    const userName = formData.get("userName") as string;
    const organizationName = formData.get("organizationName") as string;

    try {
      // 1. Stocker les données pour créer l'organisation une fois authentifié
      sessionStorage.setItem(
        "pendingOrgData",
        JSON.stringify({ organizationName, userName })
      );

      // 2. Créer le compte avec email/password via Convex Auth
      const signInFormData = new FormData();
      signInFormData.set("email", normalizedEmail);
      signInFormData.set("password", password);
      signInFormData.set("flow", "signUp");
      signInFormData.set("name", userName);

      await signIn("password", signInFormData);

      // La redirection et la création de l'organisation sont gérées dans App.tsx
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
      setSubmitting(false);
      sessionStorage.removeItem("pendingOrgData");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Créer votre organisation
        </h1>
        <p className="text-gray-600">
          Commencez à gérer vos factures en créant votre organisation
        </p>
      </div>

      <div className="bg-white rounded-lg border p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nom de la société
            </label>
            <input
              id="organizationName"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="text"
              name="organizationName"
              placeholder="Mon Entreprise SARL"
              required
            />
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
              placeholder="Alexandre Dupont"
              required
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              name="email"
              placeholder="alexandre@monentreprise.fr"
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
            {submitting ? "Création en cours..." : "Créer mon organisation"}
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
