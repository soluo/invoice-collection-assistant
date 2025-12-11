import { FileText, AlertCircle, CheckCircle } from "lucide-react";

interface StatsCardsProps {
  totalOngoing: number;
  totalOverdue: number;
  totalPaidLast30Days: number;
}

export default function StatsCards({
  totalOngoing,
  totalOverdue,
  totalPaidLast30Days,
}: StatsCardsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const cards = [
    {
      id: "ongoing",
      title: "Total En cours",
      value: formatCurrency(totalOngoing),
      subtitle: "factures envoyées non payées",
      icon: FileText,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      id: "overdue",
      title: "Total En retard",
      value: formatCurrency(totalOverdue),
      subtitle: "factures en retard",
      icon: AlertCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      iconBg: "bg-red-100",
    },
    {
      id: "paid",
      title: "Total Payé",
      value: formatCurrency(totalPaidLast30Days),
      subtitle: "30 derniers jours",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      iconBg: "bg-green-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className={`
              ${card.bgColor} ${card.textColor} ${card.borderColor}
              border rounded-lg p-4
            `}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">{card.title}</p>
                <p className="text-2xl font-bold mt-1">{card.value}</p>
                <p className="text-xs mt-1 opacity-75">{card.subtitle}</p>
              </div>
              <div className={`${card.iconBg} p-2 rounded-lg`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
