# Application de Gestion de Factures
  
This is a project built with [Chef](https://chef.convex.dev) using [Convex](https://convex.dev) as its backend.
 You can find docs about Chef with useful information like how to deploy to production [here](https://docs.convex.dev/chef).
  
This project is connected to the Convex deployment named [`fabulous-dachshund-120`](https://dashboard.convex.dev/d/fabulous-dachshund-120).
  
## Project structure
  
The frontend code is in the `app` directory and is built with [Vite](https://vitejs.dev/).
  
The backend code is in the `convex` directory.
  
`npm run dev` will start the frontend and backend servers.

## App authentication

Chef apps use [Convex Auth](https://auth.convex.dev/) with Anonymous auth for easy sign in. You may wish to change this before deploying your app.

## Developing and deploying your app

Check out the [Convex docs](https://docs.convex.dev/) for more information on how to develop with Convex.
* If you're new to Convex, the [Overview](https://docs.convex.dev/understanding/) is a good place to start
* Check out the [Hosting and Deployment](https://docs.convex.dev/production/) docs for how to deploy your app
* Read the [Best Practices](https://docs.convex.dev/understanding/best-practices/) guide for tips on how to improve you app further

## Développement

### Port Vite et SITE_URL

Vite utilise par défaut le port `5173`. Si ce port est occupé, Vite utilise automatiquement le prochain port disponible (`5174`, `5175`, etc.).

**Important :** La variable d'environnement `SITE_URL` dans Convex doit correspondre au port réellement utilisé par Vite. Cette variable est utilisée pour générer les liens dans les emails (invitations, etc.).

1. Lancer l'application et noter le port affiché :
   ```
   pnpm dev
   # ➜  Local:   http://localhost:5174/   ← Noter ce port
   ```

2. Si le port diffère de `5173`, mettre à jour `SITE_URL` dans les variables d'environnement Convex :
   ```bash
   npx convex env set SITE_URL "http://localhost:5174"
   ```

En production, `SITE_URL` doit être configuré avec l'URL de production (ex: `https://votre-domaine.com`).

## HTTP API

User-defined http routes are defined in the `convex/router.ts` file. We split these routes into a separate file from `convex/http.ts` to allow us to prevent the LLM from modifying the authentication routes.
