"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate, formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";

export default function UserHistorySection() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
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

      if (!mounted) return;

      const txs = (txRes.data ?? []) as any[];
      const pays = (payRes.data ?? []) as any[];

      // unify into a simple note-like shape for the UI
      const txNotes = txs.map((t) => {
        const book = t.book_copies?.[0]?.books ?? null;
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

    load();
    return () => {
      mounted = false;
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
