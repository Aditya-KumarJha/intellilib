"use client";


"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump?: (page: number) => void;
};

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

  // current is in middle (2..total-1)
  pages.push(1);
  if (current > 2) pages.push("...");
  pages.push(current - 1);
  pages.push(current);
  if (current < total - 1) pages.push(current + 1);
  if (current < total - 1) pages.push("...");
  pages.push(total);
  return pages;
}

export default function PaginationControls({ currentPage, totalPages, onPrev, onNext, onJump }: Props) {
  const pages = buildPageList(Math.max(1, totalPages), currentPage);

  return (
    <div className="mt-3 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={currentPage <= 1}
        aria-label="Previous page"
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${currentPage <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/8"} bg-white/80 border-black/7 text-foreground dark:bg-white/6 dark:border-white/6 dark:text-foreground`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      <div className="flex items-center gap-2">
        {pages.map((p, idx) =>
          p === "..." ? (
            <div key={`dot-${idx}`} className="px-2 text-sm text-foreground/50">…</div>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onJump?.(Number(p))}
              aria-current={p === currentPage ? "page" : undefined}
                className={`h-9 min-w-9 flex items-center justify-center rounded-md px-3 text-sm font-medium transition ${p === currentPage ? "bg-purple-600 text-white shadow-md" : "bg-transparent border text-foreground hover:bg-black/5"} ${p === currentPage ? "" : "border-black/6 dark:border-white/6 dark:bg-white/6 dark:text-foreground"}`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={currentPage >= (totalPages || 1)}
        aria-label="Next page"
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${currentPage >= (totalPages || 1) ? "opacity-50 cursor-not-allowed" : "hover:bg-black/5 dark:hover:bg-white/8"} bg-white/80 border-black/7 text-foreground dark:bg-white/6 dark:border-white/6 dark:text-foreground`}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
