import { buildMetadata } from "@/lib/seo";
import LiveActivityPanel from "@/components/dashboard/librarian/live-activity/LiveActivityPanel";

export const metadata = buildMetadata({ title: "Live Activity", description: "Realtime desk activity.", path: "/dashboard/librarian/activity", noIndex: true });

export default async function RouteWrapper() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <LiveActivityPanel />
    </main>
  );
}
