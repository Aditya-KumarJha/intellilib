"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Clock3, Sparkles } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type AiUsageStats = {
  queriesToday: number;
  topUsage: string;
  savedTime: string;
};

export default function AIUsageInsightsPanel() {
  const [stats, setStats] = useState<AiUsageStats>({
    queriesToday: 0,
    topUsage: "No assistant logs found",
    savedTime: "0 min",
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getSession();
      const userId = userData?.session?.user?.id;
      if (!userId || !mounted) return;

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("ai_queries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfToday.toISOString());

      if (!mounted) return;

      const queriesToday = Number(count ?? 0);
      setStats({
        queriesToday,
        topUsage: queriesToday > 0 ? "Search & Recommendations" : "No tracked AI activity today",
        savedTime: `${queriesToday * 5} min`,
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const rendered = useMemo(() => stats, [stats]);

  return (
    <UserPanelCard
      title="AI Usage Insights"
      subtitle="Real value from your assistant interactions"
      className="h-full max-w-full"
      delay={0.15}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
            <Bot className="h-3.5 w-3.5" /> Queries today
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{rendered.queriesToday}</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
            <Sparkles className="h-3.5 w-3.5" /> Top usage
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground whitespace-normal wrap-break-word">{rendered.topUsage}</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
            <Clock3 className="h-3.5 w-3.5" /> Saved time
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{rendered.savedTime}</p>
        </article>
      </div>
    </UserPanelCard>
  );
}
