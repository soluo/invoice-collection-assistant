import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import {
  UserPlus,
  Users,
  Mail,
  Shield,
  Wrench,
  Copy,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { InviteUserModal } from "@components/InviteUserModal";
import { toast } from "sonner";
import { Tooltip } from "@components/Tooltip";

export function TeamManagement() {
  const users = useQuery(api.organizations.listUsers);
  const invitations = useQuery(api.organizations.listInvitations);
  const deleteInvitation = useMutation(api.organizations.deleteInvitation);
  const regenerateToken = useMutation(api.organizations.regenerateInvitationToken);
  const updateUserRole = useMutation(api.organizations.updateUserRole);
  const removeUser = useMutation(api.organizations.removeUser);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  if (users === undefined || invitations === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Basic permission check - a more robust check is done on the backend
  if (users.length === 0 && invitations.length === 0) {
    const currentUser = useQuery(api.auth.loggedInUser);
    if (currentUser && currentUser.role !== "admin") {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800">
            Vous n'avez pas les permissions pour gérer l'équipe.
          </p>
        </div>
      );
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getRoleBadge = (role?: "admin" | "technicien") => {
    if (role === "admin") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Shield size={12} />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <Wrench size={12} />
        Technicien
      </span>
    );
  };

  const getStatusBadge = (status: "pending" | "accepted" | "expired") => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <Clock size={12} />
          En attente
        </span>
      );
    }
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <CheckCircle size={12} />
          Acceptée
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle size={12} />
        Expirée
      </span>
    );
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/accept-invitation/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien d'invitation copié !");
  };

  const handleRegenerate = async (invitationId: any) => {
    try {
      await regenerateToken({ invitationId });
      toast.success("Lien d'invitation regénéré !");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la regénération.");
    }
  };

  const handleDelete = (invitationId: any) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette invitation ?")) {
      deleteInvitation({ invitationId })
        .then(() => {
          toast.success("Invitation supprimée.");
        })
        .catch((error: any) => {
          toast.error(error.message || "Erreur lors de la suppression.");
        });
    }
  };

  const handleChangeRole = async (userId: any, currentRole?: "admin" | "technicien") => {
    const newRole = currentRole === "admin" ? "technicien" : "admin";
    const roleName = newRole === "admin" ? "Administrateur" : "Technicien";

    if (window.confirm(`Changer le rôle en ${roleName} ?`)) {
      try {
        await updateUserRole({ userId, newRole });
        toast.success(`Rôle changé en ${roleName}`);
        setOpenDropdown(null);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du changement de rôle");
      }
    }
  };

  const handleRemoveUser = async (userId: any, userName?: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir retirer ${userName || "cet utilisateur"} de l'organisation ?`)) {
      try {
        await removeUser({ userId });
        toast.success("Utilisateur retiré de l'organisation");
        setOpenDropdown(null);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de la suppression");
      }
    }
  };

  return (
    <div className="space-y-8 pt-6">
      {/* Header avec bouton d'invitation */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={24} />
            Gestion de l'équipe
          </h2>
          <p className="text-gray-600 mt-1">
            Gérez les membres de votre organisation et les invitations en attente.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <UserPlus size={18} />
          Inviter un utilisateur
        </button>
      </div>

      {/* Liste des utilisateurs */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={20} />
            Membres de l'équipe ({users.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.name || "Non renseigné"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{user.email || "—"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdown(openDropdown === user._id ? null : user._id)}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openDropdown === user._id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setOpenDropdown(null)}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-20">
                            <button
                              onClick={() => void handleChangeRole(user._id, user.role)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                            >
                              <Shield size={14} />
                              Changer le rôle
                            </button>
                            <button
                              onClick={() => void handleRemoveUser(user._id, user.name)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Retirer de l'organisation
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    Aucun membre dans l'équipe
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Liste des invitations */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Mail size={20} />
            Invitations ({invitations.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expire le
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((invitation) => {
                const isExpired = invitation.expiresAt < Date.now();
                const effectiveStatus = isExpired ? "expired" : invitation.status;

                return (
                  <tr key={invitation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(invitation.role)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(effectiveStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {formatDate(invitation.expiresAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Tooltip content="Copier le lien d'invitation">
                          <button
                            onClick={() => handleCopyLink(invitation.token)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isExpired}
                          >
                            <Copy size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Regénérer le lien">
                          <button
                            onClick={() => void handleRegenerate(invitation._id)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Supprimer l'invitation">
                          <button
                            onClick={() => void handleDelete(invitation._id)}
                            className="p-2 text-red-500 hover:bg-red-100 rounded-md"
                          >
                            <Trash2 size={16} />
                          </button>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucune invitation en cours ou expirée
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </div>
  );
}
