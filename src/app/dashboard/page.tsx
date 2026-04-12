"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import useAuthStore from "@/lib/authStore";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { init, isAuthenticated, isRoleLoading, role } = useAuthStore();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (isRoleLoading) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    const target = role ?? "user";
    router.replace(`/dashboard/${target}`);
  }, [isAuthenticated, isRoleLoading, role, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--page-bg)] px-4 text-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-purple-500" aria-hidden />
      <p className="text-sm text-foreground/60">Opening your workspace…</p>
    </div>
  );
}
