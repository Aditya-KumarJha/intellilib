import type { ReservationItem, ReservationRow } from "@/components/dashboard/user/reservations/types";

const HOLD_HOURS = 24;

function pickOne<T>(value: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapReservationRow(row: ReservationRow): ReservationItem | null {
  const book = pickOne(row.books);
  if (!book) return null;

  const updatedAt = row.created_at;
  const holdExpiresAt =
    row.status === "approved"
      ? new Date(new Date(updatedAt).getTime() + HOLD_HOURS * 60 * 60 * 1000).toISOString()
      : null;

  return {
    id: row.id,
    bookId: row.book_id,
    status: row.status,
    queuePosition: row.queue_position,
    updatedAt,
    holdExpiresAt,
    book: {
      title: book.title,
      author: book.author,
      coverUrl: book.cover_url,
      type: book.type,
      availableCopies: Number(book.available_copies ?? 0),
      totalCopies: Number(book.total_copies ?? 0),
    },
  };
}

export function statusLabel(status: ReservationItem["status"]) {
  if (status === "waiting") return "In queue";
  if (status === "approved") return "Ready to collect";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

export function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
