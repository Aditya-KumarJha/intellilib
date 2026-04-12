import PanelCard from "@/components/dashboard/admin/PanelCard";
import TrendSparkline from "@/components/dashboard/admin/TrendSparkline";
import { usageTrend } from "@/components/dashboard/admin/data";

export default function UsageTrendPanel() {
  return (
    <PanelCard
      title="Usage Trend"
      subtitle="Mini analytics for key operational flows"
      delay={0.1}
      className="h-full"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Issues over last 7 days</p>
          <div className="mt-3">
            <TrendSparkline values={usageTrend.issues} labels={usageTrend.days} color="violet" />
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">AI queries trend</p>
          <div className="mt-3">
            <TrendSparkline values={usageTrend.aiQueries} labels={usageTrend.days} color="cyan" />
          </div>
        </div>
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-sm font-medium text-foreground">Fine collection trend</p>
          <div className="mt-3">
            <TrendSparkline
              values={usageTrend.fineCollection}
              labels={usageTrend.days}
              color="emerald"
              yFormatter={(value) => `${Math.round(value / 100)}h`}
            />
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
