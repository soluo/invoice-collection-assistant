# Suivi Développement V2 - ZenRelance

**Date de création :** 2025-11-05
**Dernière mise à jour :** 2025-11-05
**Statut global :** 🟡 En cours (Phase 1.1-1.2-1.3.2 + Phase 2.2 complétées)
**Version cible :** 2.0.0

---
## Instructions

Ce fichier sert au suivi de la mise en oeuvre de la spec.
A chaque fois que je te le demande tu mets à jour ce fichier pour refléter l'avancement.

Sois concis, contente toi de cocher les cases et d'ajouter un récap à la partie Changelog.

---

## 📊 Vue d'ensemble

### Objectifs V2
- **Refonte visuelle** : Design system unifié (Indigo theme + lucide-react icons + shadcn/ui)
- **4 nouveaux écrans majeurs** : Détail facture, Clients à appeler, Rapprochement bancaire, Agenda
- **Intégrations IA** : Gemini pour analyse dashboard + génération templates de relances
- **UX améliorée** : Panels latéraux, modales, timelines, historiques détaillés
- **100% responsive** : Mobile-first avec breakpoints Tailwind

**Note :** Les icônes utilisent `lucide-react` (déjà installé) au lieu de Phosphor Icons spécifié dans les maquettes. Les deux bibliothèques sont très similaires visuellement.

### Ressources
- **Maquettes** : `specs/V2/mockups/*.html` (9 fichiers)
- **Rapport d'analyse** : Voir section 12 de `MULTI_USER_SPEC.md`

### Progression globale
- Phase 1 (Design System) : 8/15 ✅✅✅✅✅✅✅✅⬜⬜⬜⬜⬜⬜⬜
- Phase 2 (Écrans) : 7/45 ✅✅⬜⬜⬜⬜⬜⬜⬜⬜
- Phase 3 (Intégrations) : 0/12 ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜

---

## PHASE 1 : Design System & Layout 🎨

**Statut** : 🟡 En cours (1.1-1.2-1.3.2 complétées)
**Prérequis** : Accès MCP shadcn/ui ✅

### 1.1 Installation & Configuration

- [x] **1.1.1** ✅ Installer shadcn/ui via MCP
  - ✅ Components.json configuré pour Tailwind v4 (sans tailwind.config.js)
  - ✅ Configuration : TypeScript, Tailwind, src/ directory, baseColor: slate

- [x] **1.1.2** ✅ Icons
  - ✅ **Utilisation de `lucide-react`** (déjà installé) au lieu de Phosphor Icons
  - Note : lucide-react est visuellement similaire et déjà présent dans le projet

- [x] **1.1.3** ✅ Configurer le thème Indigo dans `src/index.css`
  - ✅ `--color-primary`: `#6366f1` (indigo-600)
  - ✅ `--color-primary-hover`: `#4f46e5` (indigo-700)
  - ✅ Cohérence avec Tailwind v4 vérifiée

- [ ] **1.1.4** Installer Chart.js (reporté)
  - Note : Installation repoussée jusqu'à implémentation des graphiques (Phase 2.1)
  ```bash
  pnpm add chart.js react-chartjs-2
  ```

### 1.2 Layout Global

- [x] **1.2.1** ✅ Créer le nouveau Sidebar
  - ✅ Fichier : `src/components/layout/Sidebar.tsx`
  - ✅ Logo "ZenRelance" (indigo-600)
  - ✅ 7 nav items principaux + 2 items bottom (Réglages, Mon Compte)
  - ✅ Icons lucide-react (Home, FileText, Users, Phone, Upload, CreditCard, Calendar, Settings, User)
  - ✅ **Navigation avec `<NavLink>` pour meilleure UX** (URL preview, clic droit, accessibilité)
  - ✅ Active state : indigo-600 bg + white text
  - ✅ Mobile : Fixed overlay avec backdrop (z-30/40)
  - ✅ Toggle : `translate-x-0` vs `-translate-x-full`

