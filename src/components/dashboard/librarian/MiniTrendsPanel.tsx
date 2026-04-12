import TrendSparkline from "@/components/dashboard/admin/TrendSparkline";
import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import { miniTrends } from "@/components/dashboard/librarian/data";

export default function MiniTrendsPanel() {
  return (
    <LibrarianPanelCard
      title="Mini Trends"
      subtitle="7-day directional trends"
      className="h-full max-w-full"
      delay={0.28}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Loans trend</p>
          <div className="mt-3">
            <TrendSparkline values={miniTrends.loans} labels={miniTrends.labels} color="violet" />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Requests trend</p>
          <div className="mt-3">
            <TrendSparkline values={miniTrends.requests} labels={miniTrends.labels} color="cyan" />
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Fines trend</p>
          <div className="mt-3">
            <TrendSparkline
              values={miniTrends.fines}
              labels={miniTrends.labels}
              color="emerald"
              yFormatter={(value) => `INR ${value}`}
            />
          </div>
        </div>
      </div>
    </LibrarianPanelCard>
  );
}
