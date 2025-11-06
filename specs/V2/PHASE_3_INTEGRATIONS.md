# PHASE 3 : Intégrations & Features Avancées 🚀

**Statut** : 🔴 Non commencé
**Prérequis** : Phases 1 & 2 complétées

---

## 3.1 Intégration Chart.js

### 3.1.1 Créer composant `TreasuryCashFlowChart`
- [ ] Fichier : `src/components/charts/TreasuryCashFlowChart.tsx`
- [ ] Type : Line chart (courbe)
- [ ] Axes : X = mois (6 derniers), Y = montant (€)
- [ ] Datasets : Encaissé vs Attendu (2 courbes)

### 3.1.2 Backend : Query `dashboard.getTreasuryCashFlow`
- [ ] Calculer pour chaque mois (6 derniers) :
  - Encaissé = somme paiements reçus
  - Attendu = somme factures émises
- [ ] Retourner : `{ months: string[], received: number[], expected: number[] }`

---

## 3.2 Intégration IA Gemini

### 3.2.1 Configurer clé API Gemini
- [ ] Ajouter `GEMINI_API_KEY` dans Convex env vars
- [ ] Installer SDK : `pnpm add @google/generative-ai`

### 3.2.2 Action `dashboard.analyzeWithGemini`
- [ ] Args : stats dashboard (KPIs)
- [ ] Prompt : "Analyse la situation financière suivante... Donne 3 recommandations prioritaires."
- [ ] Retourne : texte analyse

### 3.2.3 Action `scenarios.generateWithGemini`
- [ ] Args : tone, invoiceContext (montant, client, retard)
- [ ] Prompt : "Génère un template de relance [tone] pour une facture de [montant]€ en retard de [jours] jours."
- [ ] Retourne : template email

### 3.2.4 UI : Loading states + Error handling
- [ ] Spinner pendant appel API
- [ ] Toast si erreur
- [ ] Retry button

---

## 3.3 Gestion Multi-Contacts Clients

### 3.3.1 Schema Convex : Table `clientContacts`
- [ ] Déjà listé en 2.4 Backend

### 3.3.2 Lier contacts aux relances
- [ ] Enrichir `reminders` avec `contactId` (optionnel)
- [ ] Permettre choix du contact destinataire lors envoi relance

### 3.3.3 UI : Sélection contact dans ReminderModal
- [ ] Dropdown "Destinataire" si client a plusieurs contacts
- [ ] Pré-sélectionner contact par défaut

---

## 3.4 Historique Détaillé Factures

### 3.4.1 Schema : Table `invoiceHistory`
- [ ] Champs :
  - invoiceId: Id<"invoices">
  - type: "created" | "reminder_sent" | "email_opened" | "manual_action" | "payment_received" | "status_changed"
  - description: string
  - metadata: any (JSON)
  - createdBy: Id<"users">
  - createdAt: number

### 3.4.2 Créer événements automatiquement
- [ ] Hook création facture → Insert "created"
- [ ] Hook envoi relance → Insert "reminder_sent"
- [ ] Hook paiement → Insert "payment_received"

### 3.4.3 Webhook Email ouvert (optionnel avancé)
- [ ] Tracking pixel dans emails
- [ ] Endpoint HTTP `/webhooks/email-opened`
- [ ] Insert "email_opened" dans historique

### 3.4.4 Mutation `invoices.logManualAction`
- [ ] Args : invoiceId, description
- [ ] Insert "manual_action" dans historique
- [ ] Appelée depuis InvoiceDetail "Loguer une action"

---

## 📦 Dépendances NPM à Ajouter

```bash
# Charts
pnpm add chart.js react-chartjs-2

# Gemini AI
pnpm add @google/generative-ai

# Date utilities
pnpm add date-fns
```

---

## shadcn/ui Components Restants

Via MCP :
- Card
- Badge
- Dialog
- Tabs
- Sheet (Slide-over)
- DatePicker (Calendar + Popover)

Déjà installés :
- Button ✅
- Avatar ✅
- Label ✅
- Input ✅
- Textarea ✅
- Select ✅
- Pagination ✅
- Sidebar ✅
