"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Search, Sparkles, X } from "lucide-react";
import InfiniteScroll from "react-infinite-scroll-component";

import { supabase } from "@/lib/supabaseClient";
import BookSearchResultCard from "@/components/dashboard/user/search/BookSearchResultCard";
import Dropdown from "@/components/dashboard/user/search/Dropdown";
import { filterBooks, getSuggestions, mapBookRow, type SearchFormatFilter } from "@/components/dashboard/user/search/search-utils";
import type { BookRow, SmartSearchBook } from "@/components/dashboard/user/search/types";

type SearchSortOption =
  | "latest"
  | "newest"
  | "earliest"
  | "title-asc"
  | "title-desc"
  | "author-asc";

const sortOptions: Array<{ value: SearchSortOption; label: string }> = [
  { value: "latest", label: "Latest Added" },
  { value: "newest", label: "Newest Published" },
  { value: "earliest", label: "Earliest Published" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "author-asc", label: "Author A-Z" },
];

const formatOptions: Array<{ value: SearchFormatFilter; label: string }> = [
  { value: "all", label: "All Formats" },
  { value: "physical", label: "Physical Only" },
  { value: "digital", label: "Digital Only" },
];

function sortBooks(rows: SmartSearchBook[], sortBy: SearchSortOption): SmartSearchBook[] {
  const list = [...rows];

  list.sort((a, b) => {
    if (sortBy === "latest") return b.id - a.id;
    if (sortBy === "title-asc") return a.title.localeCompare(b.title);
    if (sortBy === "title-desc") return b.title.localeCompare(a.title);
    if (sortBy === "author-asc") return a.author.localeCompare(b.author);

    const yearA = a.published_year ?? -1;
    const yearB = b.published_year ?? -1;

    if (sortBy === "newest") {
      if (yearA === yearB) return a.title.localeCompare(b.title);
      return yearB - yearA;
    }

    if (yearA === yearB) return a.title.localeCompare(b.title);
    return yearA - yearB;
  });

  return list;
}

