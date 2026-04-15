import type { BookRow, SmartSearchBook } from "@/components/dashboard/user/search/types";

export type BookmarkRow = {
  id: number;
  created_at: string | null;
  books: BookRow | BookRow[] | null;
};

export type BookmarkedBook = SmartSearchBook & {
  bookmarkedAt: string | null;
};
