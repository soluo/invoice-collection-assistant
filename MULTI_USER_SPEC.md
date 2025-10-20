# Spécification : Système Multi-Utilisateurs avec Organisations

**Date de création :** 2025-10-20
**Statut :** En planification

---

## Contexte

Mise en place d'un système multi-utilisateurs pour une organisation type :
- **Alexandre** (prospect, patron) : admin, voit toutes les factures
- **Nolwenn** (épouse, gestion administrative) : admin, voit toutes les factures
- **5 techniciens** : accès limité à leurs propres factures uniquement

---

## 1. Architecture des Données

### Nouveaux Schémas Convex

#### Table `organizations`
```typescript
{
  name: string,                    // Nom de la société
  senderEmail: string,             // Email expéditeur pour les relances
  createdAt: number,
  // Paramètres de relances (déplacés depuis reminderSettings)
  firstReminderDelay: number,
  secondReminderDelay: number,
  thirdReminderDelay: number,
  firstReminderTemplate: string,
  secondReminderTemplate: string,
  thirdReminderTemplate: string,
}
```

#### Table `users` (extension de authTables.users)
```typescript
{
  // Champs Convex Auth
  name?: string,
  image?: string,
  email?: string,
  emailVerificationTime?: number,
  phone?: string,
  phoneVerificationTime?: number,
  isAnonymous?: boolean,

  // Nos champs personnalisés
  role?: "admin" | "technicien",
  organizationId?: Id<"organizations">,
  invitedBy?: Id<"users">,  // undefined pour le créateur de l'org
}
```

#### Table `invitations`
```typescript
{
  email: string,
  organizationId: Id<"organizations">,
  role: "admin" | "technicien",
  token: string,                   // Token unique pour l'invitation
  status: "pending" | "accepted" | "expired",
  invitedBy: Id<"users">,
  expiresAt: number,
  createdAt: number,
}
```

### Modifications des Schémas Existants

#### Table `invoices` (modifications)
```typescript
// Ajouter :
organizationId: Id<"organizations">,
createdBy: Id<"users">,          // Le technicien qui a créé la facture

// Nouveaux index :
by_organization: organizationId
by_organization_and_creator: [organizationId, createdBy]
by_organization_and_status: [organizationId, status]
```

#### Table `reminderSettings` (à supprimer)
Les paramètres de relances sont déplacés vers `organizations`

#### Table `reminders` (modifications)
```typescript
// Ajouter :
organizationId: Id<"organizations">,
```

---

## 2. Authentification

### Migration de l'Auth
- **Actuel :** Anonymous auth
- **Cible :** Email/Password (Convex Auth)

### Flows d'Authentification

#### Flow d'Inscription (Création d'Organisation)
1. Utilisateur remplit : email, mot de passe, nom, nom de société
2. Système crée :
   - L'organisation
   - L'utilisateur avec role "admin"
   - Paramètres de relances par défaut pour l'organisation
3. Utilisateur connecté automatiquement

#### Flow d'Invitation
1. Admin envoie invitation (email + role)
2. Système crée une invitation avec token unique
3. Email envoyé avec lien d'invitation
4. Destinataire clique sur le lien
5. Destinataire crée son compte (nom, mot de passe)
6. Utilisateur rejoint automatiquement l'organisation

### Limitations
- Un utilisateur ne peut appartenir qu'à une seule organisation
- Pas de migration des données existantes (on repart de zéro)

---

## 3. Permissions & Visibilité

### Rôle : Admin (Alexandre, Nolwenn)

**Permissions :**
- ✅ Voir toutes les factures de l'organisation
- ✅ Créer des factures (pour eux-mêmes ou assignées à un technicien)
- ✅ Modifier n'importe quelle facture
- ✅ Supprimer n'importe quelle facture
- ✅ Envoyer des relances pour n'importe quelle facture
- ✅ Inviter des utilisateurs
- ✅ Gérer les utilisateurs (changer rôles, supprimer)
- ✅ Configurer les paramètres d'organisation
- ✅ Configurer les paramètres de relances (centralisés)

### Rôle : Technicien

**Permissions :**
- ✅ Voir uniquement ses propres factures
- ✅ Créer (uploader) des factures
- ✅ Supprimer ses propres factures (pour ré-import si erreur)
- ✅ Envoyer des relances pour ses propres factures
- ❌ Modifier les factures (immutables après import)
- ❌ Voir les factures des autres techniciens
- ❌ Inviter des utilisateurs
- ❌ Modifier les paramètres d'organisation

---

## 4. Interface Utilisateur

### Modifications des Écrans Existants

