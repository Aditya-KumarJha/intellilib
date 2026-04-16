import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import type { CirculationSummary } from "@/lib/server/librarianCirculation";
import * as Icons from "lucide-react";

type Props = {
  summary: CirculationSummary;
};

export default function CirculationStatsRow({ summary }: Props) {
  const cards = [
    {
      label: "Issued Today",
      value: String(summary.issuedToday),
      hint: "Desk issues processed today",
      icon: "BookOpen" as keyof typeof Icons,
      tone: "violet" as const,
    },
    {
      label: "Returns Today",
      value: String(summary.returnedToday),
      hint: "Completed and synced",
      icon: "RotateCcw" as keyof typeof Icons,
      tone: "cyan" as const,
    },
    {
      label: "Pending Return Requests",
      value: String(summary.pendingReturns),
      hint: "Awaiting librarian approval",
      icon: "ClipboardList" as keyof typeof Icons,
      tone: "amber" as const,
    },
    {
      label: "Open Overdue",
      value: String(summary.overdueOpen),
      hint: `${summary.availablePhysicalCopies} physical copies available now`,
      icon: "AlertTriangle" as keyof typeof Icons,
      tone: "rose" as const,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <DashboardStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
          icon={card.icon}
          tone={card.tone}
          delay={index * 0.03}
        />
      ))}
    </div>
  );
}
