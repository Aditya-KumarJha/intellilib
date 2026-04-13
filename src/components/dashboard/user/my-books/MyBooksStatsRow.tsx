import { AlertTriangle, BookCheck, BookOpenCheck, Wallet } from "lucide-react";

import type { MyBooksStats } from "@/components/dashboard/user/my-books/types";
import { formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";

type MyBooksStatsRowProps = {
  stats: MyBooksStats;
  onSelect?: (filter: "all" | "issued" | "overdue" | "returned" | "fine") => void;
  active?: "all" | "issued" | "overdue" | "returned" | "fine";
};

function StatCard({
  label,
  value,
  icon,
  tone,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone: "cyan" | "emerald" | "amber" | "rose";
  onClick?: () => void;
  active?: boolean;
}) {
  const tones: Record<typeof tone, string> = {
    cyan: "from-cyan-500/20 to-sky-500/10 ring-cyan-500/25",
    emerald: "from-emerald-500/20 to-green-500/10 ring-emerald-500/25",
    amber: "from-amber-500/20 to-orange-500/10 ring-amber-500/25",
    rose: "from-rose-500/20 to-red-500/10 ring-rose-500/25",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition ${
        active
          ? "border-2 border-white/20 bg-white/80 shadow-md dark:border-white/20 dark:bg-white/12"
          : "border-black/10 bg-white/65 dark:border-white/10 dark:bg-white/5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-foreground/60">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-linear-to-br ring-1 ${tones[tone]}`}>
          {icon}
        </span>
      </div>
    </button>
  );
}

export default function MyBooksStatsRow({ stats, onSelect, active }: MyBooksStatsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Currently Issued"
        value={stats.activeCount}
        icon={<BookOpenCheck className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />}
        tone="cyan"
        onClick={() => onSelect?.("issued")}
        active={active === "issued"}
      />
      <StatCard
        label="Overdue"
        value={stats.overdueCount}
        icon={<AlertTriangle className="h-5 w-5 text-rose-700 dark:text-rose-300" />}
        tone="rose"
        onClick={() => onSelect?.("overdue")}
        active={active === "overdue"}
      />
      <StatCard
        label="Returned"
        value={stats.returnedCount}
        icon={<BookCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />}
        tone="emerald"
        onClick={() => onSelect?.("returned")}
        active={active === "returned"}
      />
      <StatCard
        label="Fine Due"
        value={formatCurrency(stats.dueFineAmount)}
        icon={<Wallet className="h-5 w-5 text-amber-700 dark:text-amber-300" />}
        tone="amber"
        onClick={() => onSelect?.("fine")}
        active={active === "fine"}
      />
    </div>
  );
}
