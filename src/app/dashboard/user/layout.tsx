import type { Metadata } from "next";

import DashboardRoleLayout from "@/components/dashboard/DashboardRoleLayout";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "User Dashboard",
  description: "Private IntelliLib member dashboard and account workspace.",
  path: "/dashboard/user",
  noIndex: true,
});

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoleLayout role="user">{children}</DashboardRoleLayout>;
}
