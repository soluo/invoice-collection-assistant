import { AlertCircle, Clock, Euro, Send } from "lucide-react";

interface StatsCardsProps {
  urgentCount: number;
  waitingCount: number;
  totalOutstanding: number;
  autoRemindersCount: number;
  onCardClick: (tab: string) => void;
  activeTab: string;
}

export default function StatsCards({
  urgentCount,
  waitingCount,
  totalOutstanding,
  autoRemindersCount,
  onCardClick,
  activeTab,
}: StatsCardsProps) {
  const cards = [
    {
      id: "to_handle",
      title: "Urgentes",
      value: urgentCount,
      subtitle: ">15j de retard",
      icon: AlertCircle,
      bgColor: "bg-red-50",
      textColor: "text-red-700",
      borderColor: "border-red-200",
      iconBg: "bg-red-100",
    },
    {
      id: "waiting",
      title: "En attente",
      value: waitingCount,
      subtitle: "factures envoyées",
      icon: Clock,
      bgColor: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
      iconBg: "bg-blue-100",
    },
    {
      id: "outstanding",
      title: "À encaisser",
      value: `${totalOutstanding.toLocaleString("fr-FR")} €`,
      subtitle: "total non payé",
      icon: Euro,
      bgColor: "bg-green-50",
      textColor: "text-green-700",
      borderColor: "border-green-200",
      iconBg: "bg-green-100",
    },
    {
      id: "auto_reminders",
      title: "Relances auto",
      value: autoRemindersCount,
      subtitle: "planifiées",
      icon: Send,
      bgColor: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
      iconBg: "bg-purple-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeTab === card.id;
        const isClickable = card.id !== "outstanding";

        return (
          <button
            key={card.id}
            onClick={() => isClickable && onCardClick(card.id)}
            disabled={!isClickable}
            className={`
              ${card.bgColor} ${card.textColor} ${card.borderColor}
              border rounded-lg p-4 text-left transition-all
              ${isClickable ? "cursor-pointer hover:shadow-md hover:scale-105" : "cursor-default"}
              ${isActive ? "ring-2 ring-offset-2" : ""}
              ${isActive && card.id === "to_handle" ? "ring-red-500" : ""}
              ${isActive && card.id === "waiting" ? "ring-blue-500" : ""}
              ${isActive && card.id === "auto_reminders" ? "ring-purple-500" : ""}
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
          </button>
        );
      })}
    </div>
  );
}
