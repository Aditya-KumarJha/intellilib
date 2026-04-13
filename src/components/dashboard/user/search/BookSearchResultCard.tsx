"use client";

import { BookOpen, Hash, Layers, Library, Link as LinkIcon } from "lucide-react";

import type { SmartSearchBook } from "@/components/dashboard/user/search/types";

type BookSearchResultCardProps = {
  book: SmartSearchBook;
};

function formatTypeLabel(type: SmartSearchBook["type"]) {
  if (type === "both") return "Physical + Digital";
  if (type === "digital") return "Digital";
  return "Physical";
}

export default function BookSearchResultCard({ book }: BookSearchResultCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-black/5 sm:h-44 sm:w-32 dark:bg-white/10">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`${book.title} cover`}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/45">
              <BookOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              {formatTypeLabel(book.type)}
            </span>
            {book.category ? (
              <span className="rounded-full border border-purple-400/35 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                {book.category}
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-foreground">{book.title}</h3>
          <p className="text-sm text-foreground/65">by {book.author}</p>

          {book.description ? (
            <p className="mt-3 line-clamp-2 text-sm text-foreground/70">{book.description}</p>
          ) : null}

          <div className="mt-4 grid gap-2 text-xs text-foreground/65 sm:grid-cols-2">
            <p className="inline-flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {book.availableCopies} available / {book.totalCopies} total
            </p>
            {book.publisher ? (
              <p className="inline-flex items-center gap-1.5">
                <Library className="h-3.5 w-3.5" aria-hidden />
                {book.publisher}
                {book.published_year ? ` (${book.published_year})` : ""}
              </p>
            ) : null}
            {book.isbn ? (
              <p className="inline-flex items-center gap-1.5 sm:col-span-2">
                <Hash className="h-3.5 w-3.5" aria-hidden />
                ISBN {book.isbn}
              </p>
            ) : null}
          </div>

          {book.pdf_url ? (
            <a
              href={book.pdf_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden />
              Preview digital copy
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
