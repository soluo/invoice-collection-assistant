# Suivi Développement V2 - ZenRelance

**Date de création :** 2025-11-05
**Dernière mise à jour :** 2025-11-12
**Statut global :** 🟡 En cours (Phase 1.1-1.2-1.3.2 + Phase 2.2 + Phase 2.5 + Phase 2.6 + Phase 2.8 complétées)
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
- Phase 1 (Design System) : 11/16 ✅✅✅✅✅✅✅✅✅✅✅⬜⬜⬜⬜⬜
- Phase 2 (Écrans) : 15/45 ✅✅✅✅✅✅✅✅⬜⬜
- Phase 3 (Intégrations) : 0/12 ⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜

---

## PHASE 1 : Design System & Layout 🎨

**Statut** : 🟡 En cours (1.1-1.2-1.3.2-1.3.7-1.3.8-1.3.9 complétées)
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

- [x] **1.3.7** ✅ Label (installé via MCP)
  - ✅ Fichier : `src/components/ui/label.tsx`
  - ✅ Utilisé dans formulaire InvoiceUpload pour accessibilité

- [x] **1.3.8** ✅ Input / Textarea (installés via MCP)
  - ✅ Fichier : `src/components/ui/input.tsx`
  - ✅ Fichier : `src/components/ui/textarea.tsx`
  - ✅ Utilisés dans formulaires InvoiceUpload et Invoices (filtres)

- [x] **1.3.9** ✅ Select / Dropdown (installé via MCP)
  - ✅ Fichier : `src/components/ui/select.tsx`
  - ✅ Utilisé dans formulaire de filtres Invoices (statut, technicien)

- [ ] **1.3.10** Sheet (Slide-over Panel)
  - Pour : Panel clients
  - Position : right
  - Max-width : 2xl
  - Overlay + animation translate-x

- [ ] **1.3.11** Créer composant Timeline custom
  - Fichier : `src/components/ui/Timeline.tsx`
  - Style : Cercle + ligne verticale
  - Props : items (array), variant (vertical/horizontal)

---

## PHASE 2 : Implémentation Écrans 🖥️

**Statut** : 🟡 En cours (2.2, 2.5, 2.6, 2.8 complétés/en cours)
**Prérequis** : Phase 1 complétée

**Note** : Les specs détaillées de chaque écran sont maintenant dans des fichiers séparés :

- [ ] **2.1** Dashboard Administrateur → [`SCREENS/2.1_Dashboard.md`](./SCREENS/2.1_Dashboard.md)
  - Fichier : `src/pages/Dashboard.tsx` (refonte)
  - Maquette : `specs/V2/mockups/dashboard_admin.html`
  - Statut : 🔴 Non commencé

- [x] **2.2** Factures (Liste) → [`SCREENS/2.2_Invoices.md`](./SCREENS/2.2_Invoices.md)
  - Fichier : `src/pages/Invoices.tsx` (refonte)
  - Maquette : `specs/V2/mockups/factures.html`
  - Statut : ✅ Complété

- [ ] **2.3** Détail Facture ⭐ NOUVEAU → [`SCREENS/2.3_InvoiceDetail.md`](./SCREENS/2.3_InvoiceDetail.md)
  - Fichier : `src/pages/InvoiceDetail.tsx` (à créer)
  - Maquette : `specs/V2/mockups/facture_detail.html`
  - Statut : 🔴 Non commencé

- [ ] **2.4** Clients → [`SCREENS/2.4_Clients.md`](./SCREENS/2.4_Clients.md)
  - Fichier : `src/pages/Clients.tsx` (à créer)
  - Maquette : `specs/V2/mockups/clients.html`
  - Statut : 🔴 Non commencé

- [x] **2.5** Clients à Appeler ⭐ NOUVEAU → [`SCREENS/2.5_CallPlan.md`](./SCREENS/2.5_CallPlan.md)
  - Fichier : `src/pages/CallPlan.tsx` (structure créée)
  - Maquette : `specs/V2/mockups/plan_appels.html`
  - Statut : 🟡 Structure de base créée

- [x] **2.6** Import Facture → [`SCREENS/2.6_InvoiceUpload.md`](./SCREENS/2.6_InvoiceUpload.md)
  - Fichier : `src/pages/InvoiceUpload.tsx` (refonte)
  - Maquette : `specs/V2/mockups/import_facture.html`
  - Statut : ✅ Complété

- [ ] **2.7** Rapprochement Bancaire ⭐ NOUVEAU → [`SCREENS/2.7_BankReconciliation.md`](./SCREENS/2.7_BankReconciliation.md)
  - Fichier : `src/pages/BankReconciliation.tsx` (à créer)
  - Maquette : `specs/V2/mockups/rapprochement.html`
  - Statut : 🔴 Non commencé

- [x] **2.8** Agenda des Relances ⭐ NOUVEAU → [`SCREENS/2.8_RemindersAgenda.md`](./SCREENS/2.8_RemindersAgenda.md)
  - Fichier : `src/pages/Agenda.tsx` (structure créée)
  - Maquette : `specs/V2/mockups/agenda.html`
  - Statut : 🟡 Structure de base créée

