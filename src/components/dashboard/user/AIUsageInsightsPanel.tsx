import { Bot, Clock3, Sparkles } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { aiUsage } from "@/components/dashboard/user/data";

export default function AIUsageInsightsPanel() {
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
          <p className="mt-2 text-2xl font-semibold text-foreground">{aiUsage.queriesToday}</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
            <Sparkles className="h-3.5 w-3.5" /> Top usage
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground whitespace-normal wrap-break-word">{aiUsage.topUsage}</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
            <Clock3 className="h-3.5 w-3.5" /> Saved time
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{aiUsage.savedTime}</p>
        </article>
      </div>
    </UserPanelCard>
  );
}
