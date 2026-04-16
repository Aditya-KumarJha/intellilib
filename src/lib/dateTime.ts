const TZ_SUFFIX_PATTERN = /(Z|[+-]\d{2}:\d{2})$/i;

export function normalizeDbTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  return TZ_SUFFIX_PATTERN.test(value) ? value : `${value}Z`;
}

export function dbTimestampToEpochMs(value: string | null | undefined): number | null {
  const normalized = normalizeDbTimestamp(value);
  if (!normalized) return null;

  const ms = new Date(normalized).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isDbTimestampPast(value: string | null | undefined, nowMs = Date.now()): boolean {
  const dueMs = dbTimestampToEpochMs(value);
  if (dueMs == null) return false;
  return dueMs < nowMs;
}

export function formatDbTimestampIST(value: string | null | undefined): string {
  const normalized = normalizeDbTimestamp(value);
  if (!normalized) return "-";

  return new Date(normalized).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
