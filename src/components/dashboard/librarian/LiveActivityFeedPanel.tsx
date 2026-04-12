import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import { liveActivityItems } from "@/components/dashboard/librarian/data";

export default function LiveActivityFeedPanel() {
  return (
    <LibrarianPanelCard
      title="Live Activity Feed"
      subtitle="Realtime-feel operations stream"
      className="h-full max-w-full"
      delay={0.1}
    >
      <div className="space-y-2">
        {liveActivityItems.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.event}
              className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden />
                {item.event}
              </p>
              <span className="text-xs text-foreground/55">{item.time}</span>
            </article>
          );
        })}
      </div>
    </LibrarianPanelCard>
  );
}
