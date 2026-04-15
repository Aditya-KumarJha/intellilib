"use client";

import { useState } from "react";
import { Layers, Plus, Minus, Pencil } from "lucide-react";
import { toast } from "react-toastify";

import type { SmartSearchBook } from "@/components/dashboard/user/search/types";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  book: SmartSearchBook;
  onUpdated?: () => void;
  onEdit?: (book: SmartSearchBook) => void;
};

export default function LibrarianBookCard({ book, onUpdated, onEdit }: Props) {
  const [loadingInc, setLoadingInc] = useState(false);
  const [loadingDec, setLoadingDec] = useState(false);

  const totalCopies = book.totalCopies ?? 0;
  const availableCopies = book.availableCopies ?? 0;

  async function authedFetch(url: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Session expired");

    return fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  async function changeCopies(delta: number) {
    if (delta === 0) return;
    try {
      if (delta > 0) setLoadingInc(true);
      else setLoadingDec(true);

      const res = await authedFetch(`/api/librarian/catalog/${book.id}/copies`, {
        method: "PATCH",
        body: JSON.stringify({ delta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Could not update copies");
      // show success toast with delta and optional returned counts
      const returned = json?.book;
      if (delta > 0) {
        toast.success("Added 1 copy");
      } else {
        toast.success("Removed 1 copy");
      }
      onUpdated?.();
    } catch (err) {
      toast.error(String(err instanceof Error ? err.message : err));
    } finally {
      setLoadingInc(false);
      setLoadingDec(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="flex gap-4 p-4 sm:p-5">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-black/5 dark:bg-white/10">
          {book.cover_url ? (
            <img src={book.cover_url} alt={`${book.title} cover`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/45">No cover</div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="truncate text-lg font-semibold tracking-tight text-foreground">{book.title}</h3>
              <p className="text-sm text-foreground/65">by {book.author}</p>
            </div>
            <div className="text-right text-sm text-foreground/65">
              <div className="inline-flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <div>
                  <div className="font-semibold text-foreground">{availableCopies} available</div>
                  <div className="text-foreground/55">{totalCopies} total</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void changeCopies(1)}
              disabled={loadingInc}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600/95 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-500 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add
            </button>

            <button
              type="button"
              onClick={() => void changeCopies(-1)}
              disabled={loadingDec || availableCopies <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600/95 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
            >
              <Minus className="h-4 w-4" /> Remove
            </button>

            <button
              type="button"
              onClick={() => onEdit?.(book)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600/95 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Pencil className="h-4 w-4" /> Edit
            </button>

            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(book, null, 2));
                toast.info("Book JSON copied to clipboard");
              }}
              className="ml-auto text-xs text-foreground/65"
            >
              Copy raw
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
