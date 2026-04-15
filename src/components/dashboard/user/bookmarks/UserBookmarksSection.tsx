"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bookmark, Search, Sparkles, X } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";

import Dropdown from "@/components/common/Dropdown";
import BookSearchResultCard from "@/components/dashboard/user/search/BookSearchResultCard";
import { mapBookRow, filterBooks, getSuggestions, type SearchFormatFilter } from "@/components/dashboard/user/search/search-utils";
import type { SmartSearchBook } from "@/components/dashboard/user/search/types";
import { extractBookRow } from "@/components/dashboard/user/bookmarks/bookmark-utils";
import type { BookmarkedBook, BookmarkRow } from "@/components/dashboard/user/bookmarks/types";
import { useUserBookmarkIds } from "@/components/dashboard/user/bookmarks/useUserBookmarkIds";
import { supabase } from "@/lib/supabaseClient";

type BookmarkSortOption =
  | "saved-latest"
  | "saved-earliest"
  | "title-asc"
  | "title-desc"
  | "author-asc"
  | "newest";

const sortOptions: Array<{ value: BookmarkSortOption; label: string }> = [
  { value: "saved-latest", label: "Recently Bookmarked" },
  { value: "saved-earliest", label: "Oldest Bookmarked" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "author-asc", label: "Author A-Z" },
  { value: "newest", label: "Newest Published" },
];

const formatOptions: Array<{ value: SearchFormatFilter; label: string }> = [
  { value: "all", label: "All Formats" },
  { value: "physical", label: "Physical Only" },
  { value: "digital", label: "Digital Only" },
];

function sortBooks(rows: BookmarkedBook[], sortBy: BookmarkSortOption) {
  const list = [...rows];

  list.sort((a, b) => {
    if (sortBy === "saved-latest") {
      return new Date(b.bookmarkedAt ?? 0).getTime() - new Date(a.bookmarkedAt ?? 0).getTime();
    }

    if (sortBy === "saved-earliest") {
      return new Date(a.bookmarkedAt ?? 0).getTime() - new Date(b.bookmarkedAt ?? 0).getTime();
    }

    if (sortBy === "title-asc") {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === "title-desc") {
      return b.title.localeCompare(a.title);
    }

    if (sortBy === "author-asc") {
      return a.author.localeCompare(b.author);
    }

    const yearA = a.published_year ?? -1;
    const yearB = b.published_year ?? -1;

    if (yearA === yearB) {
      return a.title.localeCompare(b.title);
    }

    return yearB - yearA;
  });

  return list;
}

