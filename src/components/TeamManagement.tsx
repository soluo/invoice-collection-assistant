import { useQuery } from "convex/react";
import { useState } from "react";
import { UserPlus, Users, Mail, Shield, Wrench, Clock, CheckCircle, XCircle } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { InviteUserModal } from "./InviteUserModal";

export function TeamManagement() {
  const users = useQuery(api.organizations.listUsers);
  const invitations = useQuery(api.organizations.listInvitations);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  if (users === undefined || invitations === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Vérifier si l'utilisateur a les permissions (admins uniquement)
  if (users.length === 0 && invitations.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          Vous n'avez pas les permissions pour gérer l'équipe.
        </p>
      </div>
    );
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

  return (
    <div className="space-y-8">
      {/* Header avec bouton d'invitation */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion de l'équipe</h2>
          <p className="text-gray-600 mt-1">
            Gérez les membres de votre organisation et les invitations
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
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
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
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expire le
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invitations.map((invitation) => (
                <tr key={invitation._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{invitation.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRoleBadge(invitation.role)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(invitation.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatDate(invitation.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {formatDate(invitation.expiresAt)}
                    </div>
                  </td>
                </tr>
              ))}
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Aucune invitation en cours
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
