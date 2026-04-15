"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookOpen, RefreshCcw } from "lucide-react";

import InfiniteScroll from "react-infinite-scroll-component";
import MyBookIssueCard from "@/components/dashboard/user/my-books/MyBookIssueCard";
import MyBooksStatsRow from "@/components/dashboard/user/my-books/MyBooksStatsRow";
import { buildMyBooksStats, mapMyBookIssueRow } from "@/components/dashboard/user/my-books/my-books-utils";
import type { MyBookIssue, MyBookIssueRow } from "@/components/dashboard/user/my-books/types";
import { supabase } from "@/lib/supabaseClient";

type ReturnRequestRow = {
  transaction_id: number;
  status: "pending" | "approved" | "rejected";
  requested_at: string | null;
};

export default function UserMyBooksSection() {
  const [issues, setIssues] = useState<MyBookIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "issued" | "overdue" | "returned" | "fine">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [serverStats, setServerStats] = useState<
    { activeCount: number; overdueCount: number; returnedCount: number; dueFineAmount: number } | null
  >(null);
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

      // fetch any paid fines linked to these transactions so we can show paid state in MyBooks
      try {
        const txIds = mapped.map((m) => m.id).filter(Boolean);
        if (txIds.length > 0) {
          const { data: finesData } = await supabase
            .from("fines")
            .select("transaction_id,paid_at")
            .in("transaction_id", txIds)
            .eq("user_id", currentUserId);

          const paidMap = new Map<number, string | null>();
          (finesData ?? []).forEach((f: { transaction_id: number; paid_at: string | null }) => {
            // prefer the latest paid_at if multiple
            const tx = Number(f.transaction_id);
            const prev = paidMap.get(tx);
            const cur = f.paid_at ?? null;
            if (!prev && cur) paidMap.set(tx, cur);
            if (prev && cur && new Date(cur).getTime() > new Date(prev).getTime()) paidMap.set(tx, cur);
          });

          // attach fine paid info
          for (const m of mapped) {
            const paidAt = paidMap.get(m.id as number) ?? null;
            m.finePaid = Boolean(paidAt);
            m.finePaidAt = paidAt;
          }

          const { data: returnRequestsData } = await supabase
            .from("return_requests")
            .select("transaction_id,status,requested_at")
            .in("transaction_id", txIds)
            .eq("user_id", currentUserId)
            .eq("status", "pending");

          const pendingReturnMap = new Map<number, string | null>();
          (returnRequestsData ?? []).forEach((row: ReturnRequestRow) => {
            pendingReturnMap.set(Number(row.transaction_id), row.requested_at ?? null);
          });

          for (const m of mapped) {
            m.returnRequestPending = pendingReturnMap.has(m.id);
            m.returnRequestRequestedAt = pendingReturnMap.get(m.id) ?? null;
          }
        }
      } catch {
        // ignore fines fetch errors — non-critical
      }

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
      const { data, error: userError } = await supabase.auth.getSession();
      if (!active) return;

      const resolvedId = data?.session?.user?.id;
      if (userError || !resolvedId) {
        setError(userError?.message || "Could not resolve user session");
        setLoading(false);
        return;
      }

      setCurrentUserId(resolvedId);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => buildMyBooksStats(issues), [issues]);

  const fetchServerStats = useCallback(async () => {
    if (!currentUserId) return;

    try {
      const [issuedRes, overdueRes, returnedRes, finesSumRes, txFinesRes] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", currentUserId).eq("status", "issued"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", currentUserId).eq("status", "overdue"),
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("user_id", currentUserId).eq("status", "returned"),
        // sum unpaid fines from fines table
        supabase.from("fines").select("sum(amount)").eq("user_id", currentUserId).is("paid_at", null),
        // sum fine_amount on overdue active transactions
        supabase.from("transactions").select("sum(fine_amount)").eq("user_id", currentUserId).eq("status", "overdue").is("return_date", null),
      ]);

      if (issuedRes.error || overdueRes.error || returnedRes.error || finesSumRes.error || txFinesRes.error) {
        // fallback: fetch rows and count client-side
        const [issuedRows, overdueRows, returnedRows, finesRows, txFinesRows] = await Promise.all([
          supabase.from("transactions").select("id").eq("user_id", currentUserId).eq("status", "issued"),
          supabase.from("transactions").select("id").eq("user_id", currentUserId).eq("status", "overdue"),
          supabase.from("transactions").select("id").eq("user_id", currentUserId).eq("status", "returned"),
          supabase.from("fines").select("amount").eq("user_id", currentUserId).is("paid_at", null),
          supabase.from("transactions").select("sum(fine_amount)").eq("user_id", currentUserId).eq("status", "overdue").is("return_date", null),
        ]);

        const activeCount = Array.isArray(issuedRows.data) ? issuedRows.data.length : 0;
        const overdueCount = Array.isArray(overdueRows.data) ? overdueRows.data.length : 0;
        const returnedCount = Array.isArray(returnedRows.data) ? returnedRows.data.length : 0;
        const unpaidFines = Array.isArray(finesRows.data)
          ? finesRows.data.reduce((sum: number, row: { amount: number | null }) => sum + Number(row.amount || 0), 0)
          : 0;
        let txFines = 0;
        if (Array.isArray(txFinesRows.data) && txFinesRows.data.length > 0) {
          const row = txFinesRows.data[0] as Record<string, unknown>;
          const key = Object.keys(row)[0];
          const raw = key ? row[key] : null;
          txFines = raw == null ? 0 : Number(raw);
        }

        const dueFineAmount = unpaidFines + txFines;
        setServerStats({ activeCount, overdueCount, returnedCount, dueFineAmount });
        return;
      }

      const activeCount = Number(issuedRes.count ?? 0);
      const overdueCount = Number(overdueRes.count ?? 0);
      const returnedCount = Number(returnedRes.count ?? 0);

      // combine unpaid fines table + any calculated fines on active overdue transactions
      let dueFineAmount = 0;
      if (Array.isArray(finesSumRes.data) && finesSumRes.data.length > 0) {
        const row = finesSumRes.data[0] as Record<string, unknown>;
        const key = Object.keys(row)[0];
        const raw = key ? row[key] : null;
        dueFineAmount += raw == null ? 0 : Number(raw);
      }
      if (Array.isArray(txFinesRes.data) && txFinesRes.data.length > 0) {
        const row = txFinesRes.data[0] as Record<string, unknown>;
        const key = Object.keys(row)[0];
        const raw = key ? row[key] : null;
        dueFineAmount += raw == null ? 0 : Number(raw);
      }

      setServerStats({ activeCount, overdueCount, returnedCount, dueFineAmount });
    } catch {
      setServerStats(null);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const initialLoadTimer = window.setTimeout(() => {
      void loadMyBooks(0, false);
    }, 0);

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
          setPage(0);
          void loadMyBooks(0, false);
          void fetchServerStats();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "return_requests",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          setPage(0);
          void loadMyBooks(0, false);
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(initialLoadTimer);
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadMyBooks, fetchServerStats]);

  const [showTop, setShowTop] = useState(false);

  function onSelectFilter(filter: "all" | "issued" | "overdue" | "returned" | "fine") {
    setActiveFilter(filter);
    setPage(0);
    setIssues([]);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchServerStats();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [currentUserId, fetchServerStats]);

  useEffect(() => {
    if (!currentUserId) return;
    const id = window.setInterval(() => {
      void fetchServerStats();
    }, 30000);
    return () => window.clearInterval(id);
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
            onClick={() => {
              void loadMyBooks();
              void fetchServerStats();
            }}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <RefreshCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <MyBooksStatsRow stats={serverStats ?? stats} onSelect={onSelectFilter} active={activeFilter} />

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