#### Dashboard
- **Admin :** Filtre en haut "Toutes les factures" | "Mes factures" | Liste des techniciens
- **Technicien :** Affichage direct de ses factures (pas de filtre)
- Statistiques adaptées au filtre sélectionné

#### Liste des Factures (Ongoing, Paid)
- Même logique de filtrage que le dashboard
- Badge visible indiquant le créateur de la facture (pour les admins)

#### Upload de Facture
- Aucun changement pour les techniciens
- Pour les admins : option "Assigner à" pour choisir le technicien

#### Paramètres
- **Déplacer :** Configuration des relances vers section "Organisation"
- **Ajouter :**
  - Email expéditeur de l'organisation
  - Section "Gestion de l'équipe"
  - Bouton "Inviter un utilisateur"

### Nouveaux Écrans

#### Page d'Inscription
- Champs : Email, Mot de passe, Nom, Nom de société
- Bouton "Créer mon organisation"
- Lien vers "J'ai déjà un compte"

#### Page de Connexion
- Champs : Email, Mot de passe
- Bouton "Se connecter"
- Lien vers "Créer une organisation"

#### Page d'Acceptation d'Invitation
- Affichage : "Vous êtes invité à rejoindre [Nom Organisation]"
- Champs : Nom, Mot de passe
- Bouton "Rejoindre l'organisation"

#### Modal d'Invitation (dans Paramètres)
- Champs : Email, Rôle (Admin/Technicien)
- Bouton "Envoyer l'invitation"
- Liste des invitations en attente avec statut

#### Section Gestion de l'Équipe (dans Paramètres)
- Tableau : Nom, Email, Rôle, Date d'ajout, Actions
- Actions : Changer le rôle, Supprimer

---

## 5. Relances Automatiques

### Configuration Centralisée
- Paramètres au niveau de l'organisation (pas par utilisateur)
- Délais configurables (1ère, 2ème, 3ème relance)
- Templates d'emails personnalisables
- **Email expéditeur :** Utiliser l'email de l'organisation (ex: contact@entreprise.fr)

### Système Cron
- Action Convex Cron qui s'exécute quotidiennement
- Logique :
  1. Récupérer toutes les factures overdue de toutes les organisations
  2. Vérifier le statut et la date de dernière relance
  3. Envoyer la relance appropriée (1ère, 2ème, 3ème)
  4. Mettre à jour le statut de la facture
  5. Enregistrer l'historique dans `reminders`

### Envoi Manuel
- Admins et techniciens peuvent déclencher des relances manuellement
- Respecte les templates de l'organisation
- Historique conservé dans `reminders`

---

## 6. Plan d'Implémentation

### Phase 1 : Backend - Schémas & Auth ✅ COMPLÉTÉE
- [x] 1.1. Créer le schéma `organizations`
- [x] 1.2. Étendre la table `users` avec champs personnalisés (role, organizationId, invitedBy)
- [x] 1.3. Créer le schéma `invitations`
- [x] 1.4. Modifier le schéma `invoices` (ajouter organizationId, createdBy, nouveaux index)
- [x] 1.5. Modifier le schéma `reminders` (ajouter organizationId)
- [x] 1.6. Supprimer le schéma `reminderSettings` (FAIT - wrapper de compatibilité créé)
- [x] 1.7. Retirer Anonymous auth, garder Password uniquement
- [x] 1.8. Créer mutation `createOrganizationWithAdmin` (création org + premier admin)
- [x] 1.9. Créer mutations pour les invitations (inviteUser, acceptInvitation, listInvitations, listUsers)
- [x] 1.10. Créer mutations pour la gestion des utilisateurs (updateUserRole, removeUser)
- [x] 1.11. Créer mutations pour la gestion des invitations (deleteInvitation, regenerateInvitationToken)

### Phase 2 : Permissions & Queries ✅ COMPLÉTÉE
- [x] 2.1. Créer helpers de permissions (isAdmin, canAccessInvoice, etc.)
- [x] 2.2. Modifier `invoices.list` pour filtrer par org/user selon rôle
- [x] 2.3. Créer query `invoices.listWithFilter` pour les admins
- [x] 2.4. Modifier toutes les mutations invoices (create, update, delete) avec checks de permissions
- [x] 2.5. Sécuriser toutes les queries/mutations invoices (listOngoing, listPaid, sendReminder)
- [x] 2.6. Modifier `dashboard.ts` pour supporter les filtres
- [x] 2.7. Sécuriser `reminders.ts` avec vérifications permissions
- [x] 2.8. Rendre organizationId et createdBy obligatoires dans schema
- [x] 2.9. Nettoyer les données existantes (redémarrage à zéro)

