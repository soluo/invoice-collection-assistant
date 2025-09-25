import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

interface InvoiceUploadProps {
  onSuccess: () => void;
}

export function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    invoiceNumber: "",
    amountTTC: "",
    invoiceDate: "",
    dueDate: "",
  });
  const [pdfStorageId, setPdfStorageId] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generateUploadUrl = useMutation(api.invoices.generateUploadUrl);
  const extractPdfData = useAction(api.pdfExtraction.extractPdfData);
  const createInvoice = useMutation(api.invoices.create);

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
      toast.success("PDF uploadé avec succès");
      
      // Extraire les données avec l'IA
      setIsExtracting(true);
      toast.info("Extraction des données en cours...");
      
      try {
        const extractedData = await extractPdfData({ storageId: json.storageId });
        
        setFormData({
          clientName: extractedData.clientName,
          clientEmail: extractedData.clientEmail,
          invoiceNumber: extractedData.invoiceNumber,
          amountTTC: extractedData.amountTTC.toString(),
          invoiceDate: extractedData.invoiceDate,
          dueDate: extractedData.dueDate,
        });
        
        if (extractedData.clientName === "Extraction échouée - vérifiez manuellement") {
          toast.warning("Extraction partiellement échouée. Vérifiez les données extraites.");
        } else {
          toast.success("Données extraites automatiquement. Vérifiez avant de sauvegarder.");
        }
      } catch (extractError) {
        console.error("Erreur extraction:", extractError);
        toast.error("Erreur lors de l'extraction. Saisissez les données manuellement.");
        
        // Pré-remplir avec des données par défaut
        const fileName = file.name.replace('.pdf', '');
        setFormData({
          clientName: "",
          clientEmail: "",
          invoiceNumber: fileName.includes('FAC') ? fileName : `FAC-${Date.now()}`,
          amountTTC: "",
          invoiceDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erreur lors de l'upload du PDF");
    } finally {
      setIsUploading(false);
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientName || !formData.clientEmail || !formData.invoiceNumber || !formData.amountTTC) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      await createInvoice({
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        invoiceNumber: formData.invoiceNumber,
        amountTTC: parseFloat(formData.amountTTC),
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        pdfStorageId: pdfStorageId as any,
      });
      
      toast.success("Facture ajoutée avec succès");
      onSuccess();
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la facture");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Nouvelle facture</h2>
        <p className="text-gray-600">Uploadez votre PDF pour extraction automatique ou saisissez manuellement</p>
      </div>

      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isUploading || isExtracting ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600">
              {isUploading ? "Upload en cours..." : "Extraction des données..."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Glissez votre PDF ici ou{" "}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-500"
                >
                  parcourez
                </button>
              </p>
              <p className="text-sm text-gray-500 mt-1">PDF uniquement, max 10MB</p>
              <p className="text-xs text-blue-600 mt-2">✨ Extraction automatique avec IA</p>
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

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Informations de la facture
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du client *
            </label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email du client *
            </label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              N° de facture *
            </label>
            <input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Montant TTC (€) *
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.amountTTC}
              onChange={(e) => setFormData({ ...formData, amountTTC: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date de facture
            </label>
            <input
              type="date"
              value={formData.invoiceDate}
              onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date d'échéance
            </label>
            <input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Ajouter la facture
          </button>
        </div>
      </form>
    </div>
  );
}
