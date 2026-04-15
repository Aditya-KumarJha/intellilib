"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import PublicBookCard from "@/components/public/search/PublicBookCard";
import PublicSearchFilters from "@/components/public/search/PublicSearchFilters";
import { getSuggestionOptions, mapPublicBook, sortPublicBooks } from "@/components/public/search/search-utils";
import type { PublicBook, PublicBookApiRow, PublicSearchSort } from "@/components/public/search/types";

const PAGE_SIZE = 18;

type SearchApiPayload = {
  books?: PublicBookApiRow[];
  error?: string;
};

export default function PublicSearchClient() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [sortBy, setSortBy] = useState<PublicSearchSort>("relevance");
  const [books, setBooks] = useState<PublicBook[]>([]);
  const [bookmarkedIdSet, setBookmarkedIdSet] = useState<Set<number>>(new Set());
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBookmarks = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user?.id) {
      setBookmarkedIdSet(new Set());
      return;
    }

    const { data, error: bookmarkError } = await supabase
      .from("bookmarks")
      .select("book_id")
      .eq("user_id", user.id);

    if (bookmarkError) {
      return;
    }

    setBookmarkedIdSet(new Set((data ?? []).map((row: { book_id: number }) => Number(row.book_id))));
  }, []);

  const loadBooks = useCallback(
    async (requestedPage: number, reset: boolean) => {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(requestedPage),
          limit: String(PAGE_SIZE),
        });

        if (submittedQuery.trim()) {
          params.set("q", submittedQuery.trim());
        }

        const response = await fetch(`/api/library/search?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => ({}))) as SearchApiPayload;
        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to fetch books");
        }

        const mapped = (payload.books ?? []).map(mapPublicBook);
        setBooks((prev) => (reset ? mapped : [...prev, ...mapped]));
        setHasMore(mapped.length === PAGE_SIZE);
        setPage(requestedPage);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "Unable to fetch books";
        setError(message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [submittedQuery],
  );

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    void loadBooks(1, true);
  }, [loadBooks]);

  const suggestions = useMemo(() => getSuggestionOptions(books, query), [books, query]);

  const sortedBooks = useMemo(() => {
    return sortPublicBooks(books, sortBy);
  }, [books, sortBy]);

  const handleSubmit = useCallback(() => {
    setSubmittedQuery(query.trim());
  }, [query]);

  const handleSuggestionPick = useCallback((value: string) => {
    setQuery(value);
    setSubmittedQuery(value.trim());
  }, []);

  const handleBookmarkChange = useCallback((bookId: number, nextBookmarked: boolean) => {
    setBookmarkedIdSet((prev) => {
      const next = new Set(prev);
      if (nextBookmarked) {
        next.add(bookId);
      } else {
        next.delete(bookId);
      }
      return next;
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-14 pt-28 sm:px-6 lg:px-8">
      <PublicSearchFilters
        query={query}
        setQuery={setQuery}
        onSubmit={handleSubmit}
        suggestionOptions={suggestions}
        onSuggestionPick={handleSuggestionPick}
        sortBy={sortBy}
        setSortBy={setSortBy}
        totalCount={sortedBooks.length}
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      ) : sortedBooks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-8 text-center text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">
          No books found. Try another keyword.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {sortedBooks.map((book) => (
              <PublicBookCard
                key={book.id}
                book={book}
                bookmarked={bookmarkedIdSet.has(book.id)}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}
          </div>

          {hasMore ? (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => {
                  void loadBooks(page + 1, false);
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loadingMore ? "Loading..." : "Load more books"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
