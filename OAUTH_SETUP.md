# Guide de Configuration OAuth Microsoft

Ce guide vous accompagne dans la configuration de l'authentification OAuth avec Microsoft pour envoyer des emails via Outlook.

## 📋 Prérequis

- Application Azure AD créée avec les scopes : `Mail.Send`, `User.Read`, `offline_access` ✅
- Client ID et Tenant ID disponibles ✅

## 🔑 Étape 1 : Générer le Client Secret

1. Allez sur [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** → **App registrations** → Votre application
3. Dans le menu de gauche : **Certificates & secrets**
4. Cliquez sur **New client secret**
   - Description : `Convex OAuth`
   - Expiration : **24 months** (recommandé)
5. **Copiez immédiatement la valeur** (elle ne sera plus visible après !)
   - Format : `xxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## 🌐 Étape 2 : Configurer les URI de redirection

1. Toujours dans votre application Azure AD
2. Menu de gauche : **Authentication**
3. Section **Platform configurations** → **Add a platform** → **Web**
4. Ajoutez les deux URIs suivantes :
   ```
   http://localhost:3000/oauth/microsoft/callback
   https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback
   ```
5. **Enregistrez**

## ⚙️ Étape 3 : Configuration Convex

### Variables d'environnement à ajouter

1. Allez sur [Convex Dashboard](https://dashboard.convex.dev)
2. Sélectionnez votre projet : `fabulous-dachshund-120`
3. Allez dans **Settings** → **Environment Variables**
4. Ajoutez les variables suivantes :

```bash
# OAuth Microsoft
MICROSOFT_CLIENT_ID=<votre-client-id>
MICROSOFT_CLIENT_SECRET=<le-secret-que-vous-avez-copié>
MICROSOFT_TENANT_ID=organizations  # IMPORTANT: Utiliser "organizations" pour accepter tous les comptes Azure AD

# URI de redirection OAuth (où Microsoft redirige après autorisation)
MICROSOFT_REDIRECT_URI=https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback

# URL du frontend (où le backend redirige après traitement du callback)
FRONTEND_URL=http://localhost:5173  # En dev, changez en prod selon votre domaine
```

> ⚠️ **Configuration Multi-Tenant obligatoire**
>
> Pour que les utilisateurs de différentes organisations Azure AD puissent connecter leur compte Outlook :
> 1. **Côté Convex** : `MICROSOFT_TENANT_ID=organizations`
> 2. **Côté Azure Portal** : Dans Authentication → "Types de comptes pris en charge" → Sélectionner **"Comptes dans un annuaire d'organisation (tout locataire Microsoft Entra ID – Multilocataire)"**
>
> Si vous utilisez un tenant ID spécifique (ex: `b3a3a3a1-...`), seuls les utilisateurs de CE tenant pourront se connecter (erreur AADSTS50020).

**Important :** Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs !

---

### 📍 Clarification des URLs

**MICROSOFT_REDIRECT_URI** (Backend Convex)
- Où : Dans Convex env vars ✅ + Dans Azure AD "Redirect URIs" ✅
- Valeur : `https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback`
- Rôle : C'est où Microsoft envoie l'utilisateur après autorisation

**FRONTEND_URL** (Votre App React)
- Où : Dans Convex env vars ✅ (PAS dans Azure AD ❌)
- Valeur dev : `http://localhost:5173`
- Valeur prod : `https://votre-domaine.com`
- Rôle : C'est où le backend Convex redirige l'utilisateur après avoir traité le callback

### Déploiement backend

Le backend est déjà configuré, il faut juste le déployer :

```bash
# Démarrer le serveur de développement (qui va déployer automatiquement)
pnpm dev:backend
```

Convex va automatiquement :
- Déployer les nouvelles fonctions OAuth
- Créer la route HTTP `/oauth/microsoft/callback`
- Appliquer les modifications du schéma

## 🧪 Étape 4 : Test de connexion

### Lancer l'application

```bash
# Terminal 1 : Backend Convex (si pas déjà lancé)
pnpm dev:backend

# Terminal 2 : Frontend
pnpm dev:frontend
```

### Test du flow OAuth

1. Ouvrez l'application : http://localhost:5173
2. Connectez-vous avec votre compte admin
3. Allez dans **Paramètres** → Onglet **Organisation**
4. Scrollez jusqu'à la section **Connexion Email (Outlook)**
5. Vous devriez voir : "Aucun compte email connecté"
6. Cliquez sur le bouton **Connecter Outlook**
7. Vous serez redirigé vers Microsoft pour autoriser l'application
8. Autorisez l'application (acceptez les permissions)
9. Vous serez redirigé automatiquement vers votre app (localhost:5173/settings)
10. Vous devriez voir un message de succès : "Compte Outlook connecté avec succès !"

### Vérification visuelle

Après la connexion réussie, vous devriez voir :

```
✅ Connexion Email (Outlook)
┌─────────────────────────────────────────────────┐
│ ✓ Connecté en tant que Votre Nom                │
│   votre-email@outlook.com                       │
│   Connecté le 23 octobre 2025 à 15:30          │
│                                                 │
│ ✓ Token actif                                   │
│   (Expire le 23 novembre 2025)                  │
└─────────────────────────────────────────────────┘

⨯ Déconnecter le compte
```

## ✅ Critères de succès

- [ ] Popup OAuth s'ouvre correctement
- [ ] L'utilisateur peut autoriser l'application
- [ ] Toast de succès affiché après redirection
- [ ] Compte affiché avec nom et email
- [ ] Token actif (pas expiré)
- [ ] Date de connexion affichée
- [ ] Bouton "Déconnecter" fonctionne

## 🐛 Troubleshooting

### Erreur : "Configuration OAuth incomplète"
- Vérifiez que toutes les variables d'environnement sont définies dans Convex
- Redémarrez `pnpm dev:backend` après avoir ajouté les variables

### Erreur : "redirect_uri mismatch"
- Vérifiez que `MICROSOFT_REDIRECT_URI` dans Azure AD correspond exactement à celle dans Convex
- Valeur correcte : `https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback`
- Attention : Pas d'espaces, pas de trailing slash

### Erreur : "No matching routes found" après OAuth
- Vérifiez que `FRONTEND_URL` est bien configuré dans Convex env vars
- Valeur dev : `http://localhost:5173`
- Le backend doit pouvoir rediriger vers votre frontend

### Token expiré immédiatement
- C'est normal si vous testez avec un compte qui a déjà autorisé l'app
- Le token sera automatiquement rafraîchi lors du premier envoi d'email

## 📝 Prochaines étapes

Une fois la connexion OAuth confirmée visuellement, vous pouvez passer à :
- **Phase 3.3** : Génération des relances
- **Phase 3.4** : Système d'approbation
- **Phase 3.5** : Envoi d'emails via Microsoft Graph API

## 📞 Informations utiles

**Deployment Convex :** fabulous-dachshund-120
**Callback URL prod :** https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback
**Callback URL dev :** http://localhost:3000/oauth/microsoft/callback (si configuré)

---

✨ Une fois ce guide complété, vous aurez une connexion OAuth fonctionnelle prête pour l'envoi d'emails !