- [x] **1.2.2** ✅ Créer le Topbar
  - ✅ Fichier : `src/components/layout/Topbar.tsx`
  - ✅ Hamburger menu (mobile uniquement)
  - ✅ User greeting dynamique (Bonjour/Bonsoir selon l'heure)
  - ✅ Avatar avec initiales (shadcn/ui Avatar component)
  - ✅ Dropdown menu utilisateur (nom, email, déconnexion)
  - ✅ White bg + border-b

- [x] **1.2.3** ✅ Créer le Layout principal
  - ✅ Fichier : `src/components/layout/AppLayout.tsx`
  - ✅ Structure : Sidebar (fixe desktop, overlay mobile) + Topbar + Main content
  - ✅ Responsive : Breakpoint md: (768px)
  - ✅ Gestion état sidebar mobile

- [x] **1.2.4** ✅ Mettre à jour `App.tsx`
  - ✅ Ancien Header supprimé, remplacé par AppLayout
  - ✅ Toutes les routes authentifiées wrapped dans `<AppLayout>`
  - ✅ Navigation mobile/desktop testée et fonctionnelle
  - ✅ Transitions sidebar fluides (duration-300 ease-in-out)

### 1.3 Composants shadcn à intégrer

- [x] **1.3.1** ✅ Button (installé via MCP)
  - ✅ Fichier : `src/components/ui/button.tsx`
  - Note : Variants disponibles (default, secondary, ghost, destructive) mais style à ajuster pour indigo-600

- [x] **1.3.2** ✅ Sidebar (créé manuellement avec composants shadcn)
  - ✅ Fichier : `src/components/ui/sidebar.tsx`
  - ✅ Composants : Sidebar, SidebarProvider, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset
  - ✅ Fichier : `src/components/ui/collapsible.tsx` (dépendance)
  - ✅ Variables CSS shadcn utilisées : `--sidebar-*`, `--primary`, `--accent`, `--muted-foreground`, etc.
  - ✅ Responsive mobile/desktop avec détection automatique du viewport
  - ✅ Tailles ajustées pour correspondre aux maquettes (p-3, gap-3, text-base, rounded-lg)
  - ✅ État actif géré avec `useMatch` et `useResolvedPath` de React Router
  - ✅ Dépendance installée : `@radix-ui/react-collapsible`

- [ ] **1.3.3** Card
  - Base : border + rounded-xl + shadow-sm
  - Variante avec header/content/footer

- [ ] **1.3.4** Badge
  - Color variants : red (retard), green (payée), blue (en cours), orange (partiel), yellow (litige)
  - Size : sm, default

- [ ] **1.3.5** Dialog (Modal)
  - Overlay : bg-gray-900/50
  - Max-width : lg, 2xl variants
  - Animation : fade in/out

- [ ] **1.3.6** Tabs
  - Style : underline (border-b-2)
  - Active : indigo-600

- [ ] **1.3.7** Input / Textarea
  - Focus : border-indigo-500 + ring-indigo-500
  - Variants : with prefix (€, search icon)

- [ ] **1.3.8** Select / Dropdown
  - Style cohérent avec Input

- [ ] **1.3.9** Sheet (Slide-over Panel)
  - Pour : Panel clients
  - Position : right
  - Max-width : 2xl
  - Overlay + animation translate-x

- [ ] **1.3.10** Créer composant Timeline custom
  - Fichier : `src/components/ui/Timeline.tsx`
  - Style : Cercle + ligne verticale
  - Props : items (array), variant (vertical/horizontal)

---

## PHASE 2 : Implémentation Écrans 🖥️

**Statut** : 🟡 En cours (Phase 2.2 complétée)
**Prérequis** : Phase 1 complétée

### 2.1 Dashboard Administrateur

**Fichier** : `src/pages/Dashboard.tsx` (refonte)
**Maquette** : `specs/V2/mockups/dashboard_admin.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.1.1** Refonte layout KPIs (4 cards)
  - Total en attente (€)
  - Total en retard (€)
  - Encaissé (30j)
  - Délai paiement moyen (jours)

- [ ] **2.1.2** Intégrer Chart.js - Graphique trésorerie
  - Type : Line chart
  - Données : 6 mois glissants
  - Backend : Créer query `dashboard.getTreasuryCashFlow`

- [ ] **2.1.3** Section "Priorités" avec analyse IA
  - Card dédiée
  - Bouton "Analyser la situation" → Call Gemini API
  - Affichage résultat analyse (loading state)

- [ ] **2.1.4** Table "Plus Gros Retards"
  - Colonnes : Client, N° Facture, Montant, Échéance, Retard, **Technicien** (nouveau)
  - Tri par montant décroissant
  - Backend : Enrichir query avec technicien (createdBy)

- [ ] **2.1.5** Actions rapides (3 cards cliquables)
  - "X paiements à rapprocher" → `/reconciliation`
  - "Y clients à appeler" → `/call-plan`
  - "Z litiges actifs" → `/invoices?status=litigation`

#### Backend requis :
- [ ] Query `dashboard.getTreasuryCashFlow` (6 mois)
- [ ] Action `dashboard.analyzeWithGemini` (intégration Gemini API)

---

### 2.2 Factures (Liste)

**Fichier** : `src/pages/Invoices.tsx` (refonte)
**Maquette** : `specs/V2/mockups/factures.html`
**Statut** : ✅ Complété

#### Tâches :
- [x] **2.2.1** ✅ Refonte filtres avancés
  - ✅ Recherche : N° facture ou nom client
  - ✅ Dropdown : Statut (Tous, En retard, Paiement partiel, En attente, Payée, En litige)
  - ✅ Input : Montant (±5% tolérance)
  - ✅ Dropdown : Technicien (liste déroulante pour admins)

- [x] **2.2.2** ✅ Tableau responsive avec nouvelles colonnes
  - ✅ Colonnes : N° Facture + Client regroupées, Date émission, Montant Total, **Solde Dû** (nouveau), Échéance, Statut, Responsable
  - ✅ Hover state : bg-gray-50
  - ✅ Lien "Voir" (détail à implémenter en Phase 2.3)

- [x] **2.2.3** ✅ Pagination
  - ✅ shadcn Pagination component avec ellipsis
  - ✅ Limiter à 20 par page
  - ✅ Affichage "Page X sur Y (Z factures)"

- [x] **2.2.4** ✅ Nouveaux badges de statut
  - ✅ En retard (red)
  - ✅ Paiement partiel (orange) - NOUVEAU
  - ✅ En attente (blue)
  - ✅ Payée (green)
  - ✅ En litige (yellow) - NOUVEAU

- [x] **2.2.5** ✅ Responsive mobile
  - ✅ Cards empilées au lieu de table
  - ✅ Filtres accessibles (formulaire responsive)

#### Backend requis :
- [x] ✅ Ajouter statuts "partial_payment", "pending" et "litigation" au schema invoices
- [x] ✅ Enrichir query `invoices.list` et `invoices.listWithFilter` avec champ `outstandingBalance` (Solde Dû)
- [x] ✅ Implémenter filtres avancés dans `listWithFilter` : recherche texte, statut, montant ±5%, technicien

---

### 2.3 Détail Facture ⭐ NOUVEAU

**Fichier** : `src/pages/InvoiceDetail.tsx` (à créer)
**Maquette** : `specs/V2/mockups/facture_detail.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.3.1** Créer route `/invoices/:id`
  - Ajouter dans `App.tsx`

- [ ] **2.3.2** Layout 2 colonnes
  - Colonne gauche (35%) : Détails facture
  - Colonne droite (65%) : Historique
  - Responsive : empilées sur mobile

- [ ] **2.3.3** Détails facture (colonne gauche)
  - Badge statut dynamique (large)
  - Infos : N° Facture, Client, Montant TTC, Solde Dû, Date facture, Échéance, Retard
  - Section "Client" : Nom, Email, Téléphone, Technicien

- [ ] **2.3.4** Actions rapides (4 boutons)
  - "Marquer comme payée" → Modal confirmation
  - "Loguer une action" → Modal textarea
  - "Mettre en pause" → Toggle
  - "Télécharger PDF" → Download

- [ ] **2.3.5** Historique détaillé (colonne droite)
  - Timeline verticale (composant Timeline)
  - Types d'événements :
    - Création (icône File)
    - Relance auto (icône PaperPlaneTilt)
    - Email ouvert (icône EnvelopeOpen) - Nouveau
    - Action manuelle (icône User)
    - Paiement (icône Check green)
  - Chaque entry : Timestamp + description + auteur

#### Backend requis :
- [ ] Query `invoices.getDetailWithHistory`
- [ ] Table `invoiceHistory` (ou enrichir `reminders`)
  - Champs : invoiceId, type, description, createdBy, createdAt
- [ ] Mutation `invoices.logAction` (pour "Loguer une action")
- [ ] Mutation `invoices.togglePause`

---

### 2.4 Clients

**Fichier** : `src/pages/Clients.tsx` (à créer)
**Maquette** : `specs/V2/mockups/clients.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.4.1** Créer route `/clients`
  - Ajouter dans `App.tsx`

- [ ] **2.4.2** Grille responsive
  - Layout : `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
  - Gap : 6

- [ ] **2.4.3** Cards clients
  - Nom client (heading)
  - Contact principal (nom + email)
  - Badge statut : En retard / À jour / En cours
  - Bouton "Voir le dossier" → Ouvre panel latéral

- [ ] **2.4.4** Panel latéral coulissant (Sheet)
  - shadcn Sheet component (position: right)
  - Max-width : 2xl
  - Fermeture : Click backdrop ou X

- [ ] **2.4.5** Contenu panel - Header KPIs
  - Total en retard (€)
  - En cours (€)
  - Total facturé (12 mois)
  - Délai paiement moyen

- [ ] **2.4.6** Contenu panel - Onglets
  - Onglet 1 : Contacts (gestion multi-contacts)
  - Onglet 2 : Factures (liste des factures du client)
  - Onglet 3 : Informations (détails client)

- [ ] **2.4.7** Onglet Contacts - Gestion multi-contacts
  - Liste contacts avec : Nom, Email, Téléphone, "Par défaut" (checkbox)
  - Bouton "+ Ajouter un contact" → Modal formulaire
  - Actions : Éditer, Supprimer (sauf si dernier contact)

#### Backend requis :
- [ ] Table `clients`
  - Champs : name, organizationId, status, createdAt, createdBy
- [ ] Table `clientContacts`
  - Champs : clientId, name, email, phone, isDefault, createdAt
- [ ] Query `clients.list` (avec stats)
- [ ] Query `clients.getDetail` (avec contacts + factures)
- [ ] Mutations CRUD : `clients.create`, `clients.update`, `clients.delete`
- [ ] Mutations CRUD contacts : `clientContacts.create`, `clientContacts.update`, `clientContacts.delete`, `clientContacts.setDefault`
- [ ] Lier `invoices.clientId` → `clients._id`

---

### 2.5 Clients à Appeler ⭐ NOUVEAU

**Fichier** : `src/pages/CallPlan.tsx` (à créer)
**Maquette** : `specs/V2/mockups/plan_appels.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.5.1** Créer route `/call-plan`
  - Ajouter dans `App.tsx`

- [ ] **2.5.2** Layout split 2 colonnes
  - Colonne gauche (1/4) : Liste clients à appeler
  - Colonne droite (3/4) : Cockpit d'appel
  - Responsive : empilées sur mobile

- [ ] **2.5.3** Liste clients (colonne gauche)
  - Cards clients : Nom, N° Facture, Retard (jours)
  - Active state : border-indigo-600
  - Click → Charge cockpit

- [ ] **2.5.4** Cockpit d'appel (colonne droite)
  - Section 1 : Infos client
    - Nom (heading)
    - Contact : Email (mailto:) + Téléphone (tel:) cliquables
    - Montant en retard

- [ ] **2.5.5** Cockpit - Historique des relances
  - Timeline courte
  - Icônes + dates des dernières relances

- [ ] **2.5.6** Cockpit - Script d'appel
  - Textarea pré-rempli (suggestion IA ?)
  - Éditable inline

- [ ] **2.5.7** Cockpit - Actions après appel
  - 3 boutons :
    - "Pas de réponse" (gris)
    - "Paiement promis" (green) → Affiche DatePicker
    - "En litige" (red)
  - Si "Paiement promis" : DatePicker + input montant

- [ ] **2.5.8** Cockpit - Notes internes
  - Textarea "Notes de l'appel"

- [ ] **2.5.9** Cockpit - Validation
  - Bouton "Valider et passer au suivant"
  - Enregistre action + passe au client suivant

#### Backend requis :
- [ ] Query `callPlan.getClientsToCall` (clients avec factures en retard)
- [ ] Mutation `callPlan.recordCallOutcome`
  - Args : clientId, invoiceId, outcome, promisedDate?, amount?, notes
  - Update invoice status si "Paiement promis" ou "En litige"
- [ ] Action `callPlan.generateCallScript` (optionnel : génération IA)

---

### 2.6 Import Facture

**Fichier** : `src/pages/InvoiceUpload.tsx` (refonte)
**Maquette** : `specs/V2/mockups/import_facture.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.6.1** Améliorer zone drag-drop
  - Design V2 : border-dashed indigo-300, hauteur 256px
  - Icône upload (équivalent Lucide)
  - Texte "Glissez votre PDF ou cliquez pour sélectionner"

- [ ] **2.6.2** Spinner pendant analyse
  - Overlay avec spinner + texte "Analyse de la facture en cours..."

- [ ] **2.6.3** Formulaire pré-rempli - Section 1 : Détails facture
  - N° Facture
  - Client (autocomplete en fonction des noms déjà saisis en base)
  - Montant TTC
  - Date d'émission
  - Date d'échéance (par défaut à J+14 de la date d'émission)

