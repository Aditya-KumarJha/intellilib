"use client";

import { Search, Sparkles, X } from "lucide-react";

import type { PublicSearchSort } from "@/components/search/types";

type PublicSearchFiltersProps = {
  query: string;
  setQuery: (value: string) => void;
  onSubmit: () => void;
  suggestionOptions: string[];
  onSuggestionPick: (value: string) => void;
  sortBy: PublicSearchSort;
  setSortBy: (value: PublicSearchSort) => void;
  totalCount: number;
};

const sortOptions: Array<{ value: PublicSearchSort; label: string }> = [
  { value: "relevance", label: "Best Match" },
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "availability", label: "Most Available" },
];

export default function PublicSearchFilters({
  query,
  setQuery,
  onSubmit,
  suggestionOptions,
  onSuggestionPick,
  sortBy,
  setSortBy,
  totalCount,
}: PublicSearchFiltersProps) {
  return (
    <section className="max-w-[1400px] overflow-visible rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" />
            Open Search Catalog
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Search books without login
          </h1>
          <p className="mt-1 text-sm text-foreground/65">
            Discover what is available right now. Bookmark while logged in.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-right text-xs dark:border-white/10 dark:bg-white/10">
          <p className="text-foreground/60">Books in view</p>
          <p className="text-lg font-semibold text-foreground">{totalCount}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-center">
        <div className="relative min-w-0 flex-1 lg:max-w-4xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Search by title, author, category"
              className="h-12 w-full rounded-2xl border border-black/10 bg-white/80 pl-11 pr-20 text-sm text-foreground outline-none transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/10"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/60 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={onSubmit}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              Search
            </button>
          </div>

          {query.trim().length > 0 && suggestionOptions.length > 0 ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-black/10 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-black/75">
              <ul className="max-h-56 overflow-auto py-1">
                {suggestionOptions.map((option) => (
                  <li key={option}>
                    <button
                      type="button"
                      onClick={() => onSuggestionPick(option)}
                      className="w-full px-3 py-2 text-left text-sm text-foreground/80 transition hover:bg-black/5 dark:hover:bg-white/10"
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <label className="grid w-full gap-1 text-xs font-medium text-foreground/60 sm:max-w-56">
          Sort
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as PublicSearchSort)}
            className="h-12 w-full rounded-2xl border border-black/10 bg-white/80 px-3 text-sm text-foreground outline-none transition focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/20 dark:border-white/10 dark:bg-white/10"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
