import { ArrowRight } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { continueReading } from "@/components/dashboard/user/data";

export default function ContinueReadingPanel() {
  return (
    <UserPanelCard
      title="Continue Reading"
      subtitle="Pick up where you left off and move to your next best read"
      className="h-full max-w-full"
      delay={0.1}
    >
      <div className="space-y-4">
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Last opened</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{continueReading.lastOpened.title}</p>
          <p className="mt-1 text-sm text-foreground/65">Due {continueReading.lastOpened.due}</p>
          <p className="mt-1 text-xs text-foreground/55">{continueReading.lastOpened.progress}</p>
        </article>

        <article className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
            Suggested next
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">{continueReading.suggestedNext.title}</p>
          <p className="mt-1 text-sm text-foreground/65">{continueReading.suggestedNext.reason}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-700 dark:text-cyan-300"
          >
            Explore recommendation <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      </div>
    </UserPanelCard>
  );
}
