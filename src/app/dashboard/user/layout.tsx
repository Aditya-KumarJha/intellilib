import DashboardRoleLayout from "@/components/dashboard/DashboardRoleLayout";

export default function UserDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardRoleLayout role="user">{children}</DashboardRoleLayout>;
}
