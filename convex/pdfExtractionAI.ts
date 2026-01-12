"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Version avec IA OpenAI native pour PDF
export const extractPdfDataAI = action({
  args: {
    storageId: v.id("_storage"),
  },
  returns: v.object({
    clientName: v.string(),
    contactEmail: v.string(), // ✅ V2 Phase 2.6 : Renommé de clientEmail
    contactPhone: v.string(), // ✅ V2 Phase 2.6 : Nouveau champ
    invoiceNumber: v.string(),
    amountTTC: v.number(),
    invoiceDate: v.string(),
    dueDate: v.string(),
    confidence: v.number(),
    extractedText: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    try {
      console.log("Extraction PDF avec IA Claude");

      const pdfUrl = await ctx.storage.getUrl(args.storageId);
      if (!pdfUrl) {
        throw new Error("PDF not found in storage");
      }

      // Télécharger le PDF
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }

      const pdfBuffer = await response.arrayBuffer();
      console.log(`PDF téléchargé: ${pdfBuffer.byteLength} bytes`);

      // Utiliser Claude pour analyser directement le PDF
      const anthropic = new (await import("@anthropic-ai/sdk")).default({
        apiKey: process.env.CLAUDE_API_KEY,
      });

      // Convertir le PDF en base64
      const base64Pdf = Buffer.from(pdfBuffer).toString('base64');
      console.log("Envoi du PDF à Claude pour analyse...");

      const prompt = `Vous êtes un expert en extraction de données de factures françaises.
Analysez cette facture PDF et extrayez EXACTEMENT les informations suivantes au format JSON strict :

{
  "clientName": "nom complet du client (destinataire de la facture, PAS l'émetteur)",
  "contactEmail": "email de contact du client si visible, sinon \"\" (ne pas inventer)",
  "contactPhone": "numéro de téléphone de contact si visible (format français), sinon \"\" (ne pas inventer)",
  "invoiceNumber": "numéro de facture exact tel qu'affiché",
  "amountTTC": "montant TTC en nombre décimal (ex: 403.48 sans €)",
  "invoiceDate": "date de facture au format YYYY-MM-DD",
  "dueDate": "date d'échéance au format YYYY-MM-DD si mentionnée, sinon \"\""
}

REGLES IMPORTANTES :
- Le CLIENT est le destinataire (celui qui doit payer), PAS l'entreprise émettrice
- Pour les dates françaises : "13 novembre 2024" → "2024-11-13"
- Pour les montants : "403,48" → 403.48 (sans virgule française)
- Pour le téléphone : garder le format tel quel (ex: "01 23 45 67 89" ou "+33 1 23 45 67 89")
- Si une info est manquante ou illisible, utiliser "" pour les textes, 0 pour les nombres

Répondez UNIQUEMENT avec le JSON valide, sans markdown ni autre texte.`;

      try {
        const completion = await anthropic.messages.create({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1000,
          temperature: 0,
          messages: [{
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }]
        });

        const extractedText = completion.content[0]?.type === 'text' ? completion.content[0].text : null;
        if (!extractedText) {
          throw new Error("Aucune réponse de Claude");
        }

        console.log("=== RÉPONSE CLAUDE BRUTE ===");
        console.log(extractedText);
        console.log("===============================");

        // Parser le JSON retourné par l'IA
        let extractedData;
        try {
          // Nettoyer la réponse (enlever markdown potentiel)
          const cleanJson = extractedText
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim();

          console.log("=== JSON NETTOYÉ ===");
          console.log(cleanJson);
          console.log("====================");

          extractedData = JSON.parse(cleanJson);

          console.log("=== DONNÉES PARSÉES ===");
          console.log(JSON.stringify(extractedData, null, 2));
          console.log("========================");

        } catch (jsonError) {
          console.error("Erreur parsing JSON:", jsonError, "Texte:", extractedText);
          throw new Error(`Réponse Claude invalide: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
        }

        // Validation et calcul du score de confiance
        let confidence = 0;
        const clientName = String(extractedData.clientName || "").trim();
        const contactEmail = String(extractedData.contactEmail || "").trim();
        const contactPhone = String(extractedData.contactPhone || "").trim();
        const invoiceNumber = String(extractedData.invoiceNumber || "").trim();
        const amountTTC = parseFloat(extractedData.amountTTC) || 0;
        const invoiceDate = String(extractedData.invoiceDate || "").trim();
        const dueDate = String(extractedData.dueDate || "").trim();

        // Calculer le score de confiance basé sur les données extraites
        if (clientName && clientName !== "" && clientName.length > 2) confidence += 25;
        if (contactEmail && contactEmail.includes('@')) confidence += 12;
        if (contactPhone && contactPhone.length >= 10) confidence += 13; // ✅ V2 Phase 2.6 : score pour téléphone
        if (invoiceNumber && invoiceNumber !== "") confidence += 20;
        if (amountTTC > 0) confidence += 25;
        if (invoiceDate && invoiceDate.match(/^\d{4}-\d{2}-\d{2}$/)) confidence += 15;

        const result = {
          clientName: clientName || "Client non identifié",
          contactEmail: contactEmail,
          contactPhone: contactPhone, // ✅ V2 Phase 2.6 : nouveau champ
          invoiceNumber: invoiceNumber || `FAC-${Date.now().toString().slice(-6)}`,
          amountTTC: amountTTC,
          invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
          dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          confidence: Math.min(confidence, 100),
          extractedText: `Extraction IA Claude (${Math.min(confidence, 100)}% confiance)`
        };

        return result;

      } catch (aiError) {
        console.error("Erreur Claude:", aiError);
        throw aiError; // Propager l'erreur pour déclencher le fallback
      }

    } catch (error) {
      console.error("Erreur extraction Claude:", error);

      return {
        clientName: "Extraction IA échouée - vérifiez manuellement",
        contactEmail: "",
        contactPhone: "", // ✅ V2 Phase 2.6 : nouveau champ
        invoiceNumber: `FAC-${Date.now().toString().slice(-6)}`,
        amountTTC: 0,
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        confidence: 0,
        extractedText: `Erreur Claude: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },
});
