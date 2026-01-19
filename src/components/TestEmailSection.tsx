import { useState } from "react";
import { useAction } from "convex/react";
import { Send, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Doc } from "@convex/_generated/dataModel";

interface TestEmailSectionProps {
  organization: Doc<"organizations">;
  user: Doc<"users">;
}

/**
 * TestEmailSection - Admin-only component to send test emails
 *
 * Renders only if:
 * - User is admin
 * - Organization has a connected email provider
 *
 * Acceptance Criteria covered:
 * - AC#1: Shows input field for test address
 * - AC#2: Sends test email via connected account
 * - AC#3: Handles missing OAuth with error message
 * - AC#4: Handles send failures with error details
 * - AC#5: Hidden from non-admin users
 */
export function TestEmailSection({ organization, user }: TestEmailSectionProps) {
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);

  const sendTestEmail = useAction(api.emails.sendTestEmail);

  // AC#5: Only show for admins with connected email
  if (user.role !== "admin") {
    return null;
  }

  // Only show if email provider is connected
  if (!organization.emailProvider || !organization.emailAccountInfo) {
    return null;
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendTestEmail = async () => {
    // Validate email format
    if (!recipientEmail.trim()) {
      toast.error("Veuillez entrer une adresse email");
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      toast.error("Format d'adresse email invalide");
      return;
    }

    setIsSending(true);

    try {
      await sendTestEmail({ recipientEmail: recipientEmail.trim() });
      toast.success("Email de test envoyé !", {
        description: `L'email a été envoyé à ${recipientEmail}`,
      });
      setRecipientEmail(""); // Clear field on success
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Une erreur est survenue";

      // AC#3: Handle missing OAuth case - prompt to reconnect with scroll action
      if (errorMessage.includes("non connecté") || errorMessage.includes("Connectez")) {
        toast.error("Compte email non connecté", {
          description: "Veuillez reconnecter votre compte Microsoft.",
          action: {
            label: "Voir la section",
            onClick: () => {
              const section = document.getElementById("email-connection-section");
              section?.scrollIntoView({ behavior: "smooth", block: "center" });
            },
          },
        });
      } else {
        // AC#4: Show error details for other failures
        toast.error("Échec de l'envoi", {
          description: errorMessage,
        });
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <MailCheck className="h-5 w-5" />
        Test de la connexion email
      </h2>
      <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Envoyez un email de test pour vérifier que la connexion fonctionne correctement.
          </p>

          <div className="space-y-2">
            <Label htmlFor="testEmail">Adresse email de test</Label>
            <div className="flex gap-2">
              <Input
                id="testEmail"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="votre@email.com"
                className="flex-1"
                disabled={isSending}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestEmail}
                disabled={isSending || !recipientEmail.trim()}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              L'email sera envoyé depuis {organization.emailAccountInfo.email}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
