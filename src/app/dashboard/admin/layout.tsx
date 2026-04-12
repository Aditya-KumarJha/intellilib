import DashboardRoleLayout from "@/components/dashboard/DashboardRoleLayout";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoleLayout role="admin">{children}</DashboardRoleLayout>;
}
