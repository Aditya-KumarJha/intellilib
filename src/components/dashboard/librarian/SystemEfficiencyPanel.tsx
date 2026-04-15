import { Activity, Clock3, RotateCcw, Timer } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianSnapshotItem } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const efficiencyIcons = [Timer, RotateCcw, Activity, Clock3];

type SystemEfficiencyPanelProps = {
  items: LibrarianSnapshotItem[];
  loading?: boolean;
};

export default function SystemEfficiencyPanel({ items, loading = false }: SystemEfficiencyPanelProps) {
  return (
    <LibrarianPanelCard
      title="System Efficiency Metrics"
      subtitle="Operational velocity for issue and return flows"
      className="h-full max-w-full"
      delay={0.24}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, idx) => {
          const Icon = efficiencyIcons[idx] ?? Timer;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4 text-sky-600 dark:text-sky-300" aria-hidden />
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{loading ? "--" : item.value}</p>
              <p className="text-xs text-foreground/60">{loading ? "Loading system metrics..." : item.hint}</p>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
