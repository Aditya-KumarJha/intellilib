"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

type NotificationRow = {
  id: number | string;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  body?: string | null;
  level?: string | null;
  is_read?: boolean | number | string | null;
  metadata?: any;
  created_at?: string | null;
};

export default function NotificationItem({
  n,
  onMarkRead,
}: {
  n: NotificationRow;
  onMarkRead?: (id: number | string) => void;
}) {
  const [open, setOpen] = useState(false);

  const isRead = (v: unknown) => v === true || v === 1 || v === "1" || v === "t";

  // derive friendly message for librarians when metadata exists
  const deriveMessage = () => {
    if (n.metadata && typeof n.metadata === "object") {
      const m = n.metadata as any;
      if (n.type === "return_request") {
        const who = m.requested_email ?? m.requested_by ?? "A user";
        return `${who} requested to return ${m.bookTitle ?? "a book"}${m.transactionId ? ` (tx:${m.transactionId})` : ""}.`;
      }
      if (n.type === "reservation_update") {
        if (m.queue_position) return `Reservation queue update: position #${m.queue_position}`;
        if (m.action === "added_to_queue") return `Added to reservation queue`;
      }
      if (n.type === "payment_success" || n.type === "payment_verified") {
        return `Payment processed: ${m.reference ?? m.note ?? n.message}`;
      }
    }
    return n.message ?? n.body ?? "(No details)";
  };

  return (
    <div className={`rounded-2xl border p-3 ${isRead(n.is_read) ? "bg-white/5" : "bg-white/10"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{(n.type ?? n.title ?? "(No title)").replace(/_/g, " ")}</p>
          <p className="mt-1 text-sm text-foreground/65 line-clamp-2">{deriveMessage()}</p>
          <p className="mt-2 text-xs text-foreground/60">{n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : "—"}</p>
        </div>
        <div className="ml-4 flex flex-col items-end gap-2">
          {!isRead(n.is_read) ? (
            <button
              onClick={() => {
                // eslint-disable-next-line no-console
                console.info("[librarian.notifications.item] markRead clicked", n.id);
                onMarkRead && onMarkRead(n.id);
              }}
              className="rounded-lg bg-purple-600 px-2 py-1 text-white text-xs whitespace-nowrap"
            >
              Mark read
            </button>
          ) : (
            <span className="text-xs text-foreground/60 whitespace-nowrap">Read</span>
          )}
          <button
            onClick={() => {
              // eslint-disable-next-line no-console
              console.info("[librarian.notifications.item] toggle details", n.id, !open);
              setOpen((s) => !s);
            }}
            className="text-xs text-foreground/60 underline"
          >
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="mt-3 rounded-md border border-black/6 bg-black/3 p-3 text-xs text-foreground/65 dark:border-white/6 dark:bg-white/3">
          {n.metadata ? (
            <pre className="whitespace-pre-wrap wrap-break-word">{typeof n.metadata === "string" ? n.metadata : JSON.stringify(n.metadata, null, 2)}</pre>
          ) : (
            <div>{n.message ?? n.body ?? "No further details."}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
