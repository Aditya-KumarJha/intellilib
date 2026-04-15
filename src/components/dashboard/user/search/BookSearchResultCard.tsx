"use client";

import { useMemo, useState } from "react";
import { BookOpen, Hash, Layers, Library, Link as LinkIcon } from "lucide-react";
import { toast } from "react-toastify";

import BookmarkToggleButton from "@/components/dashboard/user/bookmarks/BookmarkToggleButton";
import type { SmartSearchBook } from "@/components/dashboard/user/search/types";
import { supabase } from "@/lib/supabaseClient";

type BookSearchResultCardProps = {
  book: SmartSearchBook;
  bookmarked?: boolean;
  onBookmarkChange?: (nextBookmarked: boolean) => void;
  onActionComplete?: () => void;
};

function formatTypeLabel(type: SmartSearchBook["type"]) {
  if (type === "both") return "Physical + Digital";
  if (type === "digital") return "Digital";
  return "Physical";
}

export default function BookSearchResultCard({
  book,
  bookmarked = false,
  onBookmarkChange,
  onActionComplete,
}: BookSearchResultCardProps) {
  const [issuing, setIssuing] = useState(false);
  const [reserving, setReserving] = useState(false);

  const physicalAvailable = useMemo(
    () => book.copies.filter((copy) => copy.type === "physical" && copy.status === "available").length,
    [book.copies],
  );

  const hasDigitalAccess = Boolean(book.pdf_url || book.copies.some((copy) => copy.type === "digital" && copy.access_url));
  const isDigitalOnly = book.type === "digital";
  const isPhysicalOnly = book.type === "physical";
  const isHybrid = book.type === "both";
  const digitalUrl = book.pdf_url ?? undefined;
  const showDigitalButton = (isDigitalOnly || isHybrid) && hasDigitalAccess && Boolean(digitalUrl);
  const showPhysicalActions = isPhysicalOnly || isHybrid;

  async function authedFetch(url: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  async function handleIssue() {
    setIssuing(true);
    try {
      const res = await authedFetch("/api/library/issue", {
        method: "POST",
        body: JSON.stringify({ bookId: book.id }),
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not issue book");
      }

      if (payload?.mode === "digital_access") {
        toast.info(payload?.message ?? "Digital book is available instantly.");
      } else {
        toast.success(payload?.message ?? "Book issue successful.");
      }
      onActionComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setIssuing(false);
    }
  }

  async function handleReserve() {
    setReserving(true);
    try {
      const res = await authedFetch("/api/library/reservations", {
        method: "POST",
        body: JSON.stringify({ bookId: book.id }),
      });
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not create reservation");
      }

      toast.success(`Added to queue at position #${payload?.reservation?.queue_position ?? "-"}.`);
      onActionComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setReserving(false);
    }
  }

  return (
    <article className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="absolute right-4 top-4 z-10">
        <BookmarkToggleButton
          bookId={book.id}
          initialBookmarked={bookmarked}
          onChange={onBookmarkChange}
        />
      </div>

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

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {showDigitalButton ? (
              <a
                href={digitalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                <LinkIcon className="h-3.5 w-3.5" aria-hidden />
                Open digital copy
              </a>
            ) : null}

            {showPhysicalActions && physicalAvailable > 0 ? (
              <button
                type="button"
                onClick={() => {
                  void handleIssue();
                }}
                disabled={issuing}
                className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {issuing ? "Issuing..." : "Issue now"}
              </button>
            ) : showPhysicalActions ? (
              <button
                type="button"
                onClick={() => {
                  void handleReserve();
                }}
                disabled={reserving}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:text-amber-300"
              >
                {reserving ? "Adding..." : "Join reservation queue"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
