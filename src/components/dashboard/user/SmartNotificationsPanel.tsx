import { BellRing } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { smartNotifications } from "@/components/dashboard/user/data";

export default function SmartNotificationsPanel() {
  return (
    <UserPanelCard
      title="Smart Notifications"
      subtitle="Preview of your most relevant alerts"
      className="h-full max-w-full"
      delay={0.3}
    >
      <div className="space-y-3">
        {smartNotifications.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <BellRing className="h-4 w-4 text-amber-500" aria-hidden />
              {item.title}
            </p>
            <p className="mt-1 text-xs text-foreground/60">{item.description}</p>
          </article>
        ))}
      </div>
    </UserPanelCard>
  );
}
