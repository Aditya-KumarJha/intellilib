"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { dbTimestampToEpochMs } from "@/lib/dateTime";
import { supabase } from "@/lib/supabaseClient";

import useAuthStore from "@/lib/authStore";

type ActionMetrics = {
  dueIn3Days: number;
  overdue: number;
  unpaidFineTotal: number;
};

const toneStyles = {
  emerald: "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  red: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
};

export default function ActionRequiredCard() {
  const user = useAuthStore((state) => state.user);
  const [metrics, setMetrics] = useState<ActionMetrics>({
    dueIn3Days: 0,
    overdue: 0,
    unpaidFineTotal: 0,
  });
  const [suspensionInfo, setSuspensionInfo] = useState<{ status: string; byName?: string; byEmail?: string }>({
    status: "active",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const userId = user?.id;
      if (!userId || !mounted) return;

      const nowMs = Date.now();
      const threeDaysAheadMs = nowMs + 3 * 24 * 60 * 60 * 1000;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        await fetch("/api/library/fines", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // If sync fails, fallback to currently persisted fine rows.
        });
      }

      const [openTxRes, fineRes, profileRes] = await Promise.all([
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
        supabase
          .from("profiles")
          .select("status")
          .eq("id", userId)
          .single(),
      ]);

      if (!mounted) return;

      const txRows = openTxRes.data ?? [];
      const overdueCount = txRows.filter((item) => {
        const due = dbTimestampToEpochMs(item.due_date) ?? Number.POSITIVE_INFINITY;
        return item.status === "overdue" || due < nowMs;
      }).length;

      const dueSoonCount = txRows.filter((item) => {
        const due = dbTimestampToEpochMs(item.due_date);
        return due != null && due >= nowMs && due <= threeDaysAheadMs;
      }).length;

      const unpaidFineTotal = (fineRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

      setMetrics({
        dueIn3Days: dueSoonCount,
        overdue: overdueCount,
        unpaidFineTotal,
      });

      const currentStatus = profileRes.data?.status || "active";
      let suspendedByName = undefined;
      let suspendedByEmail = undefined;

      if (currentStatus === "suspended") {
        const { data: notifRes } = await supabase
          .from("notifications")
          .select("metadata")
          .eq("user_id", userId)
          .contains("metadata", { action: "member_suspended" })
          .order("created_at", { ascending: false })
          .limit(1);

        if (notifRes?.[0]?.metadata) {
          const meta = notifRes[0].metadata as Record<string, string>;
          suspendedByName = meta.suspendedByName;
          suspendedByEmail = meta.suspendedByEmail;
        }
      }

      setSuspensionInfo({ status: currentStatus, byName: suspendedByName, byEmail: suspendedByEmail });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const actionRequiredItems = useMemo(
    () => [
      {
        label: "Account Status",
        value: suspensionInfo.status === "active" ? "Active" : "Suspended",
        tone: (suspensionInfo.status === "active" ? "emerald" : "red") as keyof typeof toneStyles,
      },
      { label: "Books due soon", value: String(metrics.dueIn3Days), tone: "orange" as const },
      { label: "Overdue books", value: String(metrics.overdue), tone: "red" as const },
      { label: "Unpaid fine", value: `INR ${Math.round(metrics.unpaidFineTotal)}`, tone: "yellow" as const },
    ],
    [metrics, suspensionInfo.status],
  );

  return (
    <UserPanelCard
      title="Action Required"
      subtitle="Priority items to avoid penalties and missed reservations"
      className="h-full max-w-full border-orange-500/35"
      delay={0.05}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
      
      {suspensionInfo.status === "suspended" && (
        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            <strong>Account Suspended. </strong>
            You were suspended by {suspensionInfo.byName || "Admin"} (
            <a href={`mailto:${suspensionInfo.byEmail || "admin@intellilib.com"}`} className="underline underline-offset-2">
              {suspensionInfo.byEmail || "admin@intellilib.com"}
            </a>
            ). Please contact them to resolve this issue and restore your access.
          </p>
        </div>
      )}
    </UserPanelCard>
  );
}
