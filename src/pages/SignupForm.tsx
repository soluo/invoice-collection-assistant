import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export function SignupForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const email = (formData.get("email") as string).trim();
    const normalizedEmail = email.toLowerCase();
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      // Créer le compte avec email/password via Convex Auth
      const signUpFormData = new FormData();
      signUpFormData.set("email", normalizedEmail);
      signUpFormData.set("password", password);
      signUpFormData.set("flow", "signUp");
      signUpFormData.set("name", name);

      await signIn("password", signUpFormData);

      // Pas de création d'organisation ici, sera géré dans un onboarding séparé
      // Redirection directe vers l'app
      navigate("/invoices");
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      setErrorMessage(error.message || "Erreur lors de l'inscription");
      toast.error(error.message || "Erreur lors de l'inscription");
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Créer un compte
        </h1>
        <p className="text-slate-500">
          Commencez votre essai gratuit de 14 jours.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Field */}
            <div className="input-group">
              <Label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Nom complet
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Jean Dupont"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="input-group">
              <Label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Email
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="nom@entreprise.fr"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="input-group">
              <Label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                Mot de passe
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Minimum 6 caractères</p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-5"
            >
              <span>{submitting ? "Création en cours..." : "Créer mon compte"}</span>
              {!submitting && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>

          {/* Toggle to Login */}
          <div className="mt-6 text-center text-sm text-slate-600">
            <span>Déjà un compte ?</span>
            <NavLink
              to="/login"
              className="font-bold text-brand-600 hover:text-brand-700 ml-1 underline decoration-transparent hover:decoration-brand-600 transition-all"
            >
              Se connecter
            </NavLink>
          </div>

          {/* Terms */}
          <p className="mt-5 text-center text-xs text-slate-400 leading-relaxed">
            En créant un compte, vous acceptez nos{' '}
            <a href="#" className="underline hover:text-slate-600">CGU</a> et notre{' '}
            <a href="#" className="underline hover:text-slate-600">Politique de confidentialité</a>.
          </p>
    </div>
  );
}
