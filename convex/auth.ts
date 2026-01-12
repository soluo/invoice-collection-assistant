import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, MutationCtx } from "./_generated/server";
import { normalizeEmail } from "./utils";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email = normalizeEmail(params.email as string);
        const profileData: { email: string; name?: string } = {
          email,
        };
        if (params.name) {
          profileData.name = params.name as string;
        }
        return profileData;
      },
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId }) {
      const user = await ctx.db.get(userId);
      if (!user) {
        return;
      }

      // Si l'utilisateur a déjà une organisation, ne rien faire
      if (user.organizationId) {
        return;
      }

      // Créer une nouvelle organisation par défaut
      const organizationId = await ctx.db.insert("organizations", {
        name: "Ma société",
        createdAt: Date.now(),
        signature: "Cordialement,\nL'équipe de Ma société",
      });

      // Assigner l'utilisateur à cette organisation comme admin
      await ctx.db.patch(userId, {
        organizationId,
        role: "admin",
      });
    },
  },
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
