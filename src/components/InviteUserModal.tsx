import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import type { ValidationErrorData } from "../../convex/errors";

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteUserModal({ isOpen, onClose }: InviteUserModalProps) {
  const inviteUser = useMutation(api.organizations.inviteUser);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "technicien">("technicien");
  const [submitting, setSubmitting] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Validation email (même regex que le backend)
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setEmailError(null);

    try {
      const result = await inviteUser({ email, role });
      setInvitationToken(result.token);
      toast.success("Invitation créée avec succès !");
      setEmail("");
    } catch (error) {
      // Gérer les erreurs de validation structurées (ConvexError)
      if (error instanceof ConvexError) {
        const data = error.data as ValidationErrorData;
        if (data.field === "email") {
          setEmailError(data.message);
        } else {
          toast.error(data.message);
        }
      } else {
        // Erreur inattendue
        toast.error("Une erreur inattendue s'est produite");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setInvitationToken(null);
    setEmail("");
    setRole("technicien");
    setCopied(false);
    setEmailError(null);
    onClose();
  };

  const copyInvitationLink = () => {
    if (!invitationToken) return;

    const invitationUrl = `${window.location.origin}/accept-invitation/${invitationToken}`;
    navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    toast.success("Lien copié !");

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-slate-900 mb-6">
          Inviter un utilisateur
        </h2>

        {!invitationToken ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => {
                  const value = e.target.value;
                  if (value && !validateEmail(value)) {
                    setEmailError("Format d'email invalide");
                  } else {
                    setEmailError(null);
                  }
                }}
                pattern="^[^\s@]+@[^\s@]+\.[^\s@]+$"
                className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
                  emailError
                    ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                    : "border-slate-200 focus:ring-brand-500/20 focus:border-brand-500"
                }`}
                placeholder="utilisateur@example.com"
                required
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-600">{emailError}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Rôle
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "technicien")}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors bg-white"
              >
                <option value="technicien">Technicien</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-2 text-sm text-slate-500">
                {role === "admin"
                  ? "Accès complet à toutes les factures et paramètres"
                  : "Accès limité à ses propres factures"}
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting || !!emailError || !email}
                className="flex-1 px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Envoi..." : "Inviter"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-800 font-semibold mb-1">
                Invitation créée !
              </p>
              <p className="text-emerald-700 text-sm">
                Partagez ce lien avec {email} pour qu'il rejoigne votre organisation.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-600 mb-2 font-semibold uppercase tracking-wide">
                Lien d'invitation
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-slate-200 overflow-x-auto text-slate-700">
                  {window.location.origin}/accept-invitation/{invitationToken}
                </code>
                <button
                  onClick={copyInvitationLink}
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-lg border border-slate-200 transition-colors"
                  title="Copier le lien"
                >
                  {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
              <p className="text-brand-800 text-sm">
                <strong>Note :</strong> Le lien expire dans 7 jours. L'utilisateur devra créer son
                compte avec l'email <strong>{email}</strong>.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-3 bg-brand-500 text-white font-bold rounded-xl hover:bg-brand-600 transition-colors"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
