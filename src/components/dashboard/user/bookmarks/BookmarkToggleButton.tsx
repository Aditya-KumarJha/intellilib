"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

type BookmarkToggleButtonProps = {
  bookId: number;
  initialBookmarked?: boolean;
  onChange?: (nextBookmarked: boolean) => void;
  className?: string;
};

export default function BookmarkToggleButton({
  bookId,
  initialBookmarked = false,
  onChange,
  className,
}: BookmarkToggleButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setBookmarked(initialBookmarked);
  }, [initialBookmarked]);

  async function handleToggle() {
    if (pending) {
      return;
    }

    const nextBookmarked = !bookmarked;
    setPending(true);
    setBookmarked(nextBookmarked);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const endpoint = nextBookmarked
        ? "/api/library/bookmarks"
        : `/api/library/bookmarks?bookId=${bookId}`;

      const response = await fetch(endpoint, {
        method: nextBookmarked ? "POST" : "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: nextBookmarked ? JSON.stringify({ bookId }) : undefined,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not update bookmark");
      }

      onChange?.(nextBookmarked);
      toast.success(nextBookmarked ? "Book added to bookmarks." : "Book removed from bookmarks.");
    } catch (error) {
      setBookmarked(!nextBookmarked);
      toast.error(error instanceof Error ? error.message : "Could not update bookmark.");
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleToggle();
      }}
      disabled={pending}
      aria-pressed={bookmarked}
      aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
      title={bookmarked ? "Remove bookmark" : "Add bookmark"}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white/85 text-foreground/70 shadow-sm backdrop-blur transition hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-black/45 dark:text-foreground/75 dark:hover:bg-black/55",
        bookmarked && "border-amber-400/35 bg-amber-500/15 text-amber-600 dark:text-amber-300",
        className,
      )}
    >
      <Bookmark className={cn("h-4.5 w-4.5", bookmarked && "fill-current")} aria-hidden />
    </button>
  );
}
