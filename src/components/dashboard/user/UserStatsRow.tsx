"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, Bot, BookOpen, CreditCard } from "lucide-react";

import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { supabase } from "@/lib/supabaseClient";

type DashboardStats = {
  activeIssued: number;
  activeReserved: number;
  dueThisWeek: number;
  unpaidFineTotal: number;
  aiQueries7d: number;
};

export default function UserStatsRow() {
  const [stats, setStats] = useState<DashboardStats>({
    activeIssued: 0,
    activeReserved: 0,
    dueThisWeek: 0,
    unpaidFineTotal: 0,
    aiQueries7d: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [activeTxRes, activeReservationRes, dueTxRes, finesRes, assistantUsageRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("return_date", null),
        supabase
          .from("reservations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .in("status", ["waiting", "approved"]),
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("return_date", null)
          .gte("due_date", now.toISOString())
          .lte("due_date", weekEnd.toISOString()),
        supabase
          .from("fines")
          .select("amount")
          .eq("user_id", userId)
          .is("paid_at", null),
        supabase
          .from("ai_queries")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      if (!mounted) return;

      const unpaidFineTotal = (finesRes.data ?? []).reduce((sum, row) => sum + Number(row.amount ?? 0), 0);

      setStats({
        activeIssued: Number(activeTxRes.count ?? 0),
        activeReserved: Number(activeReservationRes.count ?? 0),
        dueThisWeek: Number(dueTxRes.count ?? 0),
        unpaidFineTotal,
        aiQueries7d: Number(assistantUsageRes.count ?? 0),
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = useMemo(
    () => [
      {
        label: "Books Issued",
        value: String(stats.activeIssued),
        hint: `${stats.activeIssued} active | ${stats.activeReserved} reserved`,
        icon: BookOpen,
        tone: "violet" as const,
      },
      {
        label: "Due This Week",
        value: String(stats.dueThisWeek),
        hint: "Return or renew soon",
        icon: AlarmClock,
        tone: "amber" as const,
      },
      {
        label: "Unpaid Fines",
        value: `INR ${Math.round(stats.unpaidFineTotal)}`,
        hint: "Pay digitally in 2 taps",
        icon: CreditCard,
        tone: "emerald" as const,
      },
      {
        label: "AI Queries (7d)",
        value: String(stats.aiQueries7d),
        hint: "Search + recommendations",
        icon: Bot,
        tone: "cyan" as const,
      },
    ],
    [stats],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item, index) => (
        <DashboardStatCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          icon={item.icon}
          tone={item.tone}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}
