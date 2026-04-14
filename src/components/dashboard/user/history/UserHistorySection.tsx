"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";

type HistoryNote = {
  id: string;
  type: string;
  message: string;
  created_at: string;
};

type TransactionHistoryRow = {
  id: number;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "issued" | "returned" | "overdue" | null;
  fine_amount: number | null;
  book_copies:
    | Array<{
        books: { id: number; title: string } | { id: number; title: string }[] | null;
      }>
    | null;
};

type PaymentHistoryRow = {
  id: number;
  amount: number | null;
  method: string | null;
  created_at: string;
  fine_id: number | null;
  razorpay_payment_id: string | null;
};

export default function UserHistorySection() {
  const [notes, setNotes] = useState<HistoryNote[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadHistory(isMounted: () => boolean) {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) {
      setNotes([]);
      setLoading(false);
      return;
    }

    const [txRes, payRes] = await Promise.all([
      supabase
        .from("transactions")
        .select("id,issue_date,due_date,return_date,status,fine_amount,book_copies(id,books(id,title))")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false })
        .limit(50),
      supabase
        .from("payments")
        .select("id,amount,method,created_at,fine_id,razorpay_payment_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (!isMounted()) return;

    const txs = (txRes.data ?? []) as TransactionHistoryRow[];
    const pays = (payRes.data ?? []) as PaymentHistoryRow[];

    const txNotes = txs.map((t) => {
      const copy = t.book_copies?.[0] ?? null;
      const rawBook = copy?.books ?? null;
      const book = Array.isArray(rawBook) ? (rawBook[0] ?? null) : rawBook;
      return {
        id: `tx-${t.id}`,
        type: book?.title || "Transaction",
        message: `Status: ${t.status} • Fine: ${formatCurrency(t.fine_amount)}`,
        created_at: t.issue_date || t.due_date || new Date().toISOString(),
      };
    });

    const payNotes = pays.map((p) => ({
      id: `pay-${p.id}`,
      type: "Payment",
      message: `${formatCurrency(p.amount)} • ${p.method ?? "—"} ${p.razorpay_payment_id ? "• Razorpay" : ""}`,
      created_at: p.created_at,
    }));

    const combined = [...txNotes, ...payNotes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setNotes(combined);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    void loadHistory(() => mounted);

    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId || !mounted) return;

      channel = supabase
        .channel(`history-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadHistory(() => mounted);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "payments",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadHistory(() => mounted);
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">History</h2>
        <p className="mt-1 text-sm text-foreground/65">Past issues, returns, and payments.</p>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60">
          No history.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {notes.map((n) => (
            <div key={n.id} className="w-full min-w-0 rounded-2xl border p-3 bg-white/5">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{(n.type ?? "Item").replace(/_/g, " ")}</p>
                <p className="mt-1 text-sm text-foreground/65 line-clamp-3 break-words">{n.message}</p>
                <p className="mt-2 text-xs text-foreground/60">{formatDate(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
