"use client";

import { useEffect, useMemo, useState } from "react";
import { BookCheck, Clock3, Target } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

import useAuthStore from "@/lib/authStore";

type ReadingActivityItem = {
  label: string;
  value: string;
  icon: typeof BookCheck;
};

export default function ReadingActivityStats() {
  const user = useAuthStore((state) => state.user);
  const [items, setItems] = useState<ReadingActivityItem[]>([
    { label: "Books read this month", value: "0", icon: BookCheck },
    { label: "Avg reading duration", value: "0 days", icon: Clock3 },
    { label: "Completion rate", value: "0%", icon: Target },
  ]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const userId = user?.id;
      if (!userId || !mounted) return;

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("transactions")
        .select("id,issue_date,return_date,status")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false })
        .limit(200);

      if (!mounted) return;

      const rows = data ?? [];
      const returned = rows.filter((row) => Boolean(row.return_date));
      const returnedThisMonth = returned.filter((row) => new Date(row.return_date as string).getTime() >= monthStart.getTime());

      const avgDurationDays = returned.length
        ? returned.reduce((sum, row) => {
            const issued = row.issue_date ? new Date(row.issue_date).getTime() : Date.now();
            const returnedAt = row.return_date ? new Date(row.return_date).getTime() : issued;
            return sum + Math.max(0, returnedAt - issued);
          }, 0) /
          returned.length /
          (1000 * 60 * 60 * 24)
        : 0;

      const completionRate = rows.length ? Math.round((returned.length / rows.length) * 100) : 0;

      setItems([
        { label: "Books read this month", value: String(returnedThisMonth.length), icon: BookCheck },
        { label: "Avg reading duration", value: `${avgDurationDays.toFixed(1)} days`, icon: Clock3 },
        { label: "Completion rate", value: `${completionRate}%`, icon: Target },
      ]);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const readingActivity = useMemo(() => items, [items]);

  return (
    <UserPanelCard
      title="Reading Activity"
      subtitle="Your monthly reading momentum"
      className="h-full max-w-full"
      delay={0.2}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {readingActivity.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
            </article>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
