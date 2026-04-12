"use client";

import RoleGuard from "@/components/auth/RoleGuard";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { UserRole } from "@/lib/authStore";

type DashboardRoleLayoutProps = {
  role: UserRole;
  children: React.ReactNode;
};

export default function DashboardRoleLayout({ role, children }: DashboardRoleLayoutProps) {
  return (
    <RoleGuard allowedRole={role}>
      <DashboardShell role={role}>{children}</DashboardShell>
    </RoleGuard>
  );
}
