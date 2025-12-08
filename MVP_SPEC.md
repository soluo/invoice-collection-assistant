# MVP Specification - Gestion de Relances de Factures
**Deadline: Demain 10h | Focus: Features critiques uniquement**

---

## 📊 État des lieux : Ce qui FONCTIONNE déjà ✅

- **Upload & AI extraction** : Factures PDF → extraction automatique via Claude
- **Liste des factures en retard** : Dashboard avec filtres par statut
- **Templates de relance** : Configuration des emails dans les settings
- **Génération automatique** : Cron quotidien (4h) qui crée les relances
- **Envoi d'emails** : Microsoft Graph API fonctionnel
- **Permissions** : Techniciens voient leurs factures, admins voient tout

---

## 🎯 Features MVP à implémenter (5 critiques)

### 1️⃣ PREVIEW EMAIL AVANT ENVOI
**Impact:** Critique - évite les erreurs d'envoi
**Temps estimé:** 3h
**Où:** `/src/pages/Reminders.tsx` + nouvelle modal

**Actions:**
- Créer composant `EmailPreviewModal.tsx`
  - Afficher sujet + corps avec variables remplacées
  - Boutons : "Modifier" | "Envoyer" | "Annuler"
- Ajouter bouton "Prévisualiser" dans la liste des relances
- Query backend : `reminders.getPreview(reminderId)` retourne email formaté

**Fichiers à modifier:**
- `src/components/EmailPreviewModal.tsx` (nouveau)
- `src/pages/Reminders.tsx` (ajouter bouton preview)
- `convex/reminders.ts` (ajouter query `getPreview`)

---

### 2️⃣ GESTION DES ERREURS D'ENVOI VISIBLES
**Impact:** Critique - l'utilisateur doit savoir si ça a échoué
**Temps estimé:** 2h
**Où:** `/src/pages/Reminders.tsx` + toasts

**Actions:**
- Afficher badge rouge "Échec" si `completionStatus === "failed"`
- Ajouter colonne "Erreur" avec le message d'échec
- Toast d'erreur avec le détail technique quand envoi échoue
- Bouton "Réessayer" pour relances échouées

**Fichiers à modifier:**
- `src/pages/Reminders.tsx` (affichage erreurs + retry)
- Utiliser `reminder.failureReason` (déjà dans le schéma)

---

### 3️⃣ NOTES SUR LES FACTURES
**Impact:** Très important - feature demandée par le prospect
**Temps estimé:** 4h
**Où:** Page détail facture + nouveau champ schema

**Actions:**
- **OPTION 1 (Recommandée)** : Créer table séparée `invoiceNotes`
  ```ts
  // convex/schema.ts
  invoiceNotes: defineTable({
    invoiceId: v.id("invoices"),
    content: v.string(),
    createdBy: v.id("users"),
    createdByName: v.string(),
    // _creationTime est automatique (pas besoin de createdAt!)
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_creation_time") // Index automatique, pas besoin de le définir
  ```
  - **Avantage** : Scalabilité, requêtes optimisées, historique illimité
  - Mutation `invoiceNotes.create({ invoiceId, content })`
  - Query `invoiceNotes.listForInvoice({ invoiceId })` → tri par `_creationTime`

- **OPTION 2** : Array dans `invoices` (acceptable pour MVP)
  ```ts
  notes: v.optional(v.array(v.object({
    id: v.string(), // UUID généré côté client
    content: v.string(),
    timestamp: v.number(), // Date.now() car pas de _creationTime dans arrays
    createdBy: v.id("users"),
    createdByName: v.string(),
  })))
  ```
  - **Inconvénient** : Limite de taille document (1 MB), pas de requêtes optimisées
  - Mutation `invoices.addNote({ invoiceId, content })` → push dans array

- UI : Section "Notes & Historique" dans `/src/pages/InvoiceDetail.tsx`
  - Textarea pour ajouter une note
  - Liste chronologique des notes avec auteur + date formatée
  - Exemple : "On s'est mis d'accord pour un règlement dans 2 mois"
  - Afficher `_creationTime` formaté si table séparée, sinon `timestamp`

**Fichiers à modifier:**
- `convex/schema.ts` (nouvelle table `invoiceNotes` OU champ array `notes`)
- `convex/invoiceNotes.ts` (nouveau si Option 1) OU `convex/invoices.ts` (si Option 2)
- `src/pages/InvoiceDetail.tsx` (UI notes)

---

### 4️⃣ SNOOZE D'UNE FACTURE (Modifier l'échéance)
**Impact:** Important - évite les relances inutiles
**Temps estimé:** 3h
**Où:** Page détail facture + modal

**Actions:**
- Mutation `invoices.snooze({ invoiceId, newDueDate, reason })`
  - Change `dueDate`
  - **Ajoute note automatique** via le système de notes (feature 3️⃣) :
    - Si table séparée : appelle `ctx.runMutation(internal.invoiceNotes.create, { ... })`
    - Si array : push dans `notes[]`
    - Contenu : "📅 Échéance reportée au {date}. Raison : {reason}"
  - Recalcule automatiquement `isOverdue` et `reminderStatus`
  - **IMPORTANT** : Utiliser `internal` pour appeler les helpers, pas `api`
