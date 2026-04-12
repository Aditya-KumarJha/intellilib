"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, PanelLeftClose, PanelLeft, Sparkles } from "lucide-react";

import type { UserRole } from "@/lib/authStore";
import useAuthStore from "@/lib/authStore";
import { getNavLinks } from "@/lib/dashboardNav";
import { supabase } from "@/lib/supabaseClient";
import ThemeToggleButton from "@/components/ui/theme-toggle-button";
import { toast } from "react-toastify";
import { cn } from "@/lib/utils";

const SIDEBAR_EXPANDED = 256;
const SIDEBAR_COLLAPSED = 76;

type DashboardShellProps = {
  role: UserRole;
  children: React.ReactNode;
};

type DashboardProfile = {
  fullName: string | null;
  avatarUrl: string | null;
};

export default function DashboardShell({ role, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearUser, init } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<DashboardProfile>({ fullName: null, avatarUrl: null });

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const stored = localStorage.getItem("intellilib-dash-sidebar");
        if (stored === "collapsed") setCollapsed(true);
        if (stored === "expanded") setCollapsed(false);
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, []);

  const persistCollapsed = (next: boolean) => {
    setCollapsed(next);
    try {
      localStorage.setItem("intellilib-dash-sidebar", next ? "collapsed" : "expanded");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (!cancelled) setMobileOpen(false);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [pathname]);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      if (!user?.id) {
        if (active) {
          setProfile({ fullName: null, avatarUrl: null });
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        if (error) {
          setProfile({ fullName: null, avatarUrl: null });
          return;
        }

        setProfile({
          fullName: data?.full_name ?? null,
          avatarUrl: data?.avatar_url ?? null,
        });
      } catch {
        if (active) {
          setProfile({ fullName: null, avatarUrl: null });
        }
      }
    };

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const links = useMemo(() => getNavLinks(role), [role]);
  const path = pathname ?? "";
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;

  const roleLabel =
    role === "admin" ? "Administrator" : role === "librarian" ? "Librarian" : "Member";

  const displayName =
    profile.fullName?.trim() || user?.email?.split("@")[0] || "Library member";
  const avatarInitial = (displayName[0] ?? "U").toUpperCase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearUser();
    toast.success("Logged out successfully.");
    router.push("/");
  };

  return (
    <div
      className="min-h-screen overflow-x-hidden text-foreground"
      style={
        {
          ["--dash-sidebar-w" as string]: `${sidebarWidth}px`,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-32 top-0 h-80 w-80 rounded-full bg-purple-500/15 blur-3xl dark:bg-purple-500/25" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-black/10 bg-white/75 backdrop-blur-xl transition-[transform,width] duration-300 ease-out dark:border-white/10 dark:bg-black/55",
          "w-[min(88vw,280px)] md:w-(--dash-sidebar-w) md:translate-x-0",
          mobileOpen ? "max-md:translate-x-0" : "max-md:-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-black/10 px-3 dark:border-white/10">
          <Link
            href="/"
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10",
              collapsed && "justify-center px-0"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-purple-500/25">
              IL
            </span>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight">IntelliLib</p>
                <p className="truncate text-xs text-foreground/60">{roleLabel} workspace</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-2 py-4">
          {links.map((item, index) => {
            const Icon = item.icon;
            const active =
              item.segment === null
                ? path === item.href
                : path === item.href || path.startsWith(`${item.href}/`);

            return (
              <motion.div
                key={item.segment ?? "overview"}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03, duration: 0.25 }}
              >
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                    active
                      ? "bg-linear-to-r from-purple-500/20 to-cyan-500/15 text-foreground shadow-sm ring-1 ring-purple-500/25 dark:from-purple-500/25 dark:to-cyan-500/10 dark:ring-purple-400/30"
                      : "text-foreground/70 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10",
                    collapsed && "justify-center px-0"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                      active
                        ? "border-purple-500/35 bg-white/80 text-purple-700 dark:border-purple-400/40 dark:bg-white/10 dark:text-purple-200"
                        : "border-black/10 bg-white/50 text-foreground/70 dark:border-white/10 dark:bg-white/5"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  {!collapsed && (
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-black/10 p-3 dark:border-white/10">
          <button
            type="button"
            onClick={() => persistCollapsed(!collapsed)}
            className={cn(
              "hidden w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-xs font-medium text-foreground/80 backdrop-blur-md transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10 md:flex",
              collapsed && "px-0"
            )}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
          <div
            className={cn(
              "rounded-xl border border-black/10 bg-white/50 p-2 text-xs dark:border-white/10 dark:bg-white/5",
              collapsed && "flex justify-center p-2"
            )}
          >
            {!collapsed ? (
              <>
                <p className="font-medium text-foreground/90">AI-first library</p>
                <p className="mt-1 text-foreground/55">
                  Realtime data, smart search, and digital fines—wired for Gemini + Supabase.
                </p>
              </>
            ) : (
              <Sparkles className="h-4 w-4 text-purple-500" aria-hidden />
            )}
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Logout" : undefined}
            className={cn(
              "inline-flex h-10 w-full items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <div className="flex min-h-screen flex-col transition-[margin] duration-300 ease-out md:ml-(--dash-sidebar-w)">
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-black/10 bg-white/70 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/50">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-white/70 text-foreground shadow-sm backdrop-blur-md md:hidden dark:border-white/10 dark:bg-white/5"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">Dashboard</h1>
          </div>

          <ThemeToggleButton
            className="border-black/15 bg-white/80 text-foreground hover:bg-black/5 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          />

          <div className="flex min-w-0 items-center gap-2 rounded-full border border-black/10 bg-white/75 px-2 py-1 dark:border-white/10 dark:bg-white/10">
            <p className="truncate text-sm font-medium text-foreground/85">Welcome, {displayName}</p>
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-purple-500 to-cyan-500 text-xs font-semibold text-white">
                {avatarInitial}
              </span>
            )}
          </div>

        </header>

        <main className="flex-1 overflow-x-hidden overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
