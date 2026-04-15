import { BookOpenCheck, IndianRupee, RotateCcw, UserPlus } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianLiveActivityItem } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const iconByType = {
  issue: BookOpenCheck,
  return: RotateCcw,
  payment: IndianRupee,
  request: UserPlus,
} as const;

type LiveActivityFeedPanelProps = {
  items: LibrarianLiveActivityItem[];
  loading?: boolean;
};

export default function LiveActivityFeedPanel({ items, loading = false }: LiveActivityFeedPanelProps) {
  return (
    <LibrarianPanelCard
      title="Live Activity Feed"
      subtitle="Realtime-feel operations stream"
      className="h-full max-w-full"
      delay={0.1}
    >
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = iconByType[item.type] ?? BookOpenCheck;
          return (
            <article
              key={item.event}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden />
                {item.event}
              </p>
              <span className="text-xs text-foreground/55">{loading ? "--" : item.time}</span>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
