"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";
import { supabase } from "@/lib/supabaseClient";

type FineTransaction = {
  id: number;
  issue_date: string | null;
  due_date: string | null;
  return_date: string | null;
  status: "issued" | "returned" | "overdue" | null;
  fine_amount: number | null;
  book_copies:
    | {
        id: number;
        location: string | null;
        access_url: string | null;
        books:
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
            }
          | Array<{
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
            }>
          | null;
      }
    | Array<{
        id: number;
        location: string | null;
        access_url: string | null;
        books:
          | {
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
            }
          | Array<{
              id: number;
              title: string;
              author: string;
              cover_url: string | null;
              publisher: string | null;
            }>
          | null;
      }>
    | null;
};

type FineRow = {
  id: number;
  amount: number;
  transaction_id: number;
  paid_at: string | null;
  created_at: string;
  status?: "pending" | "paid" | null;
  transactions: FineTransaction | FineTransaction[] | null;
};

type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  theme?: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function daysLabelFromTx(tx: FineTransaction | null): string {
  if (!tx) return "";
  const due = tx.due_date ? new Date(tx.due_date).getTime() : null;
  const returned = tx.return_date ? new Date(tx.return_date).getTime() : null;
  if (!due) return "No due date";
  if (returned) return "Returned";
  const diffDays = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  return `${diffDays}d left`;
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Not in browser"));
      return;
    }
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay script"));
    document.head.appendChild(script);
  });
}

async function authedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  return fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
}

