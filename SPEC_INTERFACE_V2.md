# Spécification Interface V2 - Simplifiée et Sobre

**Version:** 2.0
**Date:** 2025-12-09
**Statut:** Approuvé pour implémentation

## 📋 Vue d'ensemble

Interface simplifiée et sobre pour artisans du bâtiment, basée sur les retours du prospect suite à la démo initiale. Cette V2 combine :
- UX ultra-simple (3 onglets principaux + 1 onglet système)
- Toutes les fonctionnalités essentielles demandées
- Design sobre et professionnel
- Actions claires et contextuelles

---

## 🎨 Principes de Design

### Palette de Couleurs Sobre
- **Rouge** (urgent) : `bg-red-50 text-red-700 border-red-200`
- **Orange** (attention) : `bg-orange-50 text-orange-700 border-orange-200`
- **Bleu** (info/attente) : `bg-blue-50 text-blue-700 border-blue-200`
- **Vert** (payé/succès) : `bg-green-50 text-green-700 border-green-200`
- **Violet** (système) : `bg-purple-50 text-purple-700 border-purple-200`
- **Gris** (neutre) : `bg-gray-50/100 text-gray-700 border-gray-200/300`

### Tailles de Composants
- **Boutons principaux** : `size="sm"` (cohérent partout)
- **Stats cards** : hauteur ~100px, padding `p-4`
- **Ligne facture** : padding `p-4`, hover `hover:bg-gray-50`
- **Badges** : `text-sm py-1 px-3`
- **Inputs filtres** : `h-9 text-sm`

### Typographie
- **Titres sections** : `text-sm font-semibold`
- **Noms clients** : `font-medium text-gray-900`
- **Montants** : `text-lg font-semibold` (desktop) / `text-2xl font-bold` (mobile)
- **Infos secondaires** : `text-xs text-gray-500`

---

## 🗂️ Architecture de Navigation

### Structure Principale
```
Page principale unique avec 4 onglets:
├── À traiter (to_handle)
├── En attente (waiting)
├── Payées (paid)
└── Relances auto (auto_reminders)
```

### Stats Cards (en haut, cliquables)
4 cards compactes affichant :
1. **Urgentes** - Nombre de factures >15j retard (rouge)
2. **En attente** - Nombre de factures envoyées en attente (bleu)
3. **À encaisser** - Total € non payé (vert)
4. **Relances auto** - Nombre de relances planifiées (violet)

Cliquer sur une card active l'onglet correspondant.

---

## 📑 Onglet 1 : À traiter

### Contenu
Affiche toutes les factures nécessitant une action :
- Statut `urgent` (>15j retard)
- Statut `late` (1-15j retard)
- Statut `to_send` (pas encore envoyée)

### Filtres Visibles
Barre de filtres juste sous les onglets :
```
┌─────────────────────────────────────────────────────────┐
│ [🔍 Rechercher...]  [Filtre statut ▼]  [Tri par ▼]    │
└─────────────────────────────────────────────────────────┘
```

1. **Recherche** (Input texte)
   - Placeholder : "Rechercher client ou N° facture..."
   - Recherche dans `clientName` et `invoiceNumber`
   - Icône Search à gauche

2. **Filtre Statut** (Select)
   - Options :
     - Tous les statuts
     - Urgent uniquement
     - En retard
     - À envoyer

3. **Tri** (Select)
   - Options :
     - Trier par échéance (dueDate)
     - Trier par montant (amount DESC)
     - Trier par client (alphabétique)

### Affichage Ligne de Facture

#### Desktop
```
┌────────────────────────────────────────────────────────────────────┐
│ [Client Name]          [Badge Statut]                              │
│ #FAC-001 • Échéance: 01/12/2024 • X jours de retard               │
│                                                                     │
│                            1,250.00 €    [Action Principale]       │
│                                          [Action 2] [Action 3]     │
└────────────────────────────────────────────────────────────────────┘
```

