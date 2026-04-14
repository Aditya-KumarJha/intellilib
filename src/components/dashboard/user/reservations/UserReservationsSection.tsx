"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BookMarked, RefreshCcw } from "lucide-react";
import { toast } from "react-toastify";

import ReservationQueueCard from "@/components/dashboard/user/reservations/ReservationQueueCard";
import { mapReservationRow } from "@/components/dashboard/user/reservations/reservation-utils";
import type { ReservationItem, ReservationRow } from "@/components/dashboard/user/reservations/types";
import { supabase } from "@/lib/supabaseClient";

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

export default function UserReservationsSection() {
  const [items, setItems] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [tab, setTab] = useState<"active" | "history">("active");

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authedFetch(`/api/library/reservations?history=${tab === "history" ? "1" : "0"}`);
      const payload = await res.json();

      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not load reservations");
      }

      const rows = (payload?.reservations ?? []) as ReservationRow[];
      setItems(rows.map(mapReservationRow).filter((row): row is ReservationItem => Boolean(row)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  async function cancelReservation(id: number) {
    setBusyId(id);
    try {
      const res = await authedFetch(`/api/library/reservations?id=${id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error ?? "Could not cancel reservation");
      }

      toast.success("Reservation cancelled.");
      await loadReservations();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = useMemo(() => items.filter((item) => item.status === "waiting" || item.status === "approved").length, [items]);

  return (
    <div className="mx-auto space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Reservations</h2>
          <p className="mt-1 text-sm text-foreground/65">Track your queue positions and collect approved books before the hold window closes.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadReservations();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/70 p-3 text-xs dark:border-white/10 dark:bg-white/10">
        <div className="inline-flex rounded-xl bg-black/5 p-1 dark:bg-white/10">
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`rounded-lg px-3 py-1.5 ${tab === "active" ? "bg-white text-black" : "text-foreground/70"}`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            className={`rounded-lg px-3 py-1.5 ${tab === "history" ? "bg-white text-black" : "text-foreground/70"}`}
          >
            History
          </button>
        </div>

        <p className="text-foreground/70">{activeCount} active reservations</p>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-3xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-black/20 bg-black/5 px-6 py-8 text-center dark:border-white/15 dark:bg-white/5">
          <BookMarked className="mx-auto h-8 w-8 text-foreground/40" />
          <p className="mt-3 text-sm font-medium text-foreground/70">No reservations yet.</p>
          <p className="mt-1 text-xs text-foreground/55">Reserve unavailable physical books from Smart Search.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {items.map((item) => (
            <ReservationQueueCard
              key={item.id}
              item={item}
              onCancel={cancelReservation}
              busy={busyId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
