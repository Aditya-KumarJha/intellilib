import DashboardRoleLayout from "@/components/dashboard/DashboardRoleLayout";

export default function LibrarianDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoleLayout role="librarian">{children}</DashboardRoleLayout>;
}
