import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import { financialSnapshot } from "@/components/dashboard/librarian/data";

export default function FinancialSnapshotPanel() {
  return (
    <LibrarianPanelCard
      title="Financial Snapshot"
      subtitle="Collections, failures, and outstanding dues"
      className="h-full max-w-full"
      delay={0.2}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {financialSnapshot.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden />
                {item.label}
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">{item.value}</p>
              <p className="text-xs text-foreground/60">{item.hint}</p>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
