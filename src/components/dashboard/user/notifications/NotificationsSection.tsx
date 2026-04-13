"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { formatDate } from "@/components/dashboard/user/my-books/my-books-utils";

export default function NotificationsSection() {
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("unread");
  const [counts, setCounts] = useState<{ total: number; unread: number }>({ total: 0, unread: 0 });

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

      // notifications table uses `message` field (schema-driven)
      // fetch all notifications for this user and compute counts client-side to avoid boolean coercion issues
      const allRes = await supabase
        .from("notifications")
        .select("id,type,message,is_read,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!mounted) return;
      const allData = (allRes.data ?? []) as any[];

      // helper to interpret is_read values robustly
      const isReadValue = (v: any) => {
        if (v === true || v === 1 || v === "1" || v === "t") return true;
        return false;
      };

      const total = allData.length;
      const unreadCount = allData.filter((r) => !isReadValue(r.is_read)).length;

      // select visible set based on filter
      const visible = filter === "unread" ? allData.filter((r) => !isReadValue(r.is_read)) : allData;

      setNotes(visible);
      setCounts({ total, unread: unreadCount });
      setLoading(false);
    }
    load();

    // realtime — create a unique channel name so multiple mounts won't collide
    let channel: any;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) return;
      const channelName = `notifications-${userId}-${Date.now()}`;
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload: any) => {
            // payload.new will have message/is_read/created_at
            setNotes((s) => [payload.new, ...s]);
          },
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [filter]);

  async function markRead(id: number) {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      setNotes((s) =>
        s.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Notifications
        </h2>
        <p className="mt-1 text-sm text-foreground/65">
          Due date reminders, fine alerts, and request updates.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 rounded ${filter === "unread" ? "bg-white text-black" : "text-foreground/60"}`}
        >
          Unread {counts.unread ? `(${counts.unread})` : ""}
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded ${filter === "all" ? "bg-white text-black" : "text-foreground/60"}`}
        >
          All {counts.total ? `(${counts.total})` : ""}
        </button>
      </div>

      {loading ? (
        <div>Loading…</div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60">
          No notifications.
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-3 ${n.is_read ? "bg-white/5" : "bg-white/10"}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">
                    {(n.type ?? "Notification").replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-sm text-foreground/65 line-clamp-3">{n.message}</p>
                  <p className="mt-2 text-xs text-foreground/60">
                    {formatDate(n.created_at)}
                  </p>
                </div>
                <div className="ml-4 text-right">
                  {!n.is_read ? (
                    <button
                      onClick={() => markRead(n.id)}
                      className="rounded-lg bg-purple-600 px-2 py-1 text-white text-xs"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-xs text-foreground/60">Read</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
