import { BellRing } from "lucide-react";

import LibrarianPanelCard from "@/components/dashboard/librarian/LibrarianPanelCard";
import type { LibrarianNotificationPreview } from "@/components/dashboard/librarian/useLibrarianDashboardData";

type NotificationsPreviewPanelProps = {
  items: LibrarianNotificationPreview[];
  loading?: boolean;
};

export default function NotificationsPreviewPanel({ items, loading = false }: NotificationsPreviewPanelProps) {
  return (
    <LibrarianPanelCard
      title="Notifications Preview"
      subtitle="Most relevant alerts for current shift"
      className="h-full max-w-full"
      delay={0.36}
    >
      <div className="space-y-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
          >
            <p className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
              <BellRing className="h-4 w-4 text-amber-500" aria-hidden />
              {item.title}
            </p>
            <p className="mt-1 text-xs text-foreground/60">{loading ? "Loading notifications..." : item.description}</p>
          </article>
        ))}
      </div>
    </LibrarianPanelCard>
  );
}
