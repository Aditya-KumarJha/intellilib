"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type ActionMetrics = {
  dueIn3Days: number;
  overdue: number;
  unpaidFineTotal: number;
};

const toneStyles = {
  red: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
};

export default function ActionRequiredCard() {
  const [metrics, setMetrics] = useState<ActionMetrics>({
    dueIn3Days: 0,
    overdue: 0,
    unpaidFineTotal: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      const now = new Date();
      const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const [dueSoonRes, overdueRes, fineRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("return_date", null)
          .gte("due_date", now.toISOString())
          .lte("due_date", threeDaysAhead.toISOString()),
        supabase
          .from("transactions")
          .select("id,due_date,status")
          .eq("user_id", userId)
          .is("return_date", null),
        supabase
          .from("fines")
          .select("amount")
          .eq("user_id", userId)
          .is("paid_at", null),
      ]);

      if (!mounted) return;

      const overdueCount = (overdueRes.data ?? []).filter((item) => {
        const due = item.due_date ? new Date(item.due_date).getTime() : Number.POSITIVE_INFINITY;
        return item.status === "overdue" || due < Date.now();
      }).length;

      const unpaidFineTotal = (fineRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

      setMetrics({
        dueIn3Days: Number(dueSoonRes.count ?? 0),
        overdue: overdueCount,
        unpaidFineTotal,
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const actionRequiredItems = useMemo(
    () => [
      { label: "Books due in 3 days", value: String(metrics.dueIn3Days), tone: "orange" as const },
      { label: "Overdue books", value: String(metrics.overdue), tone: "red" as const },
      { label: "Unpaid fine", value: `INR ${Math.round(metrics.unpaidFineTotal)}`, tone: "yellow" as const },
    ],
    [metrics],
  );

  return (
    <UserPanelCard
      title="Action Required"
      subtitle="Priority items to avoid penalties and missed reservations"
      className="h-full max-w-full border-orange-500/35"
      delay={0.05}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {actionRequiredItems.map((item) => (
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
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </article>
        ))}
      </div>
    </UserPanelCard>
  );
}
