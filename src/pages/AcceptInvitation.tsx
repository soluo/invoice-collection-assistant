import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, User, Lock, Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Users } from "lucide-react";
import { SplitAuthLayout } from "@/components/auth/SplitAuthLayout";

// Helper pour parser les erreurs et les associer aux champs
function parseFieldError(errorMessage: string): { field: "email" | "password" | "general"; message: string } {
  const lowerMessage = errorMessage.toLowerCase();

  // Erreurs liées à l'email
  if (
    lowerMessage.includes("email") &&
    (lowerMessage.includes("already") || lowerMessage.includes("existe") || lowerMessage.includes("déjà"))
  ) {
    return { field: "email", message: "Cet email est déjà utilisé" };
  }
  if (lowerMessage.includes("email") && lowerMessage.includes("invalid")) {
    return { field: "email", message: "Email invalide" };
  }

  // Erreurs liées au mot de passe
  if (lowerMessage.includes("password") || lowerMessage.includes("mot de passe")) {
    if (lowerMessage.includes("short") || lowerMessage.includes("court") || lowerMessage.includes("6")) {
      return { field: "password", message: "Le mot de passe doit contenir au moins 6 caractères" };
    }
    return { field: "password", message: "Mot de passe invalide" };
  }

  return { field: "general", message: errorMessage };
}

export function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const { signIn } = useAuthActions();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const invitationDetails = useQuery(
    api.organizations.getInvitationByToken,
    token ? { token } : "skip"
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!token || !invitationDetails) return;
    setSubmitting(true);
    setErrors({});

    const formData = new FormData(e.target as HTMLFormElement);
    const email = invitationDetails.email;
    const normalizedEmail = email.trim().toLowerCase();
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
      signInFormData.set("email", normalizedEmail);
      signInFormData.set("password", password);
      signInFormData.set("flow", "signUp");
      signInFormData.set("name", userName);

      await signIn("password", signInFormData);

      // La redirection et l'acceptation de l'invitation sont gérées dans App.tsx
    } catch (error: any) {
      const message = error.message || "Erreur lors de l'inscription";
      const { field, message: fieldMessage } = parseFieldError(message);

      if (field === "general") {
        setErrors({ general: fieldMessage });
        toast.error(fieldMessage);
      } else {
        setErrors({ [field]: fieldMessage });
      }

      setSubmitting(false);
      sessionStorage.removeItem("pendingInvitationData");
    }
  };

  // Token manquant
  if (!token) {
    return (
      <SplitAuthLayout>
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Lien invalide</h1>
          <p className="text-slate-500 mb-6">
            Le lien d'invitation est invalide ou manquant. Veuillez vérifier l'URL.
          </p>
          <NavLink
            to="/login"
            className="text-brand-600 hover:text-brand-700 font-semibold"
          >
            Retour à la connexion
          </NavLink>
        </div>
      </SplitAuthLayout>
    );
  }

  // Chargement
  if (invitationDetails === undefined) {
    return (
      <SplitAuthLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
          <p className="text-slate-500">Chargement de l'invitation...</p>
        </div>
      </SplitAuthLayout>
    );
  }

  const isExpired = invitationDetails && invitationDetails.expiresAt < Date.now();
  const isInvalid = !invitationDetails || invitationDetails.status !== "pending" || isExpired;

  // Invitation invalide ou expirée
  if (isInvalid) {
    return (
      <SplitAuthLayout>
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Invitation expirée</h1>
          <p className="text-slate-500 mb-6">
            Cette invitation n'existe pas, a déjà été utilisée ou a expiré.
            Contactez votre administrateur pour recevoir une nouvelle invitation.
          </p>
          <NavLink
            to="/login"
            className="text-brand-600 hover:text-brand-700 font-semibold"
          >
            Retour à la connexion
          </NavLink>
        </div>
      </SplitAuthLayout>
    );
  }

  return (
    <SplitAuthLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-brand-600" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            Rejoindre {invitationDetails.organizationName}
          </h1>
          <p className="text-slate-500">
            Vous avez été invité à rejoindre l'organisation. Créez votre compte pour continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field (readonly) */}
          <div className="input-group">
            <Label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className={`w-4 h-4 ${errors.email ? "text-red-400" : "text-slate-400"}`} />
              </div>
              <Input
                id="email"
                type="email"
                name="email"
                defaultValue={invitationDetails.email}
                readOnly
                className={`w-full pl-10 pr-4 py-3 bg-slate-100 border rounded-xl text-slate-600 cursor-not-allowed ${
                  errors.email ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
            </div>
            {errors.email ? (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">
                Cet email est lié à l'invitation et ne peut pas être modifié.
              </p>
            )}
          </div>

          {/* Name Field */}
          <div className="input-group">
            <Label htmlFor="userName" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Votre nom
            </Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="w-4 h-4 text-slate-400" />
              </div>
              <Input
                id="userName"
                type="text"
                name="userName"
                placeholder="Jean Dupont"
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
                <Lock className={`w-4 h-4 ${errors.password ? "text-red-400" : "text-slate-400"}`} />
              </div>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
                className={`w-full pl-10 pr-10 py-3 bg-slate-50 border rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all ${
                  errors.password ? "border-red-300 bg-red-50" : "border-slate-200"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="text-xs text-red-600 mt-1.5 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1.5">Minimum 6 caractères</p>
            )}
          </div>

          {/* Error Message (general errors only) */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{errors.general}</span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-5"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Création du compte...</span>
              </>
            ) : (
              <>
                <span>Rejoindre l'organisation</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        {/* Toggle to Login */}
        <div className="mt-6 text-center text-sm text-slate-600">
          <span>Vous avez déjà un compte ?</span>
          <NavLink
            to="/login"
            className="font-bold text-brand-600 hover:text-brand-700 ml-1 underline decoration-transparent hover:decoration-brand-600 transition-all"
          >
            Se connecter
          </NavLink>
        </div>
      </div>
    </SplitAuthLayout>
  );
}
