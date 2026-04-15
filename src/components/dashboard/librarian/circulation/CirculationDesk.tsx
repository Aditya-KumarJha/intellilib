"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, RefreshCcw, Search, X } from "lucide-react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

import type {
  CirculationRow,
  CirculationSummary,
  DeskBook,
  DeskMember,
  PendingReturnRequest,
} from "@/lib/server/librarianCirculation";
import { supabase } from "@/lib/supabaseClient";
import Dropdown from "@/components/common/Dropdown";
import PaginationControls from "@/components/common/PaginationControls";

type Props = {
  summary: CirculationSummary;
  members: DeskMember[];
  books: DeskBook[];
  pendingRequests: PendingReturnRequest[];
  recentRows: CirculationRow[];
};

function shortDate(value: string | null | undefined) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

async function authedFetch(url: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    throw new Error("Session expired. Please log in again.");
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
    const message = String(payload?.error ?? payload?.message ?? "Request failed.");
    throw new Error(message);
  }

  return payload;
}

function statusBadgeClass(status: string) {
  if (status === "returned") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  }
  if (status === "overdue") {
    return "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400";
  }
  return "border-cyan-500/20 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
}

export default function CirculationDesk({
  summary,
  members,
  books,
  pendingRequests,
  recentRows,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState("");
  const [bookId, setBookId] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [showMemberList, setShowMemberList] = useState(false);
  const [showBookList, setShowBookList] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "issued" | "overdue" | "returned">("all");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const statusOptions = [
    { value: "all", label: "All status" },
    { value: "issued", label: "Issued" },
    { value: "overdue", label: "Overdue" },
    { value: "returned", label: "Returned" },
  ];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return recentRows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) {
        return false;
      }

      if (!q) return true;

      return (
        row.userName.toLowerCase().includes(q)
        || row.bookTitle.toLowerCase().includes(q)
        || String(row.id).includes(q)
      );
    });
  }, [recentRows, query, statusFilter]);

  // Pagination for recentRows
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / perPage));

  const display = filteredRows.slice((page - 1) * perPage, page * perPage);

  const filteredMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => m.name.toLowerCase().includes(q) || String(m.id).includes(q));
  }, [members, memberQuery]);

  const filteredBooks = useMemo(() => {
    const q = bookQuery.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || String(b.id).includes(q));
  }, [books, bookQuery]);

  const handleIssue = () => {
    if (!memberId || !bookId) {
      toast.error("Please choose both member and book.");
      return;
    }

    startTransition(async () => {
      try {
        await authedFetch("/api/librarian/issue", {
          method: "POST",
          body: JSON.stringify({ memberId, bookId: Number(bookId) }),
        });
        toast.success("Book issued successfully.");
        setBookId("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not issue book.");
      }
    });
  };

  const handleReturnByRequest = (returnRequestId: number) => {
    startTransition(async () => {
      try {
        await authedFetch("/api/librarian/return", {
          method: "POST",
          body: JSON.stringify({ returnRequestId }),
        });
        toast.success("Return request processed.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not process return request.");
      }
    });
  };

  const handleDirectReturn = (transactionId: number) => {
    startTransition(async () => {
      try {
        await authedFetch("/api/librarian/return", {
          method: "POST",
          body: JSON.stringify({ transactionId }),
        });
        toast.success("Book returned successfully.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not process return.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Issue Book</h4>
            <span className="text-xs text-foreground/55">Live desk action</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 relative">
              <span className="text-xs font-medium text-foreground/65">Member</span>
              <input
                value={(memberQuery || members.find((m) => String(m.id) === memberId)?.name) ?? ""}
                onChange={(e) => {
                  setMemberQuery(e.target.value);
                  setShowMemberList(true);
                }}
                onFocus={() => setShowMemberList(true)}
                onBlur={() => setTimeout(() => setShowMemberList(false), 150)}
                placeholder="Type name or id"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
              />

              {showMemberList && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white/90 py-1 text-sm shadow-lg dark:bg-black/80 divide-y divide-black/5 dark:divide-white/5">
                  <li className="px-3 py-2 text-xs text-foreground/60">{filteredMembers.length} result{filteredMembers.length !== 1 ? "s" : ""}</li>
                  {filteredMembers.length === 0 ? (
                    <li className="px-3 py-3 text-foreground/60">No members match</li>
                  ) : (
                    filteredMembers.map((member) => (
                      <li
                        key={member.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setMemberId(member.id);
                          setMemberQuery(member.name);
                          setShowMemberList(false);
                        }}
                        className={`flex items-center justify-between cursor-pointer px-3 py-3 hover:bg-black/5 dark:hover:bg-white/5 ${String(member.id) === String(memberId) ? 'bg-black/5 dark:bg-white/5' : ''}`}
                      >
                        <span className="truncate">{member.name}</span>
                        <span className="ml-3 text-xs text-foreground/50">#{member.id}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </label>

            <label className="space-y-1 relative">
              <span className="text-xs font-medium text-foreground/65">Book</span>
              <input
                value={(bookQuery || books.find((b) => String(b.id) === bookId)?.title) ?? ""}
                onChange={(e) => {
                  setBookQuery(e.target.value);
                  setShowBookList(true);
                }}
                onFocus={() => setShowBookList(true)}
                onBlur={() => setTimeout(() => setShowBookList(false), 150)}
                placeholder="Type title or author"
                className="h-11 w-full rounded-xl border border-black/10 bg-white/70 px-3 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
              />

              {showBookList && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-white/90 py-1 text-sm shadow-lg dark:bg-black/80 divide-y divide-black/5 dark:divide-white/5">
                  <li className="px-3 py-2 text-xs text-foreground/60">{filteredBooks.length} result{filteredBooks.length !== 1 ? "s" : ""}</li>
                  {filteredBooks.length === 0 ? (
                    <li className="px-3 py-3 text-foreground/60">No books match</li>
                  ) : (
                    filteredBooks.map((book) => (
                      <li
                        key={book.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setBookId(String(book.id));
                          setBookQuery(book.title);
                          setShowBookList(false);
                        }}
                        className={`flex items-center justify-between cursor-pointer px-3 py-3 hover:bg-black/5 dark:hover:bg-white/5 ${String(book.id) === String(bookId) ? 'bg-black/5 dark:bg-white/5' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium">{book.title}</div>
                          <div className="truncate text-xs text-foreground/60">{book.author}</div>
                        </div>
                        <div className="ml-3 shrink-0 text-xs text-foreground/50">{book.availableCopies}</div>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </label>
          </div>

          <button
            type="button"
            onClick={handleIssue}
            disabled={isPending}
            className="mt-4 inline-flex h-10 items-center rounded-xl border border-black/10 bg-white/75 px-4 text-sm font-medium text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            {isPending ? "Processing..." : "Issue now"}
          </button>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Pending Return Requests</h4>
            <span className="text-xs text-foreground/55">{summary.pendingReturns} waiting</span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-black/15 bg-black/5 px-3 py-3 text-sm text-foreground/60 dark:border-white/15 dark:bg-white/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              No pending return requests right now.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingRequests.slice(0, 5).map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{request.bookTitle}</p>
                    <p className="text-xs text-foreground/60">
                      {request.requestedByName} • tx {request.transactionId} • {shortDate(request.requestedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReturnByRequest(request.id)}
                    disabled={isPending}
                    className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white/75 px-3 text-xs font-medium text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Recent Circulation</h4>
            <p className="text-xs text-foreground/60">Latest issues, returns, and overdue records from live transactions.</p>
          </div>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/10 bg-white/75 px-3 text-xs font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center">
          <label className="relative block md:flex-[0.7]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/45" />
            <input
              ref={searchInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by member, title, or transaction id"
              className="h-12 w-full rounded-xl border border-black/10 bg-white/70 pl-10 pr-10 text-sm text-foreground outline-none transition focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-white/10 dark:bg-white/10"
            />

            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                  searchInputRef.current?.focus();
                }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-foreground/60 hover:text-foreground/80"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="w-full md:ml-auto md:w-45">
            <Dropdown
              title="All status"
              options={statusOptions}
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as "all" | "issued" | "overdue" | "returned");
                setPage(1);
              }}
              id="statusFilter"
              name="statusFilter"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-white/5">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-black/10 text-xs uppercase text-foreground/50 dark:border-white/10">
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Issued</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Returned</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {display.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-foreground/55">
                    <div className="inline-flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      No transactions match the selected filters.
                    </div>
                  </td>
                </tr>
              ) : (
                display.map((row) => {
                  const canReturn = row.status === "issued" || row.status === "overdue";

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-black/5 last:border-0 hover:bg-black/5 dark:border-white/5 dark:hover:bg-white/5"
                    >
                      <td className="px-4 py-3">{row.userName}</td>
                      <td className="px-4 py-3">{row.bookTitle}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/70">{shortDate(row.issueDate)}</td>
                      <td className="px-4 py-3 text-foreground/70">{shortDate(row.dueDate)}</td>
                      <td className="px-4 py-3 text-foreground/70">{shortDate(row.returnDate)}</td>
                      <td className="px-4 py-3">
                        {canReturn ? (
                          <button
                            type="button"
                            onClick={() => handleDirectReturn(row.id)}
                            disabled={isPending}
                            className="inline-flex h-8 items-center rounded-lg border border-black/10 bg-white/75 px-3 text-xs font-medium text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
                          >
                            Mark returned
                          </button>
                        ) : (
                          <span className="text-xs text-foreground/50">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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
              onJump={(p: number) => setPage(p)}
              perPage={perPage}
              onPerPageChange={(n: number) => {
                setPerPage(n);
                setPage(1);
              }}
            />
          </div>
      </div>
    </div>
  );
}
