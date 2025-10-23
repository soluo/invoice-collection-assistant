# Convex - Procédure de Validation (Spécifique au Projet)

> **Note :** Pour les règles générales Convex (syntaxe, schémas, validateurs, etc.), consultez `convex_rules.txt`

## ⚠️ Procédure OBLIGATOIRE

**TOUJOURS valider après modification des fichiers Convex :**

```bash
pnpm dev:backend
```

Attendre le message : `✔ Convex functions ready!`

## 🐛 Erreurs Spécifiques à ce Projet

### 1. Nouveaux champs obligatoires dans le schéma
**Symptôme :** Documents existants ne matchent plus le schéma

```
✖ Schema validation failed.
Object is missing the required field `autoSendReminders`
```

**Solution :** Rendre le nouveau champ optionnel
```typescript
autoSendReminders: v.optional(v.boolean()), // Au lieu de v.boolean()
```

### 2. Mutations/Queries internes non trouvées
**Symptôme :** `Property 'xxx' does not exist on type '{ ... }'`

**Solution :** Utiliser `internalQuery`/`internalMutation` pour les fonctions internes
```typescript
export const getOrganization = internalQuery({ ... }); // Accessible via internal.xxx
```

## 📋 Checklist

- [ ] Lancer `pnpm dev:backend`
- [ ] Vérifier `✔ Convex functions ready!`
- [ ] Pas d'erreurs TypeScript
- [ ] Pas d'erreurs de schéma

---

**Voir aussi :** `convex_rules.txt` pour les règles officielles Convex
