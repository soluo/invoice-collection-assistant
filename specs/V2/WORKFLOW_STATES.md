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

**Note** : Le nombre de relances est configurable via `organizations.reminderConfig` (2, 3, 4+).

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

**Table `organizations.reminderConfig`** (array) :

```json
[
  {
    "reminderNumber": 1,
    "delayDays": 7,
    "subject": "Rappel - Facture {numero_facture}",
    "emailTemplate": "Bonjour,\n\n..."
  },
  {
    "reminderNumber": 2,
    "delayDays": 15,
    "subject": "2ème relance ...",
    "emailTemplate": "..."
  },
  {
    "reminderNumber": 3,
    "delayDays": 30,
    "subject": "Dernière relance ...",
    "emailTemplate": "..."
  }
]
```

- **Nombre de relances** : Flexible (2, 3, 4+) selon la taille de l'array
- **Délais** : Configurables indépendamment par relance
- **Templates** : Personnalisables par organisation

**Champ associé** : `manualFollowupDelay` (ex: 45 jours après dernière relance)

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
  lastReminderDate?: string
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
  // ... champs existants ...
  reminderStatus: "reminder_1" | "reminder_2" | "reminder_3" | "reminder_4",
  sendStatus?: "pending" | "sent" | "failed",
  isPaused?: boolean // ✅ V2 Phase 2.8
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

**Dernière mise à jour** : 2025-11-07
