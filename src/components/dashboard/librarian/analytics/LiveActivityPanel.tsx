import PanelCard from "@/components/dashboard/admin/PanelCard";
import { getRecentTransactions } from "@/lib/server/adminAnalytics";
import LiveActivityPanelClient from "./LiveActivityPanelClient";

function shortDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d;
  }
}

export default async function LiveActivityPanel() {
  const tx = await getRecentTransactions(20);

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard className="w-full mx-auto" title="Live Activity" subtitle="Realtime desk activity.">
        <LiveActivityPanelClient initialTx={tx ?? []} />
      </PanelCard>
    </div>
  );
}
