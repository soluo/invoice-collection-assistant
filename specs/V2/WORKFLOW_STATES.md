# Workflow États & Événements - ZenRelance V2

**Date** : 2025-11-07
**Version** : 2.0.0

---

## 📊 Vue d'ensemble

Le système de gestion des factures utilise **3 dimensions d'états indépendantes** + **états calculés** + **événements** pour un tracking complet.

### Principes clés

1. **États stockés** → Photo actuelle de la facture (dans `invoices` table)
2. **États calculés** → Logique temps réel basée sur les 3 dimensions + date
3. **Événements** → Historique des transitions (dans `events` table)

---

## 🔄 Les 3 Dimensions d'États

### 1. **État d'envoi** (`sendStatus`)

| Valeur | Description |
|--------|-------------|
| `pending` | Facture importée mais pas encore envoyée au client |
| `sent` | Facture envoyée au client |

**Champs associés** : `sentDate` (date d'envoi)

---

###  2. **État de paiement** (`paymentStatus`)

| Valeur | Description |
|--------|-------------|
| `unpaid` | Aucun paiement reçu |
| `partial` | Paiement partiel (acompte) |
| `paid` | Entièrement payée (statut final) |

**Champs associés** : `paidAmount`, `paidDate`

---

### 3. **État de relance** (`reminderStatus`)

| Valeur | Description |
|--------|-------------|
| `none` | Aucune relance envoyée |
| `reminder_1` | 1ère relance envoyée |
| `reminder_2` | 2ème relance envoyée |
| `reminder_3` | 3ème relance envoyée |
| `reminder_4` | 4ème relance (optionnelle, selon config) |
| `manual_followup` | Fin des relances auto → contentieux/suivi manuel |

**Champs associés** : `lastReminderDate`

---

## 🧮 États Calculés (Temps Réel)

### `isOverdue` (booléen)
```typescript
dueDate < now && paymentStatus !== "paid"
```

### `daysPastDue` (nombre)
```typescript
Math.max(0, daysSince(dueDate))
```

### `outstandingBalance` (nombre)
```typescript
amountTTC - (paidAmount || 0)
```

### `mainStatus` (statut principal pour l'UI)

**Logique de priorité** :
1. Si `paymentStatus === "paid"` → **"paid"**
2. Sinon si `reminderStatus === "manual_followup"` → **"manual_followup"**
3. Sinon si `reminderStatus !== "none"` → **reminderStatus** (reminder_1, reminder_2, etc.)
4. Sinon si `isOverdue` → **"overdue"**
5. Sinon si `sendStatus === "sent"` → **"sent"**
6. Sinon → **"pending"**

---

## 🎬 Événements (Transitions)

Chaque action utilisateur crée un événement dans la table `events` :

| Type d'événement | Déclenché quand | Métadonnées |
|------------------|----------------|-------------|
| `invoice_imported` | Facture créée (upload PDF ou manuelle) | - |
| `invoice_marked_sent` | sendStatus passe à "sent" (action manuelle) | `previousSendStatus` |
| `invoice_sent` | Email d'envoi de facture (Phase 3) | - |
| `payment_registered` | Paiement partiel enregistré | `amount`, `previousPaymentStatus` |
| `invoice_marked_paid` | paymentStatus passe à "paid" | `previousPaymentStatus` |
| `reminder_sent` | Relance envoyée (auto ou manuelle) | `reminderNumber` (1,2,3,4), `isAutomatic` |

**Structure d'un événement** :
```typescript
{
  _id: Id<"events">,
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  invoiceId?: Id<"invoices">,
  reminderId?: Id<"reminders">,
  eventType: "invoice_imported" | ...,
  eventDate: number, // timestamp
  metadata?: { ... },
  description?: string // Description lisible auto-générée
}
```

---

## 📝 Flows Typiques

### Flow 1 : Paiement rapide
```
1. Import facture       → sendStatus: pending, paymentStatus: unpaid, reminderStatus: none
2. Marquer envoyée      → sendStatus: sent
                          EVENT: invoice_marked_sent
3. Paiement reçu        → paymentStatus: paid
                          EVENT: invoice_marked_paid
```

**mainStatus** : pending → sent → paid

---

### Flow 2 : Relances puis paiement
```
1. Import facture       → pending/unpaid/none
2. Marquer envoyée      → sent/unpaid/none
                          EVENT: invoice_marked_sent
3. Échéance passée      → sent/unpaid/none (isOverdue=true)
                          mainStatus: overdue
4. Relance 1 envoyée    → sent/unpaid/reminder_1
                          EVENT: reminder_sent (reminderNumber:1)
5. Relance 2 envoyée    → sent/unpaid/reminder_2
                          EVENT: reminder_sent (reminderNumber:2)
6. Paiement reçu        → sent/paid/reminder_2
                          EVENT: invoice_marked_paid
```

**mainStatus** : pending → sent → overdue → reminder_1 → reminder_2 → paid

---

### Flow 3 : Paiement partiel + relances
```
1. Import + envoi       → sent/unpaid/none
2. Acompte 500€         → sent/partial/none
                          EVENT: payment_registered (amount:500)
3. Échéance passée      → sent/partial/none (isOverdue=true)
4. Relance 1            → sent/partial/reminder_1
                          EVENT: reminder_sent
5. Relance 2            → sent/partial/reminder_2
6. Paiement solde       → sent/paid/reminder_2
                          EVENT: invoice_marked_paid
```

**mainStatus** : sent → overdue → reminder_1 → reminder_2 → paid
**Badges UI** : "Paiement partiel 500€", "En retard de X jours"

---

### Flow 4 : Contentieux
```
1-5. [Comme Flow 2]
6. Relance 3 envoyée    → sent/unpaid/reminder_3
                          EVENT: reminder_sent (reminderNumber:3)
7. Pas de paiement      → sent/unpaid/manual_followup (après délai config)
                          Passage automatique ou manuel
```

**mainStatus** : ... → reminder_3 → manual_followup

---

## ⚙️ Configuration Flexible des Relances

**Table `organizations.reminderSteps`** (array) :

```json
[
  {
    "id": "uuid-1",
    "delay": 7,
    "type": "email",
    "name": "Relance amicale",
    "emailSubject": "Rappel - Facture {numero_facture}",
    "emailTemplate": "Bonjour,\n\n..."
  },
  {
    "id": "uuid-2",
    "delay": 14,
    "type": "email",
    "name": "Relance ferme",
    "emailSubject": "2ème relance - Facture {numero_facture}",
    "emailTemplate": "..."
  },
  {
    "id": "uuid-3",
    "delay": 21,
    "type": "phone",
    "name": "Appel téléphonique"
  },
  {
    "id": "uuid-4",
    "delay": 30,
    "type": "email",
    "name": "Mise en demeure",
    "emailSubject": "Dernière relance - Facture {numero_facture}",
    "emailTemplate": "..."
  }
]
```

**Structure d'une étape** :
- `id` (string) : UUID unique pour chaque étape
- `delay` (number) : Jours après l'échéance (7, 14, 21, 30...)
- `type` (union) : `"email"` ou `"phone"`
- `name` (string) : Nom descriptif de l'étape (ex: "Relance amicale")
- `emailSubject` (optional string) : Objet de l'email (si type = email)
- `emailTemplate` (optional string) : Contenu de l'email (si type = email)

**Caractéristiques** :
- **Nombre de relances** : Flexible (2, 3, 4+) selon la taille de l'array
- **Délais** : Configurables indépendamment par étape
- **Types mixtes** : Support des relances email ET téléphone
- **Templates** : Personnalisables par organisation
- **Signature commune** : Champ `organizations.signature` ajouté automatiquement aux emails

---

## 🎨 Affichage UI : Statut Principal + Badges

### Statut principal (`mainStatus`)

| mainStatus | Label UI | Couleur |
|------------|----------|---------|
| `pending` | En attente | Gris |
| `sent` | Envoyée | Bleu |
| `overdue` | En retard | Orange |
| `reminder_1` | Relance 1 | Jaune |
| `reminder_2` | Relance 2 | Orange |
| `reminder_3` | Relance 3 | Rouge |
| `reminder_4` | Relance 4 | Rouge |
| `manual_followup` | Suivi manuel | Violet |
| `paid` | Payée | Vert |

### Badges complémentaires

- **Paiement partiel** : si `paymentStatus === "partial"` → Badge "Paiement partiel 500€"
- **Retard** : si `isOverdue` → Badge "En retard de 15 jours"

---

## 🔧 Helpers de Statut

**Fichier** : `convex/lib/invoiceStatus.ts`

### `getInvoiceDisplayInfo(invoice, now)`

Retourne :
```typescript
{
  mainStatus: MainStatus,
  isOverdue: boolean,
  daysPastDue: number,
  hasPartialPayment: boolean,
  partialAmount?: number,
  outstandingBalance: number
}
```

### `getReminderNumber(reminderStatus)`

Extrait le numéro depuis `"reminder_X"` → `X`

### `getReminderStatusFromNumber(number)`

Construit `"reminder_X"` depuis `number`

---

## 📦 Tables Convex

### `invoices`
```typescript
{
  // ... champs existants ...
  sendStatus: "pending" | "sent",
  sentDate?: string,
  paymentStatus: "unpaid" | "partial" | "paid",
  paidAmount?: number,
  paidDate?: string,
  reminderStatus: "none" | "reminder_1" | ... | "manual_followup",
  lastReminderDate?: string,
  overdueDetectedDate?: string // YYYY-MM-DD - Date de première détection en retard par le cron
}
```

### `events`
```typescript
{
  organizationId: Id<"organizations">,
  userId: Id<"users">,
  invoiceId?: Id<"invoices">,
  reminderId?: Id<"reminders">,
  eventType: "invoice_imported" | ...,
  eventDate: number,
  metadata?: {...},
  description?: string
}
```

### `reminders`
```typescript
{
  userId: Id<"users">,
  organizationId: Id<"organizations">,
  invoiceId: Id<"invoices">,
  reminderDate: string, // "YYYY-MM-DD HH:mm:ss"
  reminderStatus: "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4",
  reminderType: "email" | "phone",

  // Statut de complétion générique (email ET téléphone)
  completionStatus?: "pending" | "completed" | "failed",
  completedAt?: number,

  // Métadonnées
  generatedByCron?: boolean,
  isPaused?: boolean, // ✅ V2 Phase 2.8

  // Données spécifiques par type
  data?: {
    // Email
    emailSubject?: string,
    emailContent?: string,
    sendError?: string,
    lastSendAttempt?: number,

    // Téléphone
    phoneCallNotes?: string,
    phoneCallOutcome?: "completed" | "no_answer" | "voicemail" | "will_pay" | "dispute"
  }
}
```

---

## 🚀 Mutations Principales

| Mutation | Met à jour | Crée événement |
|----------|------------|----------------|
| `invoices.create` | sendStatus="pending" | `invoice_imported` |
| `invoices.markAsSent` | sendStatus="sent" | `invoice_marked_sent` |
| `invoices.registerPayment` | paidAmount, paymentStatus | `payment_registered` |
| `invoices.markAsPaid` | paymentStatus="paid" | `invoice_marked_paid` |
| `invoices.sendReminder` | reminderStatus="reminder_X" | (via reminders table) |
| `reminders.markReminderSent` | reminder.sendStatus="sent" | `reminder_sent` |

---

## 📅 Écran Agenda (Phase 2.8)

### Onglet "À Venir"
- Source : table `reminders` avec `sendStatus="pending"` et `isPaused=false`
- Affiche : relances planifiées mais pas encore envoyées
- Action : Mettre en pause (`agenda.pauseReminder`)

### Onglet "Historique"
- Source : table `events` (ordre chronologique inversé)
- Affiche : tous les événements passés (import, envoi, paiements, relances)
- Timeline visuelle avec icônes par type d'événement

---

## 🧹 Nettoyage Base de Données

**Fonction** : `dev.clearAllTables()`

- Supprime toutes les données (invoices, reminders, events, organizations, users, auth*)
- **Protection** : Uniquement en environnement de développement
- Utilisation : Dashboard Convex ou appel frontend

---

## 🤖 Génération Automatique des Relances

### Principe de fonctionnement

Un **cron quotidien à 4h du matin** analyse toutes les factures impayées/partielles dont l'échéance est dépassée.

### Gestion des factures anciennes (import legacy)

**Problème** : Une entreprise peut importer des factures déjà en retard de 45+ jours. Il ne faut PAS générer les 3 relances d'un coup.

**Solution adoptée** : **Délais depuis détection** + **Jours de retard depuis échéance réelle**

#### Champ clé : `overdueDetectedDate`

Ce champ enregistre la **date de première détection** du retard par le cron (format YYYY-MM-DD).

#### Logique de génération

**1. Première détection (overdueDetectedDate absent)** :
- Le cron marque `overdueDetectedDate = aujourd'hui`
- Génère immédiatement la **1ère relance** (reminder_1)
- Planifie les suivantes selon les délais configurés **depuis la date de détection**

**2. Relances suivantes** :
- Calcul des jours depuis `overdueDetectedDate`
- Génère la relance N quand `jours_depuis_détection >= delay_de_l'étape_N`
- Respect des intervalles configurés dans `reminderSteps`

**Exemple concret** : Facture échue depuis 45 jours, config J+7, J+14, J+30

```
Jour 1 (cron détecte la facture) :
- overdueDetectedDate = 2025-11-12
- Génère reminder_1 immédiatement
- Affichage client : "En retard de 45 jours" (calculé depuis dueDate)

Jour 8 (7 jours après détection) :
- 7 jours >= 7 (delay de l'étape 2)
- Génère reminder_2
- Affichage : "En retard de 52 jours"

Jour 15 (14 jours après détection) :
- 14 jours >= 14 (delay de l'étape 3)
- Génère reminder_3
- Affichage : "En retard de 59 jours"

Jour 31 (30 jours après détection) :
- Plus d'étapes email → passage en manual_followup
```

### Gestion des relances téléphoniques

Les étapes de type `phone` dans `reminderSteps` sont **générées automatiquement** par le cron mais **complétées manuellement** :

1. Le cron crée un enregistrement `reminder` avec :
   - `reminderType: "phone"`
   - `completionStatus: "pending"`
   - `generatedByCron: true`

2. L'utilisateur voit la tâche dans l'agenda "À Venir"

3. L'utilisateur peut :
   - Modifier la date du rappel si nécessaire
   - Marquer comme effectué après l'appel
   - Ajouter des notes dans `data.phoneCallNotes`
   - Renseigner le résultat dans `data.phoneCallOutcome`

**Avantage** : Utilise le même système que les emails, tout en respectant la nature manuelle des appels.

### Affichage des jours de retard

**Référence** : `dueDate` (date d'échéance réelle)

```typescript
const dueDate = new Date(invoice.dueDate);
const now = new Date();
const daysPastDue = Math.max(0, Math.floor((now - dueDate) / (1000 * 60 * 60 * 24)));
```

**Pourquoi ?** Fidélité à la réalité pour le client. Une facture échue depuis 45 jours affiche "45 jours de retard", même si détectée récemment.

### Fonction de génération

**Fichier** : `convex/cron.ts`

```typescript
export const dailyReminderGeneration = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Parcourt toutes les organisations
    // Pour chaque facture impayée/partielle échue :
    //   - Appelle generateInvoiceReminder(invoiceId, orgId, currentDate)
  }
});
```

**Fichier** : `convex/reminders.ts`

```typescript
export const generateInvoiceReminder = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    organizationId: v.id("organizations"),
    currentDate: v.optional(v.string()), // Pour tests (YYYY-MM-DD)
  },
  returns: v.union(...),
  handler: async (ctx, args) => {
    // 1. Vérifier si overdueDetectedDate existe
    // 2. Si absent → marquer + générer reminder_1
    // 3. Si présent → calculer jours depuis détection + générer reminder_N si délai atteint
    // 4. Support email ET téléphone
  }
});
```

### Tests en développement

Le paramètre `currentDate` permet de simuler une exécution à une date précise :

```typescript
// Test manuel depuis le dashboard Convex
await ctx.runMutation(internal.reminders.generateInvoiceReminder, {
  invoiceId: "jx7abc123...",
  organizationId: "jx7def456...",
  currentDate: "2025-12-25", // Simule l'exécution le 25 décembre
});
```

### Idempotence

La fonction peut être exécutée plusieurs fois par jour sans dupliquer les relances :
- Vérification de `lastReminderDate` (au moins 1 jour d'écart)
- Vérification de `reminderStatus` actuel
- Calcul précis des délais depuis `overdueDetectedDate`

---

**Dernière mise à jour** : 2025-11-12
