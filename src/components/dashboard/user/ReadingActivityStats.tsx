import { readingActivity } from "@/components/dashboard/user/data";
import UserPanelCard from "@/components/dashboard/user/UserPanelCard";

export default function ReadingActivityStats() {
  return (
    <UserPanelCard
      title="Reading Activity"
      subtitle="Your monthly reading momentum"
      className="h-full max-w-full"
      delay={0.2}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {readingActivity.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <p className="inline-flex items-center gap-1 text-xs uppercase tracking-wide text-foreground/55">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {item.label}
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{item.value}</p>
            </article>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
