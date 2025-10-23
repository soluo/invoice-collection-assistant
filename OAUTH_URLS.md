# 📍 URLs OAuth - Guide de Configuration

## Résumé Visuel

```
┌─────────────────────────────────────────────────────────────────┐
│                     FLOW OAUTH COMPLET                          │
└─────────────────────────────────────────────────────────────────┘

1. 🖱️  Utilisateur clique "Connecter Outlook"
   └─> window.location.href = getOAuthUrl

2. 🔐 Redirection vers Microsoft OAuth
   └─> Utilisateur autorise l'application

3. 📡 Microsoft redirige vers BACKEND CONVEX
   └─> URL: https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback
       ├─> Cette URL DOIT être dans Azure AD "Redirect URIs" ✅
       └─> Cette URL DOIT être dans MICROSOFT_REDIRECT_URI (Convex) ✅

4. ⚙️  Backend Convex traite le callback
   ├─> Échange le code contre des tokens
   ├─> Sauvegarde dans la base de données
   └─> Redirige vers FRONTEND

5. 🏠 Redirection vers FRONTEND REACT
   └─> URL: http://localhost:5173/settings?tab=organization&oauth=success
       ├─> Cette URL DOIT être dans FRONTEND_URL (Convex) ✅
       └─> Cette URL NE DOIT PAS être dans Azure AD ❌
```

---

## 📋 Variables d'Environnement Convex

### MICROSOFT_REDIRECT_URI
```
https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback
```
- **Rôle :** URL du backend Convex où Microsoft redirige après autorisation
- **Où la mettre :**
  - ✅ Convex env vars (Dashboard ou CLI)
  - ✅ Azure AD "Redirect URIs"

### FRONTEND_URL
```
http://localhost:5173
```
- **Rôle :** URL du frontend React où le backend redirige après traitement
- **Où la mettre :**
  - ✅ Convex env vars (Dashboard ou CLI)
  - ❌ PAS dans Azure AD

### Commandes pour configurer via CLI
```bash
npx convex env set MICROSOFT_CLIENT_ID "votre-client-id"
npx convex env set MICROSOFT_CLIENT_SECRET "votre-client-secret"
npx convex env set MICROSOFT_TENANT_ID "votre-tenant-id"
npx convex env set MICROSOFT_REDIRECT_URI "https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback"
npx convex env set FRONTEND_URL "http://localhost:5173"
```

---

## ✅ Checklist de Configuration

**Azure AD :**
- [ ] Application créée
- [ ] Scopes configurés : Mail.Send, User.Read, offline_access
- [ ] Client Secret généré et copié
- [ ] Redirect URI ajouté : `https://fabulous-dachshund-120.convex.site/oauth/microsoft/callback`

**Convex Dashboard (ou CLI) :**
- [ ] MICROSOFT_CLIENT_ID
- [ ] MICROSOFT_CLIENT_SECRET
- [ ] MICROSOFT_TENANT_ID
- [ ] MICROSOFT_REDIRECT_URI
- [ ] FRONTEND_URL ← **Nouvelle variable importante !**

**Code :**
- [x] Backend redirige vers ${FRONTEND_URL}/settings
- [x] Frontend utilise window.location.href (pas de popup)

---

## 🎯 Flow Simplifié

```
Frontend → Microsoft → Backend Convex → Frontend
(React)    (OAuth)     (Process)         (React)
```

**Pas de popup !** C'est une redirection complète de page.

---

## 🚀 Test Rapide

1. Ajoutez `FRONTEND_URL` dans Convex :
   ```bash
   npx convex env set FRONTEND_URL "http://localhost:5173"
   ```

2. Allez sur `/settings` → Organisation

3. Cliquez "Connecter Outlook"

4. Autorisez sur Microsoft

5. Vous revenez sur `/settings` avec le message "Compte Outlook connecté avec succès !"

---

**Dernière mise à jour :** 2025-10-23