#### Actions selon statut

**Statut URGENT** (>15j retard)
- Action principale : `[📞 Appeler]` (rouge outline) + `[👁️ Relancer]` (outline)
- Actions secondaires : `[💰 Enregistrer paiement]` + `[✅ Marquer payée]`

**Statut LATE** (1-15j retard)
- Action principale : `[🔔 Relancer]` (orange outline)
- Actions secondaires : `[💰 Enregistrer paiement]` + `[✅ Marquer payée]`

**Statut TO_SEND** (à envoyer)
- Action principale : `[📤 Envoyer]` (bleu solid)
- Actions secondaires : `[💰 Enregistrer paiement]` + `[✅ Marquer payée]`

#### Mobile
Cards larges avec :
- Client + badge en haut
- Montant en gros (text-2xl)
- 1 gros bouton action principale
- Actions secondaires en discret dessous

---

## 📑 Onglet 2 : En attente

### Contenu
Affiche toutes les factures avec statut `waiting` :
- Factures envoyées
- Pas encore à l'échéance OU échéance dépassée mais <7j
- Rien à faire, on attend le paiement

### Filtres
Mêmes filtres que "À traiter"

### Actions sur les factures
- Pas d'action principale (juste attendre)
- Actions secondaires disponibles : `[💰 Enregistrer paiement]` + `[✅ Marquer payée]`

---

## 📑 Onglet 3 : Payées

### Contenu
Archives des factures avec statut `paid`

### Affichage
- Même format que les autres onglets
- Badge vert "Payée"
- Ligne secondaire : "Payée le DD/MM/YYYY"
- Aucune action disponible

### Filtres
Mêmes filtres (recherche, tri)

---

## 📑 Onglet 4 : Relances auto

### Objectif
Montrer ce que le système fait automatiquement pour créer la confiance avant de lancer en pilote automatique.

### Structure

#### Section 1 : Relances planifiées (bg-blue-50)
```
📅 Relances planifiées (X)

┌──────────────────────────────────────────────────────────┐
│ [Client Name]                        Envoi prévu le      │
│ #FAC-001 • 1,250.00 € • Relance 1    12/12/2024         │
│                                      [👁️ Prévisualiser]  │
└──────────────────────────────────────────────────────────┘
```

- Liste des relances à venir
- Date d'envoi prévue
- Type de relance (Relance 1 - Amicale, Relance 2 - Sérieuse, etc.)
- Bouton "Prévisualiser" → ouvre modal preview

#### Section 2 : Relances envoyées (bg-gray-50)
```
✅ Relances envoyées récemment (X)

┌──────────────────────────────────────────────────────────┐
│ [Client Name]                        Envoyée le          │
│ #FAC-001 • 1,250.00 € • Relance 1    08/12/2024  ✓      │
└──────────────────────────────────────────────────────────┘
```

- Historique des relances envoyées (dernières 30j)
- Date d'envoi effective
- Type de relance
- Icône checkmark vert

### Données Backend Nécessaires

Créer une query Convex : `followUp.getUpcomingReminders()`
```typescript
Retourne: {
  _id: Id<"reminders">,
  invoiceId: Id<"invoices">,
  invoiceNumber: string,
  clientName: string,
  amount: number,
  scheduledDate: string, // YYYY-MM-DD HH:mm
  reminderType: string, // "Relance 1 - Amicale"
  status: "scheduled" | "sent",
  sentDate?: string,
  emailSubject?: string,
  emailContent?: string,
}
```

---

## 🔔 Modal Preview Email

### Déclenchement
- Cliquer sur "👁️ Relancer" depuis l'onglet "À traiter"
- Cliquer sur "👁️ Prévisualiser" depuis l'onglet "Relances auto"

