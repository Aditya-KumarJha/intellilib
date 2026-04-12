import PanelCard from "@/components/dashboard/admin/PanelCard";
import { aiMetrics } from "@/components/dashboard/admin/data";

type PanelProps = { className?: string };

export default function AIIntelligencePanel({ className }: PanelProps) {
  return (
    <PanelCard
      title="AI Intelligence Panel"
      subtitle="How AI affects user actions and outcomes"
      delay={0.15}
      className={["h-full", className ?? ""].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {aiMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              key={metric.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground/55">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                  <p className="mt-1 text-xs text-foreground/55">{metric.subtext}</p>
                </div>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
                  <Icon className="h-4.5 w-4.5" aria-hidden />
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </PanelCard>
  );
}
