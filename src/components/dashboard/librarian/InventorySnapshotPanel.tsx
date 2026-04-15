import { AlertTriangle, BookCopy, BookMarked, Plus } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianSnapshotItem } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const snapshotIcons = [BookCopy, BookMarked, AlertTriangle, Plus];

type InventorySnapshotPanelProps = {
  items: LibrarianSnapshotItem[];
  loading?: boolean;
};

export default function InventorySnapshotPanel({ items, loading = false }: InventorySnapshotPanelProps) {
  return (
    <LibrarianPanelCard
      title="Inventory Snapshot"
      subtitle="Availability and stock health at a glance"
      className="h-full max-w-full"
      delay={0.12}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, idx) => {
          const Icon = snapshotIcons[idx] ?? BookCopy;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden />
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{loading ? "--" : item.value}</p>
              <p className="text-xs text-foreground/60">{loading ? "Loading inventory data..." : item.hint}</p>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
