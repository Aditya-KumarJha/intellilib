import { recentActivities } from "@/components/dashboard/admin/data";
import PanelCard from "@/components/dashboard/admin/PanelCard";

type PanelProps = { className?: string };

export default function RecentActivityFeed({ className }: PanelProps) {
  return (
    <PanelCard
      title="Recent Activity Feed"
      subtitle="Realtime-looking stream of latest events"
      delay={0.4}
      className={["h-full", className ?? ""].join(" ")}
    >
      <div className="space-y-3">
        {recentActivities.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={`${item.actor}-${item.time}-${item.action}`}
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
    </PanelCard>
  );
}
