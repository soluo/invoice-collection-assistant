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
  Loader2,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { InviteUserModal } from "@/components/InviteUserModal";
import { toast } from "sonner";
import { Tooltip } from "@/components/ui/simple-tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TeamManagement() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.organizations.listUsers);
  const invitations = useQuery(api.organizations.listInvitations);
  const deleteInvitation = useMutation(api.organizations.deleteInvitation);
  const regenerateToken = useMutation(api.organizations.regenerateInvitationToken);
  const updateUserRole = useMutation(api.organizations.updateUserRole);
  const removeUser = useMutation(api.organizations.removeUser);

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Loading state
  if (users === undefined || invitations === undefined || loggedInUser === undefined) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  // Permission check
  if (loggedInUser.role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-amber-800 font-medium">
            Vous n'avez pas les permissions pour accéder à cette page.
          </p>
        </div>
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
          <Shield size={12} />
          Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
        <Wrench size={12} />
        Technicien
      </span>
    );
  };

  const getStatusBadge = (status: "pending" | "accepted" | "expired") => {
    if (status === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          <Clock size={12} />
          En attente
        </span>
      );
    }
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
          <CheckCircle size={12} />
          Acceptée
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
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
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de la suppression");
      }
    }
  };

  const UserActionsMenu = ({ user }: { user: any }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => void handleChangeRole(user._id, user.role)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Shield size={14} />
          Changer le rôle
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleRemoveUser(user._id, user.name)}
          className="flex items-center gap-2 text-red-600 focus:text-red-600 cursor-pointer"
        >
          <Trash2 size={14} />
          Retirer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Équipe</h1>
          <p className="text-slate-500 mt-1">
            Gérez les membres de votre organisation et les invitations.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="px-5 py-2 bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-600 hover:shadow-brand-500/50 hover:-translate-y-0.5 transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <UserPlus size={18} />
          Inviter
        </button>
      </div>

      {/* Members Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-slate-500" />
            Membres ({users.length})
          </h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Nom
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">
                      {user.name || "Non renseigné"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-slate-600">{user.email || "—"}</div>
                  </td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <UserActionsMenu user={user} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Aucun membre dans l'équipe
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {users.map((user) => (
            <div key={user._id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-slate-900 truncate">
                  {user.name || "Non renseigné"}
                </div>
                <div className="text-sm text-slate-500 truncate">{user.email || "—"}</div>
                <div className="mt-2">{getRoleBadge(user.role)}</div>
              </div>
              <UserActionsMenu user={user} />
            </div>
          ))}
          {users.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              Aucun membre dans l'équipe
            </div>
          )}
        </div>
      </div>

      {/* Invitations Card */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-card overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Mail size={20} className="text-slate-500" />
            Invitations ({invitations.length})
          </h2>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Expire le
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invitations.map((invitation) => {
                const isExpired = invitation.expiresAt < Date.now();
                const effectiveStatus = isExpired ? "expired" : invitation.status;

                return (
                  <tr key={invitation._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{invitation.email}</div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(invitation.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(effectiveStatus)}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-600">{formatDate(invitation.expiresAt)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip content="Copier le lien">
                          <button
                            onClick={() => handleCopyLink(invitation.token)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isExpired}
                          >
                            <Copy size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Regénérer le lien">
                          <button
                            onClick={() => void handleRegenerate(invitation._id)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <RefreshCw size={16} />
                          </button>
                        </Tooltip>
                        <Tooltip content="Supprimer">
                          <button
                            onClick={() => void handleDelete(invitation._id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    Aucune invitation en cours
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {invitations.map((invitation) => {
            const isExpired = invitation.expiresAt < Date.now();
            const effectiveStatus = isExpired ? "expired" : invitation.status;

            return (
              <div key={invitation._id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">{invitation.email}</div>
                    <div className="text-sm text-slate-500 mt-1">
                      Expire le {formatDate(invitation.expiresAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleCopyLink(invitation.token)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                      disabled={isExpired}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => void handleRegenerate(invitation._id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                    <button
                      onClick={() => void handleDelete(invitation._id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(invitation.role)}
                  {getStatusBadge(effectiveStatus)}
                </div>
              </div>
            );
          })}
          {invitations.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-500">
              Aucune invitation en cours
            </div>
          )}
        </div>
      </div>

      <InviteUserModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />
    </div>
  );
}
