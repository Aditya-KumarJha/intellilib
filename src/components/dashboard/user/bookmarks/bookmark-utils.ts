import type { BookRow } from "@/components/dashboard/user/search/types";

export function extractBookRow<T extends { books: BookRow | BookRow[] | null }>(row: T): BookRow | null {
  if (Array.isArray(row.books)) {
    return row.books[0] ?? null;
  }

  return row.books ?? null;
}
