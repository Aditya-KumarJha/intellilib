"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, RefreshCcw } from "lucide-react";

import InfiniteScroll from "react-infinite-scroll-component";
import MyBookIssueCard from "@/components/dashboard/user/my-books/MyBookIssueCard";
import MyBooksStatsRow from "@/components/dashboard/user/my-books/MyBooksStatsRow";
import { buildMyBooksStats, mapMyBookIssueRow } from "@/components/dashboard/user/my-books/my-books-utils";
import type { MyBookIssue, MyBookIssueRow } from "@/components/dashboard/user/my-books/types";
import { supabase } from "@/lib/supabaseClient";
import { dashboardHref } from "@/lib/dashboardNav";

export default function UserMyBooksSection() {
  const [issues, setIssues] = useState<MyBookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "issued" | "overdue" | "returned" | "fine">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  const loadMyBooks = useCallback(
    async (requestedPage = 0, append = false) => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      setRefreshing(true);
      setError(null);

      const from = requestedPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let builder = supabase
        .from("transactions")
        .select(
          "id,issue_date,due_date,return_date,status,fine_amount,book_copies(id,type,status,location,access_url,books(id,title,author,cover_url,publisher,published_year,type))"
        )
        .eq("user_id", currentUserId)
        .order("issue_date", { ascending: false })
        .range(from, to);

      if (activeFilter === "issued") builder = builder.eq("status", "issued");
      if (activeFilter === "overdue") builder = builder.eq("status", "overdue");
      if (activeFilter === "returned") builder = builder.eq("status", "returned");
      if (activeFilter === "fine") builder = builder.gt("fine_amount", 0);

      const { data, error: fetchError } = await builder;

      if (fetchError) {
        setError(fetchError.message || "Could not load your books");
        setRefreshing(false);
        setLoading(false);
        return;
      }

      const mapped = ((data ?? []) as MyBookIssueRow[])
        .map(mapMyBookIssueRow)
        .filter((row): row is MyBookIssue => Boolean(row));

      setIssues((prev) => (append ? [...prev, ...mapped] : mapped));
      setHasMore((data?.length ?? 0) === PAGE_SIZE);
      setRefreshing(false);
      setLoading(false);
    },
    [currentUserId, activeFilter]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const { data, error: userError } = await supabase.auth.getUser();
      if (!active) return;

      if (userError || !data.user?.id) {
        setError(userError?.message || "Could not resolve user session");
        setLoading(false);
        return;
      }

      setCurrentUserId(data.user.id);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    // reset paging when user or filter changes
    setPage(0);
    void loadMyBooks(0, false);

    const channel = supabase
      .channel(`my-books-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          // reload first page on realtime events
          setPage(0);
          void loadMyBooks(0, false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadMyBooks, activeFilter]);

  const stats = useMemo(() => buildMyBooksStats(issues), [issues]);
  const [serverStats, setServerStats] = useState<
    | { activeCount: number; overdueCount: number; returnedCount: number; dueFineAmount: number }
    | null
  >(null);

  const fetchServerStats = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const issuedRes = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("status", "issued");

      const overdueRes = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("status", "overdue");

      const returnedRes = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", currentUserId)
        .eq("status", "returned");

      // try aggregate fine sum
      const fineRes = await supabase.from("transactions").select("sum(fine_amount)").eq("user_id", currentUserId);

      const activeCount = (issuedRes.count as number) || 0;
      const overdueCount = (overdueRes.count as number) || 0;
      const returnedCount = (returnedRes.count as number) || 0;
      let dueFineAmount = 0;
      if (Array.isArray(fineRes.data) && fineRes.data.length > 0) {
        // PostgREST returns { sum: '123' } or { sum: null }
        const key = Object.keys(fineRes.data[0])[0];
        const raw = (fineRes.data[0] as any)[key];
        dueFineAmount = raw ? Number(raw) : 0;
      }

      setServerStats({ activeCount, overdueCount, returnedCount, dueFineAmount });
    } catch (e) {
      // ignore, we'll fallback to local counts
      setServerStats(null);
    }
  }, [currentUserId]);

  const [showTop, setShowTop] = useState(false);

  function onSelectFilter(filter: "all" | "issued" | "overdue" | "returned" | "fine") {
    setActiveFilter(filter);
    setPage(0);
    setIssues([]);
    void loadMyBooks(0, false);
  }

  useEffect(() => {
    void fetchServerStats();
  }, [currentUserId, fetchServerStats]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="mx-auto space-y-6">
      <div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">My Books</h2>
            <p className="mt-1 text-sm text-foreground/65">
              Live issued books, due dates, return status, and fines from Supabase.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadMyBooks()}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <MyBooksStatsRow stats={(serverStats as any) ?? stats} onSelect={onSelectFilter} active={activeFilter} />

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Could not load My Books: {error}
        </div>
      ) : issues.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-6 py-8 text-center dark:border-white/15 dark:bg-white/5">
          <BookOpen className="mx-auto h-8 w-8 text-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/70">No active or past issues found.</p>
          <p className="mt-1 text-xs text-foreground/55">Use Smart Search to issue or reserve books.</p>
        </div>
      ) : (
        <InfiniteScroll
          dataLength={issues.length}
          next={() => {
            const nextPage = page + 1;
            setPage(nextPage);
            void loadMyBooks(nextPage, true);
          }}
          hasMore={hasMore}
          loader={
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
                />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {issues.map((issue) => (
              <MyBookIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </InfiniteScroll>
        )}

        {showTop ? (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed right-6 bottom-6 z-50 rounded-full bg-purple-600/95 p-3 text-white shadow-lg transition hover:scale-105"
          >
            ↑
          </button>
        ) : null}
    </div>
  );
}
