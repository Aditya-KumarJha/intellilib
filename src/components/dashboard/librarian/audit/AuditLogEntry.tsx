"use client";

import React from "react";
import { format } from "date-fns";

type AuditMetadata = Record<string, unknown> | string | null;

export type AuditRow = {
  id: string | number;
  action?: string | null;
  entity?: string | null;
  entity_id?: number | null;
  actor?: string | null;
  metadata?: AuditMetadata;
  created_at?: string | null;
};

function prettyMetadata(metadata: AuditMetadata | undefined): Record<string, unknown> | string | null {
  if (!metadata) return null;
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata) as unknown;
      return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : metadata;
    } catch {
      return metadata;
    }
  }

  return metadata;
}

function metadataActor(metadata: Record<string, unknown> | string | null): string | null {
  if (!metadata || typeof metadata === "string") {
    return null;
  }

  const actor = metadata.actor ?? metadata.user ?? metadata.provider;
  return typeof actor === "string" ? actor : null;
}

function metadataDisplay(metadata: Record<string, unknown> | string) {
  return typeof metadata === "string" ? metadata : JSON.stringify(metadata, null, 2);
}

export default function AuditLogEntry({ a }: { a: AuditRow }) {
  const meta = prettyMetadata(a.metadata);
  const actor = a.actor ?? metadataActor(meta) ?? "System";

  return (
    <div className="rounded-lg border border-black/6 bg-white/60 p-3 dark:border-white/6 dark:bg-white/3">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{a.action ?? a.entity ?? "Event"}</p>
            <p className="mt-1 text-xs text-foreground/65">{actor}</p>
          </div>
          <div className="text-right text-xs text-foreground/55">
            {a.created_at ? <div>{format(new Date(a.created_at), "PPpp")}</div> : <div>—</div>}
          </div>
        </div>

        {a.entity || a.entity_id ? (
          <div className="text-xs text-foreground/60">{a.entity}{a.entity_id ? ` • ${a.entity_id}` : ""}</div>
        ) : null}

        {meta ? (
          <pre className="mt-2 max-h-36 overflow-auto rounded-md bg-black/3 p-2 text-xs text-foreground/60 dark:bg-white/3">
            {metadataDisplay(meta)}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
