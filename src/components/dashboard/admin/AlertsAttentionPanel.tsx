import PanelCard from "@/components/dashboard/admin/PanelCard";
import { alerts } from "@/components/dashboard/admin/data";

const toneClass = {
  red: "border-red-500/35 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  blue: "border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

type PanelProps = { className?: string };

export default function AlertsAttentionPanel({ className }: PanelProps) {
  return (
    <PanelCard
      title="Alerts and Attention Needed"
      subtitle="Priority items requiring admin intervention"
      delay={0.3}
      className={["h-full border-red-500/25", className ?? ""].join(" ")}
    >
      <div className="space-y-3">
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <article
              key={alert.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span
                    className={[
                      "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                      toneClass[alert.tone],
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{alert.label}</p>
                    <p className="mt-1 text-xs text-foreground/55">{alert.detail}</p>
                  </div>
                </div>
                <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-semibold text-foreground dark:bg-white/10">
                  {alert.count}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </PanelCard>
  );
}
