import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

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

      // La création de l'organisation et la redirection sont gérées dans App.tsx
      // via le useEffect qui détecte pendingOrgData
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
      setSubmitting(false);
      sessionStorage.removeItem("pendingOrgData");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
      {/* Header avec logo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Mail className="w-7 h-7" />
          </div>
          <span className="text-3xl font-bold text-slate-900">
            Relance<span className="text-brand-500">Zen</span>
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Créez votre compte</h1>
        <p className="text-slate-600">Commencez à gérer vos relances facilement</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm font-semibold text-slate-700">Nom de la société</Label>
              <Input
                id="organizationName"
                type="text"
                name="organizationName"
                placeholder="Mon Entreprise SARL"
                required
                className="h-12 rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName" className="text-sm font-semibold text-slate-700">Votre nom</Label>
              <Input
                id="userName"
                type="text"
                name="userName"
                placeholder="Alexandre Dupont"
                required
                className="h-12 rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="alexandre@monentreprise.fr"
                required
                className="h-12 rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                className="h-12 rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500"
              />
              <p className="text-xs text-slate-500">Minimum 6 caractères</p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 mt-6"
            >
              {submitting ? "Création en cours..." : "Créer mon compte"}
            </Button>

            <div className="text-center text-slate-600">
              <span>Vous avez déjà un compte ? </span>
              <NavLink
                to="/login"
                className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
              >
                Se connecter
              </NavLink>
            </div>
          </form>
    </div>
  );
}
