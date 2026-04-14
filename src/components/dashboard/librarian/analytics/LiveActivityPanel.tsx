import PanelCard from "@/components/dashboard/admin/PanelCard";
import { getRecentTransactions } from "@/lib/server/adminAnalytics";

function shortDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d;
  }
}

export default async function LiveActivityPanel() {
  const tx = await getRecentTransactions(20);

  return (
    <div className="space-y-6">
      <PanelCard title="Live Activity" subtitle="Realtime desk activity powered by Supabase channels.">
        <p className="mb-4 text-sm text-foreground/60">
          This area shows the most recent transactions and workflow events.
        </p>
        <div className="overflow-hidden rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-foreground/50">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Tx ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Copy</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(tx ?? []).map((t: any) => (
                    <tr key={t.id} className="border-t border-black/5 dark:border-white/5">
                      <td className="px-4 py-3">{shortDate(t.created_at)}</td>
                      <td className="px-4 py-3">{t.id}</td>
                      <td className="px-4 py-3 break-words max-w-xs">
                        <div className="flex items-center gap-2">
                          {t.user_avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={t.user_avatar} alt="avatar" className="h-6 w-6 rounded-full" />
                          ) : null}
                          <span>{t.user_display_name ?? t.user_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.book_title ?? `copy:${t.book_copy_id}`}</td>
                      <td className="px-4 py-3">{String(t.status)}</td>
                    </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
