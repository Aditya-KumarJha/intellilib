"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Info, Search, X, BookOpen } from "lucide-react";
import Dropdown from "@/components/common/Dropdown";
import PaginationControls from "@/components/common/PaginationControls";
import { PopulatedReservation } from "@/lib/server/librarianRequests";

export default function RequestsTable({ initialReservations }: { initialReservations: PopulatedReservation[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
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

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / perPage));

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortBy, initialReservations]);

  const display = filteredRequests.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center justify-between">
        <label className="relative block w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by book, member name, or ID..."
            className="h-12 w-full rounded-2xl border border-black/10 bg-white/70 pl-11 pr-11 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
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
          <Dropdown
            title="Status"
            id="status"
            name="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "waiting", label: "Waiting" },
              { value: "approved", label: "Approved" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />

          <Dropdown
            title="Sort"
            id="sort"
            name="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "latest", label: "Latest" },
              { value: "oldest", label: "Oldest" },
            ]}
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-black/10 text-xs uppercase text-foreground/50 dark:border-white/10">
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Book Title</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Position</th>
              <th className="px-4 py-3 font-semibold">Requested At</th>
            </tr>
          </thead>
          <tbody>
            {display.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-foreground/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Info className="h-6 w-6 opacity-40" />
                    <p>No requests found matching your filters.</p>
                  </div>
                </td>
              </tr>
            ) : (
              display.map((req) => (
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
                      req.status === 'approved' 
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                        : req.status === 'cancelled'
                        ? 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {req.status === 'approved' ? 'Approved' : req.status === 'cancelled' ? 'Cancelled' : 'Waiting'}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex items-center justify-end">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onJump={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