### Structure
```
┌───────────────────────────────────────────────────┐
│ Prévisualisation de l'email             [✕]      │
├───────────────────────────────────────────────────┤
│                                                   │
│ DESTINATAIRE                                      │
│ Client Name (client@example.com)                 │
│                                                   │
│ OBJET                                             │
│ Relance facture FAC-2024-001                     │
│                                                   │
│ MESSAGE                                           │
│ ┌───────────────────────────────────────────┐   │
│ │ Bonjour Client,                           │   │
│ │                                            │   │
│ │ Nous constatons que la facture...         │   │
│ │ (template complet affiché ici)            │   │
│ └───────────────────────────────────────────┘   │
│                                                   │
│ [ℹ️ Vous pouvez modifier les templates dans]    │
│ [   les paramètres]                              │
│                                                   │
├───────────────────────────────────────────────────┤
│                    [Annuler]  [📤 Confirmer]     │
└───────────────────────────────────────────────────┘
```

### Comportement
- Affichage en lecture seule du template interpolé
- Variables remplacées : {numero_facture}, {montant}, {client}, {date_echeance}, {jours_retard}
- Bouton "Confirmer" → envoie l'email réellement
- Lien vers paramètres pour modifier les templates

---

## 💰 Actions de Paiement

### Distinction importante
Deux actions distinctes pour répondre au besoin spécifique :

#### 1. "Enregistrer paiement" (complexe)
**Cas d'usage :** Reçu un chèque, il faut l'encaisser plus tard

**Modal :**
```
┌─────────────────────────────────────────────┐
│ Enregistrer un paiement                     │
├─────────────────────────────────────────────┤
│ Type de paiement:                           │
│ ○ Virement bancaire                         │
│ ○ Chèque                                    │
│                                              │
│ Montant: [________] €                       │
│                                              │
│ [Si chèque]                                 │
│ Date de réception: [__/__/____]            │
│ Date de dépôt prévue: [__/__/____]         │
│                                              │
│ Notes (optionnel):                          │
│ [________________________]                  │
│                                              │
│        [Annuler]  [Enregistrer]             │
└─────────────────────────────────────────────┘
```

Backend : appelle `payments.recordPayment()`
- Crée une entrée dans `payments` table
- Met à jour `outstandingBalance` de la facture
- Si solde = 0 → `paymentStatus = "paid"`
- Crée un event dans `events` table

#### 2. "Marquer payée" (simple)
**Cas d'usage :** Raccourci rapide, le client a payé

**Modal :**
```
┌─────────────────────────────────────────────┐
│ Marquer comme payée                         │
├─────────────────────────────────────────────┤
│ Facture: FAC-2024-001                       │
│ Montant: 1,250.00 €                         │
│                                              │
│ Date de paiement:                           │
│ [__/__/____]  (défaut: aujourd'hui)        │
│                                              │
│        [Annuler]  [Confirmer]               │
└─────────────────────────────────────────────┘
```

Backend : appelle `invoices.markAsPaid()`
- Change `paymentStatus = "paid"`
- Change `mainStatus = "paid"`
- Set `paidDate`
- Crée un event dans `events` table

---

## 🔧 Backend - Modifications Nécessaires

### Nouvelles Queries

#### `invoices.listForMainView`
```typescript
export const listForMainView = query({
  args: {
    tab: v.union(
      v.literal("to_handle"),
      v.literal("waiting"),
      v.literal("paid")
    ),
    searchQuery: v.optional(v.string()),
    filterStatus: v.optional(v.union(
      v.literal("urgent"),
      v.literal("late"),
      v.literal("to_send")
    )),
    sortBy: v.union(
      v.literal("dueDate"),
      v.literal("amount"),
      v.literal("client")
    ),
  },
  returns: v.array(v.object({...})),
  handler: async (ctx, args) => {
    // Filtre selon l'onglet actif
    // Applique recherche
    // Applique tri
    // Retourne avec calculs (daysLate, nextReminderDate, etc.)
  }
});
```

