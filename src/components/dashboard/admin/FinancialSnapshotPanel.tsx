import { CreditCard, ReceiptText, Wallet } from "lucide-react";

import PanelCard from "@/components/dashboard/admin/PanelCard";
import { financialSnapshot } from "@/components/dashboard/admin/data";

type PanelProps = { className?: string };

export default function FinancialSnapshotPanel({ className }: PanelProps) {
  return (
    <PanelCard
      title="Financial Snapshot"
      subtitle="Collections, pending amounts, and transaction quality"
      delay={0.25}
      className={["h-full", className ?? ""].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 text-foreground/70">
            <Wallet className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wide">Fines collected (today)</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground">{financialSnapshot.finesToday}</p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 text-foreground/70">
            <ReceiptText className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wide">Fines collected (month)</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground">{financialSnapshot.finesMonth}</p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Pending payments</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{financialSnapshot.pendingPayments}</p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 text-foreground/70">
            <CreditCard className="h-4 w-4" />
            <p className="text-xs uppercase tracking-wide">Failed transactions</p>
          </div>
          <p className="mt-2 text-xl font-semibold text-foreground">
            {financialSnapshot.failedTransactions}
          </p>
          <p className="mt-1 text-xs text-foreground/55">
            Avg fine per user: {financialSnapshot.averageFinePerUser}
          </p>
        </article>
      </div>
    </PanelCard>
  );
}
