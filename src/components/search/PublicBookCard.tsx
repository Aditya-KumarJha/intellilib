"use client";

import { BookOpen, Layers, Tag } from "lucide-react";

import type { PublicBook } from "@/components/search/types";
import { availabilityLabel } from "@/components/search/search-utils";
import PublicBookmarkButton from "@/components/search/PublicBookmarkButton";

type PublicBookCardProps = {
  book: PublicBook;
  bookmarked: boolean;
  onBookmarkChange: (bookId: number, nextBookmarked: boolean) => void;
};

function formatType(type: PublicBook["type"]) {
  if (type === "both") {
    return "Physical + Digital";
  }
  if (type === "digital") {
    return "Digital";
  }
  return "Physical";
}

export default function PublicBookCard({ book, bookmarked, onBookmarkChange }: PublicBookCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-black/10 bg-white/75 p-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 sm:p-5">
      <div className="absolute right-4 top-4 z-10">
        <PublicBookmarkButton
          bookId={book.id}
          initialBookmarked={bookmarked}
          onChange={(nextBookmarked) => onBookmarkChange(book.id, nextBookmarked)}
        />
      </div>

      <div className="flex gap-4">
        <div className="h-36 w-24 shrink-0 overflow-hidden rounded-2xl bg-black/5 dark:bg-white/10 sm:h-40 sm:w-28">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={`${book.title} cover`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/45">
              <BookOpen className="h-7 w-7" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pr-10 sm:pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              {formatType(book.type)}
            </span>
            {book.category ? (
              <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                {book.category}
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 line-clamp-1 text-lg font-semibold tracking-tight text-foreground">{book.title}</h3>
          <p className="text-sm text-foreground/65">by {book.author}</p>

          {book.description ? (
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-foreground/70">{book.description}</p>
          ) : (
            <p className="mt-3 text-sm text-foreground/50">No description available.</p>
          )}

          <div className="mt-4 grid gap-2 text-xs text-foreground/65 sm:grid-cols-2">
            <p className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {availabilityLabel(book.availableCopies, book.totalCopies)}
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" aria-hidden />
              {book.totalCopies} total copy records
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