### Phase 3 : Relances Automatiques
- [ ] 3.1. Migrer la configuration des relances vers `organizations`
- [ ] 3.2. Créer action `sendReminder` avec support de l'email expéditeur org
- [ ] 3.3. Créer action cron `checkAndSendReminders` (quotidienne)
- [ ] 3.4. Tester l'envoi d'emails avec l'adresse de l'organisation

### Phase 4 : Interface Utilisateur - Auth ✅ COMPLÉTÉE
- [x] 4.1. Créer composant `SignupForm.tsx` (avec nom de société)
- [x] 4.2. Créer composant `LoginForm.tsx` (SignInForm.tsx)
- [x] 4.3. Créer page `/signup` et `/login`
- [x] 4.4. Créer page `/accept-invitation/:token`
- [x] 4.5. Modifier `App.tsx` pour gérer les nouvelles routes auth
- [x] 4.6. Gérer la redirection selon l'état d'auth
- [x] 4.7. Gestion d'erreur améliorée (déconnexion si échec création org/invitation)
- [x] 4.8. Loading state contextualisé (message clair pendant création)

### Phase 5 : Interface Utilisateur - Gestion d'Équipe ✅ COMPLÉTÉE
- [x] 5.1. Créer composant `InviteUserModal.tsx`
- [x] 5.2. Créer composant `TeamManagement.tsx` (liste users, actions)
- [x] 5.3. Liste des invitations intégrée dans `TeamManagement.tsx`
- [x] 5.4. Intégrer ces composants dans la page Settings (onglets)
- [x] 5.5. Créer composant `OrganizationSettings.tsx` avec email expéditeur
- [x] 5.6. Actions utilisateurs : changer rôle, retirer de l'organisation
- [x] 5.7. Actions invitations : copier lien, regénérer, supprimer
- [x] 5.8. Filtrage des onglets Settings selon le rôle (admins only pour Org/Team)

### Phase 6 : Interface Utilisateur - Filtres & Adaptations
- [ ] 6.1. Créer composant `InvoiceFilterBar.tsx` (pour les admins)
- [ ] 6.2. Adapter `Dashboard.tsx` pour supporter les filtres
- [ ] 6.3. Adapter `InvoiceList.tsx` pour afficher le créateur (badge)
- [ ] 6.4. Adapter `OngoingInvoices.tsx` et `PaidInvoices.tsx`
- [ ] 6.5. Adapter `InvoiceUpload.tsx` (option "Assigner à" pour admins)
- [ ] 6.6. Adapter `ReminderSettings.tsx` (déplacer vers paramètres org)

### Phase 7 : Tests & Nettoyage
- [ ] 7.1. Tester le flow d'inscription + création org
- [ ] 7.2. Tester le flow d'invitation + acceptation
- [ ] 7.3. Tester les permissions admin (voir toutes factures, filtres)
- [ ] 7.4. Tester les permissions technicien (isolation des données)
- [ ] 7.5. Tester les relances automatiques
- [ ] 7.6. Tester les relances manuelles
- [ ] 7.7. Nettoyer toutes les données existantes (drop tables si besoin)
- [ ] 7.8. Vérifier tous les index Convex
- [ ] 7.9. Tester avec données de production simulées
- [ ] 7.10. Mettre à jour la documentation (CLAUDE.md, README)

---

## 7. Points Techniques Importants

### Sécurité
- Toutes les queries/mutations doivent vérifier l'appartenance à l'organisation
- Validation des tokens d'invitation (expiration, unicité)
- Hachage des mots de passe (géré par Convex Auth)

### Performance
- Utiliser les index Convex pour toutes les requêtes filtrant par org
- Index composés pour les requêtes complexes (org + status, org + creator)

### Email
- Configurer l'envoi d'emails via l'API Convex
- Support de l'email expéditeur personnalisé (From: organisation.senderEmail)
- Templates HTML pour les invitations et les relances

### Migration
- Pas de migration de données (redémarrage à zéro)
- Possibilité d'ajouter un script d'import CSV si besoin futur

---

## 8. Estimation

**Temps de développement estimé :** 2-3 jours

**Répartition :**
- Phase 1 (Backend) : 4-6 heures
- Phase 2 (Permissions) : 3-4 heures
- Phase 3 (Relances) : 2-3 heures
- Phase 4 (Auth UI) : 3-4 heures
- Phase 5 (Gestion équipe UI) : 3-4 heures
- Phase 6 (Filtres & Adaptations UI) : 4-5 heures
- Phase 7 (Tests & Nettoyage) : 2-3 heures

---

## 9. Notes & Décisions

