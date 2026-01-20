import { useState, useEffect } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/simple-tooltip";
import { Mail, AlertTriangle, Loader2, Settings, FileText } from "lucide-react";
import { NavLink } from "react-router-dom";
import { toast } from "sonner";

interface SendInvoiceEmailModalProps {
  invoiceId: Id<"invoices">;
  onClose: () => void;
}

export function SendInvoiceEmailModal({
  invoiceId,
  onClose,
}: SendInvoiceEmailModalProps) {
  const [sending, setSending] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [initialized, setInitialized] = useState(false);

  const invoice = useQuery(api.invoices.getById, { invoiceId });
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const emailTemplate = useQuery(api.organizations.getInvoiceEmailTemplate);
  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    invoice?.pdfStorageId ? { storageId: invoice.pdfStorageId } : "skip"
  );
  const sendInvoiceEmail = useAction(api.invoiceEmails.sendInvoiceEmail);

  // Determine blocking issues
  const isLoading = !invoice || !organization || !emailTemplate;
  const missingContactEmail = invoice && !invoice.contactEmail;
  const missingOAuth = organization && (!organization.emailProvider || !organization.emailAccountInfo);
  const missingPdf = invoice && !invoice.pdfStorageId;

  // Blocking = cannot send at all
  const hasBlockingIssue = missingContactEmail || missingOAuth;
  // Can send but with warning
  const canSend = !isLoading && !hasBlockingIssue && subject.trim() && body.trim();

  // Generate content with replaced variables
  const generateContent = (template: string) => {
    if (!invoice) return template;

    const formattedAmount = invoice.amountTTC.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const formatDateFr = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    return template
      .replace(/{numero_facture}/g, invoice.invoiceNumber)
      .replace(/{nom_client}/g, invoice.clientName)
      .replace(/{montant}/g, formattedAmount)
      .replace(/{date_facture}/g, formatDateFr(invoice.invoiceDate))
      .replace(/{date_echeance}/g, formatDateFr(invoice.dueDate));
  };

  // Initialize editable fields when data loads
  useEffect(() => {
    if (invoice && emailTemplate && !initialized) {
      setSubject(generateContent(emailTemplate.subject));
      setBody(generateContent(emailTemplate.template));
      setInitialized(true);
    }
  }, [invoice, emailTemplate, initialized]);

  const handleSend = async () => {
    if (!invoice || !canSend) return;

    setSending(true);
    try {
      const result = await sendInvoiceEmail({
        invoiceId,
        skipPdf: missingPdf, // Auto-skip PDF if not available
        customSubject: subject,
        customBody: body,
      });

      if (result.success) {
        toast.success("Facture envoyée par email");
        onClose();
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
      }
    } catch (error) {
      console.error("Send error:", error);
      toast.error("Erreur lors de l'envoi de l'email");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Envoyer la facture par email
          </DialogTitle>
          <DialogDescription>
            Vérifiez et modifiez le contenu avant d'envoyer
          </DialogDescription>
        </DialogHeader>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Alerts for issues */}
            {(missingContactEmail || missingOAuth || (missingPdf && !hasBlockingIssue)) && (
              <div className="space-y-3 mb-4">
                {/* AC5: Missing contact email - blocking */}
                {missingContactEmail && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Ajoutez un email de contact avant d'envoyer la facture.
                    </AlertDescription>
                  </Alert>
                )}

                {/* AC8: OAuth not connected - blocking */}
                {missingOAuth && !missingContactEmail && (
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between gap-4">
                      <span>Connectez votre compte email dans les paramètres.</span>
                      <NavLink to="/settings#email-connection-section">
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3 mr-1" />
                          Paramètres
                        </Button>
                      </NavLink>
                    </AlertDescription>
                  </Alert>
                )}

                {/* AC6: No PDF - warning only */}
                {missingPdf && !hasBlockingIssue && (
                  <Alert className="bg-amber-50 border-amber-200 text-amber-800 [&>svg]:text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-amber-800">
                      Aucun PDF attaché. L'email sera envoyé sans pièce jointe.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Main content - always visible but may be disabled */}
            <div className="space-y-4">
              {/* Sender */}
              <div className="space-y-2">
                <Label>Expéditeur</Label>
                <p className="text-gray-900">
                  {organization.emailAccountInfo ? (
                    <>
                      {organization.senderName || organization.emailAccountInfo.name}{" "}
                      <span className="text-gray-500">
                        &lt;{organization.emailAccountInfo.email}&gt;
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Non configuré</span>
                  )}
                </p>
              </div>

              {/* Recipient */}
              <div className="space-y-2">
                <Label>Destinataire</Label>
                <p className="text-gray-900">
                  {invoice.contactEmail ? (
                    <>
                      {invoice.contactName || invoice.clientName}{" "}
                      <span className="text-gray-500">
                        &lt;{invoice.contactEmail}&gt;
                      </span>
                    </>
                  ) : (
                    <span className="text-gray-400 italic">Email manquant</span>
                  )}
                </p>
              </div>

              {/* Subject (editable) */}
              <div className="space-y-2">
                <Label htmlFor="emailSubject">Objet</Label>
                <Input
                  id="emailSubject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Objet de l'email"
                  disabled={hasBlockingIssue}
                />
              </div>

              {/* Body (editable) */}
              <div className="space-y-2">
                <Label htmlFor="emailBody">Message</Label>
                <Textarea
                  id="emailBody"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Contenu de l'email"
                  rows={10}
                  className="resize-none"
                  disabled={hasBlockingIssue}
                />
                {organization.signature && (
                  <p className="text-xs text-gray-500">
                    La signature de l'organisation sera ajoutée automatiquement.
                  </p>
                )}
              </div>

              {/* PDF attachment indicator */}
              <div className="flex items-center gap-3">
                <Label className="mb-0">Pièce jointe</Label>
                {invoice.pdfStorageId ? (
                  <Tooltip content="Afficher la facture">
                    <a
                      href={pdfUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={pdfUrl ? "inline-block" : "inline-block pointer-events-none"}
                    >
                      <Badge variant="secondary" className="gap-2 py-1.5 px-3 hover:bg-gray-200 transition-colors cursor-pointer">
                        <FileText className="h-4 w-4" />
                        facture-{invoice.invoiceNumber}.pdf
                      </Badge>
                    </a>
                  </Tooltip>
                ) : (
                  <span className="text-sm text-gray-400 italic">
                    Aucun PDF attaché
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={!canSend || sending}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
