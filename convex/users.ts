import { query } from "./_generated/server";
import { getUserWithOrg, isAdmin } from "./permissions";

/**
 * Liste les membres de l'équipe (pour le filtre admin)
 */
export const listTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    const user = await getUserWithOrg(ctx);

    // Seuls les admins peuvent lister les membres
    if (!isAdmin(user)) {
      return [];
    }

    // Récupérer tous les utilisateurs de l'organisation
    const users = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("organizationId"), user.organizationId))
      .collect();

    // Retourner seulement les infos nécessaires
    return users.map((u) => ({
      _id: u._id,
      name: u.name || u.email || "Utilisateur",
    }));
  },
});