### Décisions Validées
- ✅ Auth : Email/Password (recommandé validé)
- ✅ Workflow : Techniciens créent leurs factures
- ✅ Permissions : Factures immutables après import, techniciens peuvent supprimer pour ré-import
- ✅ Relances : Configuration centralisée au niveau organisation
- ✅ Multi-org : Un utilisateur = une organisation uniquement
- ✅ Migration : Pas de migration, redémarrage à zéro

### Questions en Suspens
- ⏳ Gestion des emails : Quel service d'envoi d'emails ? (Resend, SendGrid, etc.)
- ⏳ Design des emails : Garder simple ou templates avancés ?
- ⏳ Expiration des invitations : 7 jours par défaut ?

---

## 10. Changelog

- **2025-10-20** : Création de la spécification initiale
- **2025-10-20** : ✅ **Phase 1 COMPLÉTÉE** - Backend (schémas + auth + mutations)
  - Créé tables : `organizations`, `invitations`
  - Étendu table `users` avec champs personnalisés (role, organizationId, invitedBy)
  - Modifié tables : `invoices` (+ organizationId, createdBy), `reminders` (+ organizationId)
  - Retiré provider Anonymous, gardé Password uniquement
  - ✅ Refactorisation : supprimé table `profiles`, étendu directement `users` (meilleure pratique Convex Auth)
  - Créé fichier `convex/organizations.ts` avec 12 fonctions :
    - `createOrganizationWithAdmin` : création org + premier admin avec paramètres par défaut
    - `inviteUser` : inviter un utilisateur (génère token, expire après 7j) + validation email
    - `acceptInvitation` : accepter une invitation
    - `listInvitations` : lister les invitations (admins uniquement)
    - `listUsers` : lister les utilisateurs de l'org (admins uniquement)
    - `getCurrentOrganization` : récupérer l'org courante
    - `updateOrganizationSettings` : mettre à jour les paramètres (admins uniquement)
    - `getInvitationByToken` : récupérer les détails d'une invitation (public)
    - `deleteInvitation` : supprimer une invitation (admins uniquement)
    - `regenerateInvitationToken` : regénérer le token d'une invitation (admins uniquement)
    - `updateUserRole` : changer le rôle d'un utilisateur (admins uniquement, protection dernier admin)
    - `removeUser` : retirer un utilisateur de l'organisation (admins uniquement, soft delete)
  - Supprimé table `reminderSettings`, paramètres déplacés vers `organizations`
  - Créé wrapper de compatibilité dans `reminderSettings.ts` pour compatibilité avec ancien composant
  - Note : organizationId et createdBy temporairement optionnels (seront obligatoires en Phase 2)

- **2025-10-20** : ✅ **Phase 4 COMPLÉTÉE** - Interface Auth
  - Créé `SignupForm.tsx` : formulaire d'inscription avec org name + email/password
  - Créé `AcceptInvitation.tsx` : page d'acceptation d'invitation avec validation token
  - Modifié `SignInForm.tsx` : lien vers signup
  - Routes auth configurées dans `App.tsx` : `/signup`, `/login`, `/accept-invitation/:token`
  - Flow signup : sessionStorage → création org dans useEffect après auth
  - Flow invitation : sessionStorage → acceptation dans useEffect après auth
  - Gestion d'erreur robuste : déconnexion automatique si échec + message explicite
  - Loading state contextualisé : "Création de votre organisation..." ou "Acceptation de l'invitation..."

- **2025-10-20** : ✅ **Phase 5 COMPLÉTÉE** - Interface Gestion d'Équipe
  - Créé `TeamManagement.tsx` : liste users + liste invitations + actions
  - Créé `InviteUserModal.tsx` : modal d'invitation avec email + rôle
  - Créé `OrganizationSettings.tsx` : paramètres org (email expéditeur, délais, templates, signature)
  - Intégré dans `App.tsx` → SettingsPage avec 3 onglets
  - Actions utilisateurs : menu dropdown avec "Changer le rôle" et "Retirer de l'organisation"
  - Actions invitations : boutons "Copier le lien", "Regénérer", "Supprimer"
  - Filtrage des onglets selon le rôle : techniciens voient uniquement "Relances (ancien)"
  - Protection backend : impossible de retirer le dernier admin

