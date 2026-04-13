"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";

function pickOne<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] as T) : (v as T);
}

function daysLabelFromTx(tx: any): string {
  if (!tx) return "";
  const due = tx.due_date ? new Date(tx.due_date).getTime() : null;
  const ret = tx.return_date ? new Date(tx.return_date).getTime() : null;
  if (!due) return "No due date";
  if (ret) return "Returned";
  const now = Date.now();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  return `${diffDays}d left`;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("Not in browser"));
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
}

export default function UserFinesSection() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");

  async function loadFines(active = true) {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setError("Not signed in");
        setFines([]);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("fines")
        .select(
          `id,amount,transaction_id,paid_at,created_at,transactions(id,issue_date,due_date,return_date,status,fine_amount,book_copies(id,location,access_url,books(id,title,author,cover_url,publisher)))`
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!active) return;
      if (fetchErr) {
        console.error("fines load error", fetchErr);
        setError("Could not load fines. Please try again later.");
        setFines([]);
        return;
      }
      setFines(data ?? []);
    } catch (e) {
      console.error(e);
      setError("Could not load fines");
      setFines([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    loadFines(active);
    return () => {
      active = false;
    };
  }, []);

  function toggle(id: number) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handlePay() {
    if (selected.length === 0) return;
    setPaying(true);
    try {
      const total = selected.reduce((s, id) => s + (fines.find((x) => x.id === id)?.amount ?? 0), 0);

      const createRes = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(total * 100),
          fines: selected,
          userId: (await supabase.auth.getUser()).data?.user?.id,
        }),
      });
      const payload = await createRes.json();
      if (!payload?.order) throw new Error("Could not create order");

      const options = {
        key: payload.key,
        amount: payload.order.amount,
        currency: payload.order.currency,
        name: "Intellilib",
        order_id: payload.order.id,
        handler: async function (response: any) {
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              orderId: payload.order.id,
              fines: selected,
              userId: (await supabase.auth.getUser()).data?.user?.id,
            }),
          });
          const verify = await verifyRes.json();
          if (verify?.ok) {
            await loadFines();
            setSelected([]);
          } else {
            console.error("verify failed", verify);
            alert("Payment verification failed");
          }
        },
        theme: { color: "#7c3aed" },
      } as any;

      try {
        await loadRazorpayScript();
      } catch (e) {
        alert("Payment failed: could not load payment library.");
        setPaying(false);
        return;
      }

      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        alert("Payment failed: Razorpay not available");
        setPaying(false);
        return;
      }

      // @ts-ignore global
      const rzp = new RazorpayCtor(options);
      rzp.open();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert(msg);
    } finally {
      setPaying(false);
    }
  }

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Fines & Payments</h2>
        <p className="mt-1 text-sm text-foreground/65">Outstanding fines, pay digitally, and view receipts.</p>
      </div>

      {loading ? (
        <div>Loading fines…</div>
      ) : error ? (
        <div className="text-red-500">{typeof error === "string" ? error : JSON.stringify(error)}</div>
      ) : (
        <div>
          {/* tabs */}
          <div className="flex items-center justify-between">
            <div className="flex rounded-lg bg-surface/40 p-1">
              <button
                onClick={() => setActiveTab("unpaid")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === "unpaid" ? "bg-white text-black" : "text-foreground/60"}`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setActiveTab("paid")}
                className={`ml-2 px-4 py-2 rounded-md text-sm font-medium ${activeTab === "paid" ? "bg-white text-black" : "text-foreground/60"}`}
              >
                Paid
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm">Selected: {selected.length} • Total: {formatCurrency(selected.reduce((s, id) => s + (fines.find((x) => x.id === id)?.amount ?? 0), 0))}</div>
              {activeTab === "unpaid" && (
                <button
                  onClick={handlePay}
                  disabled={selected.length === 0 || paying}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  Pay Selected
                </button>
              )}
            </div>
          </div>

          <div className="mt-4">
            {(() => {
              const unpaid = fines.filter((x) => !x.paid_at);
              const paid = fines.filter((x) => !!x.paid_at);

              const renderCard = (f: any) => {
                const tx = f.transactions ?? f.transaction ?? null;
                const bookCopy = tx?.book_copies ? pickOne(tx.book_copies) : null;
                const book = bookCopy?.books ? pickOne(bookCopy.books) : null;
                const isPaid = !!f.paid_at;
                return (
                  <div key={f.id} className="rounded-2xl border p-4">
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-black/5">
                        {book?.cover_url ? (
                          <img src={book.cover_url} alt={`${book.title} cover`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-foreground/45">📚</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{book?.title ?? "Fine"}</p>
                            {book?.author ? <p className="text-sm text-foreground/60">by {book.author}</p> : null}
                            <p className="mt-2 text-xs text-foreground/60">Issued: {tx?.issue_date ? new Date(tx.issue_date).toLocaleString() : "-"}</p>
                            <p className="text-xs text-foreground/60">Due: {tx?.due_date ? new Date(tx.due_date).toLocaleDateString() : "-"} • {daysLabelFromTx(tx)}</p>
                            <p className="mt-2 text-sm text-foreground/70">Fine detail: {f.transaction_id ? `Overdue charge` : "Fine"}</p>
                            <p className="mt-1 text-xs text-foreground/60">Status: {isPaid ? "Paid" : (f.status ?? "pending")}</p>
                            <p className="mt-1 text-xs text-foreground/60">Last paid: {isPaid ? new Date(f.paid_at).toLocaleString() : "N/A"}</p>
                          </div>

                          <div className="shrink-0 text-right ml-4">
                            <div className="text-lg font-semibold">{formatCurrency(f.amount)}</div>
                            <label className="flex items-center gap-2 text-sm mt-2">
                              <input type="checkbox" disabled={isPaid} checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                              <span className="ml-1">{isPaid ? "Paid" : "Pay"}</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              };

              if (activeTab === "unpaid") {
                if (unpaid.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">No unpaid fines.</div>
                  );
                }
                return <div className="grid gap-4 sm:grid-cols-2">{unpaid.map(renderCard)}</div>;
              }

              // paid tab
              if (paid.length === 0) {
                return (
                  <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">No paid fines.</div>
                );
              }
              return <div className="grid gap-4 sm:grid-cols-2">{paid.map(renderCard)}</div>;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
