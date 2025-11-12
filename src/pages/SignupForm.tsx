import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="max-w-md mx-auto mt-20">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RelanceFactures
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Créez votre compte</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Nom de la société</Label>
              <Input
                id="organizationName"
                type="text"
                name="organizationName"
                placeholder="Mon Entreprise SARL"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Votre nom</Label>
              <Input
                id="userName"
                type="text"
                name="userName"
                placeholder="Alexandre Dupont"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                name="email"
                placeholder="alexandre@monentreprise.fr"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Création en cours..." : "Créer mon organisation"}
            </Button>

            <div className="text-center text-sm text-gray-600">
              <span>Vous avez déjà un compte ? </span>
              <button
                type="button"
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
                onClick={() => navigate("/login")}
              >
                Se connecter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
