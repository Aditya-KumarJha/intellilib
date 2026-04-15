"use client";

import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "react-toastify";

import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

type PublicBookmarkButtonProps = {
  bookId: number;
  initialBookmarked?: boolean;
  onChange?: (nextBookmarked: boolean) => void;
};

export default function PublicBookmarkButton({
  bookId,
  initialBookmarked = false,
  onChange,
}: PublicBookmarkButtonProps) {
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
        throw new Error("Please login first to bookmark.");
      }

      const response = await fetch(
        nextBookmarked ? "/api/library/bookmarks" : `/api/library/bookmarks?bookId=${bookId}`,
        {
          method: nextBookmarked ? "POST" : "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: nextBookmarked ? JSON.stringify({ bookId }) : undefined,
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not update bookmark");
      }

      onChange?.(nextBookmarked);
      toast.success(nextBookmarked ? "Book added to bookmarks." : "Book removed from bookmarks.");
    } catch (error) {
      setBookmarked(!nextBookmarked);
      const message = error instanceof Error ? error.message : "Could not update bookmark.";
      if (message.toLowerCase().includes("login") || message.toLowerCase().includes("session")) {
        toast.info("Please login first to bookmark.");
      } else {
        toast.error(message);
      }
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
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/75 text-foreground/70 shadow-sm backdrop-blur transition hover:bg-white hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20",
        bookmarked && "border-amber-400/35 bg-amber-500/15 text-amber-700 dark:text-amber-300",
      )}
    >
      <Bookmark className={cn("h-4.5 w-4.5", bookmarked && "fill-current")} aria-hidden />
    </button>
  );
}
