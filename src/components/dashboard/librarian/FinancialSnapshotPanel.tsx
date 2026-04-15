import { ArrowDownUp, Clock3, CreditCard, IndianRupee } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianSnapshotItem } from "@/components/dashboard/librarian/useLibrarianDashboardData";

const financialIcons = [IndianRupee, Clock3, CreditCard, ArrowDownUp];

type FinancialSnapshotPanelProps = {
  items: LibrarianSnapshotItem[];
  loading?: boolean;
};

export default function FinancialSnapshotPanel({ items, loading = false }: FinancialSnapshotPanelProps) {
  return (
    <LibrarianPanelCard
      title="Financial Snapshot"
      subtitle="Collections, failures, and outstanding dues"
      className="h-full max-w-full"
      delay={0.2}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item, idx) => {
          const Icon = financialIcons[idx] ?? IndianRupee;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden />
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{loading ? "--" : item.value}</p>
              <p className="text-xs text-foreground/60">{loading ? "Loading financial data..." : item.hint}</p>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
