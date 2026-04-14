import Image from "next/image";
import { AlertTriangle, BookOpen, CalendarClock, Library, Link as LinkIcon } from "lucide-react";

import { formatDate, getDaysLabel, getIssueVisualStatus, formatCurrency } from "@/components/dashboard/user/my-books/my-books-utils";
import type { MyBookIssue } from "@/components/dashboard/user/my-books/types";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";

type MyBookIssueCardProps = {
  issue: MyBookIssue;
};

const statusStyles: Record<"issued" | "returned" | "overdue", string> = {
  issued:
    "border-cyan-400/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
  returned:
    "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  overdue:
    "border-red-400/35 bg-red-500/10 text-red-700 dark:text-red-300",
};

export default function MyBookIssueCard({ issue }: MyBookIssueCardProps) {
  const visualStatus = getIssueVisualStatus(issue);
  const [requestingReturn, setRequestingReturn] = useState(false);
  const hasPendingReturnRequest = Boolean(issue.returnRequestPending);

  async function authedFetch(url: string, init?: RequestInit) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error("Session expired");

    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });

    return res;
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-black/5 sm:h-44 sm:w-32 dark:bg-white/10">
          {issue.book.coverUrl ? (
            <div className="relative h-full w-full">
              <Image
                src={issue.book.coverUrl}
                alt={`${issue.book.title} cover`}
                fill
                sizes="(max-width: 640px) 100vw, 128px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-foreground/45">
              <BookOpen className="h-8 w-8" aria-hidden />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${statusStyles[visualStatus]}`}>
              {visualStatus}
            </span>
            <span className="rounded-full border border-purple-400/35 bg-purple-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
              {issue.copyType}
            </span>
          </div>

          <h3 className="mt-2 truncate text-lg font-semibold tracking-tight text-foreground">{issue.book.title}</h3>
          <p className="text-sm text-foreground/65">by {issue.book.author}</p>

          <div className="mt-4 grid gap-2 text-xs text-foreground/65 sm:grid-cols-2">
            <p className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              Due: {formatDate(issue.dueDate)} ({getDaysLabel(issue)})
            </p>
            <p className="inline-flex items-center gap-1.5">
              <Library className="h-3.5 w-3.5" aria-hidden />
              Issued: {formatDate(issue.issueDate)}
            </p>

            {issue.location ? (
              <p className="inline-flex items-center gap-1.5 sm:col-span-2">
                Shelf: {issue.location}
              </p>
            ) : null}

            {issue.fineAmount > 0 ? (
              issue.finePaid ? (
                <p className="inline-flex items-center gap-2 sm:col-span-2 text-foreground/70">
                  <AlertTriangle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  <span className="line-through text-foreground/60">Fine due: {formatCurrency(issue.fineAmount)}</span>
                  <span className="ml-2 rounded-md bg-emerald-600/10 px-2 py-0.5 text-xs font-medium text-emerald-600">Paid</span>
                  {issue.finePaidAt ? <span className="ml-2 text-xs text-foreground/60">on {formatDate(issue.finePaidAt)}</span> : null}
                </p>
              ) : (
                <p className="inline-flex items-center gap-1.5 sm:col-span-2 text-red-600 dark:text-red-300">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  Fine due: {formatCurrency(issue.fineAmount)}
                </p>
              )
            ) : null}
          </div>

          {issue.accessUrl ? (
            <a
              href={issue.accessUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-black/5 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden />
              Open digital copy
            </a>
          ) : null}

          {/* Actions: Return is request-only and processed by librarian */}
          {(visualStatus === "issued" || visualStatus === "overdue") && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (hasPendingReturnRequest) {
                    toast.info("Return request already in process.");
                    return;
                  }

                  try {
                    setRequestingReturn(true);
                    const res = await authedFetch(`/api/library/returns`, {
                      method: "POST",
                      body: JSON.stringify({ transactionId: issue.id, mode: "request" }),
                    });
                    const payload = await res.json();
                    if (!res.ok) throw new Error(payload?.error ?? "Could not request return");
                    toast.success("Return requested. A librarian will process it shortly.");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : String(e));
                  } finally {
                    setRequestingReturn(false);
                  }
                }}
                disabled={requestingReturn || hasPendingReturnRequest}
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/15"
              >
                {requestingReturn ? "Requesting..." : hasPendingReturnRequest ? "Return in process" : "Request return"}
              </button>

              {hasPendingReturnRequest ? (
                <span className="inline-flex items-center rounded-xl bg-purple-600/10 px-3 py-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                  Waiting for librarian approval
                </span>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
