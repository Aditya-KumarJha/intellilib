import { insightBadge, personalizedInsights } from "@/components/dashboard/user/data";
import UserPanelCard from "@/components/dashboard/user/UserPanelCard";

export default function PersonalizedInsightsPanel() {
  const InsightIcon = insightBadge.icon;

  return (
    <UserPanelCard
      title="Personalized Insights"
      subtitle="Behavior patterns and recommendation direction"
      className="h-full max-w-full"
      delay={0.4}
    >
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-3">
        <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
          <InsightIcon className="h-3.5 w-3.5" aria-hidden /> {insightBadge.label}
        </p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-foreground/75">
        {personalizedInsights.map((line) => (
          <li
            key={line}
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5"
          >
            {line}
          </li>
        ))}
      </ul>
    </UserPanelCard>
  );
}
