"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

type ContinueReadingState = {
  lastOpened: {
    title: string;
    due: string;
    progress: string;
  };
  suggestedNext: {
    title: string;
    reason: string;
  };
};

export default function ContinueReadingPanel() {
  const [content, setContent] = useState<ContinueReadingState>({
    lastOpened: {
      title: "No active issue",
      due: "-",
      progress: "Issue a book to start tracking.",
    },
    suggestedNext: {
      title: "Explore Smart Search",
      reason: "We will personalize recommendations as your reading activity grows.",
    },
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      const [recentIssueRes, suggestionRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("id,issue_date,due_date,book_copies!inner(books!inner(id,title,author))")
          .eq("user_id", userId)
          .is("return_date", null)
          .order("issue_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("books")
          .select("id,title,author,available_copies,total_copies")
          .order("available_copies", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!mounted) return;

      const current = recentIssueRes.data;
      const currentBook = Array.isArray(current?.book_copies)
        ? current?.book_copies?.[0]?.books
        : current?.book_copies?.books;

      const dueText = current?.due_date
        ? new Date(current.due_date).toLocaleDateString("en-IN", { dateStyle: "medium" })
        : "-";

      const progress = current?.due_date
        ? (() => {
            const days = Math.ceil((new Date(current.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (days < 0) return `${Math.abs(days)} day(s) overdue`;
            if (days === 0) return "Due today";
            return `${days} day(s) remaining`;
          })()
        : "Issue a book to start tracking.";

      setContent({
        lastOpened: {
          title: currentBook?.title ?? "No active issue",
          due: dueText,
          progress,
        },
        suggestedNext: {
          title: suggestionRes.data?.title ?? "Explore Smart Search",
          reason: suggestionRes.data
            ? `Popular pick with ${Number(suggestionRes.data.available_copies ?? 0)}/${Number(suggestionRes.data.total_copies ?? 0)} copies available.`
            : "We will personalize recommendations as your reading activity grows.",
        },
      });
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <UserPanelCard
      title="Continue Reading"
      subtitle="Pick up where you left off and move to your next best read"
      className="h-full max-w-full"
      delay={0.1}
    >
      <div className="space-y-4">
        <article className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="text-xs uppercase tracking-wide text-foreground/55">Last opened</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{content.lastOpened.title}</p>
          <p className="mt-1 text-sm text-foreground/65">Due {content.lastOpened.due}</p>
          <p className="mt-1 text-xs text-foreground/55">{content.lastOpened.progress}</p>
        </article>

        <article className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
            Suggested next
          </p>
          <p className="mt-2 text-lg font-semibold text-foreground">{content.suggestedNext.title}</p>
          <p className="mt-1 text-sm text-foreground/65">{content.suggestedNext.reason}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cyan-700 dark:text-cyan-300"
          >
            Explore recommendation <ArrowRight className="h-4 w-4" />
          </button>
        </article>
      </div>
    </UserPanelCard>
  );
}
