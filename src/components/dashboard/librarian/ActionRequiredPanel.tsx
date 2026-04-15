import { AlertTriangle, CircleSlash, RotateCcw, Users } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianActionItem } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const actionIcons = [AlertTriangle, Users, CircleSlash, RotateCcw];

const toneStyles = {
  red: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
  blue: "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

type ActionRequiredPanelProps = {
  items: LibrarianActionItem[];
  loading?: boolean;
};

export default function ActionRequiredPanel({ items, loading = false }: ActionRequiredPanelProps) {
  return (
    <LibrarianPanelCard
      title="Action Required"
      subtitle="Priority queue for librarian control center"
      className="h-full max-w-full border-orange-500/35"
      delay={0.05}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item, idx) => {
          const Icon = actionIcons[idx] ?? AlertTriangle;
          return (
            <article
              key={item.label}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <span
                  className={[
                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                    toneStyles[item.tone],
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm font-medium text-foreground">{item.label}</p>
              </div>
              <p className="text-sm font-semibold text-foreground">{loading ? "--" : item.value}</p>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
