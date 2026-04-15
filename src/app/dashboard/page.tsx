"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";

import useAuthStore from "@/lib/authStore";

export default function DashboardIndexPage() {
  const router = useRouter();
  const { init, isAuthenticated, isRoleLoading, role } = useAuthStore();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("social_login") === "true") {
        toast.success("Login successful!");
      }
    }
  }, []);

  useQuery({
    queryKey: ["auth", "init"],
    queryFn: async () => {
      init();
      return true;
    },
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: false,
    refetchOnWindowFocus: false,
  });

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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-(--page-bg) px-4 text-foreground">
      <Loader2 className="h-10 w-10 animate-spin text-purple-500" aria-hidden />
      <p className="text-sm text-foreground/60">Opening your workspace…</p>
    </div>
  );
}
