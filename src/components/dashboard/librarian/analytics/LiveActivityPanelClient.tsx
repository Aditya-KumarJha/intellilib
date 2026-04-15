"use client";

import React, { useState } from "react";
import PaginationControls from "@/components/common/PaginationControls";
import type { getRecentTransactions } from "@/lib/server/adminAnalytics";

function shortDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return d as string;
  }
}

type RecentTransactionRow = Awaited<ReturnType<typeof getRecentTransactions>>[number];

export default function LiveActivityPanelClient({ initialTx }: { initialTx: RecentTransactionRow[] }) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const totalPages = Math.max(1, Math.ceil((initialTx?.length ?? 0) / perPage));

  const display = (initialTx ?? []).slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <p className="mb-4 text-sm text-foreground/60">This area shows the most recent transactions and workflow events.</p>
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white/60 dark:border-white/10 dark:bg-white/5">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-foreground/50">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Tx ID</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Copy</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {display.map((transaction) => (
              <tr key={transaction.id} className="border-t border-black/5 dark:border-white/5">
                <td className="px-4 py-3">{shortDate(transaction.created_at)}</td>
                <td className="px-4 py-3">{transaction.id}</td>
                <td className="px-4 py-3 wrap-break-word max-w-xs">
                  <div className="flex items-center gap-2">
                    {transaction.user_avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={transaction.user_avatar} alt="avatar" className="h-6 w-6 rounded-full" />
                    ) : null}
                    <span>{transaction.user_display_name ?? transaction.user_id}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{transaction.book_title ?? `copy:${transaction.book_copy_id}`}</td>
                <td className="px-4 py-3">{String(transaction.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex items-center justify-end">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          perPage={perPage}
          onJump={(p: number) => setPage(p)}
          onPerPageChange={(n: number) => {
            setPerPage(n);
            setPage(1);
          }}
        />
      </div>
    </>
  );
}
