"use client";

import { useEffect, useState } from "react";
import AuditLogEntry from "./AuditLogEntry";
import PaginationControls from "@/components/common/PaginationControls";

export default function AuditLogSectionClient({ initialRows }: { initialRows: any[] }) {
  const [page, setPage] = useState(1);
  const perPage = 10;
  const totalPages = Math.max(1, Math.ceil((initialRows?.length ?? 0) / perPage));

  useEffect(() => {
    setPage(1);
  }, [initialRows]);

  const display = (initialRows ?? []).slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {display.length === 0 ? (
          <div className="rounded-lg border border-black/6 bg-white/60 p-6 text-center text-sm text-foreground/60 dark:border-white/6 dark:bg-white/3">
            No audit events found.
          </div>
        ) : (
          display.map((a) => <AuditLogEntry key={a.id} a={a} />)
        )}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          onPrev={() => setPage((p) => Math.max(1, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
          onJump={(p) => setPage(p)}
        />
      </div>
    </>
  );
}
