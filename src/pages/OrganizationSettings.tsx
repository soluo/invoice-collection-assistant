import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Mail, Phone, Trash2, Edit, Plus, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { ReminderStepModal, type ReminderStep } from "@/components/ReminderStepModal";
import { ForbiddenPage } from "@/components/ForbiddenPage";
import { Tooltip } from "@/components/ui/simple-tooltip";
import { TestEmailSection } from "@/components/TestEmailSection";
import { EmailTemplateModal } from "@/components/EmailTemplateModal";

const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

export function OrganizationSettings() {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const updateOrganizationName = useMutation(api.organizations.updateOrganizationName);
  const updateAutoSendEnabled = useMutation(api.organizations.updateAutoSendEnabled);
  const addReminderStep = useMutation(api.organizations.addReminderStep);
  const updateReminderStep = useMutation(api.organizations.updateReminderStep);
  const deleteReminderStep = useMutation(api.organizations.deleteReminderStep);
  const updateSenderName = useMutation(api.organizations.updateSenderName);
  const updateReminderSendTime = useMutation(api.organizations.updateReminderSendTime);
  // Story 7.3: PDF attachment to reminders
  const updateAttachPdfToReminders = useMutation(api.organizations.updateAttachPdfToReminders);
  const getOAuthUrl = useQuery(api.oauth.getOAuthUrl);
  const disconnectEmail = useMutation(api.oauth.disconnectEmailProvider);
  const refreshTokenIfNeeded = useAction(api.oauth.refreshTokenIfNeeded);
  // Story 7.1: Invoice email template
  const invoiceEmailTemplate = useQuery(api.organizations.getInvoiceEmailTemplate);
  const updateInvoiceEmailTemplate = useMutation(api.organizations.updateInvoiceEmailTemplate);
  // Story 7.2: Invitation email template
  const invitationEmailTemplate = useQuery(api.organizations.getInvitationEmailTemplate);
  const updateInvitationEmailTemplate = useMutation(api.organizations.updateInvitationEmailTemplate);

  // Block 1: Organization name
  const [organizationName, setOrganizationName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Block 2: Email connection
  const [senderDisplayName, setSenderDisplayName] = useState("");
  const [savingSenderName, setSavingSenderName] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const hasAttemptedAutoRefresh = useRef(false);

  // Block 3: Reminder settings
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [reminderSendTime, setReminderSendTime] = useState("10:00");
  const [savingSendTime, setSavingSendTime] = useState(false);
  // Story 7.3: PDF attachment setting
  const [attachPdfToReminders, setAttachPdfToReminders] = useState(true);
  const [reminderSteps, setReminderSteps] = useState<ReminderStep[]>([]);
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ReminderStep | null>(null);

  // Story 7.1: Email template modal state
  const [emailTemplateModalOpen, setEmailTemplateModalOpen] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  // Story 7.2: Invitation template modal state
  const [invitationTemplateModalOpen, setInvitationTemplateModalOpen] = useState(false);
  const [savingInvitationTemplate, setSavingInvitationTemplate] = useState(false);

  // Handle OAuth messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("oauth");
    const message = params.get("message");

    if (oauthStatus === "success") {
      toast.success("Compte Outlook connecté avec succès !");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthStatus === "error") {
      toast.error(`Erreur de connexion : ${message || "Une erreur est survenue"}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Initialize form data
  useEffect(() => {
    if (organization) {
      setOrganizationName(organization.name);
      setSenderDisplayName(organization.senderName || "");
      setAutoSendEnabled(organization.autoSendEnabled ?? false);
      setReminderSendTime(organization.reminderSendTime || "10:00");
      // Story 7.3: Default to true if undefined
      setAttachPdfToReminders(organization.attachPdfToReminders !== false);
      setReminderSteps(organization.reminderSteps || []);
    }
  }, [organization]);

  // Token refresh logic
  useEffect(() => {
    if (!organization) {
      hasAttemptedAutoRefresh.current = false;
      return;
    }

    if (
      organization.emailProvider !== "microsoft" ||
      !organization.emailAccountInfo
    ) {
      hasAttemptedAutoRefresh.current = false;
      return;
    }

    const expiresAt = organization.emailTokenExpiresAt;
    const now = Date.now();
    const shouldRefresh =
      !expiresAt || expiresAt - now <= TOKEN_REFRESH_THRESHOLD_MS;

    if (!shouldRefresh) {
      hasAttemptedAutoRefresh.current = false;
      return;
    }

    if (hasAttemptedAutoRefresh.current) {
      return;
    }

    hasAttemptedAutoRefresh.current = true;

    const renewToken = async () => {
      try {
        setRefreshingToken(true);
        await refreshTokenIfNeeded({});
      } catch (error: any) {
        console.error("Erreur lors du renouvellement du token:", error);
        toast.error("Impossible de renouveler le token. Veuillez reconnecter votre compte.");
      } finally {
        setRefreshingToken(false);
      }
    };

    renewToken();
  }, [organization, refreshTokenIfNeeded]);

  // Block 1 handlers
  const handleSaveOrganizationName = async () => {
    if (!organizationName.trim()) {
      toast.error("Le nom de l'organisation ne peut pas être vide");
      return;
    }

    setSavingName(true);
    try {
      await updateOrganizationName({ name: organizationName.trim() });
      toast.success("Nom de l'organisation enregistré");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingName(false);
    }
  };

  // Block 2 handlers
  const handleConnectOutlook = () => {
    if (getOAuthUrl) {
      window.location.href = getOAuthUrl;
    } else {
      toast.error("URL OAuth non disponible");
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter votre compte email ?")) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectEmail({});
      toast.success("Compte email déconnecté");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveSenderName = async () => {
    setSavingSenderName(true);
    try {
      await updateSenderName({ senderName: senderDisplayName.trim() || undefined });
      toast.success("Nom d'affichage enregistré");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setSavingSenderName(false);
    }
  };

  // Block 3 handlers
  const handleToggleAutoSend = async (checked: boolean) => {
    try {
      await updateAutoSendEnabled({ enabled: checked });
      setAutoSendEnabled(checked);
      toast.success(
        checked
          ? "Envoi automatique activé"
          : "Envoi automatique désactivé"
      );
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  // Story 7.3: Toggle PDF attachment to reminders
  const handleToggleAttachPdf = async (checked: boolean) => {
    try {
      await updateAttachPdfToReminders({ attachPdfToReminders: checked });
      setAttachPdfToReminders(checked);
      toast.success(
        checked
          ? "Pièces jointes PDF activées"
          : "Pièces jointes PDF désactivées"
      );
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour");
    }
  };

  const handleSendTimeChange = async (newTime: string) => {
    // Validation frontend
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(newTime)) {
      toast.error("Format d'heure invalide");
      return;
    }

    const [hours] = newTime.split(":").map(Number);
    if (hours < 6 || hours >= 22) {
      toast.error("L'heure d'envoi doit être entre 06:00 et 21:59");
      return;
    }

    setReminderSendTime(newTime);
    setSavingSendTime(true);

    try {
      await updateReminderSendTime({ sendTime: newTime });
      toast.success("Heure d'envoi mise à jour");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la sauvegarde");
      // Revert on error
      setReminderSendTime(organization?.reminderSendTime || "10:00");
    } finally {
      setSavingSendTime(false);
    }
  };

  const handleAddStep = () => {
    setEditingStep(null);
    setStepModalOpen(true);
  };

  const handleEditStep = (step: ReminderStep) => {
    setEditingStep(step);
    setStepModalOpen(true);
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette étape ?")) {
      return;
    }

    try {
      const updatedSteps = await deleteReminderStep({ stepId });
      setReminderSteps(updatedSteps);
      toast.success("Étape supprimée");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la suppression");
    }
  };

  const handleSaveStep = async (stepData: Omit<ReminderStep, "id"> & { id?: string }) => {
    try {
      if (stepData.id) {
        // Update existing step
        const updatedSteps = await updateReminderStep({
          stepId: stepData.id,
          delay: stepData.delay,
          type: stepData.type,
          name: stepData.name,
          emailSubject: stepData.emailSubject,
          emailTemplate: stepData.emailTemplate,
        });
        setReminderSteps(updatedSteps);
        toast.success("Étape mise à jour");
      } else {
        // Add new step
        const updatedSteps = await addReminderStep({
          delay: stepData.delay,
          type: stepData.type,
          name: stepData.name,
          emailSubject: stepData.emailSubject,
          emailTemplate: stepData.emailTemplate,
        });
        setReminderSteps(updatedSteps);
        toast.success("Étape ajoutée");
      }
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'enregistrement");
    }
  };

  const sortedSteps = [...reminderSteps].sort((a, b) => a.delay - b.delay);
  const existingDelays = reminderSteps.map((s) => s.delay);

  // Story 7.1: Save invoice email template
  const handleSaveInvoiceEmailTemplate = async (data: { subject: string; template: string }) => {
    setSavingTemplate(true);
    try {
      await updateInvoiceEmailTemplate({
        subject: data.subject,
        template: data.template,
      });
      toast.success("Modèle enregistré");
      setEmailTemplateModalOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      toast.error(errorMessage);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Story 7.2: Save invitation email template
  const handleSaveInvitationEmailTemplate = async (data: { subject: string; template: string }) => {
    setSavingInvitationTemplate(true);
    try {
      await updateInvitationEmailTemplate({
        subject: data.subject,
        template: data.template,
      });
      toast.success("Modèle enregistré");
      setInvitationTemplateModalOpen(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'enregistrement";
      toast.error(errorMessage);
    } finally {
      setSavingInvitationTemplate(false);
    }
  };

  // Loading state
  if (loggedInUser === undefined || !organization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Permission check - Admin only
  if (loggedInUser.role !== "admin") {
    return (
      <ForbiddenPage
        message="Cette page est réservée aux administrateurs. Contactez votre administrateur pour obtenir les permissions nécessaires."
        returnPath="/invoices"
        returnLabel="Retour aux factures"
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-0 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Réglages</h1>
          <p className="text-slate-500 mt-1">
            Gérez votre profil, vos connexions et vos scénarios de relance.
          </p>
        </div>
      </div>

      {/* Block 1: Organization Profile */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Profil de l'entreprise
        </h2>
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Nom de l'entreprise</Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleSaveOrganizationName}
                disabled={savingName || !organizationName.trim()}
              >
                {savingName ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Block 2: Email Connection */}
      <section id="email-connection-section" className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Connexion du compte email
        </h2>
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="space-y-4">
          {organization.emailProvider && organization.emailAccountInfo ? (
            <>
              {/* Connected account info */}
              <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left sm:justify-between gap-3">
                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full flex-shrink-0">
                    <Check className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 break-all sm:break-normal">
                      {organization.emailAccountInfo.email}
                    </p>
                    <p className="text-sm text-gray-500">
                      {organization.emailProvider === "microsoft" ? "Outlook" : organization.emailProvider}
                    </p>
                  </div>
                </div>
                {autoSendEnabled ? (
                  <Tooltip
                    content="Désactivez d'abord l'envoi automatique des relances pour déconnecter ce compte"
                    side="left"
                  >
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-gray-400 cursor-not-allowed w-full sm:w-auto"
                      >
                        Déconnecter
                      </Button>
                    </span>
                  </Tooltip>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectEmail}
                    disabled={disconnecting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full sm:w-auto"
                  >
                    {disconnecting ? "Déconnexion..." : "Déconnecter"}
                  </Button>
                )}
              </div>

              {refreshingToken && (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Renouvellement du token d'accès...</span>
                </div>
              )}

              {/* Sender display name */}
              <div className="pt-4 border-t border-gray-100">
                <Label htmlFor="senderDisplayName">
                  Nom d'affichage pour l'expéditeur (optionnel)
                </Label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    id="senderDisplayName"
                    value={senderDisplayName}
                    onChange={(e) => setSenderDisplayName(e.target.value)}
                    placeholder={organization.emailAccountInfo.name}
                    className="flex-1 min-w-0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveSenderName}
                    disabled={savingSenderName}
                    className="flex-shrink-0"
                  >
                    {savingSenderName ? "..." : "Enregistrer"}
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-1.5">
                  Personnalisez le nom qui apparaît comme expéditeur de vos emails
                </p>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex items-center justify-center gap-3"
                disabled
              >
                <div className="w-6 h-6 rounded bg-gray-300"></div>
                <div className="text-left">
                  <div className="font-medium text-gray-400">Google</div>
                  <div className="text-xs text-gray-400">Bientôt disponible</div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex items-center justify-center gap-3 hover:bg-blue-50"
                onClick={handleConnectOutlook}
              >
                <Mail className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">Outlook</div>
                  <div className="text-xs text-gray-600">Connecter avec Microsoft</div>
                </div>
              </Button>
            </div>
          )}
          </div>
        </div>
      </section>

      {/* Block: Test Email (admin only, shown only when email is connected) */}
      <TestEmailSection organization={organization} user={loggedInUser} />

      {/* Block 3: Reminder Management */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Gestion des relances
        </h2>
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="space-y-6">
          {/* Auto-send toggle */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <Label htmlFor="autoSend" className="text-base font-medium cursor-pointer">
                Activer l'envoi automatique des emails de relance
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                {organization.emailProvider && organization.emailAccountInfo
                  ? "Les reminders seront toujours créés, mais les emails ne seront envoyés que si cette option est activée"
                  : "Connectez d'abord un compte email pour activer cette option"}
              </p>
            </div>
            <Switch
              id="autoSend"
              checked={autoSendEnabled}
              onCheckedChange={handleToggleAutoSend}
              disabled={!organization.emailProvider || !organization.emailAccountInfo}
              className="flex-shrink-0 mt-0.5"
            />
          </div>

          {/* Reminder send time */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <Label htmlFor="reminderSendTime" className="text-base font-medium">
              Heure d'envoi quotidienne
            </Label>
            <p className="text-sm text-gray-600 mt-1 mb-3">
              Les relances générées seront envoyées quotidiennement à cette heure
            </p>
            <div className="flex items-center gap-3">
              <Input
                id="reminderSendTime"
                type="time"
                value={reminderSendTime}
                onChange={(e) => handleSendTimeChange(e.target.value)}
                disabled={savingSendTime}
                className="w-40"
                min="06:00"
                max="21:59"
              />
              {savingSendTime && (
                <span className="text-sm text-gray-500">Enregistrement...</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Plage autorisée : 06:00 - 21:59
            </p>
          </div>

          {/* Story 7.3: PDF attachment toggle (AC2) */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 min-w-0">
              <Label htmlFor="attachPdfToReminders" className="text-base font-medium cursor-pointer">
                Joindre le PDF de la facture aux relances
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Attacher automatiquement le PDF de la facture aux emails de relance
              </p>
            </div>
            <Switch
              id="attachPdfToReminders"
              checked={attachPdfToReminders}
              onCheckedChange={handleToggleAttachPdf}
              className="flex-shrink-0 mt-0.5"
            />
          </div>

          {/* Reminder steps sequence */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">
                Séquence de relance
              </h3>
              <Button
                onClick={handleAddStep}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Ajouter une étape
              </Button>
            </div>

            {sortedSteps.length === 0 ? (
              <Card className="p-8 text-center border-dashed">
                <p className="text-gray-500">
                  Aucune étape de relance configurée. Cliquez sur "Ajouter une étape" pour commencer.
                </p>
              </Card>
            ) : (
              <div className="divide-y divide-gray-200 sm:divide-y-0 sm:space-y-3">
                {sortedSteps.map((step, index) => (
                  <div
                    key={step.id}
                    className="py-4 sm:p-4 sm:border sm:border-gray-200 sm:rounded-lg hover:sm:border-gray-400 transition-colors cursor-pointer"
                    onClick={() => handleEditStep(step)}
                  >
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                      {/* Delay badge */}
                      <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="font-semibold text-gray-700 text-sm sm:text-base">J+{step.delay}</span>
                      </div>

                      {/* Step info + Actions wrapper */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                          {/* Step info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {step.type === "email" ? (
                                <Mail className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <Phone className="h-4 w-4 text-orange-600 flex-shrink-0" />
                              )}
                              <span className="text-sm text-gray-500">
                                {step.type === "email" ? "Email automatique" : "Appel manuel"}
                              </span>
                            </div>
                            <p className="font-semibold text-gray-900">{step.name}</p>
                            {step.type === "email" && step.emailSubject && (
                              <p className="text-sm text-gray-600 mt-1">
                                {step.emailSubject}
                              </p>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditStep(step);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStep(step.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
        </div>
      </section>

      {/* Story 7.1: Email Templates Section (AC7) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          Modèles d'emails
        </h2>
        <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
          <div className="divide-y divide-gray-200 sm:divide-y-0 sm:space-y-3">
            {/* Invoice Email Template Card */}
            <div
              className="py-4 sm:p-4 sm:border sm:border-gray-200 sm:rounded-lg hover:sm:border-gray-400 transition-colors cursor-pointer"
              onClick={() => setEmailTemplateModalOpen(true)}
            >
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>

                {/* Info + Actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {/* Template info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Envoi de la facture</p>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {invoiceEmailTemplate?.subject || "Facture {numero_facture} - {nom_client}"}
                      </p>
                    </div>

                    {/* Edit button only - no delete */}
                    <div className="flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmailTemplateModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Story 7.2: Invitation Email Template Card */}
            <div
              className="py-4 sm:p-4 sm:border sm:border-gray-200 sm:rounded-lg hover:sm:border-gray-400 transition-colors cursor-pointer"
              onClick={() => setInvitationTemplateModalOpen(true)}
            >
              <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                </div>

                {/* Info + Actions */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {/* Template info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">Invitation utilisateur</p>
                      <p className="text-sm text-gray-600 mt-1 truncate">
                        {invitationEmailTemplate?.subject || "Invitation à rejoindre {nom_organisation} sur RelanceZen"}
                      </p>
                    </div>

                    {/* Edit button only - no delete */}
                    <div className="flex-shrink-0 flex items-center gap-2 mt-2 sm:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInvitationTemplateModalOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Step Modal */}
      <ReminderStepModal
        open={stepModalOpen}
        onClose={() => setStepModalOpen(false)}
        onSave={handleSaveStep}
        step={editingStep}
        existingDelays={existingDelays}
      />

      {/* Story 7.1: Email Template Modal */}
      {invoiceEmailTemplate && (
        <EmailTemplateModal
          open={emailTemplateModalOpen}
          onClose={() => setEmailTemplateModalOpen(false)}
          onSave={handleSaveInvoiceEmailTemplate}
          subject={invoiceEmailTemplate.subject}
          template={invoiceEmailTemplate.template}
          saving={savingTemplate}
          templateType="invoice"
        />
      )}

      {/* Story 7.2: Invitation Template Modal */}
      {invitationEmailTemplate && (
        <EmailTemplateModal
          open={invitationTemplateModalOpen}
          onClose={() => setInvitationTemplateModalOpen(false)}
          onSave={handleSaveInvitationEmailTemplate}
          subject={invitationEmailTemplate.subject}
          template={invitationEmailTemplate.template}
          saving={savingInvitationTemplate}
          templateType="invitation"
        />
      )}
    </div>
  );
}
