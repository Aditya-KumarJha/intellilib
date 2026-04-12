import { userInsights } from "@/components/dashboard/admin/data";
import PanelCard from "@/components/dashboard/admin/PanelCard";

type PanelProps = { className?: string };

export default function UserInsightsPanel({ className }: PanelProps) {
  const totalUsers = userInsights.activeUsers + userInsights.inactiveUsers;
  const activePercent = Math.round((userInsights.activeUsers / Math.max(totalUsers, 1)) * 100);

  return (
    <PanelCard
      title="User Insights"
      subtitle="Acquisition and borrower engagement signals"
      delay={0.35}
      className={["h-full", className ?? ""].join(" ")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">New users today</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{userInsights.newUsersToday}</p>
        </article>
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Suspended users</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{userInsights.suspendedUsers}</p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5 sm:col-span-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">Active vs inactive users</span>
            <span className="text-foreground/70">{activePercent}% active</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-violet-500 to-cyan-500"
              style={{ width: `${activePercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-foreground/55">
            Active: {userInsights.activeUsers} | Inactive: {userInsights.inactiveUsers}
          </p>
        </article>

        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5 sm:col-span-2">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Top borrowers</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {userInsights.topBorrowers.map((name) => (
              <span
                key={name}
                className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300"
              >
                {name}
              </span>
            ))}
          </div>
        </article>
      </div>
    </PanelCard>
  );
}
