import { useState, useRef, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { Upload, CheckCircle2, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface InvoiceUploadProps {
  onSuccess: () => void;
}

export function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // ✅ V2 : S'assurer que TOUS les champs ont des valeurs initiales (pas undefined) pour éviter l'erreur React "uncontrolled to controlled"
  const [formData, setFormData] = useState({
    clientName: "",
    contactName: "", // ✅ V2 Phase 2.6
    contactEmail: "", // ✅ V2 Phase 2.6 : Renommé de clientEmail
    contactPhone: "", // ✅ V2 Phase 2.6 : Nouveau champ
    invoiceNumber: "",
    amountTTC: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ✅ V2 : J+14 par défaut
  });
  const [pdfStorageId, setPdfStorageId] = useState<any>(null);

  // Récupérer l'utilisateur actuel et la liste des utilisateurs
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const users = useQuery(api.organizations.listUsers);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

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
      handleFileUpload(pdfFile);
    } else {
      toast.error("Veuillez sélectionner un fichier PDF");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      handleFileUpload(file);
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

        setFormData({
          clientName: extractedData.clientName,
          contactName: extractedData.clientName, // ✅ V2 Phase 2.6 : Pré-remplir avec clientName
          contactEmail: extractedData.contactEmail, // ✅ V2 Phase 2.6
          contactPhone: extractedData.contactPhone, // ✅ V2 Phase 2.6
          invoiceNumber: extractedData.invoiceNumber,
          amountTTC: extractedData.amountTTC.toString(),
          invoiceDate: extractedData.invoiceDate,
          dueDate: extractedData.dueDate,
        });

        // Afficher le message en fonction du score de confiance
        if (extractedData.confidence >= 80) {
          setExtractionSuccess(true);
          toast.success(`✨ Extraction réussie (${extractedData.confidence}% de confiance)`);
        } else if (extractedData.confidence >= 50) {
          setExtractionSuccess(true);
          toast.warning(`⚠️ Extraction partielle (${extractedData.confidence}% de confiance). Vérifiez attentivement.`);
        } else {
          toast.error("🔍 Extraction difficile. Vérifiez et corrigez les données manuellement.");
        }

        // ✅ Afficher le formulaire APRÈS avoir récupéré les données
        setShowManualEntry(true);
      } catch (extractError) {
        console.error("Erreur extraction:", extractError);
        toast.error("Erreur lors de l'extraction. Saisissez les données manuellement.");

        // Pré-remplir avec des données par défaut
        const fileName = file.name.replace('.pdf', '');
        setFormData({
          clientName: "",
          contactName: "",
          contactEmail: "",
          contactPhone: "",
          invoiceNumber: fileName.includes('FAC') ? fileName : `FAC-${Date.now()}`,
          amountTTC: "",
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // ✅ V2 : J+14
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
    setShowManualEntry(false);
    setFormData({
      clientName: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      invoiceNumber: "",
      amountTTC: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
      toast.error("Erreur lors de l'ajout de la facture");
    }
  };

  // ✅ V2 : Sur mobile, afficher directement le formulaire
  if (isMobile && !showManualEntry) {
    setShowManualEntry(true);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Importer une facture</h1>
        <p className="mt-2 text-lg text-gray-600">Déposez votre PDF, nous lirons les informations pour vous.</p>
      </div>

      {/* ✅ V2 : Zone drag-drop avec design maquette (cachée sur mobile) */}
      {!isMobile && !showManualEntry && (
        <>
          {/* Conteneur blanc pour la zone d'upload */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div
              className={`h-64 border-2 border-dashed rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                isDragging
                  ? "border-indigo-400 bg-indigo-100"
                  : "border-indigo-300 bg-indigo-50 hover:bg-indigo-100"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isUploading && !isExtracting && fileInputRef.current?.click()}
            >
              {isUploading || isExtracting ? (
                <div className="space-y-3 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="text-lg font-semibold text-indigo-700">
                    {isUploading ? "Upload en cours..." : "Analyse de votre facture en cours..."}
                  </p>
                  <p className="text-sm text-gray-500">Veuillez patienter.</p>
                </div>
              ) : (
                <div className="text-center space-y-4 px-6">
                  <Upload className="h-12 w-12 text-indigo-500 mx-auto" />
                  <div>
                    <p className="text-lg font-semibold text-indigo-700">
                      Glissez-déposez votre facture
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ou cliquez pour sélectionner un fichier (PDF, JPG, PNG)
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Lien manuel en dehors de la card */}
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setShowManualEntry(true)}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              ou entrer les informations manuellement
            </button>
          </div>
        </>
      )}

      {/* ✅ V2 : Formulaire avec sections */}
      {showManualEntry && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-6 space-y-6">
          {/* ✅ V2 : Bandeau succès */}
          {extractionSuccess && (
            <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg">
              <p className="font-medium">Données extraites !</p>
              <p className="text-sm">Veuillez vérifier les informations ci-dessous avant de valider.</p>
            </div>
          )}

          {/* ✅ V2 : Affichage fichier uploadé */}
          {uploadedFileName && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <p className="text-sm text-gray-700 font-medium">{uploadedFileName}</p>
              <button
                type="button"
                onClick={handleChangeFile}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Changer
              </button>
            </div>
          )}

          {/* ✅ V2 : Section 1 - Détails de la facture */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Détails de la facture</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ligne 1 : Numéro de facture | Montant TTC */}
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Numéro de facture / Dossier <span className="text-red-500">*</span></Label>
                <input
                  id="invoiceNumber"
                  type="text"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: F2024-081 ou 'Dossier Martin'"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountTTC">Montant Total TTC <span className="text-red-500">*</span></Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">€</span>
                  <input
                    id="amountTTC"
                    type="number"
                    step="0.01"
                    value={formData.amountTTC}
                    onChange={(e) => setFormData({ ...formData, amountTTC: e.target.value })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="0,00"
                    required
                  />
                </div>
              </div>

              {/* Ligne 2 : Date d'émission | Date d'échéance */}
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Date d'émission</Label>
                <input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Date d'échéance <span className="text-red-500">*</span></Label>
                <input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Ligne 3 : Client / Donneur d'ordre | Responsable de la facture */}
              <div className="space-y-2">
                <Label htmlFor="clientName">Client / Donneur d'ordre <span className="text-red-500">*</span></Label>
                <input
                  id="clientName"
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  onBlur={(e) => {
                    // ✅ V2 Phase 2.6 : Copier vers contactName uniquement si contactName est vide
                    if (e.target.value && !formData.contactName) {
                      setFormData(prev => ({ ...prev, contactName: e.target.value }));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Agence Immo Sud"
                  required
                />
              </div>

              {/* Responsable de la facture (admins uniquement) */}
              {isAdmin && users && users.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="responsible">Responsable de la facture</Label>
                  <select
                    id="responsible"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name || user.email} {user.role === "admin" ? "(Admin)" : "(Technicien)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ✅ V2 Phase 2.6 : Section 2 - Contact pour la relance */}
          <div className="space-y-4 pt-2">
            <div>
              <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">Contact pour la relance (Recommandé)</h3>
              <p className="text-sm text-gray-500 mt-2">Qui devons-nous contacter ? (Ex: Sophie de l'agence, ou le service compta)</p>
            </div>

            <div className="space-y-4">
              {/* Nom du contact - Pleine largeur */}
              <div className="space-y-2">
                <Label htmlFor="contactName">Nom du contact</Label>
                <input
                  id="contactName"
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Ex: Sophie de l'agence"
                />
              </div>

              {/* Email et Téléphone - 2 colonnes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email</Label>
                  <input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="compta@agence.fr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="04 01 02 03 04"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer boutons */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                handleChangeFile();
                setShowManualEntry(false);
              }}
              className="rounded-lg border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="rounded-lg bg-indigo-600 px-6 hover:bg-indigo-700 text-white font-semibold"
            >
              Ajouter la facture
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
