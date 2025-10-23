# Spécification : Système Multi-Utilisateurs avec Organisations

**Date de création :** 2025-10-20
**Statut :** En cours — Phases 1 & 2 livrées, Phase 3 en développement progressif

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

### Normalisation des emails
- ✅ Toutes les adresses email sont trimées et stockées en minuscules côté Convex Auth et invitations
- ✅ Les formulaires (connexion, inscription, acceptation d'invitation) envoient systématiquement l'email normalisé
- ✅ Connexion rétro-compatible : tentative en minuscule puis avec la casse d'origine pour supporter les comptes déjà créés

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

#### Header global
- ✅ Bouton "Se déconnecter" remplacé par un avatar circulaire avec initiales de l'utilisateur connecté
- ✅ Clic sur l'avatar ouvre un menu affichant nom + email et le bouton "Se déconnecter"
- ✅ Fermeture automatique du menu au clic extérieur, touche `Escape` ou changement de route

#### Dashboard
- **Admin :** Filtre en haut "Toutes les factures" | "Mes factures" | Liste des techniciens (⏳ À implémenter)
- **Technicien :** Affichage direct de ses factures (pas de filtre)
- Statistiques adaptées au filtre sélectionné
- ✅ Affichage du créateur sous chaque facture urgente (admin uniquement)

#### Liste des Factures (Ongoing, Paid, InvoiceList)
- ✅ Affichage du créateur visible pour les admins :
  - `InvoiceList.tsx` : colonne "Créé par" (desktop) + ligne dans cards (mobile)
  - `OngoingInvoices.tsx` + `PaidInvoices.tsx` : info créateur en petit texte
- ⏳ Logique de filtrage Dashboard à reporter sur ces pages (futur)

#### Upload de Facture
- Aucun changement pour les techniciens
- Pour les admins : option "Assigner à" pour choisir le technicien

#### Paramètres
- **Déplacer :** Configuration des relances vers section "Organisation"
- **Ajouter :**
  - Email expéditeur de l'organisation
  - Section "Gestion de l'équipe"
  - Bouton "Inviter un utilisateur"
  - Toggle "Envoi automatique des relances" (avec autoSendReminders)
  - Connexion OAuth Outlook + statut token (OrganizationSettings.tsx)

### Nouveaux Écrans

#### Page d'Inscription
- Champs : Email, Mot de passe, Nom, Nom de société
- Bouton "Créer mon organisation"
- Lien vers "J'ai déjà un compte"

#### Page de Connexion
- Champs : Email, Mot de passe
- Bouton "Se connecter"
- Lien vers "Créer une organisation"
- ✅ Gestion d'erreur inline : message "Identifiants incorrects" sans toast, réinitialisation du formulaire après tentative

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

#### Page Factures (`/invoices`) ✅ NOUVEAU
- **Vue table complète** avec toutes les factures (admin) ou ses factures (technicien)
- **Section filtres** :
  - Dropdown "Responsable" (admin uniquement) : filtre par technicien
  - Placeholders "Date" et "Montant" (à implémenter)
- **Colonnes du tableau** :
  - Numéro | Client | Date facture | Montant | Échéance | État | Responsable* | Actions
  - *Colonne "Responsable" visible uniquement pour admin
- **État simplifié** calculé dynamiquement :
  - "Payée" (vert) si status = paid
  - "En retard" (rouge) si non payée ET échéance dépassée
  - "En cours" (bleu) si non payée ET échéance future
- **Actions contextuelles** :
  - "Relancer" : visible si non payée ET en retard → ouvre ReminderModal
  - "Marquer payée" : visible si non payée
- **Bouton "Ajouter une facture"** :
  - Positionné en haut à droite
  - Redirige vers `/upload?returnTo=/invoices`
  - Retour automatique vers `/invoices` après upload réussi
- **Vue responsive** : Cards empilées sur mobile
- **Navigation** : Accessible via bouton "Factures" dans le header

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

### Phase 3 : Génération & Envoi de Relances via OAuth

**Philosophie :** Confiance avant Automatisation

**Workflow par défaut (envoi manuel) :**
1. Cron quotidien → GÉNÈRE les relances (reminders en status "pending")
2. Admin reçoit notification → consulte la liste des relances générées
3. Admin décide d'envoyer immédiatement les relances pertinentes ou de les supprimer
4. Historique conservé pour suivre les envois et les suppressions

**Workflow avancé (envoi automatique activé) :**
- Cron génère ET envoie directement pour les organisations ayant activé `autoSendReminders`
- Toujours possibilité de désactiver l'envoi automatique si besoin

#### Backend (Convex)

**3.1. Modifications du schéma (convex/schema.ts)**
- [x] 3.1.1. Modifier table `organizations` - Ajouter :
  - `autoSendReminders: v.boolean()` (par défaut : false)
  - `emailProvider: v.optional(v.union(v.literal("microsoft"), v.literal("google"), v.literal("infomaniak")))`
  - `emailConnectedAt: v.optional(v.number())`
  - `emailAccessToken: v.optional(v.string())`
  - `emailRefreshToken: v.optional(v.string())`
  - `emailTokenExpiresAt: v.optional(v.number())`
  - `emailConnectedBy: v.optional(v.id("users"))`
  - `emailAccountInfo: v.optional(v.object({ email: v.string(), name: v.string() }))`

- [ ] 3.1.2. Modifier table `reminders` - Ajouter :
  - `sendStatus: v.union(v.literal("pending"), v.literal("sending"), v.literal("sent"), v.literal("failed"), v.literal("cancelled"))`
  - `sentAt: v.optional(v.number())`
  - `sendError: v.optional(v.string())`
  - `lastSendAttempt: v.optional(v.number())`
  - `generatedByCron: v.boolean()`
  - `cancelledBy: v.optional(v.id("users"))`
  - `cancelledAt: v.optional(v.number())`

- [ ] 3.1.3. Ajouter indexes pour reminders :
  - `.index("by_sendStatus", ["sendStatus"])`
  - `.index("by_organization_and_status", ["organizationId", "sendStatus"])`

**3.2. OAuth Flow Microsoft (convex/oauth.ts - nouveau fichier)**
- [x] 3.2.1. Créer query `getOAuthUrl` : Génère l'URL d'autorisation Microsoft
- [x] 3.2.2. Créer mutation `disconnectEmailProvider` : Supprime les tokens OAuth
- [x] 3.2.3. Créer action Node.js `refreshAccessToken` (internal) : Renouvelle l'access token
- [x] 3.2.4. Créer action `refreshTokenIfNeeded` : Vérifie et rafraîchit le token si nécessaire
- [x] 3.2.5. Créer HTTP route `GET /oauth/microsoft/callback` :
  - Échange code contre tokens
  - Récupère infos compte via Graph API
  - Met à jour organizations
  - Redirige vers /settings?tab=organization&oauth=success

**3.3. Génération des relances (convex/reminders.ts - enrichir)**
- [ ] 3.3.1. Créer action `generateReminder` :
  - Args : `invoiceId`, `reminderType`, `generatedByCron`
  - Récupère invoice + org + template approprié
  - Construit l'email avec `buildReminderEmailFromTemplate`
  - Crée reminder avec `sendStatus: "pending"` (pas d'envoi)
  - Retourne ID du reminder créé

- [ ] 3.3.2. Créer helper `buildReminderEmailFromTemplate` :
  - Args : `organizationId`, `invoiceId`, `reminderType`
  - Récupère template + données facture
  - Remplace variables : {numero_facture}, {nom_client}, {montant}, {date_facture}, {date_echeance}, {jours_retard}
  - Ajoute signature
  - Retourne : `{ subject: string, body: string }`

**3.4. Gestion des relances en attente (convex/reminders.ts)**
- [ ] 3.4.1. Créer mutation `updateReminderContent` :
  - Args : `reminderId`, `emailSubject`, `emailContent`
  - Permet de modifier le contenu tant que `sendStatus === "pending"`
  - Met à jour la date de dernière modification pour l'audit

- [ ] 3.4.2. Créer mutation `deleteReminder` :
  - Args : `reminderId`, `reason`
  - Vérifie les permissions (admin ou créateur)
  - Marque la relance comme `sendStatus: "cancelled"` et renseigne `cancelledBy`, `cancelledAt`

- [ ] 3.4.3. Créer mutation `deleteReminders` (bulk) :
  - Args : `reminderIds: Id<"reminders">[]`, `reason`
  - Supprime en lot les relances sélectionnées (statut `cancelled`)

**3.5. Envoi des relances (convex/email.ts - nouveau fichier)**
- [ ] 3.5.1. Créer action Node.js `sendReminder` :
  - Args : `reminderId`
  - Récupère reminder et vérifie `sendStatus === "pending"` ou `"failed"`
  - Récupère org et vérifie qu'un compte email est connecté
  - Vérifie validité du token (refresh si nécessaire)
  - Update reminder : `sendStatus: "sending"`
  - Envoie via Microsoft Graph API : POST /me/sendMail
  - Succès → Update : `sendStatus: "sent"`, `sentAt`
  - Échec → Update : `sendStatus: "failed"`, `sendError`, `lastSendAttempt`
  - Met à jour le statut de la facture (first_reminder, second_reminder, etc.)

- [ ] 3.5.2. Créer action `sendAllPendingReminders` :
  - Query tous les reminders avec `sendStatus: "pending"`
  - Appelle `sendReminder` pour chacun
  - Retourne statistiques : `{ sent: 5, failed: 1 }`

- [ ] 3.5.3. Créer action `retrySendReminder` :
  - Args : `reminderId`
  - Vérifie que `sendStatus === "failed"`
  - Update : `sendStatus: "pending"`
  - Appelle `sendReminder`

**3.6. Cron automatique (convex/cron.ts - nouveau fichier)**
- [ ] 3.6.1. Créer action Cron `generateDailyReminders` (quotidienne, 8h00) :
  - Pour chaque organisation
  - Trouver factures overdue qui nécessitent une relance
  - Déterminer type de relance (1ère, 2ème, 3ème)
  - Vérifier qu'une relance de ce type n'existe pas déjà
  - GÉNÉRER la relance (pas d'envoi ici)
  - Si `autoSendReminders` activé : envoyer immédiatement les relances générées
  - Retourner statistiques : combien de reminders générés par org

- [ ] 3.6.2. Créer helper `findOverdueInvoices` :
  - Factures avec status "overdue", "first_reminder", etc.
  - Respecte les délais configurés
  - Exclut factures qui ont déjà une relance pending/sending/sent du type approprié

- [ ] 3.6.3. Créer helper `determineReminderType` :
  - Calcule jours de retard
  - Compare avec délais configurés
  - Retourne le type approprié

**3.7. Queries pour l'UI (convex/reminders.ts)**
- [ ] 3.7.1. Créer query `getPendingReminders` :
  - Args : `organizationId`
  - Liste reminders avec `sendStatus: "pending"`
  - Triés par date (plus récents en premier)

- [ ] 3.7.2. Créer query `getSendingReminders` :
  - Args : `organizationId`
  - Liste reminders avec `sendStatus: "sending"`
  - Permet d'afficher la progression des envois en cours

- [ ] 3.7.3. Créer query `getReminderStats` :
  - Args : `organizationId`
  - Retourne : `{ pending: number, sending: number, sent: number, failed: number, cancelled: number }`
  - Stats pour afficher dans le Dashboard

#### Frontend (React)

**3.8. Section Connexion Email (OrganizationSettings.tsx)**
- [x] 3.8.1. Ajouter section "Envoi automatique des relances" :
  - Checkbox `autoSendReminders` liée à Convex (`updateOrganizationSettings`)
  - Texte explicatif sur le workflow manuel vs automatique
  - Valeur initialisée depuis `getCurrentOrganization.autoSendReminders`

- [x] 3.8.2. Ajouter section "Connexion Email (Outlook)" :
  - Bouton "Connecter Outlook" (redirige vers `getOAuthUrl`)
  - Affichage compte connecté (nom + email) + date de connexion + statut token actif/expiré
  - Alerte configuration manquante si URL indisponible
  - Bouton "Déconnecter" si connecté (mutation `disconnectEmailProvider`)

**3.9. Page Gestion des Relances (src/pages/Reminders.tsx - NOUVEAU)**
- [ ] 3.9.1. Créer route `/reminders` dans App.tsx
- [ ] 3.9.2. Créer composant RemindersPage avec 3 onglets :
  - Onglet 1 : "À envoyer" (pending)
  - Onglet 2 : "Envoi en cours / envoyées" (sending + sent)
  - Onglet 3 : "Échecs / supprimées" (failed + cancelled)

- [ ] 3.9.3. Onglet 1 - À envoyer :
  - Tableau : Facture | Client | Type | Montant | Créée le | Aperçu | Actions
  - Bouton "Voir l'email" → modal avec sujet/contenu
  - Actions : "Envoyer" | "Modifier" | "Supprimer"
  - Bouton global : "Tout envoyer" → appelle `sendAllPendingReminders`

- [ ] 3.9.4. Onglet 2 - Envoi en cours / envoyées :
  - Tableau similaire
  - Statut : badge "Envoi en cours" (sending) ou "Envoyée" (sent)
  - Actions : "Réessayer" disponible uniquement pour `failed` déplacés depuis onglet 3
  - Bouton global : "Actualiser l'état" (rafraîchit la query)

- [ ] 3.9.5. Onglet 3 - Échecs / supprimées :
  - Tableau avec colonne Statut (badge rouge pour failed, gris pour cancelled)
  - Actions : "Réessayer" (remet en pending) pour `failed`, "Supprimer définitivement" si besoin
  - Filtre par type d'échec/suppression

**3.10. Badge Notifications (App.tsx)**
- [ ] 3.10.1. Ajouter badge dans le header :
  - Affiche le nombre de reminders "pending" (ex: "5" sur l'icône Bell)
  - Cliquable → redirige vers /reminders

**3.11. Bannière Dashboard (src/components/RemindersBanner.tsx - nouveau)**
- [ ] 3.11.1. Créer composant RemindersBanner
- [ ] 3.11.2. Affiche en haut du Dashboard si :
  - Des reminders "pending" existent (relances à envoyer)
  - Des reminders "sending" existent (envois en cours)
  - Des reminders "failed" ou "cancelled" existent (suivi des anomalies)
  - Aucun compte email connecté

- [ ] 3.11.3. Exemples de messages :
  - "🔔 5 relances en attente d'envoi. [Envoyer maintenant]"
  - "🚀 2 relances sont en cours d'envoi. [Suivre]"
  - "⚠️ 2 relances ont échoué. [Voir les erreurs]"
  - "❌ Connectez votre compte Outlook pour envoyer des relances. [Configurer]"

**3.12. Modal Prévisualisation (src/components/ReminderPreviewModal.tsx)**
- [ ] 3.12.1. Créer composant ReminderPreviewModal
- [ ] 3.12.2. Props : `{ reminder: Reminder, onSend, onDelete, onEdit }`
- [ ] 3.12.3. Affichage :
  - En-tête : Facture #XXX - Client XXX
  - Type de relance : Badge "1ère relance" / "2ème relance" / "3ème relance"
  - Aperçu email : Sujet + Corps formaté
  - Actions : "Modifier" | "Envoyer" | "Supprimer" | "Annuler"

**3.13. Modal Édition (src/components/ReminderEditModal.tsx)**
- [ ] 3.13.1. Créer composant ReminderEditModal
- [ ] 3.13.2. Props : `{ reminder: Reminder, onSave }`
- [ ] 3.13.3. Formulaire :
  - Champ "Objet" : input text (pré-rempli avec emailSubject)
  - Champ "Message" : textarea (pré-rempli avec emailContent)
  - Variables disponibles affichées en aide
  - Bouton "Sauvegarder" → appelle mutation `updateReminderContent`

#### Configuration Azure AD

**3.14. Setup Azure AD (Prérequis)**
- [ ] 3.14.1. Créer une application Azure AD
- [ ] 3.14.2. Configurer les permissions Microsoft Graph :
  - `Mail.Send` (déléguée)
  - `User.Read` (déléguée)
- [ ] 3.14.3. Configurer l'URI de redirection : `https://[deployment].convex.site/oauth/microsoft/callback`
- [ ] 3.14.4. Récupérer Client ID et Client Secret
- [ ] 3.14.5. Ajouter dans Convex env vars :
  - `MICROSOFT_CLIENT_ID`
  - `MICROSOFT_CLIENT_SECRET`
  - `MICROSOFT_REDIRECT_URI`

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

### Phase 6 : Interface Utilisateur - Filtres & Adaptations ⏳ EN COURS
- [x] 6.1. Créer page `/invoices` avec filtres et vue table complète
- [ ] 6.2. Adapter `Dashboard.tsx` pour supporter les filtres par technicien
- [x] 6.3. Adapter toutes les vues pour afficher le créateur (InvoiceList, Dashboard, OngoingInvoices, PaidInvoices)
- [x] 6.4. Adapter `InvoiceUpload.tsx` (option "Assigner à" pour admins)
- [ ] 6.5. Adapter `ReminderSettings.tsx` (déplacer vers paramètres org)

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

**Temps de développement estimé :** 5-7 jours

**Répartition :**
- Phase 1 (Backend - Schémas & Auth) : 4-6 heures ✅ COMPLÉTÉE
- Phase 2 (Permissions & Queries) : 3-4 heures ✅ COMPLÉTÉE
- Phase 3 (Génération & Envoi Relances via OAuth) : 22-30 heures
  - Schema modifications (30min)
  - Setup Azure AD (1h)
  - Backend - Génération (2h)
  - Backend - Approbation (1-2h)
  - Backend - Envoi via Graph API (2-3h)
  - Backend - OAuth flow (3-4h)
  - Backend - Cron (2-3h)
  - Frontend - Settings (1-2h)
  - Frontend - Page Reminders (4-5h)
  - Frontend - Modals (2-3h)
  - Frontend - Bannière (1h)
  - Tests & Debug (3-4h)
- Phase 4 (Auth UI) : 3-4 heures ✅ COMPLÉTÉE
- Phase 5 (Gestion équipe UI) : 3-4 heures ✅ COMPLÉTÉE
- Phase 6 (Filtres & Adaptations UI) : 4-5 heures ⏳ EN COURS (2/5 complétées)
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

- **2025-10-22** : ✅ **Phase 6 Partielle - Affichage Créateur & Page /invoices**
  - **6.3 COMPLÉTÉE** - Affichage du créateur des factures pour les admins :
    - Backend enrichi : toutes les queries retournent `creatorName` (name || email || "Utilisateur inconnu")
    - Helper `enrichInvoicesWithCreator()` dans `invoices.ts` et `dashboard.ts`
    - Frontend adapté :
      - `InvoiceList.tsx` : colonne "Créé par" (desktop) + ligne dans cards (mobile)
      - `Dashboard.tsx` : info créateur sous les factures urgentes
      - `OngoingInvoices.tsx` + `PaidInvoices.tsx` : info créateur en petit texte
    - Visible uniquement pour les admins (via `currentUser.role === "admin"`)
  - **6.1 COMPLÉTÉE** - Nouvelle page `/invoices` (vue table complète) :
    - Créé `src/pages/Invoices.tsx` avec :
      - Affichage intelligent : admin (toutes factures org) vs technicien (ses factures)
      - Section filtres : dropdown "Responsable" (admin) + placeholders Date/Montant
      - Tableau desktop : 8 colonnes dont "État" simplifié (En cours/En retard/Payée)
      - Vue mobile responsive : cards empilées
      - Actions contextuelles : "Relancer" (si retard) + "Marquer payée"
      - Bouton "Ajouter une facture" avec redirection intelligente
    - Modifié `App.tsx` :
      - Ajouté route `/invoices`
      - Ajouté bouton "Factures" (icône FileText) dans Header navigation
      - Support query param `returnTo` dans `InvoiceUploadPage` pour redirection après upload
    - Utilise queries backend existantes : `listWithFilter` (admin) et `list` (technicien)
    - Réutilise composants existants : `ReminderModal` pour les relances
  - **Prochaine priorité** : 6.2 (Filtrage Dashboard par technicien)

- **2025-10-23** : ✅ **Phase 6 - Tâche 6.4 Complétée + Refactoring Majeur**
  - **6.4 COMPLÉTÉE** - Dropdown "Assigner à" pour les admins :
    - Backend : email client rendu **optionnel** dans le schema (`convex/schema.ts:48` → `v.optional(v.string())`)
    - Mutation `create()` et `update()` : nouveau paramètre `assignToUserId` pour assigner une facture à un technicien
    - `InvoiceUpload.tsx` : ajout du dropdown "Responsable de la facture" (lignes 328-346)
      - Affichage uniquement pour les admins (`isAdmin && users.length > 0`)
      - Sélection par défaut : utilisateur actuel
      - Liste déroulante avec nom/email + badge rôle "(Admin)" ou "(Technicien)"
    - `InvoiceEditModal.tsx` : même fonctionnalité pour modification de factures (lignes 157-175)
    - Permet aux admins de créer/réassigner des factures à n'importe quel membre de l'équipe
  - **REFACTORING** - Création de bibliothèques utilitaires et simplification du code :
    - **Nouveaux fichiers utilitaires** créés dans `src/lib/` :
      - `formatters.ts` : fonctions de formatage (montants, dates)
      - `invoiceHelpers.ts` : helpers pour manipuler les factures
      - `invoiceStatus.ts` : logique complète de gestion des statuts d'invoices
        - Types : `InvoiceStatus`, `StatusDisplay`
        - Helpers : pluralisation, formatage des compléments (échéances/retards)
        - Calculs : jours de retard, tri par urgence
        - Affichage : badges, couleurs, libellés
    - **Renommage** : `InvoiceList.tsx` → `InvoicesList.tsx` (meilleure cohérence de nommage)
    - **Simplification massive** des pages grâce à la réutilisation des utilitaires :
      - `Dashboard.tsx` : logique déplacée vers helpers
      - `Invoices.tsx` : formatage et statuts externalisés
      - `OngoingInvoices.tsx` : code dédupliqué
      - `PaidInvoices.tsx` : code dédupliqué
    - **Impact** : -553 lignes nettes (1015 supprimées, 462 ajoutées)
    - **Bénéfices** : code plus maintenable, logique métier centralisée, réutilisation accrue
  - **Prochaine priorité** : 6.2 (Filtrage Dashboard par technicien) + 6.5 (Migration ReminderSettings)

- **2025-10-23** : 📋 **Phase 3 MISE À JOUR - Plan Détaillé OAuth Microsoft**
  - **Révision complète de la Phase 3** : Système de génération & envoi de relances via OAuth
  - **Philosophie adoptée** : "Confiance avant Automatisation"
    - Workflow par défaut : Cron génère → Admin envoie ou supprime → Historique conservé
    - Workflow avancé : Envoi automatique activable pour clients ayant confiance
  - **Modifications du schéma** détaillées :
    - Table `organizations` : ajout champs OAuth (provider, tokens, expiration, account info) + flag `autoSendReminders`
    - Table `reminders` : ajout workflow complet (`sendStatus` pending/sending/sent/failed/cancelled + error handling)
    - Nouveaux indexes pour performances optimales
  - **Backend détaillé** (47 sous-tâches) :
    - OAuth flow Microsoft complet avec refresh automatique des tokens
    - Génération intelligente des relances avec templates et variables
    - Possibilité d'éditer ou supprimer les relances avant envoi
    - Envoi via Microsoft Graph API avec retry sur échec
    - Cron quotidien avec détection automatique des factures overdue
    - Queries dédiées pour l'UI (pending, sending, stats)
  - **Frontend détaillé** (33 sous-tâches) :
    - Page `/reminders` avec 3 onglets (À envoyer, En cours/Envoyées, Échecs/Supprimées)
    - Modals de prévisualisation et édition des relances
    - Bannière Dashboard avec notifications contextuelles
    - Badge dans le header pour alertes pending
    - Section OAuth dans Settings (connexion/déconnexion Outlook)
  - **Configuration Azure AD** documentée (5 étapes) :
    - Setup application Azure AD
    - Permissions Microsoft Graph (Mail.Send, User.Read)
    - Configuration URI de redirection Convex
    - Variables d'environnement requises
  - **Estimation temps mise à jour** : 22-30 heures (vs 2-3h initialement)
  - **Total projet révisé** : 5-7 jours (vs 2-3j initialement)
  - **Ordre d'implémentation** recommandé : 14 étapes séquentielles pour garantir succès
  - **Avantages** : Confiance progressive, contrôle total, transparence, flexibilité, audit trail, graceful degradation
  - **Prochaine étape** : Commencer Phase 3 (ou terminer Phase 6 restante)

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

### 🟡 Priorité Moyenne (2025-10-24)
8. **Erreur "Non authentifié" lors de la déconnexion** ✅
   - Problème : `dashboard.getDashboardStats` lançait une erreur lorsque `signOut` était déclenché pendant un fetch
   - Solution : la query renvoie désormais `null` si l'utilisateur n'est plus authentifié et la page Dashboard ignore ce flux

9. **Message d'erreur intempestif à la connexion** ✅
   - Problème : les erreurs `InvalidAccountId` / `InvalidSecret` déclenchaient un toast et polluaient la console
   - Solution : normalisation des erreurs côté `SignInForm` avec affichage inline "Identifiants incorrects" et stockage d'un message par défaut
