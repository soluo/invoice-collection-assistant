import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate, useSearchParams, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Shield, ArrowRight } from "lucide-react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
          Bon retour
        </h1>
        <p className="text-slate-500">
          Connectez-vous pour accéder à votre tableau de bord.
        </p>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSubmitting(true);
          setErrorMessage(null);
          const formElement = e.target as HTMLFormElement;
          const submittedData = new FormData(formElement);
          const originalEmail = ((submittedData.get("email") as string) ?? "").trim();
          const password = (submittedData.get("password") as string) ?? "";
          const normalizedEmail = originalEmail.toLowerCase();

          const buildFormData = (emailValue: string) => {
            const data = new FormData();
            data.set("email", emailValue);
            data.set("password", password);
            data.set("flow", "signIn");
            return data;
          };

          const emailCandidates =
            normalizedEmail === originalEmail
              ? [normalizedEmail]
              : [normalizedEmail, originalEmail];

          let signedIn = false;
          let lastError: unknown = null;

          for (const candidate of emailCandidates) {
            try {
              await signIn("password", buildFormData(candidate));
              signedIn = true;
              break;
            } catch (error) {
              lastError = error;
            }
          }

          if (signedIn) {
            setSubmitting(false);
            const returnTo = searchParams.get("returnTo") || "/follow-up";
            navigate(returnTo);
            return;
          }

          const message = mapSignInError(lastError);
          setErrorMessage(message);
          setSubmitting(false);
        }}
      >
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
            <div className="flex justify-between items-center mb-1.5">
              <Label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                Mot de passe
              </Label>
              <a href="#forgot" className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                Oublié?
              </a>
            </div>
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
            <span>{submitting ? "Connexion en cours..." : "Se connecter"}</span>
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        {/* Toggle to Signup */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <span>Pas encore de compte ?</span>
          <NavLink
            to="/signup"
            className="font-bold text-brand-600 hover:text-brand-700 ml-1 underline decoration-transparent hover:decoration-brand-600 transition-all"
          >
            Créer un compte gratuit
          </NavLink>
        </div>

        {/* Trust Badge */}
        <div className="mt-5 flex justify-center items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-green-500" />
          <span>Connexion sécurisée SSL 256-bit</span>
        </div>
    </div>
  );
}

function mapSignInError(error: unknown): string {
  if (typeof error === "string") {
    return normaliseMessage(error);
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) {
      return normaliseMessage(message);
    }
  }
  return "Une erreur est survenue. Veuillez réessayer.";
}

function normaliseMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();

  // Erreurs d'authentification connues (dev) → message user-friendly
  if (
    lower.includes("invalid password") ||
    lower.includes("invalidaccountid") ||
    lower.includes("invalidaccount") ||
    lower.includes("invalidsecret") ||
    lower.includes("not found") ||
    lower.includes("account_id")
  ) {
    return "Identifiants incorrects";
  }

  // Erreurs Convex auth:signIn en prod → identifiants incorrects
  // Ex: "[CONVEX A(auth:signIn)] [Request ID: ...] Server Error Called by client"
  if (lower.includes("auth:signin")) {
    return "Identifiants incorrects";
  }

  // Autres erreurs Convex (vraies erreurs techniques)
  if (lower.includes("[convex") || lower.includes("server error")) {
    return "Une erreur technique est survenue. Veuillez réessayer.";
  }

  // Fallback
  return "Une erreur est survenue. Veuillez réessayer.";
}
