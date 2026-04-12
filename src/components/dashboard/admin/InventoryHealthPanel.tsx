import PanelCard from "@/components/dashboard/admin/PanelCard";
import { inventoryHealth } from "@/components/dashboard/admin/data";

type PanelProps = { className?: string };

export default function InventoryHealthPanel({ className }: PanelProps) {
  return (
    <PanelCard
      title="Inventory Health"
      subtitle="Availability, pressure points, and circulation leaders"
      delay={0.2}
      className={["h-full", className ?? ""].join(" ")}
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Available books</span>
            <span className="text-foreground/70">{inventoryHealth.availablePercent}%</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-emerald-500 to-teal-500"
              style={{ width: `${inventoryHealth.availablePercent}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-foreground/55">Reserved books</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{inventoryHealth.reservedBooks}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wide text-foreground/55">Most issued category</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {inventoryHealth.mostIssuedCategory}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Low stock categories</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {inventoryHealth.lowStockCategories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
              >
                {category}
              </span>
            ))}
          </div>
        </div>
      </div>
    </PanelCard>
  );
}
