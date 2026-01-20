/**
 * Type pour une étape de relance
 */
export type ReminderStep = {
  id: string;
  delay: number;
  type: "email" | "phone";
  name: string;
  emailSubject?: string;
  emailTemplate?: string;
};

/**
 * Génère les étapes de relance par défaut
 * J+7: Email "Relance amicale"
 * J+14: Email "Relance sérieuse"
 * J+30: Phone "Appel manuel"
 */
export function getDefaultReminderSteps(): ReminderStep[] {
  return [
    {
      id: crypto.randomUUID(),
      delay: 7,
      type: "email",
      name: "Relance amicale",
      emailSubject: "Rappel - Facture {numero_facture}",
      emailTemplate: `Bonjour,

Nous constatons que notre facture n°{numero_facture} d'un montant de {montant}€ TTC émise le {date_facture} est arrivée à échéance le {date_echeance}.

Pourriez-vous nous confirmer la réception de cette facture et nous indiquer la date de règlement prévue ?

Cordialement,`,
    },
    {
      id: crypto.randomUUID(),
      delay: 14,
      type: "email",
      name: "Relance sérieuse",
      emailSubject: "2ème relance - Facture {numero_facture}",
      emailTemplate: `Bonjour,

Malgré notre première relance, nous constatons que notre facture n°{numero_facture} d'un montant de {montant}€ TTC reste impayée (échue depuis {jours_retard} jours).

Nous vous remercions de procéder au règlement dans les plus brefs délais.

Cordialement,`,
    },
    {
      id: crypto.randomUUID(),
      delay: 30,
      type: "phone",
      name: "Appel manuel",
    },
  ];
}

/**
 * Template par défaut pour l'envoi initial de facture (Story 7.1)
 */
export const DEFAULT_INVOICE_EMAIL_SUBJECT = "Facture {numero_facture} - {nom_client}";

export const DEFAULT_INVOICE_EMAIL_TEMPLATE = `Bonjour,

Veuillez trouver ci-joint notre facture n°{numero_facture} d'un montant de {montant}€ TTC.

Date de facture : {date_facture}
Date d'échéance : {date_echeance}

Nous vous remercions de procéder au règlement avant la date d'échéance.

Cordialement,`;
