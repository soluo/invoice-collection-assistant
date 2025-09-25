"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const extractPdfData = action({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      const pdfUrl = await ctx.storage.getUrl(args.storageId);
      if (!pdfUrl) {
        throw new Error("PDF not found");
      }

      // Télécharger le PDF
      const response = await fetch(pdfUrl);
      const pdfBuffer = await response.arrayBuffer();

      // Extraire le texte du PDF
      const pdfParse = (await import("pdf-parse")).default;
      const pdfData = await pdfParse(Buffer.from(pdfBuffer));
      const pdfText = pdfData.text;

      // Utiliser l'IA pour extraire les données structurées
      const openai = new (await import("openai")).default({
        baseURL: process.env.CONVEX_OPENAI_BASE_URL,
        apiKey: process.env.CONVEX_OPENAI_API_KEY,
      });

      const prompt = `Analyse ce texte extrait d'une facture PDF et extrait les informations suivantes au format JSON strict :

{
  "clientName": "nom du client ou de l'entreprise cliente",
  "clientEmail": "email du client si disponible, sinon chaîne vide",
  "invoiceNumber": "numéro de facture",
  "amountTTC": "montant TTC en nombre (sans devise)",
  "invoiceDate": "date de facture au format YYYY-MM-DD",
  "dueDate": "date d'échéance au format YYYY-MM-DD si disponible, sinon chaîne vide"
}

Texte de la facture :
${pdfText}

Réponds UNIQUEMENT avec le JSON, sans autre texte.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });

      const extractedText = completion.choices[0].message.content;
      if (!extractedText) {
        throw new Error("Aucune réponse de l'IA");
      }

      // Parser le JSON retourné par l'IA
      const extractedData = JSON.parse(extractedText);
      
      // Validation et nettoyage des données
      return {
        clientName: extractedData.clientName || "Client non identifié",
        clientEmail: extractedData.clientEmail || "",
        invoiceNumber: extractedData.invoiceNumber || `FAC-${Date.now()}`,
        amountTTC: parseFloat(extractedData.amountTTC) || 0,
        invoiceDate: extractedData.invoiceDate || new Date().toISOString().split('T')[0],
        dueDate: extractedData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    } catch (error) {
      console.error("Erreur extraction PDF:", error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        clientName: "Extraction échouée - vérifiez manuellement",
        clientEmail: "",
        invoiceNumber: `FAC-${Date.now()}`,
        amountTTC: 0,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };
    }
  },
});