export default function UserBookmarksSection() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeFormat, setActiveFormat] = useState<SearchFormatFilter>("all");
  const [sortBy, setSortBy] = useState<BookmarkSortOption>("saved-latest");
  const [books, setBooks] = useState<BookmarkedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTop, setShowTop] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const visibleCountRef = useRef(12);

  const PAGE_SIZE = 12;
  const { bookmarkedIdSet, updateLocal: updateLocalBookmarks } = useUserBookmarkIds(currentUserId);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const loadBookmarks = useCallback(async () => {
    if (!currentUserId) {
      setBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("bookmarks")
      .select(
        "id,created_at,books(id,title,author,description,type,isbn,cover_url,pdf_url,publisher,published_year,categories(name),book_copies(id,type,status,location,access_url),reservations(status))",
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message || "Could not load bookmarks");
      setLoading(false);
      return;
    }

    const mapped = ((data ?? []) as BookmarkRow[])
      .map((row) => {
        const book = extractBookRow(row);
        if (!book) {
          return null;
        }

        return {
          ...mapBookRow(book),
          bookmarkedAt: row.created_at,
        } satisfies BookmarkedBook;
      })
      .filter((row): row is BookmarkedBook => Boolean(row));

    setBooks(mapped);
    visibleCountRef.current = PAGE_SIZE;
    setVisibleCount(PAGE_SIZE);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const { data, error: userError } = await supabase.auth.getSession();
      if (!active) {
        return;
      }

      const resolvedId = data?.session?.user?.id;
      if (userError || !resolvedId) {
        setError(userError?.message || "Could not resolve user session");
        setLoading(false);
        return;
      }

      setCurrentUserId(resolvedId);
    }

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const loadHandle = window.setTimeout(() => {
      void loadBookmarks();
    }, 0);

    return () => {
      window.clearTimeout(loadHandle);
    };
  }, [loadBookmarks, bookmarkedIdSet]);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const suggestions = useMemo(() => getSuggestions(books, query), [books, query]);

  const filtered = useMemo(() => {
    const base = filterBooks(books as SmartSearchBook[], query, activeFormat) as BookmarkedBook[];
    return sortBooks(base, sortBy);
  }, [activeFormat, books, query, sortBy]);

  const visibleBooks = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const hasMore = visibleCount < filtered.length;
  const totalAvailable = useMemo(
    () => filtered.reduce((sum, book) => sum + book.availableCopies, 0),
    [filtered],
  );

  const handleBookmarkChange = useCallback((bookId: number, nextBookmarked: boolean) => {
    updateLocalBookmarks(bookId, nextBookmarked);

    if (!nextBookmarked) {
      setBooks((prev) => prev.filter((book) => book.id !== bookId));
    }
  }, [updateLocalBookmarks]);

  return (
    <div className="mx-auto space-y-6">
      <section className="max-w-6xl rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Saved bookmarks
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Your bookmarked books</h2>
            <p className="mt-1 text-sm text-foreground/65">
              Search, filter, and reopen saved titles from one focused reading list.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-right text-xs dark:border-white/10 dark:bg-white/10">
            <p className="text-foreground/60">Saved books</p>
            <p className="text-lg font-semibold text-foreground">{filtered.length}</p>
            <p className="text-foreground/55">{totalAvailable} copies currently available</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="relative block w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  visibleCountRef.current = PAGE_SIZE;
                  setVisibleCount(PAGE_SIZE);
                  setQuery(event.target.value);
                }}
                placeholder="Search your bookmarks"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/20 dark:border-white/10 dark:bg-white/10"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    visibleCountRef.current = PAGE_SIZE;
                    setVisibleCount(PAGE_SIZE);
                    setQuery("");
                    inputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/60 hover:text-foreground/80"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>

            <div className="grid w-full grid-cols-2 gap-3 md:w-90">
              <Dropdown
                title="Format"
                id="bookmark-format"
                name="bookmark-format"
                value={activeFormat}
                onChange={(event) => {
                  visibleCountRef.current = PAGE_SIZE;
                  setVisibleCount(PAGE_SIZE);
                  setActiveFormat(event.target.value as SearchFormatFilter);
                }}
                options={formatOptions.map((option) => ({ value: option.value, label: option.label }))}
              />

              <Dropdown
                title="Sort"
                id="bookmark-sort"
                name="bookmark-sort"
                value={sortBy}
                onChange={(event) => {
                  visibleCountRef.current = PAGE_SIZE;
                  setVisibleCount(PAGE_SIZE);
                  setSortBy(event.target.value as BookmarkSortOption);
                }}
                options={sortOptions.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>
          </div>

          {query.trim() && suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-xs font-medium text-foreground/80 transition hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}

          <p className="pt-1 text-xs text-foreground/55">
            Showing <span className="font-semibold text-foreground/75">{activeFormat}</span> bookmarks sorted by{" "}
            <span className="font-semibold text-foreground/75">
              {sortOptions.find((option) => option.value === sortBy)?.label}
            </span>.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Could not load bookmarks: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-black/20 bg-black/5 px-5 py-10 text-center dark:border-white/15 dark:bg-white/5">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <Bookmark className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-4 text-base font-semibold text-foreground">
            {books.length === 0 ? "No bookmarks yet." : "No bookmarks matched this search."}
          </p>
          <p className="mt-2 text-sm text-foreground/60">
            {books.length === 0
              ? "Save books from Smart Search or My Books and they will appear here instantly."
              : "Try a different keyword or change the selected format."}
          </p>
          {books.length === 0 ? (
            <Link
              href="/dashboard/user/search"
              className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-400"
            >
              Explore Smart Search
            </Link>
          ) : null}
        </div>
      ) : (
        <InfiniteScroll
          dataLength={visibleBooks.length}
          next={() => {
            visibleCountRef.current += PAGE_SIZE;
            setVisibleCount(visibleCountRef.current);
          }}
          hasMore={hasMore}
          loader={
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={index}
                  className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
                />
              ))}
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleBooks.map((book) => (
              <BookSearchResultCard
                key={book.id}
                book={book}
                bookmarked={bookmarkedIdSet.has(book.id)}
                onBookmarkChange={(nextBookmarked) => handleBookmarkChange(book.id, nextBookmarked)}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}

      {showTop ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed right-6 bottom-6 z-50 rounded-full bg-amber-500 p-3 text-black shadow-lg transition hover:scale-105"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}
