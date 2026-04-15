"use client";

import { useMemo, useState, useRef, useTransition } from "react";
import { CheckCircle2, Info, Search, ShieldX, X, BookOpen } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Dropdown from "@/components/common/Dropdown";
import PaginationControls from "@/components/common/PaginationControls";
import { PopulatedReservation } from "@/lib/server/librarianRequests";
import type { PendingReturnRequest } from "@/lib/server/librarianCirculation";
import { supabase } from "@/lib/supabaseClient";

type RequestsTableProps = {
  initialReservations: PopulatedReservation[];
  pendingReturnRequests: PendingReturnRequest[];
};

async function authedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Session expired. Please sign in again.");
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(String(payload?.error ?? payload?.message ?? "Request failed."));
  }

  return payload;
}

export default function RequestsTable({ initialReservations, pendingReturnRequests }: RequestsTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [activeTab, setActiveTab] = useState<"reservations" | "returns">("reservations");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const shortDate = (d?: string | null) => {
    if (!d) return "-";
    try {
      return new Date(d).toLocaleString("en-IN", { 
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short"
      });
    } catch {
      return d;
    }
  };

  const filteredRequests = useMemo(() => {
    let result = [...initialReservations];

    if (statusFilter !== "all") {
      result = result.filter((req) => req.status === statusFilter);
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (req) =>
          req.book_title?.toLowerCase().includes(q) ||
          req.user_display_name?.toLowerCase().includes(q) ||
          String(req.id).includes(q)
      );
    }

    result.sort((a, b) => {
      const tA = new Date(a.created_at).getTime();
      const tB = new Date(b.created_at).getTime();
      
      if (sortBy === "latest") return tB - tA;
      if (sortBy === "oldest") return tA - tB;
      return 0;
    });

    return result;
  }, [initialReservations, query, statusFilter, sortBy]);

  const filteredReturnRequests = useMemo(() => {
    let result = [...pendingReturnRequests];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (req) =>
          req.bookTitle.toLowerCase().includes(q)
          || req.requestedByName.toLowerCase().includes(q)
          || String(req.id).includes(q)
          || String(req.transactionId).includes(q),
      );
    }

    result.sort((a, b) => {
      const tA = new Date(a.requestedAt ?? "").getTime();
      const tB = new Date(b.requestedAt ?? "").getTime();

      if (sortBy === "latest") return tB - tA;
      if (sortBy === "oldest") return tA - tB;
      return 0;
    });

    return result;
  }, [pendingReturnRequests, query, sortBy]);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const sourceRows = activeTab === "reservations" ? filteredRequests : filteredReturnRequests;
  const totalPages = Math.max(1, Math.ceil(sourceRows.length / perPage));

  const displayReservations = filteredRequests.slice((page - 1) * perPage, page * perPage);
  const displayReturnRequests = filteredReturnRequests.slice((page - 1) * perPage, page * perPage);

  const runAction = (task: () => Promise<unknown>, successMessage: string) => {
    startTransition(async () => {
      try {
        await task();
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not complete request action.");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <label className="relative block w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setPage(1);
              setQuery(event.target.value);
            }}
            placeholder="Search by book, member name, or ID..."
            className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setQuery("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/60 hover:text-foreground/80"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </label>

        <div className="grid grid-cols-2 gap-3 w-full md:w-90">
          {activeTab === "reservations" ? (
            <Dropdown
              title="Status"
              id="status"
              name="status"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value);
              }}
              options={[
                { value: "all", label: "All Status" },
                { value: "waiting", label: "Waiting" },
                { value: "approved", label: "Approved" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          ) : (
            <div className="flex items-end">
              <div className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-3 text-xs text-foreground/60 dark:border-white/10 dark:bg-white/10">
                Pending-only moderation queue
              </div>
            </div>
          )}

          <Dropdown
            title="Sort"
            id="sort"
            name="sort"
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value);
            }}
            options={[
              { value: "latest", label: "Latest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setActiveTab("reservations");
          }}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            activeTab === "reservations"
              ? "bg-purple-600 text-white"
              : "border border-black/10 bg-white/70 text-foreground/70 dark:border-white/10 dark:bg-white/10"
          }`}
        >
          Reservation Queue ({initialReservations.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setPage(1);
            setActiveTab("returns");
          }}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            activeTab === "returns"
              ? "bg-purple-600 text-white"
              : "border border-black/10 bg-white/70 text-foreground/70 dark:border-white/10 dark:bg-white/10"
          }`}
        >
          Return Requests ({pendingReturnRequests.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
        {activeTab === "reservations" ? (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase text-foreground/50 dark:border-white/10">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Book Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Position</th>
                <th className="px-4 py-3 font-semibold">Requested At</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayReservations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-foreground/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="h-6 w-6 opacity-40" />
                      <p>No requests found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayReservations.map((req) => (
                  <tr key={req.id} className="border-b border-black/5 last:border-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {req.user_avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={req.user_avatar}
                            alt="avatar"
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-black/10 dark:bg-white/10" />
                        )}
                        <span className="font-medium text-foreground">{req.user_display_name ?? req.user_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-foreground/50" />
                        <span className="truncate max-w-50">{req.book_title ?? `ID: ${req.book_id}`}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        req.status === "approved"
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : req.status === "cancelled"
                          ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                          : "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        {req.status === "approved" ? "Approved" : req.status === "cancelled" ? "Cancelled" : "Waiting"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {req.queue_position ? (
                        <span className="font-medium text-foreground">#{req.queue_position}</span>
                      ) : (
                        <span className="text-foreground/50">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground/70">
                      {shortDate(req.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {["waiting", "approved"].includes(req.status) ? (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => runAction(
                              () =>
                                authedFetch("/api/librarian/requests", {
                                  method: "POST",
                                  body: JSON.stringify({
                                    action: "cancel_reservation",
                                    reservationId: req.id,
                                  }),
                                }),
                              "Reservation cancelled.",
                            )}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/15 disabled:opacity-60 dark:text-red-400"
                          >
                            <ShieldX className="h-3.5 w-3.5" />
                            Cancel
                          </button>
                        ) : (
                          <span className="text-xs text-foreground/45">No action</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase text-foreground/50 dark:border-white/10">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Book</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
                <th className="px-4 py-3 font-semibold">Requested At</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayReturnRequests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-foreground/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Info className="h-6 w-6 opacity-40" />
                      <p>No return requests found matching your filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayReturnRequests.map((req) => (
                  <tr key={req.id} className="border-b border-black/5 last:border-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5 transition">
                    <td className="px-4 py-3 font-medium text-foreground">{req.requestedByName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-foreground/50" />
                        <span className="truncate max-w-50">{req.bookTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground/70">{shortDate(req.dueDate)}</td>
                    <td className="px-4 py-3 text-foreground/70">{shortDate(req.requestedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runAction(
                            () =>
                              authedFetch("/api/librarian/return", {
                                method: "POST",
                                body: JSON.stringify({ returnRequestId: req.id }),
                              }),
                            "Return request approved.",
                          )}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-500/15 disabled:opacity-60 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runAction(
                            () =>
                              authedFetch("/api/librarian/requests", {
                                method: "POST",
                                body: JSON.stringify({
                                  action: "reject_return_request",
                                  returnRequestId: req.id,
                                }),
                              }),
                            "Return request rejected.",
                          )}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-500/15 disabled:opacity-60 dark:text-red-400"
                        >
                          <ShieldX className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
      <div className="mt-2 flex items-center justify-end">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onJump={(p: number) => setPage(p)}
          perPage={perPage}
          onPerPageChange={(n: number) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>
    </div>
  );
}
