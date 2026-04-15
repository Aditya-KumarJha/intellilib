import type { Metadata } from "next";

import DashboardRoleLayout from "@/components/dashboard/DashboardRoleLayout";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Librarian Dashboard",
  description: "Private librarian operations workspace for circulation and inventory.",
  path: "/dashboard/librarian",
  noIndex: true,
});

export default function LibrarianDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoleLayout role="librarian">{children}</DashboardRoleLayout>;
}
