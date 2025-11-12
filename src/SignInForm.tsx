import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              placeholder="nom@exemple.fr"
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
            />
          </div>
          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Connexion en cours..." : "Se connecter"}
          </Button>
          <div className="text-center text-sm text-gray-600">
            <span>Vous n'avez pas de compte ? </span>
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 hover:underline font-medium cursor-pointer"
              onClick={() => navigate("/signup")}
            >
              Créer une organisation
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
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