- [ ] **2.9** Réglages → [`SCREENS/2.9_Settings.md`](./SCREENS/2.9_Settings.md)
  - Fichier : `src/pages/Settings.tsx` (refonte)
  - Maquette : `specs/V2/mockups/reglages.html`
  - Statut : 🔴 Non commencé

---

## PHASE 3 : Intégrations & Features Avancées 🚀

**Statut** : 🔴 Non commencé
**Prérequis** : Phases 1 & 2 complétées

**Note** : Les specs détaillées sont maintenant dans [`PHASE_3_INTEGRATIONS.md`](./PHASE_3_INTEGRATIONS.md)

- [ ] **3.1** Intégration Chart.js
- [ ] **3.2** Intégration IA Gemini
- [ ] **3.3** Gestion Multi-Contacts Clients
- [ ] **3.4** Historique Détaillé Factures

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

# À installer (voir PHASE_3_INTEGRATIONS.md)
pnpm add chart.js react-chartjs-2       # Charts
pnpm add @google/generative-ai          # Gemini AI
pnpm add date-fns                        # Date utilities
```

### shadcn/ui Components
Via MCP :
- Button ✅
- Avatar ✅
- Label ✅
- Input ✅
- Textarea ✅
- Select ✅
- Pagination ✅
- Card
- Badge
- Dialog
- Tabs
- Sheet (Slide-over)
- DatePicker (Calendar + Popover)

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
- **Icons** : lucide-react (déjà installé)
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
6. **Phase 1.3 (suite)** : Installer les composants shadcn restants (Card, Badge, Dialog, Tabs, Sheet, Timeline)
7. **Phase 2.3** : Créer l'écran Détail Facture avec historique et timeline (`/invoices/:id`)
8. **Phase 2.1** : Refonte Dashboard avec KPIs et graphiques

---

## 📝 Changelog

### 2025-11-12

**Phase 2.5 & 2.8 : Structure pages Agenda et Plan d'appels** ✅
- Créées pages vides : `src/pages/Agenda.tsx`, `src/pages/CallPlan.tsx`
- Routes ajoutées dans `App.tsx` : `/agenda`, `/call-plan`
- Navigation fonctionnelle (liens déjà présents dans Sidebar/Topbar)

**Améliorations écran Factures** ✅
- Ajout dropdown actions par facture (marquer envoyée, payée, ajouter paiement)
- Sélection date d'envoi avec DatePicker
- Ajout paiements partiels avec gestion multi-paiements (chèques)
- Workflow états factures amélioré : draft → sent → paid
- Badge statut "Mega" avec logique prioritaire

**Backend** ✅
- Schema événements (`events` table) pour tracking actions utilisateurs
- Mutations paiements : `addPayment`, `markAsPaid`, `markAsSent`
- Calcul `outstandingBalance` automatique

### 2025-11-06

**Phase 1.3.8-1.3.9 : Composants shadcn Input, Textarea, Select** ✅
- Installés via MCP : Input, Textarea, Select
- Utilisés dans formulaire InvoiceUpload et filtres Invoices

**Phase 2.2 : Améliorations liste Factures** ✅
- Tri côté serveur sur 4 colonnes : Émission, Montant TTC, Solde Dû, Échéance (défaut: Date émission DESC)
- Icônes de tri cliquables (ArrowUpDown/ArrowUp/ArrowDown) avec toggle DESC → ASC
- Synchronisation filtres + tri avec URL (partage, bookmark, navigation)
- Backend : ajout paramètres `sortBy` et `sortOrder` dans `invoices.list` et `listWithFilter`

**Phase 2.6 : Import Facture** ✅
- Refonte complète de `InvoiceUpload.tsx` avec design V2 indigo theme
- Zone drag-drop redessinée : h-64, border-dashed indigo-300, icône Upload (lucide-react)
- Formulaire structuré en 2 sections : Détails facture + Contact pour la relance
- Nouveaux champs contact : `contactName`, `contactEmail`, `contactPhone`
- UX responsive : drag-drop sur desktop, formulaire direct sur mobile
- Bandeau succès après extraction IA + affichage fichier avec bouton "Changer"
- Backend : schema et mutations mis à jour avec champs contact, extraction IA enrichie
- Date d'échéance par défaut : J+14 (au lieu de J+7)

**Phase 1.3.3 : Composant Label shadcn** ✅
- Installé composant `Label` via MCP shadcn
- Utilisé dans formulaire InvoiceUpload pour accessibilité

**Réorganisation des specs** ✅
- Création du dossier `SCREENS/` avec 9 fichiers de specs détaillées (2.1 à 2.9)
- Création du fichier `PHASE_3_INTEGRATIONS.md` pour les intégrations avancées
- Allègement de `V2_TRACKING.md` : conserve Phase 1 complète + résumés des Phases 2-3
- Bénéfice : Réduction du contexte de ~835 lignes → ~350 lignes dans le fichier principal

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

**Dernière mise à jour** : 2025-11-12
