import Link from "next/link";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { quickActions } from "@/components/dashboard/user/data";

export default function QuickActionsPanel() {
  return (
    <UserPanelCard
      title="Quick Actions"
      subtitle="Jump directly to the next thing you need"
      className="h-full max-w-full"
      delay={0.35}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden />
              {action.label}
            </Link>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
