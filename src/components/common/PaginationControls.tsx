"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump?: (page: number) => void;
  perPage?: number;
  onPerPageChange?: (n: number) => void;
};

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function buildPageList(total: number, current: number) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | string)[] = [];

  if (current === 1) {
    pages.push(1);
    if (total >= 2) pages.push(2);
    if (total >= 3) pages.push(3);
    if (total > 3) pages.push("...");
    if (total > 3) pages.push(total);
    return pages;
  }

  if (current === total) {
    pages.push(1);
    if (total > 3) pages.push("...");
    if (total >= 3) pages.push(total - 2);
    if (total >= 2) pages.push(total - 1);
    pages.push(total);
    return pages;
  }

  pages.push(1);
  if (current > 2) pages.push("...");
  pages.push(current - 1);
  pages.push(current);
  if (current < total - 1) pages.push(current + 1);
  if (current < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPrev,
  onNext,
  onJump,
  perPage = 10,
  onPerPageChange,
}: Props) {
  const pages = buildPageList(Math.max(1, totalPages), currentPage);

  return (
    <div className="mt-3 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={classNames(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
          currentPage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/8",
          "bg-white/80 border-black/7 text-foreground dark:bg-white/6 dark:border-white/6 dark:text-foreground"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm text-foreground/60">Per page</label>
          <select
            value={String(perPage)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onPerPageChange?.(Number(e.target.value))}
            className="h-9 rounded-md border border-black/6 bg-transparent px-2 text-sm text-foreground outline-none dark:border-white/6"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {pages.map((p, idx) =>
            p === "..." ? (
              <div key={`dot-${idx}`} className="px-2 text-sm text-foreground/50">…</div>
            ) : (
              <button
                key={String(p)}
                type="button"
                onClick={() => onJump?.(Number(p))}
                aria-current={p === currentPage ? "page" : undefined}
                className={classNames(
                  "h-9 min-w-9 flex items-center justify-center rounded-md px-3 text-sm font-medium transition",
                  p === currentPage
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-transparent border text-foreground hover:bg-black/5",
                  p === currentPage ? undefined : "border-black/6 dark:border-white/6 dark:bg-white/6 dark:text-foreground"
                )}
              >
                {p}
              </button>
            )
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= (totalPages || 1)}
        aria-label="Next page"
        className={classNames(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
          currentPage >= (totalPages || 1) ? "opacity-50 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/8",
          "bg-white/80 border-black/7 text-foreground dark:bg-white/6 dark:border-white/6 dark:text-foreground"
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
