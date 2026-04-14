"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import NotificationItem from "./NotificationItem";

type NotificationRow = {
  id: number;
  type?: string | null;
  message?: string | null;
  is_read?: boolean | number | string | null;
  created_at?: string;
  metadata?: any;
};

export default function NotificationsSectionClient({ initialRows }: { initialRows: NotificationRow[] }) {
  const [rows, setRows] = useState<NotificationRow[]>(initialRows ?? []);
  const [loading, setLoading] = useState(false);
  // default to unread on refresh as requested
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [counts, setCounts] = useState<{ total: number; unread: number }>({ total: 0, unread: 0 });

  useEffect(() => {
    // initialize counts from initial rows
    const isRead = (v: unknown) => v === true || v === 1 || v === "1" || v === "t";
    const total = initialRows.length;
    const unread = initialRows.filter((r) => !isRead(r.is_read)).length;
    setCounts({ total, unread });
    setRows(filter === "unread" ? initialRows.filter((r) => !isRead(r.is_read)) : initialRows);
    // client-side debug: initial rows
    // eslint-disable-next-line no-console
    console.info("[librarian.notifications.client] init", { initialCount: initialRows.length, first: initialRows[0] ?? null });
  }, [initialRows, filter]);

  useEffect(() => {
    const channel = supabase
      .channel(`notifications-global`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          // eslint-disable-next-line no-console
          console.info("[librarian.notifications.client] realtime payload", payload);
          setRows((s) => [payload.new as NotificationRow, ...s]);
          setCounts((c) => ({ ...c, total: c.total + 1, unread: c.unread + 1 }));
        },
      )
      .subscribe();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  async function markRead(id: number) {
    try {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setRows((s) => s.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
      setCounts((c) => ({ ...c, unread: Math.max(0, c.unread - 1) }));
      // eslint-disable-next-line no-console
      console.info(`[librarian.notifications.client] markRead ${id}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[librarian.notifications.client] markRead error", err);
      console.error(err);
    }
  }

  async function markAllRead() {
    try {
      await supabase.from("notifications").update({ is_read: true }).neq("is_read", true);
      setRows((s) => s.map((r) => ({ ...r, is_read: true })));
      setCounts((c) => ({ ...c, unread: 0 }));
      // eslint-disable-next-line no-console
      console.info("[librarian.notifications.client] markAllRead");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[librarian.notifications.client] markAllRead error", err);
      console.error(err);
    }
  }

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-foreground/65">Broadcast and operational alerts.</p>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => setFilter("unread")} className={`px-3 py-1 rounded ${filter === "unread" ? "bg-white text-black" : "text-foreground/60"}`}>
          Unread {counts.unread ? `(${counts.unread})` : ""}
        </button>
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded ${filter === "all" ? "bg-white text-black" : "text-foreground/60"}`}>
          All {counts.total ? `(${counts.total})` : ""}
        </button>
        <div className="ml-auto">
          <button onClick={markAllRead} className="rounded-lg bg-purple-600 px-3 py-1 text-white text-sm">Mark all read</button>
        </div>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60">No notifications.</div>
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {rows.map((n) => (
            <NotificationItem key={n.id} n={n} onMarkRead={(id) => markRead(Number(id))} />
          ))}
        </div>
      )}
    </div>
  );
}
