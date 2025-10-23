Excellente idée ! Cela permet aux clients de valider le système avant de lui faire confiance. Je comprends maintenant le workflow complet :

1. Cron quotidien : GÉNÈRE les relances (crée des reminders en status "pending")
2. Admin voit l'UI : "5 nouvelles relances générées aujourd'hui"
3. Admin peut : Prévisualiser, modifier, approuver/rejeter
4. Envoi : Seulement après approbation (manuelle ou auto si paramètre activé)

Laissez-moi réviser le plan avec cette séparation claire :

⏺User approved Claude's plan:
⎿  Plan Révisé : Phase 3 - Génération & Envoi de Relances via OAuth

     Philosophie : Confiance avant Automatisation

     Workflow par défaut (envoi manuel) :
     1. Cron quotidien → GÉNÈRE les relances (reminders en status "pending")
     2. Admin reçoit notification → PRÉVISUALISE les relances générées
     3. Admin APPROUVE ou REJETTE chaque relance (ou en masse)
     4. Relances approuvées → ENVOI via OAuth (manuel ou auto)

     Workflow avancé (envoi automatique activé) :
     - Cron génère ET envoie directement (skip approbation)
     - Pour clients qui font confiance au système

     ---
     Backend (Convex)

     3.1. Modifications du schéma (convex/schema.ts)

     Modifier la table organizations - Ajouter :
     // Paramètre d'envoi automatique
     autoSendReminders: v.boolean(), // Par défaut : false

     // Connexion email OAuth
     emailProvider: v.optional(v.union(
       v.literal("microsoft"),
       v.literal("google"),
       v.literal("infomaniak")
     )),
     emailConnectedAt: v.optional(v.number()),
     emailAccessToken: v.optional(v.string()),
     emailRefreshToken: v.optional(v.string()),
     emailTokenExpiresAt: v.optional(v.number()),
     emailConnectedBy: v.optional(v.id("users")),
     emailAccountInfo: v.optional(v.object({
       email: v.string(),
       name: v.string(),
     })),

     Modifier la table reminders - Ajouter :
     // Workflow d'approbation et d'envoi
     sendStatus: v.union(
       v.literal("pending"),    // Généré automatiquement, en attente d'approbation
       v.literal("approved"),   // Approuvé, prêt à être envoyé
       v.literal("sending"),    // En cours d'envoi
       v.literal("sent"),       // Envoyé avec succès
       v.literal("failed"),     // Échec d'envoi
       v.literal("rejected")    // Rejeté par l'admin
     ),
     approvedBy: v.optional(v.id("users")),      // Qui a approuvé
     approvedAt: v.optional(v.number()),         // Quand approuvé
     sentAt: v.optional(v.number()),             // Quand envoyé
     sendError: v.optional(v.string()),          // Message d'erreur si failed
     lastSendAttempt: v.optional(v.number()),    // Dernière tentative
     generatedByCron: v.boolean(),               // true si auto, false si manuel

     Ajouter indexes :
     .index("by_sendStatus", ["sendStatus"])
     .index("by_organization_and_status", ["organizationId", "sendStatus"])

     3.2. OAuth Flow Microsoft (convex/oauth.ts - nouveau fichier)

     Query :
     - getOAuthUrl : Génère l'URL d'autorisation Microsoft

     Mutations :
     - disconnectEmailProvider : Supprime les tokens OAuth

     Actions Node.js :
     - refreshAccessToken (internal) : Renouvelle l'access token
     - verifyTokenValidity : Vérifie et refresh le token si nécessaire

     HTTP Routes :
     - GET /oauth/microsoft/callback : Callback OAuth
       - Échange code contre tokens
       - Récupère infos compte via Graph API
       - Met à jour organizations
       - Redirige vers /settings?tab=organization&oauth=success

     3.3. Génération des relances (convex/reminders.ts - enrichir)

     Action generateReminder :
     args: {
       invoiceId: Id<"invoices">,
       reminderType: "first_reminder" | "second_reminder" | "third_reminder",
       generatedByCron: boolean
     }
     returns: Id<"reminders">

     Logique :
     1. Récupère l'invoice et l'organisation
     2. Récupère le template approprié selon reminderType
     3. Construit l'email avec buildReminderEmailFromTemplate
     4. Crée le reminder avec sendStatus: "pending" (pas d'envoi !)
     5. Retourne l'ID du reminder créé

     Helper buildReminderEmailFromTemplate :
     args: { organizationId, invoiceId, reminderType }
     returns: { subject: string, body: string }
     - Récupère template + données facture
     - Remplace variables : {numero_facture}, {nom_client}, {montant}, {date_facture}, {date_echeance}, {jours_retard}
     - Ajoute signature

     3.4. Approbation des relances (convex/reminders.ts)

     Mutation approveReminder :
     args: { reminderId: Id<"reminders"> }
     - Vérifie permissions (admin ou créateur de la facture)
     - Update reminder : sendStatus: "approved", approvedBy: userId, approvedAt: Date.now()
     - Si organization.autoSendReminders === true : appelle immédiatement sendReminder

     Mutation rejectReminder :
     args: { reminderId: Id<"reminders"> }
     - Update reminder : sendStatus: "rejected"

     Mutation approveBulkReminders :
     args: { reminderIds: Id<"reminders">[] }
     - Boucle sur tous les IDs et appelle approveReminder

     Mutation updateReminderContent :
     args: {
       reminderId: Id<"reminders">,
       emailSubject: string,
       emailContent: string
     }
     - Permet de modifier le contenu avant approbation
     - Vérifie que sendStatus === "pending"

     3.5. Envoi des relances (convex/email.ts - nouveau fichier)

     Action Node.js sendReminder :
     args: { reminderId: Id<"reminders"> }

     Logique :
     1. Récupère le reminder et vérifie sendStatus === "approved" ou "failed"
     2. Récupère l'organisation et vérifie qu'un compte email est connecté
     3. Vérifie validité du token (refresh si nécessaire)
     4. Update reminder : sendStatus: "sending"
     5. Envoie via Microsoft Graph API : POST /me/sendMail
     6. Succès → Update : sendStatus: "sent", sentAt: Date.now()
     7. Échec → Update : sendStatus: "failed", sendError: message, lastSendAttempt: Date.now()
     8. Met à jour le statut de la facture (first_reminder, second_reminder, etc.)

     Action sendAllApprovedReminders :
     - Query tous les reminders avec sendStatus: "approved"
     - Appelle sendReminder pour chacun
     - Retourne statistiques : { sent: 5, failed: 1 }

     Action retrySendReminder :
     args: { reminderId: Id<"reminders"> }
     - Vérifie que sendStatus === "failed"
     - Update : sendStatus: "approved"
     - Appelle sendReminder

     3.6. Cron automatique (convex/cron.ts - nouveau fichier)

     Action Cron generateDailyReminders (quotidienne, 8h00) :
     handler: async (ctx) => {
       // 1. Pour chaque organisation
       const orgs = await ctx.db.query("organizations").collect();

       for (const org of orgs) {
         // 2. Trouver les factures overdue qui nécessitent une relance
         const overdueInvoices = await findOverdueInvoices(ctx, org);

         for (const invoice of overdueInvoices) {
           // 3. Déterminer quel type de relance (1ère, 2ème, 3ème)
           const reminderType = determineReminderType(invoice, org);

           // 4. Vérifier qu'une relance de ce type n'existe pas déjà
           const existingReminder = await findExistingReminder(ctx, invoice._id, reminderType);
           if (existingReminder) continue;

           // 5. GÉNÉRER la relance (pas d'envoi ici !)
           const reminderId = await ctx.runAction(internal.reminders.generateReminder, {
             invoiceId: invoice._id,
             reminderType,
             generatedByCron: true
           });

           // 6. Si autoSendReminders activé : approuver et envoyer immédiatement
           if (org.autoSendReminders) {
             await ctx.runMutation(internal.reminders.approveReminder, {
               reminderId
             });
           }
         }
       }

       // 7. Statistiques : combien de reminders générés par org
       return { generatedCount: ... };
     }

     Helper findOverdueInvoices :
     - Factures avec status "overdue", "first_reminder", etc.
     - Respecte les délais configurés
     - Exclut les factures qui ont déjà une relance pending/approved/sent du type approprié

     Helper determineReminderType :
     - Calcule jours de retard
     - Compare avec délais configurés
     - Retourne le type approprié

     3.7. Queries pour l'UI (convex/reminders.ts)

     Query getPendingReminders :
     args: { organizationId: Id<"organizations"> }
     returns: Reminder[]
     - Liste des reminders avec sendStatus: "pending"
     - Triés par date (plus récents en premier)

     Query getApprovedReminders :
     args: { organizationId: Id<"organizations"> }
     returns: Reminder[]
     - Liste des reminders avec sendStatus: "approved"
     - Prêts à être envoyés

     Query getReminderStats :
     args: { organizationId: Id<"organizations"> }
     returns: { pending: number, approved: number, sent: number, failed: number }
     - Stats pour afficher dans le Dashboard

     ---
     Frontend (React)

     3.8. Section Connexion Email (OrganizationSettings.tsx)

     Ajouter deux sections :

     A) Envoi automatique (avant connexion OAuth) :
     <div className="bg-white rounded-lg border p-6">
       <h3>Envoi automatique des relances</h3>
       <label>
         <input
           type="checkbox"
           checked={formData.autoSendReminders}
           onChange={...}
         />
         Envoyer automatiquement les relances générées
       </label>
       <p className="text-sm text-gray-600">
         Si désactivé (recommandé au début), vous devrez approuver manuellement
         chaque relance avant envoi.
       </p>
     </div>

     B) Connexion OAuth (comme prévu) :
     - Section "Connexion Email (Outlook)"
     - Bouton "Connecter Outlook" ou infos du compte connecté
     - Statut du token

     3.9. Page Gestion des Relances (src/pages/Reminders.tsx - NOUVEAU)

     Route : /reminders

     3 onglets :

     1. En attente d'approbation (pending) :
     - Tableau : Facture | Client | Type | Montant | Créée le | Aperçu | Actions
     - Aperçu : Bouton "Voir l'email" → modal avec sujet/contenu
     - Actions : "Approuver" | "Modifier" | "Rejeter"
     - Bouton global : "Tout approuver" (confirmation requise)

     2. Approuvées / En cours d'envoi (approved + sending) :
     - Tableau similaire
     - Statut : "Prête à envoyer" (approved) ou "Envoi en cours..." (sending)
     - Actions : "Envoyer maintenant" (si approved)
     - Bouton global : "Tout envoyer" → appelle sendAllApprovedReminders

     3. Historique (sent + failed + rejected) :
     - Tableau avec colonne Statut (badge vert/rouge/gris)
     - Filtre par statut
     - Si failed : affiche l'erreur + bouton "Réessayer"
     - Pas d'actions sur sent/rejected

     Badge dans le header :
     - Affiche le nombre de reminders "pending" (ex: "5" sur l'icône)
     - Cliquable → redirige vers /reminders

     3.10. Bannière Dashboard (src/components/RemindersBanner.tsx - nouveau)

     Affiche en haut du Dashboard si :
     1. Des reminders "pending" existent (nouvelles relances générées)
     2. Des reminders "approved" existent (prêtes à envoyer)
     3. Des reminders "failed" existent (échecs d'envoi)
     4. Aucun compte email connecté

     Exemples de messages :
     - "🔔 5 nouvelles relances générées aujourd'hui. [Examiner]"
     - "✅ 3 relances approuvées prêtes à envoyer. [Envoyer maintenant]"
     - "⚠️ 2 relances ont échoué à l'envoi. [Voir les erreurs]"
     - "❌ Connectez votre compte Outlook pour envoyer des relances. [Configurer]"

     3.11. Modal Prévisualisation (src/components/ReminderPreviewModal.tsx)

     Props : { reminder: Reminder, onApprove, onReject, onEdit }

     Affichage :
     - En-tête : Facture #XXX - Client XXX
     - Type de relance : Badge "1ère relance" / "2ème relance" / "3ème relance"
     - Aperçu email :
       - Sujet : [affiché comme dans un client email]
       - Corps : [formaté avec retours à la ligne]
     - Actions :
       - "Modifier" → ouvre modal d'édition
       - "Approuver" → appelle mutation approveReminder
       - "Rejeter" → appelle mutation rejectReminder
       - "Annuler"

     3.12. Modal Édition (src/components/ReminderEditModal.tsx)

     Props : { reminder: Reminder, onSave }

     Formulaire :
     - Champ "Objet" : input text (pré-rempli avec emailSubject)
     - Champ "Message" : textarea (pré-rempli avec emailContent)
     - Variables disponibles affichées en aide
     - Bouton "Sauvegarder" → appelle mutation updateReminderContent

     3.13. Mise à jour de App.tsx

     Ajouter dans le header :
     <Link to="/reminders" className="relative">
       <Bell />
       {pendingCount > 0 && (
         <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
           {pendingCount}
         </span>
       )}
     </Link>

     Ajouter la route :
     <Route path="/reminders" element={<RemindersPage />} />

     ---
     Étapes d'implémentation

     Ordre recommandé :

     1. Schema (30min) : Modifier organizations (autoSendReminders) + reminders (sendStatus, approval fields), indexes
     2. Setup Azure AD (1h)
     3. Backend - Génération (2h) : Action generateReminder + helper templates
     4. Backend - Approbation (1-2h) : Mutations approve/reject/update
     5. Backend - Envoi (2-3h) : Action sendReminder via Microsoft Graph
     6. Backend - OAuth (3-4h) : OAuth flow complet
     7. Backend - Cron (2-3h) : Génération quotidienne + détection overdue
     8. Frontend - Settings (1-2h) : Toggle autoSendReminders + connexion OAuth
     9. Frontend - Page Reminders (4-5h) : 3 onglets + tableaux + actions
     10. Frontend - Modals (2-3h) : Preview + Edit
     11. Frontend - Bannière (1h) : Notifications Dashboard
     12. Tests & Debug (3-4h)

     Total estimé : 22-30 heures

     ---
     Workflow Utilisateur Typique

     Jour 1-7 (phase test) :
     1. Admin connecte son compte Outlook
     2. Laisse autoSendReminders = false
     3. Chaque matin, cron génère les relances
     4. Admin va dans /reminders → voit 3 nouvelles relances pending
     5. Prévisualise chacune, modifie si besoin
     6. Approuve manuellement
     7. Clique "Tout envoyer"
     8. Vérifie dans l'historique que tout est OK

     Jour 8+ (confiance établie) :
     1. Admin active autoSendReminders = true
     2. Le cron génère ET envoie automatiquement
     3. Admin consulte juste l'historique pour monitoring

     Gestion d'erreurs :
     1. Email échoue (token expiré par ex.)
     2. Bannière affiche "2 relances ont échoué"
     3. Admin va dans l'onglet Historique
     4. Voit l'erreur, se reconnecte à Outlook
     5. Clique "Réessayer" sur les 2 relances failed

     ---
     Avantages de cette approche

     ✅ Confiance progressive : Les clients voient le travail avant validation
     ✅ Contrôle total : Possibilité de modifier chaque relance
     ✅ Transparent : Historique complet de toutes les relances
     ✅ Flexibilité : Workflow manuel OU automatique selon maturité
     ✅ Audit trail : Qui a approuvé quoi et quand
     ✅ Graceful degradation : Si OAuth échoue, les relances restent en queue
