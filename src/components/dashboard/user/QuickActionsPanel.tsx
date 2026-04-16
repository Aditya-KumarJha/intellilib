"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Bookmark, CreditCard, Search, Sparkles } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type QuickAction = {
  label: string;
  href: string;
  icon: typeof Search;
};

export default function QuickActionsPanel() {
  const [counts, setCounts] = useState({ activeBooks: 0, unpaidFines: 0 });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getSession();
      const userId = userData?.session?.user?.id;
      if (!userId || !mounted) return;

      const token = userData.session?.access_token;
      if (token) {
        await fetch("/api/library/fines", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // Best-effort sync only.
        });
      }

      const [activeBooksRes, unpaidFinesRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("return_date", null),
        supabase
          .from("fines")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .is("paid_at", null),
      ]);

      if (!mounted) return;
      setCounts({
        activeBooks: Number(activeBooksRes.count ?? 0),
        unpaidFines: Number(unpaidFinesRes.count ?? 0),
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const quickActions = useMemo<QuickAction[]>(
    () => [
      { label: "Search Book", href: "/dashboard/user/search", icon: Search },
      { label: `View My Books (${counts.activeBooks})`, href: "/dashboard/user/my-books", icon: BookOpen },
      { label: "Bookmarks", href: "/dashboard/user/bookmarks", icon: Bookmark },
      { label: `Pay Fine (${counts.unpaidFines})`, href: "/dashboard/user/fines", icon: CreditCard },
      { label: "Ask AI", href: "/dashboard/user/assistant", icon: Sparkles },
    ],
    [counts],
  );

  return (
    <UserPanelCard
      title="Quick Actions"
      subtitle="Jump directly to the next thing you need"
      className="h-full max-w-full"
      delay={0.35}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
            >
              <Icon className="h-4 w-4 text-cyan-600 dark:text-cyan-300" aria-hidden />
              {action.label}
            </Link>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
