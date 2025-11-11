import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { Settings as SettingsIcon, Mail, Check, X, ExternalLink, Clock } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";

const TOKEN_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

export function OrganizationSettings() {
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const updateSettings = useMutation(api.organizations.updateOrganizationSettings);
  const getOAuthUrl = useQuery(api.oauth.getOAuthUrl);
  const disconnectEmail = useMutation(api.oauth.disconnectEmailProvider);
  const refreshTokenIfNeeded = useAction(api.oauth.refreshTokenIfNeeded);

  const [formData, setFormData] = useState({
    organizationName: "",
    senderEmail: "",
    firstReminderDelay: 7,
    secondReminderDelay: 15,
    thirdReminderDelay: 30,
    litigationDelay: 45,
    firstReminderTemplate: "",
    secondReminderTemplate: "",
    thirdReminderTemplate: "",
    signature: "",
    autoSendReminders: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const hasAttemptedAutoRefresh = useRef(false);

  // Gérer les messages OAuth (success/error) depuis les query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get("oauth");
    const message = params.get("message");

    if (oauthStatus === "success") {
      toast.success("Compte Outlook connecté avec succès !");
      // Nettoyer les query params
      window.history.replaceState({}, "", window.location.pathname + "?tab=organization");
    } else if (oauthStatus === "error") {
      toast.error(`Erreur de connexion : ${message || "Une erreur est survenue"}`);
      window.history.replaceState({}, "", window.location.pathname + "?tab=organization");
    }
  }, []);

  // Mettre à jour le formulaire quand les données arrivent
  useEffect(() => {
    if (organization) {
      setFormData({
        organizationName: organization.name,
        senderEmail: organization.senderEmail,
        firstReminderDelay: organization.firstReminderDelay,
        secondReminderDelay: organization.secondReminderDelay,
        thirdReminderDelay: organization.thirdReminderDelay,
        litigationDelay: organization.litigationDelay,
        firstReminderTemplate: organization.firstReminderTemplate,
        secondReminderTemplate: organization.secondReminderTemplate,
        thirdReminderTemplate: organization.thirdReminderTemplate,
        signature: organization.signature,
        autoSendReminders: organization.autoSendReminders ?? false,
      });
    }
  }, [organization]);

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
        const result = await refreshTokenIfNeeded({});
        if (result?.refreshed) {
          toast.success("Token Outlook renouvelé automatiquement");
        }
      } catch (error: any) {
        console.error("Erreur lors du renouvellement du token:", error);
        toast.error(
          error.message ||
            "Impossible de renouveler automatiquement le token Outlook"
        );
        hasAttemptedAutoRefresh.current = false;
      } finally {
        setRefreshingToken(false);
      }
    };

    void renewToken();
  }, [organization, refreshTokenIfNeeded]);

  if (organization === undefined) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          Vous n'appartenez à aucune organisation.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateSettings({
        name: formData.organizationName,
        senderEmail: formData.senderEmail,
        firstReminderDelay: formData.firstReminderDelay,
        secondReminderDelay: formData.secondReminderDelay,
        thirdReminderDelay: formData.thirdReminderDelay,
        litigationDelay: formData.litigationDelay,
        firstReminderTemplate: formData.firstReminderTemplate,
        secondReminderTemplate: formData.secondReminderTemplate,
        thirdReminderTemplate: formData.thirdReminderTemplate,
        signature: formData.signature,
        autoSendReminders: formData.autoSendReminders,
      });
      toast.success("Réglages du compte sauvegardés");
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde:", error);
      toast.error(error.message || "Erreur lors de la sauvegarde");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConnectOutlook = () => {
    if (getOAuthUrl) {
      // Redirection complète vers l'URL OAuth (pas de popup)
      window.location.href = getOAuthUrl;
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Êtes-vous sûr de vouloir déconnecter votre compte Outlook ?")) {
      return;
    }

    setDisconnecting(true);
    try {
      await disconnectEmail();
      toast.success("Compte Outlook déconnecté");
    } catch (error: any) {
      console.error("Erreur lors de la déconnexion:", error);
      toast.error(error.message || "Erreur lors de la déconnexion");
    } finally {
      setDisconnecting(false);
    }
  };

  const tokenExpirationTimestamp = organization?.emailTokenExpiresAt ?? null;
  const timeUntilExpiration =
    tokenExpirationTimestamp !== null ? tokenExpirationTimestamp - Date.now() : null;
  const isTokenExpired =
    timeUntilExpiration !== null ? timeUntilExpiration <= 0 : false;
  const isTokenExpiringSoon =
    timeUntilExpiration !== null &&
    timeUntilExpiration > 0 &&
    timeUntilExpiration <= TOKEN_REFRESH_THRESHOLD_MS;
  const expirationLabel =
    tokenExpirationTimestamp !== null
      ? new Date(tokenExpirationTimestamp).toLocaleString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Date inconnue";
  const minutesUntilExpiration =
    timeUntilExpiration !== null
      ? Math.max(0, Math.floor(timeUntilExpiration / (60 * 1000)))
      : null;
  const minutesUntilExpirationLabel =
    minutesUntilExpiration !== null
      ? `Expire dans environ ${minutesUntilExpiration} min`
      : "Expiration imminente";

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-8 pt-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <SettingsIcon size={24} />
          Réglages du compte
        </h2>
        <p className="text-gray-600 mt-1">
          Configurez les paramètres de votre organisation, les délais de relance et les templates d'emails.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Nom de l'organisation */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nom de l'organisation</h3>
          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Nom
            </label>
            <input
              id="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mon entreprise"
              required
            />
          </div>
        </div>

        {/* Email expéditeur */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email expéditeur</h3>
          <div>
            <label
              htmlFor="senderEmail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Adresse email
            </label>
            <input
              id="senderEmail"
              type="email"
              value={formData.senderEmail}
              onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="contact@monentreprise.fr"
            />
            <p className="mt-1 text-xs text-gray-500">
              Cette adresse sera utilisée comme expéditeur pour les relances automatiques
            </p>
          </div>
        </div>

        {/* Envoi automatique */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Envoi automatique des relances
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Choisissez si les relances générées doivent être envoyées automatiquement ou nécessiter une approbation manuelle.
          </p>
          <label className="flex items-start gap-3">
            <input
              id="autoSendReminders"
              type="checkbox"
              checked={formData.autoSendReminders}
              onChange={(e) =>
                setFormData({ ...formData, autoSendReminders: e.target.checked })
              }
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Envoyer automatiquement les relances générées
              </span>
              <p className="text-xs text-gray-600 mt-1">
                Désactivez cette option pour valider manuellement chaque relance avant envoi (recommandé lors de la phase de test).
              </p>
            </div>
          </label>
        </div>

        {/* Connexion Email OAuth */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Mail size={20} />
                Connexion Email (Outlook)
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Connectez votre compte Outlook pour envoyer automatiquement des relances
              </p>
            </div>
          </div>

          {organization.emailProvider === "microsoft" && organization.emailAccountInfo ? (
            // Compte connecté
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <Check className="text-green-600" size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-green-900">
                      Connecté en tant que {organization.emailAccountInfo.name}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      {organization.emailAccountInfo.email}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Connecté le{" "}
                      {organization.emailConnectedAt
                        ? new Date(organization.emailConnectedAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Date inconnue"}
                    </p>
                  </div>
                </div>

                {/* Statut du token */}
                <div className="mt-4 flex items-center gap-2">
                  {refreshingToken ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      <span className="text-sm font-medium text-blue-600">
                        Renouvellement du token en cours...
                      </span>
                    </>
                  ) : isTokenExpired ? (
                    <>
                      <div className="flex items-center gap-2 text-orange-600">
                        <X size={16} />
                        <span className="text-sm font-medium">Token expiré</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        (Une nouvelle tentative sera effectuée automatiquement lors du prochain envoi)
                      </span>
                    </>
                  ) : isTokenExpiringSoon ? (
                    <>
                      <div className="flex items-center gap-2 text-amber-600">
                        <Clock size={16} />
                        <span className="text-sm font-medium">Token expirant bientôt</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        ({minutesUntilExpirationLabel}, renouvellement automatique en préparation)
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-green-600">
                        <Check size={16} />
                        <span className="text-sm font-medium">Token actif</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        (Expire le {expirationLabel})
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Bouton déconnecter */}
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting || refreshingToken}
                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X size={16} />
                {disconnecting ? "Déconnexion..." : "Déconnecter le compte"}
              </button>
            </div>
          ) : (
            // Pas de compte connecté
            <div className="space-y-4">
              {getOAuthUrl === null ? (
                // Configuration OAuth manquante
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    ⚠️ Configuration OAuth manquante
                  </p>
                  <p className="text-sm text-yellow-700 mb-3">
                    Les variables d'environnement OAuth ne sont pas configurées dans Convex.
                  </p>
                  <p className="text-xs text-yellow-600">
                    Consultez <code className="bg-yellow-100 px-1 py-0.5 rounded">OAUTH_SETUP.md</code> pour les instructions de configuration.
                  </p>
                </div>
              ) : (
                // Configuration OK mais pas connecté
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      Aucun compte email connecté. Vous devez connecter un compte Outlook pour pouvoir
                      envoyer des relances automatiques.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleConnectOutlook}
                    disabled={!getOAuthUrl}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ExternalLink size={16} />
                    Connecter Outlook
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Délais de relance */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Délais de relance</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configurez les délais (en jours après la date d'échéance) pour chaque type de relance
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1ère relance (jours)
              </label>
              <input
                type="number"
                value={formData.firstReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, firstReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2ème relance (jours)
              </label>
              <input
                type="number"
                value={formData.secondReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, secondReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                3ème relance (jours)
              </label>
              <input
                type="number"
                value={formData.thirdReminderDelay}
                onChange={(e) =>
                  setFormData({ ...formData, thirdReminderDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contentieux (jours)
              </label>
              <input
                type="number"
                value={formData.litigationDelay}
                onChange={(e) =>
                  setFormData({ ...formData, litigationDelay: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>
        </div>

        {/* Templates d'emails */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Templates d'emails</h3>
          <p className="text-sm text-gray-600 mb-6">
            Variables disponibles : {"{numero_facture}"}, {"{nom_client}"}, {"{montant}"}, {"{date_facture}"}, {"{date_echeance}"}, {"{jours_retard}"}
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 1ère relance
              </label>
              <textarea
                value={formData.firstReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, firstReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de première relance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 2ème relance
              </label>
              <textarea
                value={formData.secondReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, secondReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de deuxième relance..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template 3ème relance
              </label>
              <textarea
                value={formData.thirdReminderTemplate}
                onChange={(e) =>
                  setFormData({ ...formData, thirdReminderTemplate: e.target.value })
                }
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Votre message de troisième relance..."
              />
            </div>
          </div>
        </div>

        {/* Signature */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Signature</h3>
          <textarea
            value={formData.signature}
            onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre signature (nom, téléphone, email...)"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sauvegarde..." : "Sauvegarder les paramètres"}
          </button>
        </div>
      </form>
    </div>
  );
}
