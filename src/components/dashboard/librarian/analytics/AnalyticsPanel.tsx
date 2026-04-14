import PanelCard from "@/components/dashboard/admin/PanelCard";
import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { getLibraryOverviewStats } from "@/lib/server/adminAnalytics";
import { Book, Clock, FileText, Wind } from "lucide-react";

export default async function AnalyticsPanel() {
  const stats = await getLibraryOverviewStats();

  const cards = [
    {
      label: "Total Books",
      value: String(stats.totalBooks),
      hint: `${stats.totalCopies} copies | ${stats.availableCopies} available`,
      icon: "Book",
      tone: "violet" as const,
    },
    {
      label: "Currently Issued",
      value: String(stats.issuedCount),
      hint: `${stats.overdueCount} overdue`,
      icon: "FileText",
      tone: "amber" as const,
    },
    {
      label: "Waiting Reservations",
      value: String(stats.waitingReservations),
      hint: "Users in queue",
      icon: "Wind",
      tone: "cyan" as const,
    },
    {
      label: "Outstanding Fines",
      value: `INR ${Math.round(stats.unpaidFineTotal)}`,
      hint: "Collect at desk or online",
      icon: "Clock",
      tone: "emerald" as const,
    },
  ];

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard className="w-full mx-auto" title="Analytics" subtitle="Loans, turnover, and category insights.">
        <p className="mb-4 text-sm text-foreground/60">
          Live metrics powered by Supabase. This view is server-rendered for accuracy.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c, i) => (
            <DashboardStatCard
              key={c.label}
              label={c.label}
              value={c.value}
              hint={c.hint}
              icon={c.icon}
              tone={c.tone}
              delay={i * 0.03}
            />
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