#### `followUp.getUpcomingReminders`
```typescript
export const getUpcomingReminders = query({
  args: {},
  returns: v.array(v.object({
    _id: v.id("reminders"),
    invoiceId: v.id("invoices"),
    invoiceNumber: v.string(),
    clientName: v.string(),
    amount: v.number(),
    scheduledDate: v.string(),
    reminderType: v.string(),
    status: v.union(v.literal("scheduled"), v.literal("sent")),
    sentDate: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailContent: v.optional(v.string()),
  })),
  handler: async (ctx) => {
    // Récupère tous les reminders non envoyés ou récents (<30j)
    // Join avec invoices pour avoir les infos
    // Retourne enrichi
  }
});
```

### Mutations Existantes à Vérifier

✅ `invoices.markAsPaid` - déjà existe
✅ `payments.recordPayment` - déjà existe
✅ `invoices.markAsSent` - déjà existe

Vérifier qu'elles créent bien des events dans la table `events`.

---

## 📱 Responsive - Mobile

### Breakpoint
`md:` = 768px

### Changements Mobile
- Stats cards en grille 2x2 au lieu de 1x4
- Onglets empilés verticalement si nécessaire
- Filtres en colonne (3 inputs empilés)
- Factures en cards larges au lieu de lignes tableau
- Boutons actions en pleine largeur

### Card Mobile
```
┌─────────────────────────────────────┐
│ [Client Name]       [Badge]         │
│ #FAC-001                            │
│                                      │
│ 1,250.00 €                          │
│ ⏰ Retard : 5 jours                 │
│                                      │
│ [━━━ ACTION PRINCIPALE ━━━]        │
│                                      │
│ [Action 2]        [Action 3]        │
└─────────────────────────────────────┘
```

---

## 📂 Structure des Composants

### Nouveaux Composants à Créer

```
src/pages/
  └── MainView.tsx              # Page principale avec 4 onglets

src/components/
  ├── mainView/
  │   ├── StatsCards.tsx        # 4 cards stats en haut
  │   ├── FilterBar.tsx         # Barre de filtres
  │   ├── InvoiceRow.tsx        # Ligne de facture (desktop)
  │   ├── InvoiceCard.tsx       # Card de facture (mobile)
  │   ├── AutoRemindersView.tsx # Onglet relances auto
  │   └── EmailPreviewModal.tsx # Modal preview email
  │
  └── modals/
      ├── MarkAsPaidModal.tsx   # Modal simple "Marquer payée"
      └── RecordPaymentModal.tsx # Modal complexe "Enregistrer paiement"
```

### Composants Existants à Réutiliser
- `src/components/ui/badge.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx` (si besoin)

---

## 🚀 Plan d'Implémentation

### Phase 1 : Backend
1. Créer `followUp.getUpcomingReminders`
2. Créer `invoices.listForMainView` avec filtres/tri
3. Vérifier que les mutations existantes créent des events
4. Tester les queries

### Phase 2 : Composants de Base
1. Créer `StatsCards.tsx`
2. Créer `FilterBar.tsx`
3. Créer `InvoiceRow.tsx` (desktop)
4. Créer `InvoiceCard.tsx` (mobile)

### Phase 3 : Onglets
1. Créer structure `MainView.tsx` avec 4 onglets
2. Implémenter onglet "À traiter"
3. Implémenter onglet "En attente"
4. Implémenter onglet "Payées"
5. Implémenter onglet "Relances auto" avec `AutoRemindersView.tsx`

### Phase 4 : Modals et Actions
1. Créer `EmailPreviewModal.tsx`
2. Créer `MarkAsPaidModal.tsx`
3. Créer `RecordPaymentModal.tsx`
4. Connecter les actions aux mutations

### Phase 5 : Polish
1. Responsive mobile
2. États de chargement
3. Gestion d'erreurs
4. Tests manuels complets

