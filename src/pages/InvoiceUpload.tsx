import React, { useState, useRef, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Id } from "../../convex/_generated/dataModel";

interface InvoiceUploadProps {
  onSuccess: () => void;
}

const formatDateToISO = (date: Date) => date.toISOString().split("T")[0];

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const getTodayISO = () => formatDateToISO(new Date());

const getDefaultDueDate = (invoiceDate?: string | null) => {
  if (invoiceDate) {
    const parsed = new Date(invoiceDate);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateToISO(addDays(parsed, 14));
    }
  }
  return formatDateToISO(addDays(new Date(), 14));
};

export function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [extractionSuccess, setExtractionSuccess] = useState(false);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

  // ✅ V2 : S'assurer que TOUS les champs ont des valeurs initiales (pas undefined) pour éviter l'erreur React "uncontrolled to controlled"
  const [formData, setFormData] = useState({
    clientName: "",
    contactName: "", // ✅ V2 Phase 2.6
    contactEmail: "", // ✅ V2 Phase 2.6 : Renommé de clientEmail
    contactPhone: "", // ✅ V2 Phase 2.6 : Nouveau champ
    invoiceNumber: "",
    amountTTC: "",
    invoiceDate: getTodayISO(),
    dueDate: getDefaultDueDate(getTodayISO()), // ✅ V2 : J+14 par défaut
  });
  const [pdfStorageId, setPdfStorageId] = useState<any>(null);

  // Récupérer l'utilisateur actuel et la liste des utilisateurs
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Récupérer l'URL du PDF pour la prévisualisation
  const pdfUrl = useQuery(
    api.invoices.getPdfUrl,
    pdfStorageId ? { storageId: pdfStorageId as Id<"_storage"> } : "skip"
  );

  // Détection mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialiser selectedUserId avec l'utilisateur actuel
  useEffect(() => {
    if (loggedInUser && !selectedUserId) {
      setSelectedUserId(loggedInUser._id);
    }
  }, [loggedInUser, selectedUserId]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.invoices.generateUploadUrl);
  const extractPdfData = useAction(api.pdfExtractionAI.extractPdfDataAI);
  const createInvoice = useMutation(api.invoices.create);

  const isAdmin = loggedInUser?.role === "admin";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === "application/pdf");

    if (pdfFile) {
      void handleFileUpload(pdfFile);
    } else {
      toast.error("Veuillez sélectionner un fichier PDF");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      void handleFileUpload(file);
    } else {
      toast.error("Veuillez sélectionner un fichier PDF");
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadedFileName(file.name);
    setExtractionSuccess(false);

    try {
      // Générer l'URL d'upload
      const postUrl = await generateUploadUrl();

      // Uploader le fichier
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      const json = await result.json();
      if (!result.ok) {
        throw new Error(`Upload failed: ${JSON.stringify(json)}`);
      }

      setPdfStorageId(json.storageId);
      setIsUploading(false);

      // Extraire les données avec l'IA
      setIsExtracting(true);
      // ✅ V2 : Ne PAS afficher le formulaire immédiatement, attendre la fin de l'extraction

      try {
        const extractedData = await extractPdfData({ storageId: json.storageId });
        const extractedInvoiceDate = extractedData.invoiceDate || getTodayISO();

        setFormData({
          clientName: extractedData.clientName,
          contactName: extractedData.clientName, // ✅ V2 Phase 2.6 : Pré-remplir avec clientName
          contactEmail: extractedData.contactEmail, // ✅ V2 Phase 2.6
          contactPhone: extractedData.contactPhone, // ✅ V2 Phase 2.6
          invoiceNumber: extractedData.invoiceNumber,
          amountTTC: extractedData.amountTTC != null ? extractedData.amountTTC.toString() : "",
          invoiceDate: extractedInvoiceDate,
          dueDate: extractedData.dueDate || getDefaultDueDate(extractedInvoiceDate),
        });

        // Stocker le score de confiance
        setConfidenceScore(extractedData.confidence);

        // Afficher le message en fonction du score de confiance
        if (extractedData.confidence >= 80) {
          setExtractionSuccess(true);
          toast.success(`Extraction réussie (${extractedData.confidence}% de confiance)`);
        } else if (extractedData.confidence >= 50) {
          setExtractionSuccess(true);
          toast.warning(`Extraction partielle (${extractedData.confidence}% de confiance). Vérifiez attentivement.`);
        } else {
          toast.error("Extraction difficile. Vérifiez et corrigez les données manuellement.");
        }

        // ✅ Afficher le formulaire APRÈS avoir récupéré les données
        setShowManualEntry(true);
      } catch (extractError) {
        console.error("Erreur extraction:", extractError);
        toast.error("Erreur lors de l'extraction. Saisissez les données manuellement.");

        // Pré-remplir avec des données par défaut
        const fileName = file.name.replace('.pdf', '');
        const fallbackInvoiceDate = getTodayISO();
        setFormData({
          clientName: "",
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          invoiceNumber: fileName.includes('FAC') ? fileName : `FAC-${Date.now()}`,
          amountTTC: "",
          invoiceDate: fallbackInvoiceDate,
          dueDate: getDefaultDueDate(fallbackInvoiceDate), // ✅ V2 : J+14
        });

        // ✅ Afficher le formulaire même en cas d'erreur
        setShowManualEntry(true);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload du PDF");
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  const handleChangeFile = () => {
    setPdfStorageId(null);
    setUploadedFileName("");
    setExtractionSuccess(false);
    setConfidenceScore(null);
    setShowManualEntry(false);
    const resetInvoiceDate = getTodayISO();
    setFormData({
      clientName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      invoiceNumber: "",
      amountTTC: "",
      invoiceDate: resetInvoiceDate,
      dueDate: getDefaultDueDate(resetInvoiceDate),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientName || !formData.invoiceNumber || !formData.amountTTC) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const invoiceData: any = {
        clientName: formData.clientName,
        contactName: formData.contactName || formData.clientName, // ✅ V2 Phase 2.6 : Fallback sur clientName
        invoiceNumber: formData.invoiceNumber,
        amountTTC: parseFloat(formData.amountTTC),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
      };

      // ✅ V2 Phase 2.6 : Inclure contactEmail uniquement s'il est fourni
      if (formData.contactEmail) {
        invoiceData.contactEmail = formData.contactEmail;
      }

      // ✅ V2 Phase 2.6 : Inclure contactPhone uniquement s'il est fourni
      if (formData.contactPhone) {
        invoiceData.contactPhone = formData.contactPhone;
      }

      // N'inclure pdfStorageId que s'il n'est pas null
      if (pdfStorageId) {
        invoiceData.pdfStorageId = pdfStorageId;
      }

      // Envoyer assignToUserId si un utilisateur différent est sélectionné
      if (selectedUserId && selectedUserId !== loggedInUser?._id) {
        invoiceData.assignToUserId = selectedUserId;
      }

      await createInvoice(invoiceData);

      toast.success("Facture ajoutée avec succès");
      onSuccess();
    } catch (error) {
      console.error("Erreur lors de l'ajout de la facture:", error);
      toast.error("Erreur lors de l'ajout de la facture");
    }
  };

  // Déterminer si on affiche le layout side-by-side (quand un PDF est uploadé ou en cours d'upload)
  const showSideBySide = pdfStorageId || isUploading || isExtracting;

  // Fonction helper pour obtenir la couleur du badge de confiance
  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  // Composant pour la zone de drop/preview
  const renderDocumentPanel = () => (
    <div className="flex flex-col h-full">
      {/* Header du panneau document */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-gray-500" />
          <span className="font-medium text-gray-700">Document</span>
        </div>
        {pdfStorageId && !isExtracting && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleChangeFile}
                  className="text-sm"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Remplacer
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Uploader un autre document</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Zone de contenu : Drop zone OU Preview PDF */}
      <div className="flex-1 min-h-0">
        {pdfUrl ? (
          // Preview PDF
          <iframe
            src={pdfUrl}
            className="w-full h-full rounded-lg border border-gray-200"
            title="Aperçu du PDF"
          />
        ) : (
          // Zone de drop
          <div
            className={`h-full min-h-[300px] border-2 border-dashed rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-primary/50 bg-primary/5 hover:bg-primary/10"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && !isExtracting && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-3 text-center">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                <p className="text-lg font-semibold text-primary">Upload en cours...</p>
                <p className="text-sm text-gray-500">{uploadedFileName}</p>
              </div>
            ) : (
              <div className="text-center space-y-4 px-6">
                <Upload className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-primary">
                    Glissez-déposez votre facture
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ou cliquez pour sélectionner un fichier (PDF)
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  // Composant pour le formulaire
  const renderFormPanel = () => (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col h-full">
      {/* Header avec indicateur de confiance */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">Informations de la facture</h3>
        {confidenceScore !== null && !isExtracting && (
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getConfidenceColor(confidenceScore)}`}>
            Confiance : {confidenceScore}%
          </span>
        )}
      </div>

      {/* Contenu du formulaire avec overlay pendant l'analyse */}
      <div className="flex-1 min-h-0 overflow-y-auto relative">
        {/* Overlay pendant l'extraction */}
        {isExtracting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
            <div className="text-center space-y-3">
              <Loader2 className="h-10 w-10 text-primary mx-auto animate-spin" />
              <p className="text-lg font-semibold text-gray-700">Analyse en cours...</p>
              <p className="text-sm text-gray-500">Extraction des informations du document</p>
            </div>
          </div>
        )}

        <div className="space-y-6 pr-2">
          {/* Bandeau succès */}
          {extractionSuccess && !isExtracting && (
            <div className="p-3 bg-green-50 text-green-700 border border-green-200 rounded-lg">
              <p className="font-medium text-sm">Données extraites avec succès</p>
              <p className="text-xs">Vérifiez les informations avant de valider.</p>
            </div>
          )}

          {/* Section 1 - Détails de la facture */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">1</div>
              <h3 className="text-base font-medium text-gray-900">Détails de la facture</h3>
            </div>

            <div className="pl-8 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invoiceNumber" className="text-sm">Numéro de facture <span className="text-red-500">*</span></Label>
                <Input
                  id="invoiceNumber"
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full"
                  required
                  disabled={isExtracting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="amountTTC" className="text-sm">Montant TTC <span className="text-red-500">*</span></Label>
                <InputGroup>
                  <InputGroupAddon>€</InputGroupAddon>
                  <InputGroupInput
                    id="amountTTC"
                    type="number"
                    step="0.01"
                    value={formData.amountTTC}
                    onChange={(e) => setFormData({ ...formData, amountTTC: e.target.value })}
                    required
                    disabled={isExtracting}
                  />
                </InputGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invoiceDate" className="text-sm">Date d'émission</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full block"
                  disabled={isExtracting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-sm">Date d'échéance <span className="text-red-500">*</span></Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full block"
                  required
                  disabled={isExtracting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="clientName" className="text-sm">Client <span className="text-red-500">*</span></Label>
                <Input
                  id="clientName"
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  onBlur={(e) => {
                    if (e.target.value && !formData.contactName) {
                      setFormData(prev => ({ ...prev, contactName: e.target.value }));
                    }
                  }}
                  className="w-full"
                  placeholder="Nom du client ou agence"
                  required
                  disabled={isExtracting}
                />
              </div>

              {isAdmin && users && users.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="responsible" className="text-sm">Responsable</Label>
                  <Select value={selectedUserId || undefined} onValueChange={setSelectedUserId} disabled={isExtracting}>
                    <SelectTrigger id="responsible">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.name || user.email} {user.role === "admin" ? "(Admin)" : "(Tech)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Section 2 - Contact pour la relance */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">2</div>
              <h3 className="text-base font-medium text-gray-900">Contact pour la relance</h3>
            </div>

            <div className="pl-8 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactName" className="text-sm">Nom du contact</Label>
                <Input
                  id="contactName"
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full"
                  disabled={isExtracting}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail" className="text-sm">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full"
                    disabled={isExtracting}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    data-form-type="other"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone" className="text-sm">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full"
                    disabled={isExtracting}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer boutons */}
      <div className="flex items-center justify-end gap-3 pt-4 mt-4 border-t border-gray-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            handleChangeFile();
            setShowManualEntry(false);
          }}
          disabled={isExtracting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isExtracting}>
          Ajouter la facture
        </Button>
      </div>
    </form>
  );

  // Layout principal
  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Importer une facture</h1>
      </div>

      {/* Contenu principal */}
      {!showSideBySide && !showManualEntry ? (
        // Vue initiale : zone de drop centrée (sans le wrapper "Document")
        <div className="max-w-2xl mx-auto space-y-6">
          <div
            className={`h-64 border-2 border-dashed rounded-xl transition-colors flex items-center justify-center cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-primary/50 bg-primary/5 hover:bg-primary/10"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="space-y-3 text-center">
                <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
                <p className="text-lg font-semibold text-primary">Upload en cours...</p>
                <p className="text-sm text-gray-500">{uploadedFileName}</p>
              </div>
            ) : (
              <div className="text-center space-y-4 px-6">
                <Upload className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <p className="text-lg font-semibold text-primary">
                    Glissez-déposez votre facture
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    ou cliquez pour sélectionner un fichier (PDF)
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="text-primary hover:text-primary/80 font-medium"
            >
              ou entrer les informations manuellement
            </button>
          </div>
        </div>
      ) : showManualEntry && !showSideBySide ? (
        // Vue formulaire seul (saisie manuelle sans document)
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            {renderFormPanel()}
          </div>
        </div>
      ) : (
        // Vue side-by-side (document + formulaire)
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-160px)]">
          {/* Panneau document */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col min-h-[400px] lg:min-h-0">
            {renderDocumentPanel()}
          </div>

          {/* Panneau formulaire */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col min-h-[500px] lg:min-h-0">
            {renderFormPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
