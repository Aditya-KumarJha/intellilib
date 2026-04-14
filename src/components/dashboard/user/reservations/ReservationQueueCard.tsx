import { BookOpen, CalendarClock, Layers, Timer, X } from "lucide-react";

import { formatDateTime, statusLabel } from "@/components/dashboard/user/reservations/reservation-utils";
import type { ReservationItem } from "@/components/dashboard/user/reservations/types";

type ReservationQueueCardProps = {
  item: ReservationItem;
  onCancel: (id: number) => void;
  busy: boolean;
};

const statusStyle: Record<ReservationItem["status"], string> = {
  waiting: "border-amber-400/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-300",
  completed: "border-cyan-400/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

export default function ReservationQueueCard({ item, onCancel, busy }: ReservationQueueCardProps) {
  const cancellable = item.status === "waiting" || item.status === "approved";

  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:p-6">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-black/5 sm:h-44 sm:w-32 dark:bg-white/10">
          {item.book.coverUrl ? (
            <img
              src={item.book.coverUrl}
              alt={`${item.book.title} cover`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/45">
              <BookOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyle[item.status]}`}>
              {statusLabel(item.status)}
            </span>
            {item.queuePosition ? (
              <span className="rounded-full border border-purple-400/35 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                Queue #{item.queuePosition}
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-foreground">{item.book.title}</h3>
          <p className="text-sm text-foreground/65">by {item.book.author}</p>

          <div className="mt-4 grid gap-2 text-xs text-foreground/65 sm:grid-cols-2">
            <p className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {item.book.availableCopies} available / {item.book.totalCopies} total
            </p>
            <p className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Updated: {formatDateTime(item.updatedAt)}
            </p>
            {item.holdExpiresAt ? (
              <p className="inline-flex items-center gap-1.5 sm:col-span-2 text-emerald-700 dark:text-emerald-300">
                <Timer className="h-3.5 w-3.5" aria-hidden />
                Collect before {formatDateTime(item.holdExpiresAt)}
              </p>
            ) : null}
          </div>

          {cancellable ? (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <X className="h-4 w-4" aria-hidden />
              Cancel reservation
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