- [ ] **2.6.4** Formulaire pré-rempli - Section 2 : Contact (recommandé)
  - Email
  - Téléphone
  - Note : "(Recommandé pour automatiser les relances)"

- [ ] **2.6.5** UX
  - En desktop on affiche par défaut la zone de drag&drop, et on propose la saisie manuelle (voir maquette)
  - En mobile on affiche par défaut le formulaire de saisie, pas de zone drag & drop

#### Backend requis :
- [ ] Enrichir extraction AI pour inclure email/téléphone contact
- [ ] Mutation `invoices.create` accepte `contactEmail` et `contactPhone`

---

### 2.7 Rapprochement Bancaire ⭐ NOUVEAU

**Fichier** : `src/pages/BankReconciliation.tsx` (à créer)
**Maquette** : `specs/V2/mockups/rapprochement.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.7.1** Créer route `/reconciliation`
  - Ajouter dans `App.tsx`

- [ ] **2.7.2** Filtres
  - Input : Recherche montant exact (€)
  - Input : Recherche client ou N° facture
  - Dropdown : Statut (Tous, En attente, En retard)

- [ ] **2.7.3** Table factures à rapprocher
  - Colonnes : Client/N° Facture, Échéance, Statut, Solde Dû
  - Bouton "Enregistrer paiement" par ligne → Ouvre modal

- [ ] **2.7.4** Modal enregistrement paiement
  - Header : Infos facture (Client, N°, Montant total)
  - Onglets : "Virement" vs "Chèque(s)"

- [ ] **2.7.5** Modal - Onglet Virement
  - DatePicker : Date de paiement
  - Input : Montant (€)
  - Validation : Bouton "Enregistrer"

- [ ] **2.7.6** Modal - Onglet Chèque(s)
  - Liste dynamique de chèques
  - Par chèque : Input montant + DatePicker date
  - Bouton "+ Ajouter un chèque"
  - Total calculé en temps réel
  - Validation : Bouton "Enregistrer"

- [ ] **2.7.7** Mise à jour en temps réel
  - Si montant = solde dû → Statut "Payée" (green badge)
  - Si montant < solde dû → Statut "Paiement partiel" (orange badge)
  - Refresh table après enregistrement

#### Backend requis :
- [ ] Query `reconciliation.getUnpaidInvoices`
- [ ] Mutation `reconciliation.recordPayment`
  - Args : invoiceId, paymentType (virement/cheque), payments (array), totalAmount
  - Update invoice : paidAmount, status, paidDate
- [ ] Table `payments` (optionnel : historique paiements détaillé)
  - Champs : invoiceId, type, amount, date, chequeNumber?, createdAt

---

### 2.8 Agenda des Relances ⭐ NOUVEAU

**Fichier** : `src/pages/RemindersAgenda.tsx` (à créer)
**Maquette** : `specs/V2/mockups/agenda.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.8.1** Créer route `/agenda`
  - Ajouter dans `App.tsx`

