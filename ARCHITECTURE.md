# Architecture

Application française de gestion de recouvrement de factures.

## Vue d'ensemble

- **Backend** : Convex (real-time database avec APIs automatiques)
- **Frontend** : React 19 + TypeScript + Vite
- **Styling** : Tailwind CSS v4 (config dans `src/index.css`)
- **Authentification** : `@convex-dev/auth` (anonymous auth)
- **AI** : Claude 3.5 Haiku (Anthropic) pour extraction PDF

## Backend Structure (Convex)

Le backend Convex fournit une base de données temps réel avec génération automatique d'APIs dans `/convex/`.

### Fichiers Backend Principaux

- `convex/schema.ts` - Schéma de la base de données (3 tables principales)
- `convex/invoices.ts` - CRUD factures, gestion des statuts, logique métier
- `convex/reminderSettings.ts` - Configuration des relances par utilisateur
- `convex/reminders.ts` - Historique des relances envoyées
- `convex/pdfExtractionAI.ts` - Extraction IA des données de factures PDF
- `convex/dashboard.ts` - Statistiques et métriques du tableau de bord
- `convex/auth.ts` & `convex/auth.config.ts` - Configuration authentification
- `convex/router.ts` & `convex/http.ts` - Définitions des routes HTTP

## Frontend Structure (React)

Application React 19 + TypeScript dans `/src/`.

### Routing & Layout

- `src/App.tsx` - Layout principal, authentification, configuration React Router
- `src/components/layout/AppLayout.tsx` - Wrapper de layout avec sidebar et topbar
- `src/components/layout/Sidebar.tsx` - Navigation latérale (responsive, overlay mobile)
- `src/components/layout/Topbar.tsx` - Barre du haut avec menu utilisateur et hamburger mobile

**Routes** : `/` (dashboard), `/invoices`, `/clients`, `/upload`, `/settings`, `/team`, etc.

### Composants Clés

- `src/components/Dashboard.tsx` - Tableau de bord avec stats factures en retard/à venir
- `src/components/InvoiceList.tsx` - Liste des factures avec badges de statut et actions
- `src/components/OngoingInvoices.tsx` - Factures envoyées non encore échues
- `src/components/PaidInvoices.tsx` - Archive des factures payées
- `src/components/InvoiceUpload.tsx` - Upload PDF avec aperçu de l'extraction IA
- `src/components/InvoiceEditModal.tsx` - Édition des détails de facture
- `src/components/ReminderSettings.tsx` - Configuration délais et modèles d'emails
- `src/components/ReminderModal.tsx` - Envoi de relances avec aperçu
- `src/components/StatsNavigation.tsx` - Onglets de navigation entre les vues

### State Management

- Hooks Convex : `useQuery`, `useMutation`
- Real-time : synchronisation automatique via Convex
- Router : React Router v7

### Bibliothèques UI

- Navigation : React Router v7 (préférer `<NavLink>` avec prop `end` si besoin)
- Notifications : `sonner` (toasts)
- Icônes : `lucide-react`
- Styling : Tailwind CSS v4

## Database Schema

### Table : `invoices`

Factures utilisateur avec suivi du statut, infos client, montants, dates, PDF optionnel.

**Champs principaux** :
- `userId` - ID de l'utilisateur propriétaire
- `clientName`, `clientEmail` - Informations client
- `invoiceNumber` - Numéro de facture
- `amountTTC` - Montant TTC
- `invoiceDate` - Date de la facture
- `dueDate` - Date d'échéance
- `paidDate` - Date de paiement (optionnelle)
- `status` - Statut de la facture (voir flow ci-dessous)
- `pdfStorageId` - ID du PDF stocké (optionnel)

**Index** :
- `by_user` - Factures par utilisateur
- `by_user_and_status` - Factures par utilisateur et statut
- `by_due_date` - Factures par date d'échéance

### Table : `reminderSettings`

Configuration des délais et modèles d'emails de relance par utilisateur.

**Champs principaux** :
- `userId` - ID de l'utilisateur
- `firstReminderDelay` - Délai avant 1ère relance (jours après échéance)
- `secondReminderDelay` - Délai avant 2ème relance
- `thirdReminderDelay` - Délai avant 3ème relance
- `emailTemplates` - Modèles d'emails personnalisables

**Index** : `by_user`

### Table : `reminders`

Historique des relances envoyées.

**Champs principaux** :
- `invoiceId` - ID de la facture concernée
- `userId` - ID de l'utilisateur
- `sentAt` - Date d'envoi
- `emailContent` - Contenu de l'email envoyé
- `reminderType` - Type de relance (first, second, third)

**Index** : `by_invoice`, `by_user`

### Tables d'Authentification

Tables Convex Auth intégrées pour la gestion des utilisateurs.

## Invoice Status Flow

