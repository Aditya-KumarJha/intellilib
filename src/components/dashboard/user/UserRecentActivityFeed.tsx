import { activityFeed } from "@/components/dashboard/user/data";
import UserPanelCard from "@/components/dashboard/user/UserPanelCard";

export default function UserRecentActivityFeed() {
  return (
    <UserPanelCard
      title="Recent Activity"
      subtitle="Latest actions in your account"
      className="h-full max-w-full"
      delay={0.25}
    >
      <div className="space-y-3">
        {activityFeed.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={`${item.time}-${item.action}`}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{item.actor}</span> {item.action}
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">{item.time}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
