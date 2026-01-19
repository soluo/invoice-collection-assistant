import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

const EMAIL_VARIABLES = [
  { name: "nom_client", label: "Nom client" },
  { name: "nom_contact", label: "Nom contact" },
  { name: "numero_facture", label: "N° facture" },
  { name: "montant", label: "Montant" },
  { name: "date_facture", label: "Date facture" },
  { name: "date_echeance", label: "Date échéance" },
  { name: "jours_retard", label: "Jours retard" },
] as const;

export type ReminderStep = {
  id: string;
  delay: number;
  type: "email" | "phone";
  name: string;
  emailSubject?: string;
  emailTemplate?: string;
};

type ReminderStepModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (step: Omit<ReminderStep, "id"> & { id?: string }) => void;
  step?: ReminderStep | null;
  existingDelays?: number[];
};

export function ReminderStepModal({
  open,
  onClose,
  onSave,
  step,
  existingDelays = [],
}: ReminderStepModalProps) {
  const [delay, setDelay] = useState<string>("");
  const [type, setType] = useState<"email" | "phone">("email");
  const [name, setName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailTemplate, setEmailTemplate] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Refs and state for variable insertion
  const emailSubjectRef = useRef<HTMLInputElement>(null);
  const emailTemplateRef = useRef<HTMLTextAreaElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "template" | null>(null);

  const insertVariable = (variableName: string) => {
    const variable = `{${variableName}}`;

    // Determine which field to insert into
    const targetField = lastFocusedField || "template";
    const ref = targetField === "subject" ? emailSubjectRef : emailTemplateRef;
    const value = targetField === "subject" ? emailSubject : emailTemplate;
    const setValue = targetField === "subject" ? setEmailSubject : setEmailTemplate;

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

  // Initialize form when step changes or modal opens
  useEffect(() => {
    if (open) {
      if (step) {
        setDelay(step.delay.toString());
        setType(step.type);
        setName(step.name);
        setEmailSubject(step.emailSubject || "");
        setEmailTemplate(step.emailTemplate || "");
      } else {
        // Reset for new step
        setDelay("");
        setType("email");
        setName("");
        setEmailSubject("");
        setEmailTemplate("");
      }
      setErrors({});
    }
  }, [open, step]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate delay
    const delayNum = parseInt(delay, 10);
    if (!delay || isNaN(delayNum) || delayNum <= 0) {
      newErrors.delay = "Le délai doit être un nombre supérieur à 0";
    } else {
      // Check if delay is unique (excluding current step if editing)
      const otherDelays = existingDelays.filter((d) => !step || d !== step.delay);
      if (otherDelays.includes(delayNum)) {
        newErrors.delay = "Une étape existe déjà pour ce délai";
      }
    }

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Le nom de l'étape est obligatoire";
    }

    // Validate email fields if type is email
    if (type === "email") {
      if (!emailSubject.trim()) {
        newErrors.emailSubject = "L'objet de l'email est obligatoire";
      }
      if (!emailTemplate.trim()) {
        newErrors.emailTemplate = "Le contenu de l'email est obligatoire";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const stepData: Omit<ReminderStep, "id"> & { id?: string } = {
      delay: parseInt(delay, 10),
      type,
      name: name.trim(),
    };

    if (step) {
      stepData.id = step.id;
    }

    if (type === "email") {
      stepData.emailSubject = emailSubject.trim();
      stepData.emailTemplate = emailTemplate.trim();
    }

    onSave(stepData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step ? "Modifier l'étape" : "Ajouter une étape"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Delay input */}
          <div className="space-y-2">
            <Label htmlFor="delay">
              Délai (jours après l'échéance) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="delay"
              type="number"
              min="1"
              value={delay}
              onChange={(e) => setDelay(e.target.value)}
              placeholder="Ex: 7"
              className={errors.delay ? "border-red-500" : ""}
            />
            {errors.delay && (
              <p className="text-sm text-red-500">{errors.delay}</p>
            )}
          </div>

          {/* Type selector */}
          <div className="space-y-2">
            <Label htmlFor="type">
              Type d'action <span className="text-red-500">*</span>
            </Label>
            <Select value={type} onValueChange={(value: "email" | "phone") => setType(value)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Téléphone (appel manuel)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Nom de l'étape <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='Ex: "Relance amicale"'
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Conditional fields based on type */}
          {type === "email" ? (
            <>
              {/* Email subject */}
              <div className="space-y-2">
                <Label htmlFor="emailSubject">
                  Objet de l'email <span className="text-red-500">*</span>
                </Label>
                <Input
                  ref={emailSubjectRef}
                  id="emailSubject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  onFocus={() => setLastFocusedField("subject")}
                  placeholder='Ex: "Rappel - Facture {numero_facture}"'
                  className={errors.emailSubject ? "border-red-500" : ""}
                />
                {errors.emailSubject && (
                  <p className="text-sm text-red-500">{errors.emailSubject}</p>
                )}
              </div>

              {/* Email template */}
              <div className="space-y-2">
                <Label htmlFor="emailTemplate">
                  Contenu de l'email <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  ref={emailTemplateRef}
                  id="emailTemplate"
                  value={emailTemplate}
                  onChange={(e) => setEmailTemplate(e.target.value)}
                  onFocus={() => setLastFocusedField("template")}
                  placeholder="Bonjour,&#10;&#10;Nous constatons que..."
                  rows={8}
                  className={errors.emailTemplate ? "border-red-500" : ""}
                />
                {errors.emailTemplate && (
                  <p className="text-sm text-red-500">{errors.emailTemplate}</p>
                )}
              </div>

              {/* Variables badges */}
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  Variables disponibles · <span className="text-gray-400">Cliquez pour insérer</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {EMAIL_VARIABLES.map((v) => (
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
            </>
          ) : (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900">
                Un reminder sera créé pour effectuer un appel manuel à cette étape. Il apparaîtra dans la section "Clients à appeler".
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