- UI : Bouton "Reporter l'échéance" → modal avec :
  - Date picker pour nouvelle échéance
  - Textarea pour raison (optionnel)
  - Bouton "Confirmer"
  - Toast de succès avec nouvelle date

**Fichiers à modifier:**
- `convex/invoices.ts` (mutation `snooze`)
- `src/pages/InvoiceDetail.tsx` (bouton + modal snooze)
- `src/components/SnoozeInvoiceModal.tsx` (nouveau)

---

### 5️⃣ FILTRE PAR TECHNICIEN (UI Admin)
**Impact:** Moyen - améliore la navigation
**Temps estimé:** 2h
**Où:** Dashboard + liste factures

**Actions:**
- Dropdown "Filtrer par technicien" visible uniquement pour admins
- Query `users.listTechnicians()` pour avoir la liste
- Passer `creatorId` au query `invoices.listWithFilter`
- Afficher nom du technicien dans la liste des factures

**Fichiers à modifier:**
- `src/components/Dashboard.tsx` (ajouter dropdown filtre)
- `src/pages/InvoiceList.tsx` (passer paramètre creatorId)
- `convex/users.ts` (ajouter query `listTechnicians`)

---

## ⭐ BONUS si temps restant

### 6️⃣ TRACKING DES APPELS TÉLÉPHONIQUES
**Impact:** Utile - compléter les relances email
**Temps estimé:** 3h
**Où:** Page détail facture

**Actions:**
- Bouton "Enregistrer un appel" dans InvoiceDetail
- Modal avec :
  - Dropdown résultat : "Pas de réponse" | "Message laissé" | "Accord obtenu" | "Litige"
  - Textarea notes d'appel
  - Checkbox "Marquer la relance comme complétée"
- Mutation `reminders.recordPhoneCall({ reminderId, outcome, notes })`
  - Update reminder : `phoneCallOutcome`, `phoneCallNotes` (champs existants dans schema)
  - **Ajoute note automatique** sur la facture via système de notes (feature 3️⃣)
  - Contenu : "📞 Appel téléphonique - Résultat : {outcome}. Notes : {notes}"
  - Mark `completionStatus = "completed"` si checkbox cochée
  - **IMPORTANT** : Utiliser `internal` pour appeler les helpers
- Afficher historique des appels dans timeline de la facture

**Fichiers à modifier:**
- `src/pages/InvoiceDetail.tsx` (bouton + modal)
- `src/components/RecordPhoneCallModal.tsx` (nouveau)
- `convex/reminders.ts` (mutation `recordPhoneCall`)
- Utiliser champs `phoneCallOutcome` et `phoneCallNotes` déjà dans le schéma

---

## 🎨 AJUSTEMENTS UI (Post-implémentation)

### 📌 InvoiceDetail : Refonte Layout Notes + Historique
**Problème :** Layout 3 colonnes trop serré (Détails | Historique | Notes)
**Solution :** Layout 2 colonnes avec onglets

**Structure finale :**
```
┌─────────────────────────────────────────────────────┐
│ Détails (35%)  │  Historique & Notes (65%)          │
│                │  ┌──────────────────────────────┐  │
│ - Montant      │  │ [Historique] [Notes]        │  │
│ - Échéance     │  └──────────────────────────────┘  │
│ - Émission     │                                    │
│ - Contact      │  [Contenu de l'onglet actif]      │
└─────────────────────────────────────────────────────┘
```

**Implémentation :**
- Tab "Historique" : Événements système (import, envoi, relances, paiements)
- Tab "Notes" : Formulaire d'ajout + liste des notes utilisateur
- Utiliser `<Tabs>` de shadcn/ui (déjà utilisé dans FollowUp.tsx)

**Fichiers à modifier :**
- `src/pages/InvoiceDetail.tsx` : Refonte du layout avec onglets

---

### 📌 FollowUp : Preview + Envoi en masse
**Problème :** Preview dans /reminders au lieu de /follow-up
**Solution :** Déplacer preview dans /follow-up avec envoi multiple

**Changements à implémenter :**

**1. Remplacer bouton "Modifier" par "Prévisualiser"**
- Pour relances de type "email" uniquement
- Ouvre modal de prévisualisation

**2. Supprimer bouton "Pause"**
- Retirer complètement (ligne 245-248 de FollowUp.tsx)
- Feature à implémenter plus tard

**3. Ajouter cases à cocher pour sélection multiple**
```tsx
// Structure de chaque ReminderCard
<div className="flex items-center gap-4">
  <input type="checkbox" />  {/* Nouveau */}
  <div className="icon">...</div>
  <div className="content">...</div>
</div>

// Bouton flottant si sélection
{selectedReminders.length > 0 && (
  <FloatingButton>
    Envoyer {selectedReminders.length} relance(s)
  </FloatingButton>
)}
```

