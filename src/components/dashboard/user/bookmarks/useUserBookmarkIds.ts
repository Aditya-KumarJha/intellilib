"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

export function useUserBookmarkIds(userId: string | null) {
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBookmarkedIds([]);
      return;
    }

    const { data, error } = await supabase
      .from("bookmarks")
      .select("book_id")
      .eq("user_id", userId);

    if (error) {
      return;
    }

    const nextIds = Array.from(
      new Set(
        (data ?? [])
          .map((row: { book_id: number | null }) => row.book_id)
          .filter((bookId): bookId is number => Number.isFinite(bookId) && Number(bookId) > 0),
      ),
    );

    setBookmarkedIds(nextIds);
  }, [userId]);

  useEffect(() => {
    const refreshHandle = window.setTimeout(() => {
      void refresh();
    }, 0);

    if (!userId) {
      return () => {
        window.clearTimeout(refreshHandle);
      };
    }

    const channel = supabase
      .channel(`bookmarks-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      window.clearTimeout(refreshHandle);
      void supabase.removeChannel(channel);
    };
  }, [refresh, userId]);

  const bookmarkedIdSet = useMemo(() => new Set(bookmarkedIds), [bookmarkedIds]);

  const updateLocal = useCallback((bookId: number, nextBookmarked: boolean) => {
    setBookmarkedIds((prev) => {
      if (nextBookmarked) {
        return prev.includes(bookId) ? prev : [...prev, bookId];
      }

      return prev.filter((id) => id !== bookId);
    });
  }, []);

  return {
    bookmarkedIds,
    bookmarkedIdSet,
    refresh,
    updateLocal,
  };
}
