import { useMutation } from "convex/react";
import { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await inviteUser({ email, role });
      setInvitationToken(result.token);
      toast.success("Invitation créée avec succès !");
      setEmail("");
    } catch (error: any) {
      console.error("Erreur lors de l'invitation:", error);
      toast.error(error.message || "Erreur lors de l'invitation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setInvitationToken(null);
    setEmail("");
    setRole("technicien");
    setCopied(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Inviter un utilisateur
        </h2>

        {!invitationToken ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="utilisateur@example.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rôle
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as "admin" | "technicien")}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="technicien">Technicien</option>
                <option value="admin">Admin</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {role === "admin"
                  ? "Admin : accès complet à toutes les factures et paramètres"
                  : "Technicien : accès limité à ses propres factures"}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Envoi..." : "Envoyer l'invitation"}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium mb-2">
                Invitation créée avec succès !
              </p>
              <p className="text-green-700 text-sm">
                Partagez ce lien avec {email} pour qu'il rejoigne votre organisation :
              </p>
            </div>

            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <p className="text-xs text-gray-600 mb-2 font-medium">
                Lien d'invitation :
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 text-xs bg-white px-2 py-1.5 rounded border border-gray-200 overflow-x-auto">
                  {window.location.origin}/accept-invitation/{invitationToken}
                </code>
                <button
                  onClick={copyInvitationLink}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                  title="Copier le lien"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Note :</strong> Le lien expire dans 7 jours. L'utilisateur devra créer son
                compte avec l'email <strong>{email}</strong>.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
