import { AlertTriangle } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { actionRequiredItems } from "@/components/dashboard/user/data";

const toneStyles = {
  red: "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300",
  orange: "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  yellow: "border-yellow-500/35 bg-yellow-500/10 text-yellow-800 dark:text-yellow-200",
};

export default function ActionRequiredCard() {
  return (
    <UserPanelCard
      title="Action Required"
      subtitle="Priority items to avoid penalties and missed reservations"
      className="h-full max-w-full border-orange-500/35"
      delay={0.05}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {actionRequiredItems.map((item) => (
          <article
            key={item.label}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg border",
                  toneStyles[item.tone],
                ].join(" ")}
              >
                <AlertTriangle className="h-4 w-4" aria-hidden />
              </span>
              <p className="text-sm font-medium text-foreground">{item.label}</p>
            </div>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </article>
        ))}
      </div>
    </UserPanelCard>
  );
}