- [ ] **2.8.2** Onglets principaux
  - Onglet 1 : "À Venir" (badge count)
  - Onglet 2 : "Historique" (badge count)

- [ ] **2.8.3** Onglet "À Venir" - Groupement par date
  - Sections : Aujourd'hui, Demain, Cette semaine, Plus tard
  - Tri chronologique

- [ ] **2.8.4** Onglet "À Venir" - Cards relance
  - Icône type action (Email, SMS, Appel)
  - Client + N° Facture
  - Montant + Retard (jours)
  - Date/heure prévue
  - Bouton "Mettre en pause" (icône Pause)

- [ ] **2.8.5** Onglet "Historique" - Timeline verticale
  - Groupement par date (Aujourd'hui, Hier, Cette semaine, etc.)
  - Timeline composant custom
  - Icônes d'événements :
    - Création (File)
    - Email envoyé (PaperPlaneTilt)
    - SMS envoyé (ChatCircle)
    - Paiement reçu (Check green)
  - Infos : Client, N° Facture, Montant, Description

- [ ] **2.8.6** Action "Mettre en pause"
  - Click → Confirmation modal
  - Mutation backend → Update reminder status "paused"
  - Refresh liste

#### Backend requis :
- [ ] Query `agenda.getUpcomingReminders` (groupées par date)
- [ ] Query `agenda.getReminderHistory` (événements passés)
- [ ] Mutation `agenda.pauseReminder`
- [ ] Ajouter statut "paused" au schema reminders

---

### 2.9 Réglages

**Fichier** : `src/pages/Settings.tsx` (refonte)
**Maquette** : `specs/V2/mockups/reglages.html`
**Statut** : 🔴 Non commencé

#### Tâches :
- [ ] **2.9.1** Onglets principaux
  - Onglet 1 : Profil
  - Onglet 2 : Connexion Email
  - Onglet 3 : Scénarios de relance (nouveau)

- [ ] **2.9.2** Onglet Profil
  - Input : Nom de l'entreprise
  - Input : Votre nom
  - Bouton "Enregistrer"

- [ ] **2.9.3** Onglet Connexion Email
  - Card Google : Logo + "Connecter avec Google" → OAuth
  - Card Outlook : Logo + "Connecter avec Outlook" → OAuth
  - Si connecté : Afficher email + Bouton "Déconnecter"

- [ ] **2.9.4** Onglet Scénarios - Timeline éditable
  - Affichage : Timeline horizontale des étapes
    - J+7 : Email "Relance amicale"
    - J+14 : Email "Relance sérieuse"
    - J+30 : Email "Dernier avis"
    - J+35 : Appel manuel → "Clients à appeler"
  - Bouton "Modifier" par étape → Ouvre modal

- [ ] **2.9.5** Modal édition étape
  - Dropdown : Type d'action (Email, SMS, Appel manuel)
  - Input : Délai (jours après échéance)
  - Input : Nom de l'étape (ex: "Relance amicale")
  - Textarea : Template (si Email/SMS)
  - Bouton "Générer avec IA" → Ouvre modal IA

- [ ] **2.9.6** Modal Génération IA (Gemini)
  - Contexte : Affiche infos facture type
  - Dropdown : Choix de ton
    - Amical et bienveillant
    - Ferme mais professionnel
    - Concis et direct
    - Empathique
  - Bouton "Générer" → Call Gemini
  - Affichage résultat (loading state)
  - Bouton "Utiliser ce texte" → Remplit textarea

- [ ] **2.9.7** Validation scénarios
  - Bouton "Enregistrer les modifications"
  - Toast confirmation

#### Backend requis :
- [ ] Table `reminderScenarios` (ou enrichir `organizations`)
  - Champs : organizationId, steps (JSON array), updatedAt
  - Step : { delay, type, name, template }
- [ ] Query `scenarios.get`
- [ ] Mutation `scenarios.update`
- [ ] Action `scenarios.generateWithGemini`
  - Args : tone, context (facture type)
  - Call Gemini API
  - Retourne template généré

---

## PHASE 3 : Intégrations & Features Avancées 🚀

**Statut** : 🔴 Non commencé
**Prérequis** : Phases 1 & 2 complétées

### 3.1 Intégration Chart.js

- [ ] **3.1.1** Créer composant `TreasuryCashFlowChart`
  - Fichier : `src/components/charts/TreasuryCashFlowChart.tsx`
  - Type : Line chart (courbe)
  - Axes : X = mois (6 derniers), Y = montant (€)
  - Datasets : Encaissé vs Attendu (2 courbes)

- [ ] **3.1.2** Backend : Query `dashboard.getTreasuryCashFlow`
  - Calculer pour chaque mois (6 derniers) :
    - Encaissé = somme paiements reçus
    - Attendu = somme factures émises
  - Retourner : `{ months: string[], received: number[], expected: number[] }`

### 3.2 Intégration IA Gemini

- [ ] **3.2.1** Configurer clé API Gemini
  - Ajouter `GEMINI_API_KEY` dans Convex env vars
  - Installer SDK : `pnpm add @google/generative-ai`

- [ ] **3.2.2** Action `dashboard.analyzeWithGemini`
  - Args : stats dashboard (KPIs)
  - Prompt : "Analyse la situation financière suivante... Donne 3 recommandations prioritaires."
  - Retourne : texte analyse

- [ ] **3.2.3** Action `scenarios.generateWithGemini`
  - Args : tone, invoiceContext (montant, client, retard)
  - Prompt : "Génère un template de relance [tone] pour une facture de [montant]€ en retard de [jours] jours."
  - Retourne : template email

- [ ] **3.2.4** UI : Loading states + Error handling
  - Spinner pendant appel API
  - Toast si erreur
  - Retry button

### 3.3 Gestion Multi-Contacts Clients

- [ ] **3.3.1** Schema Convex : Table `clientContacts`
  - Déjà listé en 2.4 Backend

- [ ] **3.3.2** Lier contacts aux relances
  - Enrichir `reminders` avec `contactId` (optionnel)
  - Permettre choix du contact destinataire lors envoi relance

- [ ] **3.3.3** UI : Sélection contact dans ReminderModal
  - Dropdown "Destinataire" si client a plusieurs contacts
  - Pré-sélectionner contact par défaut

### 3.4 Historique Détaillé Factures

- [ ] **3.4.1** Schema : Table `invoiceHistory`
  - Champs :
    - invoiceId: Id<"invoices">
    - type: "created" | "reminder_sent" | "email_opened" | "manual_action" | "payment_received" | "status_changed"
    - description: string
    - metadata: any (JSON)
    - createdBy: Id<"users">
    - createdAt: number

- [ ] **3.4.2** Créer événements automatiquement
  - Hook création facture → Insert "created"
  - Hook envoi relance → Insert "reminder_sent"
  - Hook paiement → Insert "payment_received"

- [ ] **3.4.3** Webhook Email ouvert (optionnel avancé)
  - Tracking pixel dans emails
  - Endpoint HTTP `/webhooks/email-opened`
  - Insert "email_opened" dans historique

- [ ] **3.4.4** Mutation `invoices.logManualAction`
  - Args : invoiceId, description
  - Insert "manual_action" dans historique
  - Appelée depuis InvoiceDetail "Loguer une action"

---

## 📦 Dépendances à Ajouter

### NPM Packages
```bash
# Déjà installés
# - @convex-dev/auth
# - convex
# - react, react-dom, react-router-dom
# - tailwindcss v4
# - sonner (toasts)
# - lucide-react (icons) ✅

# À installer
# pnpm add @phosphor-icons/react          # Icons - NON NÉCESSAIRE (on utilise lucide-react)
pnpm add chart.js react-chartjs-2       # Charts
pnpm add @google/generative-ai          # Gemini AI
pnpm add date-fns                        # Date utilities
```

### shadcn/ui Components
Via MCP :
- Button ✅
- Avatar ✅
- Card
- Badge
- Dialog
- Tabs
- Input
- Textarea
- Select
- Sheet (Slide-over)
- DatePicker (Calendar + Popover)
- Pagination

---

## 🤔 Questions Ouvertes & Décisions

### À discuter :
1. **Page Reminders actuelle** : Merger avec `/agenda` ou conserver séparément ?
   - Option A : Remplacer `/reminders` par `/agenda`
   - Option B : `/reminders` = gestion relances, `/agenda` = visualisation timeline

2. **Migration données existantes** :
   - Créer script de migration pour lier invoices → clients ?
   - Ou repartir de zéro avec données V2 ?

3. **Feature flags** :
   - Déployer progressivement écran par écran ?
   - Ou big bang release V2 ?

4. **Statuts factures** :
   - Ajouter "partial_payment" et "litigation" nécessite migration schema
   - Impact sur logique existante des reminders ?

5. **OAuth Email** :
   - Réutiliser OAuth Microsoft existant (Phase 3 V1) ?
   - Ajouter Google OAuth en parallèle ?

---

## 📝 Notes de Développement

### Conventions de code V2 :
- **Composants UI** : `src/components/ui/` (shadcn)
- **Composants layout** : `src/components/layout/`
- **Composants métier** : `src/components/` (ex: InvoiceCard)
- **Pages** : `src/pages/`
- **Utilities** : `src/lib/`
- **Icons** : Phosphor (`@phosphor-icons/react`)
- **Colors** : Thème indigo (indigo-600 primary)

### Tests à prévoir :
- [ ] Navigation mobile (sidebar collapse)
- [ ] Modales (ouverture/fermeture, scroll lock)
- [ ] Panel latéral clients (animation, backdrop)
- [ ] Filtres factures (combinaison multiple)
- [ ] Pagination factures
- [ ] Timeline agenda (groupement dates)
- [ ] Formulaire paiement (chèques dynamiques, validation)
- [ ] Intégration IA (loading states, erreurs)

---

## 🎯 Prochaines Étapes

1. ✅ ~~Valider l'accès MCP shadcn/ui~~
2. ✅ ~~Démarrer Phase 1.1 : Installation dépendances~~
3. ✅ ~~Créer le nouveau layout (Phase 1.2)~~
4. ✅ ~~Phase 1.3.2 : Créer composants Sidebar shadcn~~
5. ✅ ~~Phase 2.2 : Écran Factures avec filtres, pagination, responsive~~
6. **Phase 1.3 (suite)** : Installer les composants shadcn restants (Card, Badge, Dialog, Tabs, Input, Select, Sheet, Timeline)
7. **Phase 2.3** : Créer l'écran Détail Facture avec historique et timeline (`/invoices/:id`)
8. **Phase 2.1** : Refonte Dashboard avec KPIs et graphiques

---

## 📝 Changelog

### 2025-11-05

**Phase 2.2 : Écran Factures** ✅
- Implémenté filtres avancés : recherche texte, statut, montant ±5%, technicien (admins)
- Créé tableau responsive avec colonnes enrichies (Solde Dû, Date émission, Responsable)
- Ajouté pagination shadcn (20 par page, ellipsis, navigation intelligente)
- Implémenté badges pour tous les statuts (partial_payment, litigation, etc.)
- Vue mobile avec cards empilées
- Backend : ajout statuts V2 dans schema, calcul outstandingBalance, filtres dans listWithFilter

**Phase 1.3.2 : Composants Sidebar shadcn** ✅
- Créé `sidebar.tsx` et `collapsible.tsx` avec composants shadcn complets
- Refactorisé `Sidebar.tsx` : utilisation variables CSS shadcn, styles ajustés maquettes
- Installé `@radix-ui/react-collapsible`

**Phase 1.1-1.2 : Installation & Layout** ✅
- Configuré shadcn/ui (Tailwind v4, thème Indigo)
- Créé layout global (Sidebar, Topbar, AppLayout)
- Navigation avec `<NavLink>`, responsive mobile/desktop

---

**Dernière mise à jour** : 2025-11-05