- **2025-10-21** : ✅ **Phase 2 COMPLÉTÉE** - Permissions & Queries (Sécurité critique)
  - Créé `convex/permissions.ts` : système complet de gestion des permissions
    - Helper `getUserWithOrg()` : récupère l'utilisateur avec contexte organisation
    - Helpers de vérification : `isAdmin()`, `canAccessInvoice()`, `canModifyInvoice()`, `canDeleteInvoice()`, `canUpdateInvoiceStatus()`, `canSendReminder()`
    - Assertions pour validation : `assertIsAdmin()`, `assertCanAccessInvoice()`, etc.
    - Type `UserWithOrg` pour typage fort
  - Sécurisé `convex/invoices.ts` avec contrôle d'accès strict :
    - `list()` : filtrage automatique admin (toutes factures org) vs technicien (ses propres factures uniquement)
    - `listWithFilter()` : nouvelle query pour admins avec filtre optionnel par technicien
    - `create()` : ajout paramètre `assignToUserId` pour que les admins puissent assigner des factures
    - `update()` : seuls les admins peuvent modifier (techniciens = factures immutables)
    - `deleteInvoice()` : admins (toutes) + techniciens (leurs propres factures pour ré-import)
    - `updateStatus()` + `markAsPaid()` : contrôle basé sur rôle et ownership
    - `sendReminder()` : vérification permissions avant envoi
    - `listOngoing()` + `listPaid()` : filtrage automatique par rôle avec index optimisés
  - Adapté `convex/dashboard.ts` pour filtrage dynamique :
    - `getDashboardStats()` : nouveau paramètre `filterByUserId` pour admins
    - Stats calculées selon le rôle (admin = org entière, technicien = ses factures)
  - Sécurisé `convex/reminders.ts` :
    - Ajout champ `organizationId` obligatoire lors de la création
    - Vérifications permissions via `assertCanAccessInvoice`
    - Queries filtrées par organisation avec index
  - Mis à jour `convex/schema.ts` : **BREAKING CHANGE**
    - `organizationId` et `createdBy` maintenant **obligatoires** dans `invoices`
    - `organizationId` maintenant **obligatoire** dans `reminders`
    - Permet d'utiliser les index composés pour performances optimales
  - **Nettoyage base de données** (redémarrage à zéro comme prévu dans spec) :
    - Supprimé toutes les données dans `invoices`, `reminders`, `users`
    - Note importante : nécessite aussi de nettoyer `authAccounts`, `authSessions`, `authRefreshTokens` pour éviter comptes orphelins
  - **Utilisation systématique des index Convex** :
    - `by_organization` pour queries admin sur toutes les factures
    - `by_organization_and_creator` pour filtrage par technicien
    - `by_organization_and_status` pour queries par statut
    - Performances optimales garanties quelle que soit la taille de la base

## 11. Bugs Corrigés

### 🔴 Priorité Haute (2025-10-20)
1. **Gestion d'erreur incomplète dans App.tsx** ✅
   - Problème : Utilisateur authentifié mais sans organisation si création/invitation échoue
   - Solution : Déconnexion automatique + message d'erreur + timeout 2s

2. **Pas de validation du format email dans inviteUser** ✅
   - Problème : Invitations avec emails invalides acceptées
   - Solution : Regex de validation côté backend

3. **Onglets Settings visibles pour les techniciens** ✅
   - Problème : Techniciens voyaient onglets "Organisation" et "Équipe" mais recevaient erreurs
   - Solution : Filtrage des onglets selon le rôle (adminOnly: true)

4. **Table reminderSettings toujours présente** ✅
   - Problème : Table obsolète dans le schema
   - Solution : Supprimée du schema, wrapper de compatibilité créé

### 🟡 Priorité Moyenne
5. **Pas de mutations pour gérer les utilisateurs** ✅
   - Solution : Créé `updateUserRole` et `removeUser` avec protection dernier admin

6. **Loading state peu clair pendant création org/invitation** ✅
   - Solution : Message contextualisé selon le flow (pendingOrgData vs pendingInvitationData)

### 🔴 Priorité Haute (2025-10-21)
7. **Erreur signup "Cannot read properties of null (reading '_id')" après nettoyage partiel de la base** ✅
   - Problème : Après avoir nettoyé uniquement `users` sans les tables auth, tentative de signup avec même email échoue
   - Cause : Comptes orphelins dans `authAccounts` pointent vers des `userId` inexistants
   - Symptôme : `Password.ts:120` essaie de lire `user._id` mais `user` est `null`
   - Solution : Lors d'un reset complet, nettoyer également `authAccounts`, `authSessions`, `authRefreshTokens`
   - Leçon : Pour un reset complet, nettoyer **toutes** les tables (application + auth) sauf `authVerificationCodes`, `authVerifiers`, `authRateLimits`

### 🟢 Notes
- Bug 7 (cleanup invitations expirées via cron) : reporté à Phase 3
- Bug 9 (limit nombre invitations) : reporté ultérieurement
