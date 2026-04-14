"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BookCopy, BookMarked, IndianRupee, type LucideIcon } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type ActivityItem = {
  actor: string;
  action: string;
  time: string;
  icon: LucideIcon;
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} hr ago`;
  const day = Math.floor(hour / 24);
  return `${day} day ago`;
}

export default function UserRecentActivityFeed() {
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      const [txRes, payRes, reservationRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,issue_date,return_date,status,book_copies!inner(books!inner(title))")
          .eq("user_id", userId)
          .order("issue_date", { ascending: false })
          .limit(4),
        supabase
          .from("payments")
          .select("id,amount,created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("reservations")
          .select("id,created_at,status,books!inner(title)")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (!mounted) return;

      const txItems: Array<ActivityItem & { sortAt: number }> = (txRes.data ?? []).map((tx) => {
        const bookTitle = Array.isArray(tx.book_copies)
          ? tx.book_copies[0]?.books?.title
          : tx.book_copies?.books?.title;
        const returned = Boolean(tx.return_date) || tx.status === "returned";
        const stamp = (returned ? tx.return_date : tx.issue_date) ?? tx.issue_date ?? new Date().toISOString();

        return {
          actor: "You",
          action: returned ? `returned \"${bookTitle ?? "book"}\"` : `issued \"${bookTitle ?? "book"}\"`,
          time: relativeTime(stamp),
          icon: returned ? ArrowRight : BookCopy,
          sortAt: new Date(stamp).getTime(),
        };
      });

      const paymentItems: Array<ActivityItem & { sortAt: number }> = (payRes.data ?? []).map((pay) => ({
        actor: "You",
        action: `paid INR ${Math.round(Number(pay.amount ?? 0))} fine`,
        time: relativeTime(pay.created_at),
        icon: IndianRupee,
        sortAt: new Date(pay.created_at).getTime(),
      }));

      const reservationItems: Array<ActivityItem & { sortAt: number }> = (reservationRes.data ?? []).map((reservation) => {
        const title = Array.isArray(reservation.books) ? reservation.books[0]?.title : reservation.books?.title;
        return {
          actor: "You",
          action: `reserved \"${title ?? "book"}\"`,
          time: relativeTime(reservation.created_at),
          icon: BookMarked,
          sortAt: new Date(reservation.created_at).getTime(),
        };
      });

      const combined = [...txItems, ...paymentItems, ...reservationItems]
        .sort((a, b) => b.sortAt - a.sortAt)
        .slice(0, 4)
        .map(({ sortAt: _sortAt, ...item }) => item);

      setActivityFeed(combined);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserPanelCard
      title="Recent Activity"
      subtitle="Latest actions in your account"
      className="h-full max-w-full"
      delay={0.25}
    >
      <div className="space-y-3">
        {activityFeed.length === 0 ? (
          <article className="rounded-2xl border border-black/10 bg-white/60 p-3 text-sm text-foreground/60 dark:border-white/10 dark:bg-white/5">
            No recent activity yet.
          </article>
        ) : null}
        {activityFeed.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={`${item.time}-${item.action}`}
              className="rounded-2xl border border-black/10 bg-white/60 p-3 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex items-start gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-700 dark:text-violet-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{item.actor}</span> {item.action}
                  </p>
                  <p className="mt-1 text-xs text-foreground/55">{item.time}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </UserPanelCard>
  );
}
