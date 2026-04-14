"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain } from "lucide-react";

import UserPanelCard from "@/components/dashboard/user/UserPanelCard";
import { supabase } from "@/lib/supabaseClient";

const FALLBACK_INSIGHTS = [
  "You prefer Backend and System Design books.",
  "Recommended next track: AI and Distributed Systems.",
];

export default function PersonalizedInsightsPanel() {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      const { data } = await supabase
        .from("transactions")
        .select("issue_date,return_date,book_copies!inner(books!inner(title,author))")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false })
        .limit(50);

      if (!mounted) return;

      const rows = data ?? [];
      const books = rows
        .map((row) => {
          const copy = Array.isArray(row.book_copies) ? row.book_copies[0] : row.book_copies;
          return copy?.books ?? null;
        })
        .filter((book): book is { title?: string; author?: string } => Boolean(book));

      const authorCount = new Map<string, number>();
      for (const book of books) {
        const author = (book.author ?? "").trim();
        if (!author) continue;
        authorCount.set(author, (authorCount.get(author) ?? 0) + 1);
      }

      const topAuthor = [...authorCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const returnedCount = rows.filter((row) => Boolean(row.return_date)).length;
      const totalCount = rows.length;
      const completionRate = totalCount ? Math.round((returnedCount / totalCount) * 100) : 0;

      const dynamicLines: string[] = [];
      if (topAuthor) {
        dynamicLines.push(`You often read books by ${topAuthor}.`);
      }
      dynamicLines.push(`Your completion rate is ${completionRate}% across your borrowing history.`);
      dynamicLines.push("Recommended next track: continue with related authors and recent high-availability titles.");

      setLines(dynamicLines);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const InsightIcon = Brain;
  const insightBadgeLabel = "AI-curated profile";
  const renderedLines = useMemo(() => (lines.length ? lines : FALLBACK_INSIGHTS), [lines]);

  return (
    <UserPanelCard
      title="Personalized Insights"
      subtitle="Behavior patterns and recommendation direction"
      className="h-full max-w-full"
      delay={0.4}
    >
      <div className="rounded-2xl border border-cyan-500/25 bg-cyan-500/10 p-3">
        <p className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
          <InsightIcon className="h-3.5 w-3.5" aria-hidden /> {insightBadgeLabel}
        </p>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-foreground/75">
        {renderedLines.map((line) => (
          <li
            key={line}
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 dark:border-white/10 dark:bg-white/5"
          >
            {line}
          </li>
        ))}
      </ul>
    </UserPanelCard>
  );
}
