import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate, useSearchParams, NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bon retour !</h1>
        <p className="text-slate-600">Connectez-vous à votre compte</p>
      </div>

      <form
        className="space-y-6"
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
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="nom@exemple.fr"
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
              className="h-12 rounded-lg border-slate-200 focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 bg-brand-500 hover:bg-brand-600 text-white text-lg font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
          >
            {submitting ? "Connexion en cours..." : "Se connecter"}
          </Button>
          <div className="text-center text-slate-600">
            <span>Vous n'avez pas de compte ? </span>
            <NavLink
              to="/signup"
              className="text-brand-600 hover:text-brand-700 font-semibold hover:underline"
            >
              Créer un compte
            </NavLink>
          </div>
        </form>
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

  if (rawMessage) {
    return rawMessage;
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}