Les factures progressent à travers ces statuts :

```
sent → overdue → first_reminder → second_reminder → third_reminder → litigation → paid
```

**Statuts** :
- `sent` - Facture envoyée au client
- `overdue` - Échéance dépassée
- `first_reminder` - 1ère relance envoyée
- `second_reminder` - 2ème relance envoyée
- `third_reminder` - 3ème relance envoyée
- `litigation` - Escaladé en contentieux
- `paid` - Paiement reçu (état terminal)

**Logique** :
- `invoices.list` calcule automatiquement `daysOverdue`
- Tri par priorité : litigation → third_reminder → ... → sent → paid

## Fonctionnalités Principales

### 1. Extraction IA de PDF

Upload de factures PDF avec extraction automatique des données :
- **Modèle** : Claude 3.5 Haiku (Anthropic API)
- **SDK** : `@anthropic-ai/sdk`
- **Variable d'environnement** : `CLAUDE_API_KEY` (requis)
- **Analyse** : Compréhension directe de documents PDF par Claude
- **Données extraites** : clientName, clientEmail, invoiceNumber, amountTTC, invoiceDate, dueDate
- **Score de confiance** : Retourné pour indiquer la qualité de l'extraction
- **Fallback** : Retourne des données partielles avec 0% de confiance en cas d'erreur

### 2. Gestion des Statuts

- Mise à jour manuelle du statut de paiement
- Suivi de l'historique des relances
- Calcul automatique des jours de retard

### 3. Synchronisation Temps Réel

- Convex fournit une synchronisation automatique en temps réel
- Tous les clients voient les mêmes données instantanément
- Pas besoin de rafraîchir la page

### 4. Système de Relances

- Délais configurables par utilisateur
- Modèles d'emails personnalisables
- Historique complet des relances envoyées
- Aperçu avant envoi

### 5. Vues Multiples

- Dashboard avec statistiques
- Filtres par statut (en retard, en cours, payées)
- Archive des factures payées
- Navigation par onglets

## Déploiement Convex

- **Environnement** : `fabulous-dachshund-120`
- **Frontend** : React 19 avec hooks modernes et TypeScript strict
- **Build** : Vite pour le bundling optimisé

## Outils de Développement

### Mutations de nettoyage (`convex/dev.ts`)

Ces mutations sont accessibles depuis le dashboard Convex ou via le MCP Convex.

| Mutation | Description |
|----------|-------------|
| `dev:clearAllTables` | **DANGER** - Supprime TOUTES les données (invoices, reminders, events, users, organizations, auth). Utile pour repartir de zéro en dev. |
| `dev:cleanOrphanEvents` | Supprime les événements orphelins dont la facture associée a été supprimée. Retourne le nombre d'événements supprimés. |
| `dev:cleanOrphanFiles` | Supprime les fichiers PDF orphelins du storage dont la facture associée a été supprimée. Retourne le nombre de fichiers supprimés. |

**Usage via MCP Convex** :
```
mcp__convex__run(functionName: "dev:clearAllTables", args: "{}")
mcp__convex__run(functionName: "dev:cleanOrphanEvents", args: "{}")
mcp__convex__run(functionName: "dev:cleanOrphanFiles", args: "{}")
```

> **Note** : La suppression d'une facture via `deleteInvoice` supprime automatiquement les reminders, events et le fichier PDF associés (suppression cascade).

### Tests de relances (`convex/testReminders.ts`)

Mutations internes pour tester le système de relances automatiques.

| Mutation | Description |
|----------|-------------|
| `testReminders:setupTestData` | Crée des données de test (organisation, utilisateur, factures) |
| `testReminders:cleanupTestData` | Nettoie les données de test |
| `testReminders:runAllTests` | Exécute tous les tests de relances |
| `testReminders:runTest1_InvoiceDueTodayDelay1` | Test : facture échue aujourd'hui avec délai J+1 |
| `testReminders:runTest2_InvoiceDueYesterdayDelay2` | Test : facture échue hier avec délai J+2 |
| `testReminders:runTest3_SubsequentReminderDelay7` | Test : relance suivante avec délai J+7 |
| `testReminders:runTest4_NotYetDue` | Test : facture pas encore échue |
| `testReminders:runTest5_AlreadyPaid` | Test : facture déjà payée |
| `testReminders:runTest6_NotSent` | Test : facture non envoyée |

> **Note** : Ces mutations sont `internalMutation` et ne sont pas appelables directement depuis le frontend.

## Notes Techniques

- **Runtime Node.js** : `pdfExtractionAI.ts` utilise `"use node";` pour le SDK Anthropic
- **HTTP Endpoints** : Définis dans `convex/router.ts` (actuellement minimal, auth géré par Convex Auth)
- **Validateurs** : Tous les args/returns de fonctions Convex utilisent des validateurs (`v.*`)
