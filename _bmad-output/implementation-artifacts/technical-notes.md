# Technical Notes

Notes techniques découvertes pendant l'implémentation.

---

## OAuth Microsoft - Configuration Multi-Tenant

**Date:** 2025-01-12
**Contexte:** Erreur AADSTS50020 lors de la connexion d'un client externe

### Problème

Les utilisateurs d'autres tenants Azure AD ne pouvaient pas connecter leur compte Outlook :
```
AADSTS50020: User account 'xxx@domain.fr' from identity provider does not exist in tenant 'Soluo'
```

### Solution

**1. Variable d'environnement Convex :**
```bash
MICROSOFT_TENANT_ID=organizations
```

> ⚠️ Ne PAS utiliser un tenant ID spécifique (ex: `b3a3a3a1-...`) sinon seuls les utilisateurs de ce tenant pourront se connecter.

**2. Configuration Azure Portal :**
- App registrations → Relance Factures → Authentication
- "Types de comptes pris en charge" → **"Comptes dans un annuaire d'organisation (tout locataire Microsoft Entra ID – Multilocataire)"**

### Valeurs possibles pour MICROSOFT_TENANT_ID

| Valeur | Accepte |
|--------|---------|
| `common` | Tous les comptes Azure AD + comptes personnels Microsoft |
| `organizations` | Tous les comptes Azure AD professionnels (recommandé pour B2B) |
| `{tenant-id}` | Uniquement le tenant spécifique |

### Fichiers concernés

- `convex/oauth.ts:22` - Construction de l'URL d'autorisation
- `convex/router.ts:48` - Échange du code contre les tokens
- `OAUTH_SETUP.md` - Documentation utilisateur

---