**4. Modal de prévisualisation avec permissions**
```tsx
<EmailPreviewModal>
  - Afficher : De, À, Objet, Corps
  - Boutons :
    * "Fermer" (toujours)
    * "Modifier" (SI : admin OU createdBy de facture)
    * "Envoyer" (si email valide)
</EmailPreviewModal>
```

**5. Modal d'édition (si "Modifier" cliqué)**
```tsx
<EmailEditModal>
  - Champ "Objet" éditable
  - Textarea "Corps" éditable
  - Boutons : "Annuler" | "Enregistrer"
  - Uniquement AVANT premier envoi (completionStatus !== "completed")
</EmailEditModal>
```

**6. Confirmation avant envoi en masse**
```tsx
<BulkSendConfirmModal>
  - Liste des {n} relances sélectionnées
  - Récapitulatif : Clients, montants
  - Boutons : "Annuler" | "Confirmer l'envoi"
</BulkSendConfirmModal>
```

**Fichiers à créer :**
- `src/components/EmailPreviewModal.tsx` (nouveau modal pour /follow-up)
- `src/components/EmailEditModal.tsx` (édition sujet/corps)
- `src/components/BulkSendConfirmModal.tsx` (confirmation envoi multiple)

**Fichiers à modifier :**
- `src/pages/FollowUp.tsx` :
  - Ajouter état `selectedReminders`
  - Remplacer bouton "Modifier" par "Prévisualiser"
  - Supprimer bouton "Pause"
  - Ajouter checkboxes + bouton flottant
- `convex/reminders.ts` :
  - Ajouter mutation `updateEmailContent({ reminderId, subject, content })`
  - Ajouter action `sendMultipleReminders({ reminderIds[] })`

**Règles métier :**
- Édition uniquement si `completionStatus === "pending"` (pas pour retry)
- Permissions édition : admin OU createdBy de la facture associée
- Envoi en masse : confirmation obligatoire avant envoi

---

## 📋 Ordre d'implémentation recommandé

1. **Notes sur factures** (3️⃣) - Feature la plus demandée
2. **Snooze facture** (4️⃣) - Dépend des notes
3. **Preview email** (1️⃣) - Critique avant envoi
4. **Gestion erreurs** (2️⃣) - Rapide et critique
5. **Filtre technicien** (5️⃣) - Quick win
6. *[BONUS]* **Tracking appels** (6️⃣) - Si temps restant

---

## ✅ Checklist finale avant démo 10h

- [ ] Toutes les features critiques (1-5) implémentées
- [ ] Tests manuels : Upload → Relance → Preview → Envoi
- [ ] Tests manuels : Ajout de notes + snooze facture
- [ ] Vérifier que les emails s'envoient vraiment (compte Microsoft connecté)
- [ ] UI responsive sur mobile (navigation sidebar)
- [ ] Gestion des erreurs visible partout
- [ ] `pnpm lint` passe sans erreur
- [ ] `pnpm build` passe sans erreur
- [ ] Déploiement Convex + frontend

---

## 📁 Fichiers critiques à connaître

**Backend (Convex):**
- `convex/schema.ts` - Schémas DB (ajouter `notes` ici)
- `convex/invoices.ts` - CRUD factures (ajouter `addNote`, `snooze`)
- `convex/reminders.ts` - Envoi emails + génération (ajouter `getPreview`, `recordPhoneCall`)

**Frontend (React):**
- `src/pages/InvoiceDetail.tsx` - Page détail facture (notes, snooze, appels)
- `src/pages/Reminders.tsx` - Liste relances (preview, erreurs, retry)
- `src/components/Dashboard.tsx` - Dashboard (filtre technicien)

**Styling:**
- `src/index.css` - Tailwind v4 avec @theme (pas de config file!)

---

## ⚠️ Notes importantes

### Convex Best Practices (CRITIQUE!)
- **`_creationTime` automatique** : JAMAIS ajouter de champ `createdAt` custom, utiliser `_creationTime`
- **Index `by_creation_time`** : Existe automatiquement sur toutes les tables, pas besoin de le définir
- **Validators obligatoires** : Toutes les fonctions Convex doivent avoir `args`, `returns`, `handler`
- **Internal vs Public** : Utiliser `internalQuery/internalMutation` pour les helpers, pas les exposer aux clients
- **Index DB** : Utiliser `.withIndex()` au lieu de `.filter()` pour les performances
- **Await promises** : TOUJOURS attendre `ctx.db.patch()`, `ctx.runMutation()`, etc.
- **Dev backend** : TOUJOURS lancer `pnpm dev:backend` après modif schema/fonctions

### Frontend
- **Tailwind v4** : Toute config CSS va dans `src/index.css` avec `@theme {}`
- **Imports** : Toujours utiliser les alias `@/` au lieu de chemins relatifs
- **Convex React hooks** : `useQuery`, `useMutation` sont déjà configurés

---

## 🚀 Workflow de développement

1. Implémenter une feature
2. Tester manuellement
3. **COMMIT** (voir CLAUDE.md pour les règles de commit)
4. Passer à la feature suivante
