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
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      valueColor: "text-slate-900",
    },
    {
      id: "overdue",
      title: "Total En retard",
      value: formatCurrency(totalOverdue),
      subtitle: "factures en retard",
      icon: AlertCircle,
      iconBg: "bg-red-50",
      iconColor: "text-red-500",
      valueColor: "text-red-600",
    },
    {
      id: "paid",
      title: "Total Payé",
      value: formatCurrency(totalPaidLast30Days),
      subtitle: "30 derniers jours",
      icon: CheckCircle,
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      valueColor: "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className="bg-white p-5 rounded-xl shadow-card border border-slate-100 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {card.title}
              </p>
              <h3 className={`text-2xl font-extrabold ${card.valueColor}`}>
                {card.value}
              </h3>
              <div className="text-xs text-slate-400 mt-1">{card.subtitle}</div>
            </div>
            <div
              className={`w-12 h-12 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}
            >
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
}
