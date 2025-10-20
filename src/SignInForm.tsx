import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function SignInForm() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="w-full">
      <form
        className="flex flex-col gap-4 form-field"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitting(true);
          const formData = new FormData(e.target as HTMLFormElement);
          formData.set("flow", "signIn");
          void signIn("password", formData).catch((error) => {
            let toastTitle = "Erreur de connexion";
            if (error.message?.includes("Invalid password")) {
              toastTitle = "Mot de passe incorrect";
            } else if (error.message?.includes("not found")) {
              toastTitle = "Compte introuvable. Avez-vous créé un compte ?";
            } else if (error.message) {
              toastTitle = error.message;
            }
            toast.error(toastTitle);
            setSubmitting(false);
          });
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
