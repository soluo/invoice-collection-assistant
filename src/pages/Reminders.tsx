import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

type ReminderRecord = {
  _id: string;
  reminderDate: string;
  reminderStatus: "first_reminder" | "second_reminder" | "third_reminder";
  sendStatus: "pending" | "sent" | "failed";
  emailSubject: string;
  emailContent: string;
  generatedByCron: boolean;
  invoice: {
    _id: string;
    invoiceNumber: string;
    clientName: string;
    clientEmail: string | null;
    amountTTC: number;
    dueDate: string;
    status: string;
  } | null;
  creator: {
    _id: string;
    name: string;
  } | null;
};

const sendStatusLabels: Record<ReminderRecord["sendStatus"], string> = {
  pending: "En attente",
  sent: "Envoyée",
  failed: "Échec",
};

const sendStatusClasses: Record<ReminderRecord["sendStatus"], string> = {
  pending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const reminderTypeLabels: Record<ReminderRecord["reminderStatus"], string> = {
  first_reminder: "1ère relance",
  second_reminder: "2ème relance",
  third_reminder: "3ème relance",
};

function formatDate(dateTime: string) {
  const parsed = new Date(dateTime.replace(" ", "T"));
  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAmount(amount: number | undefined) {
  if (amount === undefined) return "—";
  return amount.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

export function Reminders() {
  const reminders = useQuery(api.reminders.listForOrganization) as ReminderRecord[] | undefined;
  const organization = useQuery(api.organizations.getCurrentOrganization);
  const previewOrganization = organization
    ? {
        name: organization.name,
        senderEmail: organization.senderEmail,
        emailAccountInfo: organization.emailAccountInfo ?? undefined,
      }
    : null;
  const [previewReminder, setPreviewReminder] = useState<ReminderRecord | null>(null);

  const stats = useMemo(() => {
    if (!reminders) {
      return {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
      };
    }

    return reminders.reduce(
      (acc, reminder) => {
        acc.total += 1;
        if (reminder.sendStatus === "sent") {
          acc.sent += 1;
        } else if (reminder.sendStatus === "failed") {
          acc.failed += 1;
        } else {
          acc.pending += 1;
        }
        return acc;
      },
      {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
      }
    );
  }, [reminders]);

  if (reminders === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relances</h1>
        <p className="text-gray-600">
          Suivez les relances générées par le système et préparez leur envoi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="En attente" value={stats.pending} tone="amber" />
        <StatCard label="Envoyées" value={stats.sent} tone="green" />
        <StatCard label="Échecs" value={stats.failed} tone="red" />
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Relances générées</h2>
          <span className="text-sm text-gray-600">
            {stats.pending} en attente d'envoi
          </span>
        </div>
        {reminders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucune relance n'a encore été générée.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Facture & Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Montant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Créée le
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    État
                 </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Provenance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reminders.map((reminder) => (
                  <tr key={reminder._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {reminder.invoice ? (
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900">
                            #{reminder.invoice.invoiceNumber}
                          </p>
                          <p className="text-sm text-gray-600">
                            {reminder.invoice.clientName}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400">Facture supprimée</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatAmount(reminder.invoice?.amountTTC)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {reminderTypeLabels[reminder.reminderStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatDate(reminder.reminderDate)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${sendStatusClasses[reminder.sendStatus]}`}
                      >
                        {sendStatusLabels[reminder.sendStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {reminder.generatedByCron ? "Généré automatiquement" : "Créé manuellement"}
                      {reminder.creator && (
                        <p className="text-xs text-gray-500 mt-1">
                          Par {reminder.creator.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <button
                        type="button"
                        onClick={() => setPreviewReminder(reminder)}
                        className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        Prévisualiser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {previewReminder && (
        <ReminderPreviewModal
          reminder={previewReminder}
          organization={previewOrganization}
          onClose={() => setPreviewReminder(null)}
        />
      )}
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: number;
  tone?: "amber" | "green" | "red";
};

function StatCard({ label, value, tone }: StatCardProps) {
  const base = "p-4 rounded-lg border";
  const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
    amber: `${base} bg-amber-50 text-amber-700 border-amber-200`,
    green: `${base} bg-green-50 text-green-700 border-green-200`,
    red: `${base} bg-red-50 text-red-700 border-red-200`,
  };

  const defaultClass = `${base} bg-white text-gray-700 border-gray-200`;
  const toneClass = tone ? toneClasses[tone] : defaultClass;

  return (
    <div className={tone ? toneClass : defaultClass}>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

type ReminderPreviewModalProps = {
  reminder: ReminderRecord;
  organization: {
    senderEmail: string;
    name: string;
    emailAccountInfo?: { email: string; name: string };
  } | null;
  onClose: () => void;
};

function ReminderPreviewModal({ reminder, organization, onClose }: ReminderPreviewModalProps) {
  const recipientName = reminder.invoice?.clientName ?? "Client inconnu";
  const recipientEmail = reminder.invoice?.clientEmail ?? "Email indisponible";
  const senderName =
    organization?.emailAccountInfo?.name ??
    organization?.name ??
    "Organisation";
  const senderEmail =
    organization?.emailAccountInfo?.email ??
    organization?.senderEmail ??
    "Email expéditeur non configuré";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Prévisualisation du mail</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-900">À :</span>{" "}
              {recipientName} &lt;{recipientEmail}&gt;
            </p>
            <p>
              <span className="font-semibold text-gray-900">De :</span>{" "}
              {senderName} &lt;{senderEmail}&gt;
            </p>
            <p>
              <span className="font-semibold text-gray-900">Objet :</span>{" "}
              {reminder.emailSubject}
            </p>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {reminder.emailContent}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-500 rounded-md opacity-60 cursor-not-allowed"
            title="Envoi automatique à venir"
          >
            Envoyer (bientôt)
          </button>
        </div>
      </div>
    </div>
  );
}
