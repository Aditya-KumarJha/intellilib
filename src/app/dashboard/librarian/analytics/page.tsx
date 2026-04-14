import { buildMetadata } from "@/lib/seo";
import AnalyticsPanel from "@/components/dashboard/librarian/analytics/AnalyticsPanel";

export const metadata = buildMetadata({ title: "Analytics", description: "Loans, turnover, and category insights.", path: "/dashboard/librarian/analytics", noIndex: true });

export default async function RouteWrapper() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-6">
      <AnalyticsPanel />
    </main>
  );
}