export default function UserSmartSearchSection() {
  const [query, setQuery] = useState("");
  const [activeFormat, setActiveFormat] = useState<SearchFormatFilter>("all");
  const [sortBy, setSortBy] = useState<SearchSortOption>("latest");
  const [books, setBooks] = useState<SmartSearchBook[]>([]);
  const [totalBooksCount, setTotalBooksCount] = useState<number | null>(null);
  const [totalCopiesAvailable, setTotalCopiesAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showTop, setShowTop] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pageRef = useRef(0);

  const PAGE_SIZE = 20;

  const loadBooks = useCallback(
    async (requestedPage = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const from = requestedPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let builder = supabase
          .from("books")
          .select(
            "id,title,author,description,type,isbn,cover_url,pdf_url,publisher,published_year,categories(name),book_copies(id,type,status,location,access_url),reservations(status)"
          )
          .order("title", { ascending: true })
          .range(from, to);

        // apply simple server-side filters for format and query
        if (activeFormat === "digital") {
          builder = builder.in("type", ["digital", "both"]);
        } else if (activeFormat === "physical") {
          builder = builder.in("type", ["physical", "both"]);
        }

        const q = query.trim();
        if (q.length >= 3) {
          // basic ilike search across title, author, isbn
          // use PostgREST OR syntax
          const like = `%${q}%`;
          builder = builder.or(`title.ilike.${like},author.ilike.${like},isbn.ilike.${like}`);
        }

        const { data, error: fetchError } = await builder;

        if (fetchError) {
          setError(fetchError.message || "Could not load books");
          setLoading(false);
          return;
        }

        const mapped = ((data ?? []) as BookRow[]).map(mapBookRow);

        setBooks((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
        if (append) setLoadingMore(false);
        else setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [query, activeFormat]
  );

    // fetch overall totals (books matching filters and available copies) separately
    const fetchTotals = useCallback(async () => {
      try {
        const q = query.trim();

        let builder = supabase
          .from("books")
          .select("id");

        if (activeFormat === "digital") {
          builder = builder.in("type", ["digital", "both"]);
        } else if (activeFormat === "physical") {
          builder = builder.in("type", ["physical", "both"]);
        }

        if (q.length >= 3) {
          const like = `%${q}%`;
          builder = builder.or(`title.ilike.${like},author.ilike.${like},isbn.ilike.${like}`);
        }

        // request a large range of ids so we can count copies reliably
        const { data: idRows, error: idErr } = await builder.range(0, 99999);
        if (idErr) {
          setTotalBooksCount(null);
          setTotalCopiesAvailable(null);
          return;
        }

        const ids = (idRows ?? []).map((row: { id: number }) => row.id);
        setTotalBooksCount(ids.length);

        if (ids.length === 0) {
          setTotalCopiesAvailable(0);
          return;
        }

        const { count: copiesCount, error: copiesErr } = await supabase
          .from("book_copies")
          .select("id", { count: "exact", head: true })
          .in("book_id", ids)
          .eq("status", "available");

        if (copiesErr) {
          setTotalCopiesAvailable(null);
          return;
        }

        setTotalCopiesAvailable(copiesCount ?? 0);
      } catch {
        setTotalBooksCount(null);
        setTotalCopiesAvailable(null);
      }
    }, [query, activeFormat]);

  useEffect(() => {
    // initial load or when query/format changes
    pageRef.current = 0;

    const initialLoadHandle = window.setTimeout(() => {
      void loadBooks(0, false);
      void fetchTotals();
    }, 0);

    return () => {
      window.clearTimeout(initialLoadHandle);
    };
  }, [loadBooks, fetchTotals]);
  

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 200);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const suggestions = useMemo(() => getSuggestions(books, query), [books, query]);
  const filtered = useMemo(() => {
    const base = filterBooks(books, query, activeFormat);
    return sortBooks(base, sortBy);
  }, [books, query, activeFormat, sortBy]);

  const totalAvailable = useMemo(
    () => filtered.reduce((sum, book) => sum + book.availableCopies, 0),
    [filtered]
  );

  const refreshAfterAction = useCallback(() => {
    pageRef.current = 0;
    void loadBooks(0, false);
    void fetchTotals();
  }, [loadBooks, fetchTotals]);

  return (
    <div className="mx-auto space-y-6">
      <section className="max-w-6xl rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
              <Sparkles className="h-3.5 w-3.5" />
              Live Smart Search
            </div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">Find books by title, author, category</h2>
            <p className="mt-1 text-sm text-foreground/65">
              Powered by real records with availability and format filters.
            </p>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-right text-xs dark:border-white/10 dark:bg-white/10">
              <p className="text-foreground/60">Books shown</p>
              <p className="text-lg font-semibold text-foreground">{totalBooksCount ?? filtered.length}</p>
              <p className="text-foreground/55">{totalCopiesAvailable ?? totalAvailable} copies available</p>
            </div>
        </div>

        <div className="mt-5 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try: clean code, AI, martin, programming"
                className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => {
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

            <div className="grid grid-cols-2 gap-3">
              <Dropdown
                title="Format"
                id="format"
                name="format"
                value={activeFormat}
                onChange={(event) => {
                  setActiveFormat(event.target.value as SearchFormatFilter);
                }}
                options={formatOptions.map((option) => ({ value: option.value, label: option.label }))}
              />

              <Dropdown
                title="Sort"
                id="sort"
                name="sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SearchSortOption)}
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
            Showing <span className="font-semibold text-foreground/75">{activeFormat}</span> books sorted by <span className="font-semibold text-foreground/75">{sortOptions.find((o) => o.value === sortBy)?.label}</span>.
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
          Could not load search data: {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-4 py-6 text-center text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">
          No books matched this search. Try a broader keyword or switch format.
        </div>
      ) : (
        <InfiniteScroll
          dataLength={filtered.length}
          next={() => {
            const nextPage = pageRef.current + 1;
            pageRef.current = nextPage;
            void loadBooks(nextPage, true);
          }}
          hasMore={hasMore}
          loader={
            loadingMore ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
                  />
                ))}
              </div>
            ) : null
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {filtered.map((book) => (
              <BookSearchResultCard key={book.id} book={book} onActionComplete={refreshAfterAction} />
            ))}
          </div>
        </InfiniteScroll>
      )}

      {showTop ? (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="fixed right-6 bottom-6 z-50 rounded-full bg-purple-600/95 p-3 text-white shadow-lg transition hover:scale-105"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}
