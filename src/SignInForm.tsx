import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4 form-field"
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
            return;
          }

          const message = mapSignInError(lastError);
          setErrorMessage(message);
          setSubmitting(false);
        }}
      >
        <input
          className="auth-input-field"
          type="email"
          name="email"
          placeholder="Email"
          required
        />
        <input
          className="auth-input-field"
          type="password"
          name="password"
          placeholder="Mot de passe"
          required
        />
        {errorMessage && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
        <button className="auth-button" type="submit" disabled={submitting}>
          Se connecter
        </button>
        <div className="text-center text-sm text-secondary">
          <span>Vous n'avez pas de compte ? </span>
          <button
            type="button"
            className="text-primary hover:text-primary-hover hover:underline font-medium cursor-pointer"
            onClick={() => navigate("/signup")}
          >
            Créer une organisation
          </button>
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
