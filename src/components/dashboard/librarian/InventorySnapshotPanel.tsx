import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import { inventorySnapshot } from "@/components/dashboard/librarian/data";

export default function InventorySnapshotPanel() {
  return (
    <LibrarianPanelCard
      title="Inventory Snapshot"
      subtitle="Availability and stock health at a glance"
      className="h-full max-w-full"
      delay={0.12}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {inventorySnapshot.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-4 w-4 text-violet-600 dark:text-violet-300" aria-hidden />
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