### Phase 6 : Migration
1. Mettre à jour les routes dans `App.tsx`
2. Rediriger `/follow-up` vers `MainView`
3. Supprimer les anciennes pages devenues obsolètes
4. Mettre à jour la navigation (Sidebar)

---

## ✅ Checklist de Validation

### Fonctionnalités Essentielles
- [ ] Filtrer par recherche (client, N° facture)
- [ ] Filtrer par statut
- [ ] Trier par montant, date, client
- [ ] Voir relances planifiées automatiquement
- [ ] Prévisualiser email avant envoi
- [ ] Enregistrer un paiement (chèque)
- [ ] Marquer comme payée (simple)
- [ ] Actions disponibles sur factures en retard

### Design
- [ ] Palette de couleurs sobre cohérente
- [ ] Tailles de boutons uniformes
- [ ] Badges lisibles et discrets
- [ ] Responsive mobile fonctionnel
- [ ] Hover states et transitions fluides

### UX
- [ ] Navigation claire entre onglets
- [ ] Actions contextuelles selon statut facture
- [ ] Feedback visuel sur toutes les actions
- [ ] Chargement optimiste où pertinent
- [ ] Messages d'erreur compréhensibles

---

## 📝 Notes Techniques

### Gestion de l'État Local
Utiliser `useState` pour :
- Onglet actif
- Recherche
- Filtres
- Tri
- Modals (ouvert/fermé)

### Optimistic Updates
Sur ces actions :
- Marquer comme payée
- Enregistrer paiement
- Envoyer relance

### Cache Convex
Les queries sont automatiquement mises en cache et réactives.

### Accessibility
- Labels sur tous les inputs
- Boutons avec texte ou aria-label
- Keyboard navigation sur les onglets
- Focus states visibles

---

## 🎯 Différences avec l'Interface Actuelle

### À Supprimer
- ❌ Page `/dashboard` séparée
- ❌ Page `/invoices` séparée avec filtres complexes
- ❌ Page `/follow-up` séparée
- ❌ Page `/ongoing` et `/paid` séparées
- ❌ Menu "..." avec actions cachées
- ❌ Statuts multiples compliqués (reminder_1, reminder_2, etc.)

### À Garder
- ✅ `/upload` - Upload de factures
- ✅ `/settings` - Paramètres organisation
- ✅ `/team` - Gestion équipe
- ✅ `/invoices/:id` - Détail facture

### Nouvelle Structure
```
/ (home)
/invoices (nouvelle page principale MainView)
/invoices/:id (détail inchangé)
/upload
/settings
/team
```

---

## 📎 Annexes

### Exemple de Données Invoice (enrichies)
```typescript
{
  _id: Id<"invoices">,
  invoiceNumber: "FAC-2024-001",
  clientName: "Jean Dupont",
  clientEmail: "jean@example.com",
  amountTTC: 1250.50,
  dueDate: "2024-12-01",
  invoiceDate: "2024-11-15",

  // Statuts
  mainStatus: "late" | "urgent" | "waiting" | "to_send" | "paid",
  sendStatus: "pending" | "sent",
  paymentStatus: "unpaid" | "partial" | "paid",

  // Calculs enrichis
  daysLate: 5,
  isOverdue: true,
  outstandingBalance: 1250.50,
  hasPartialPayment: false,

  // Relance
  nextReminderDate?: "2024-12-12",
  nextReminderType?: "Relance 1 - Amicale",

  // Dates
  sentDate?: "2024-11-16",
  paidDate?: "2024-12-08",

  _creationTime: 1234567890,
}
```

### Variables de Template Email
À interpoler dans les templates :
- `{numero_facture}` → `FAC-2024-001`
- `{client}` → `Jean Dupont`
- `{montant}` → `1 250,50 €`
- `{date_facture}` → `15/11/2024`
- `{date_echeance}` → `01/12/2024`
- `{jours_retard}` → `5`

---

**Fin de la spécification**

Cette spec peut être utilisée comme référence pour l'implémentation complète de l'interface V2.
