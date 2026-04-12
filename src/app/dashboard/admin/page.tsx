import AdminDashboardPage from "@/pages/AdminDashboardPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Admin Dashboard",
  description:
    "Administrative control center for IntelliLib operations, analytics, financial performance, and alerts.",
  path: "/dashboard/admin",
  noIndex: true,
});

export default function AdminDashboardRoutePage() {
  return <AdminDashboardPage />;
}