export default function UserFinesSection() {
  const [fines, setFines] = useState<FineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"unpaid" | "paid">("unpaid");
  const [userId, setUserId] = useState<string | null>(null);

  async function loadFines(isActive = true) {
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getSession();
      const resolvedUserId = userData?.session?.user?.id;
      if (!resolvedUserId) {
        if (isActive) {
          setError("Not signed in");
          setFines([]);
        }
        return;
      }

      if (isActive) {
        setUserId(resolvedUserId);
      }

      const { data, error: fetchError } = await supabase
        .from("fines")
        .select(
          "id,amount,transaction_id,paid_at,created_at,status,transactions(id,issue_date,due_date,return_date,status,fine_amount,book_copies(id,location,access_url,books(id,title,author,cover_url,publisher)))",
        )
        .eq("user_id", resolvedUserId)
        .order("created_at", { ascending: false });

      if (!isActive) return;

      if (fetchError) {
        setError("Could not load fines. Please try again later.");
        setFines([]);
        return;
      }

      setFines((data ?? []) as FineRow[]);
    } catch (fetchError: unknown) {
      if (!isActive) return;
      const message = fetchError instanceof Error ? fetchError.message : "Could not load fines";
      setError(message);
      setFines([]);
    } finally {
      if (isActive) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    let isActive = true;
    void loadFines(isActive);
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`fines-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fines",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void loadFines();
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
          void loadFines();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const unpaid = useMemo(() => fines.filter((fine) => !fine.paid_at), [fines]);
  const paid = useMemo(() => fines.filter((fine) => Boolean(fine.paid_at)), [fines]);
  const selectedTotal = useMemo(
    () => selected.reduce((sum, id) => sum + (fines.find((fine) => fine.id === id)?.amount ?? 0), 0),
    [fines, selected],
  );

  function toggle(id: number) {
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function handlePay() {
    if (selected.length === 0 || paying) return;

    setPaying(true);
    try {
      const createRes = await authedFetch("/api/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({ fineIds: selected }),
      });
      const orderPayload = (await createRes.json().catch(() => ({}))) as {
        ok?: boolean;
        key?: string;
        order?: { id: string; amount: number; currency: string };
        error?: string;
      };

      if (!createRes.ok || !orderPayload.order || !orderPayload.key) {
        throw new Error(orderPayload.error ?? "Could not create payment order.");
      }

      await loadRazorpayScript();
      if (!window.Razorpay) {
        throw new Error("Payment library is unavailable.");
      }

      const rzp = new window.Razorpay({
        key: orderPayload.key,
        amount: orderPayload.order.amount,
        currency: orderPayload.order.currency,
        name: "IntelliLib",
        description: `Library fine payment for ${selected.length} fine${selected.length > 1 ? "s" : ""}`,
        order_id: orderPayload.order.id,
        handler: async (response: RazorpaySuccessResponse) => {
          const verifyRes = await authedFetch("/api/razorpay/verify", {
            method: "POST",
            body: JSON.stringify(response),
          });
          const verifyPayload = (await verifyRes.json().catch(() => ({}))) as { ok?: boolean; error?: string };

          if (!verifyRes.ok || !verifyPayload.ok) {
            throw new Error(verifyPayload.error ?? "Payment verification failed.");
          }

          toast.success("Payment successful.");
          setSelected([]);
          await loadFines();
        },
        theme: { color: "#7c3aed" },
      });

      rzp.open();
    } catch (paymentError: unknown) {
      const message = paymentError instanceof Error ? paymentError.message : "Payment failed.";
      toast.error(message);
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
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex rounded-lg bg-surface/40 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("unpaid")}
                className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "unpaid" ? "bg-white text-black" : "text-foreground/60"}`}
              >
                Unpaid
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("paid")}
                className={`ml-2 rounded-md px-4 py-2 text-sm font-medium ${activeTab === "paid" ? "bg-white text-black" : "text-foreground/60"}`}
              >
                Paid
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm">
                Selected: {selected.length} • Total: {formatCurrency(selectedTotal)}
              </div>
              {activeTab === "unpaid" ? (
                <button
                  type="button"
                  onClick={() => void handlePay()}
                  disabled={selected.length === 0 || paying}
                  className="rounded-xl bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
                >
                  {paying ? "Processing..." : "Pay Selected"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4">
            {(activeTab === "unpaid" ? unpaid : paid).length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">
                {activeTab === "unpaid" ? "No unpaid fines." : "No paid fines."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {(activeTab === "unpaid" ? unpaid : paid).map((fine) => {
                  const tx = pickOne(fine.transactions);
                  const bookCopy = pickOne(tx?.book_copies);
                  const book = pickOne(bookCopy?.books);
                  const isPaid = Boolean(fine.paid_at);

                  return (
                    <div key={fine.id} className="rounded-2xl border p-4">
                      <div className="flex items-start gap-4">
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-md bg-black/5">
                          {book?.cover_url ? (
                            <Image
                              src={book.cover_url}
                              alt={`${book.title} cover`}
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-foreground/45">BOOK</div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate font-semibold">{book?.title ?? "Fine"}</p>
                              {book?.author ? <p className="text-sm text-foreground/60">by {book.author}</p> : null}
                              <p className="mt-2 text-xs text-foreground/60">
                                Issued: {tx?.issue_date ? new Date(tx.issue_date).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "-"}
                              </p>
                              <p className="text-xs text-foreground/60">
                                Due: {tx?.due_date ? new Date(tx.due_date).toLocaleDateString() : "-"} • {daysLabelFromTx(tx ?? null)}
                              </p>
                              <p className="mt-2 text-sm text-foreground/70">Status: {isPaid ? "Paid" : fine.status ?? "pending"}</p>
                              <p className="mt-1 text-xs text-foreground/60">
                                {isPaid ? `Paid on ${new Date(fine.paid_at ?? fine.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}` : "Awaiting payment"}
                              </p>
                            </div>

                            <div className="ml-4 shrink-0 text-right">
                              <div className="text-lg font-semibold">{formatCurrency(fine.amount)}</div>
                              <label className="mt-2 flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  disabled={isPaid}
                                  checked={selected.includes(fine.id)}
                                  onChange={() => toggle(fine.id)}
                                />
                                <span>{isPaid ? "Paid" : "Pay"}</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
