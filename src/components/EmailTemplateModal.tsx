import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Variables disponibles pour le template d'envoi de facture (Story 7.1)
const INVOICE_EMAIL_VARIABLES = [
  { name: "nom_client", label: "Nom client" },
  { name: "numero_facture", label: "N° facture" },
  { name: "montant", label: "Montant" },
  { name: "date_facture", label: "Date facture" },
  { name: "date_echeance", label: "Date échéance" },
] as const;

interface EmailTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { subject: string; template: string }) => void;
  subject: string;
  template: string;
  saving?: boolean;
}

export function EmailTemplateModal({
  open,
  onClose,
  onSave,
  subject: initialSubject,
  template: initialTemplate,
  saving = false,
}: EmailTemplateModalProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [template, setTemplate] = useState(initialTemplate);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs for cursor position tracking
  const subjectRef = useRef<HTMLInputElement>(null);
  const templateRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<
    "subject" | "template" | null
  >(null);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (open) {
      setSubject(initialSubject);
      setTemplate(initialTemplate);
      setErrors({});
    }
  }, [open, initialSubject, initialTemplate]);

  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`;

    // Determine which field to insert into
    const targetField = lastFocusedField || "template";
    const ref = targetField === "subject" ? subjectRef : templateRef;
    const value = targetField === "subject" ? subject : template;
    const setValue = targetField === "subject" ? setSubject : setTemplate;

    const element = ref.current;
    if (!element) {
      // Fallback: append to end
      setValue(value + variable);
      return;
    }

    const start = element.selectionStart ?? value.length;
    const end = element.selectionEnd ?? value.length;

    const newValue = value.slice(0, start) + variable + value.slice(end);
    setValue(newValue);

    // Restore focus and set cursor position after the inserted variable
    requestAnimationFrame(() => {
      element.focus();
      const newCursorPos = start + variable.length;
      element.setSelectionRange(newCursorPos, newCursorPos);
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!subject.trim()) {
      newErrors.subject = "L'objet de l'email est obligatoire";
    }
    if (!template.trim()) {
      newErrors.template = "Le contenu de l'email est obligatoire";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    onSave({
      subject: subject.trim(),
      template: template.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Modifier le modèle d'email</DialogTitle>
          <DialogDescription>
            Personnalisez l'objet et le contenu du mail envoyé avec vos factures
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="emailSubject">
              Objet <span className="text-red-500">*</span>
            </Label>
            <Input
              ref={subjectRef}
              id="emailSubject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onFocus={() => setLastFocusedField("subject")}
              placeholder='Ex: "Facture {numero_facture} - {nom_client}"'
              className={errors.subject ? "border-red-500" : ""}
            />
            {errors.subject && (
              <p className="text-sm text-red-500">{errors.subject}</p>
            )}
          </div>

          {/* Template body */}
          <div className="space-y-2">
            <Label htmlFor="emailTemplate">
              Contenu du mail <span className="text-red-500">*</span>
            </Label>
            <Textarea
              ref={templateRef}
              id="emailTemplate"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              onFocus={() => setLastFocusedField("template")}
              placeholder="Bonjour,&#10;&#10;Veuillez trouver ci-joint..."
              rows={10}
              className={errors.template ? "border-red-500" : ""}
            />
            {errors.template && (
              <p className="text-sm text-red-500">{errors.template}</p>
            )}
          </div>

          {/* Variable buttons */}
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Variables disponibles ·{" "}
              <span className="text-gray-400">Cliquez pour insérer</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {INVOICE_EMAIL_VARIABLES.map((v) => (
                <Badge
                  key={v.name}
                  variant="secondary"
                  className="cursor-pointer hover:bg-gray-200 transition-colors select-none"
                  onClick={() => insertVariable(v.name)}
                >
                  {v.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
