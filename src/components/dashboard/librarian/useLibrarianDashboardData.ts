"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/lib/supabaseClient";

export type LibrarianTone = "red" | "orange" | "yellow" | "blue";

export type LibrarianMetricItem = {
  label: string;
  value: string;
};

export type LibrarianActionItem = {
  label: string;
  value: string;
  tone: LibrarianTone;
};

export type LiveActivityType = "issue" | "return" | "payment" | "request";

export type LibrarianLiveActivityItem = {
  event: string;
  time: string;
  type: LiveActivityType;
};

export type LibrarianSnapshotItem = {
  label: string;
  value: string;
  hint: string;
};

export type LibrarianMiniTrends = {
  labels: string[];
  loans: number[];
  requests: number[];
  fines: number[];
};

export type LibrarianNotificationPreview = {
  title: string;
  description: string;
};

export type LibrarianDashboardData = {
  kpis: LibrarianMetricItem[];
  actionRequired: LibrarianActionItem[];
  liveActivity: LibrarianLiveActivityItem[];
  inventorySnapshot: LibrarianSnapshotItem[];
  memberInsights: LibrarianSnapshotItem[];
  financialSnapshot: LibrarianSnapshotItem[];
  systemEfficiency: LibrarianSnapshotItem[];
  miniTrends: LibrarianMiniTrends;
  notificationsPreview: LibrarianNotificationPreview[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function asNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

function formatCurrency(value: number) {
  return `INR ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value)))}`;
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return "--";
  }

  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatTimeAgo(iso: string | null | undefined) {
  if (!iso) {
    return "just now";
  }

  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) {
    return "just now";
  }

  const diffMs = Date.now() - ts;
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d ago`;
}

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDayLabels(days = 7) {
  const now = startOfDay();
  const labels: string[] = [];
  const keys: string[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * DAY_MS);
    labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    keys.push(d.toISOString().slice(0, 10));
  }

  return { labels, keys };
}

function median(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
}

function createInitialData(): LibrarianDashboardData {
  return {
    kpis: [
      { label: "Desk queue", value: "--" },
      { label: "Issues today", value: "--" },
      { label: "Returns today", value: "--" },
    ],
    actionRequired: [
      { label: "Overdue > 7 days", value: "--", tone: "red" },
      { label: "Pending approvals", value: "--", tone: "orange" },
      { label: "Failed transactions", value: "--", tone: "yellow" },
      { label: "Unprocessed returns", value: "--", tone: "blue" },
    ],
    liveActivity: [
      { event: "Recent issue activity", time: "--", type: "issue" },
      { event: "Recent return activity", time: "--", type: "return" },
      { event: "Recent payment activity", time: "--", type: "payment" },
      { event: "Recent request activity", time: "--", type: "request" },
    ],
    inventorySnapshot: [
      { label: "Available books %", value: "--", hint: "Healthy shelf coverage" },
      { label: "Reserved books", value: "--", hint: "Awaiting pickup or issue" },
      { label: "Low stock titles", value: "--", hint: "Needs procurement follow-up" },
      { label: "Newly added books", value: "--", hint: "Added in last 7 days" },
    ],
    memberInsights: [
      { label: "Active users today", value: "--", hint: "At least one issue/return" },
      { label: "New registrations", value: "--", hint: "Joined in last 24 hours" },
      { label: "Top borrowers", value: "--", hint: "Highest loan volume this week" },
      { label: "Suspicious activity", value: "--", hint: "Unusual rapid transactions" },
    ],
    financialSnapshot: [
      { label: "Fines collected today", value: "--", hint: "Successful collections today" },
      { label: "Pending fines", value: "--", hint: "Needs reminder push" },
      { label: "Failed payments", value: "--", hint: "Payment retries required" },
      { label: "Avg fine value", value: "--", hint: "Across paid transactions today" },
    ],
    systemEfficiency: [
      { label: "Avg issue time", value: "--", hint: "Reservation to issue completion" },
      { label: "Avg return processing", value: "--", hint: "Request to approval/rejection" },
      { label: "Queue speed", value: "--", hint: "Current day throughput" },
      { label: "Turnaround time", value: "--", hint: "Issue to return median" },
    ],
    miniTrends: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      loans: [0, 0, 0, 0, 0, 0, 0],
      requests: [0, 0, 0, 0, 0, 0, 0],
      fines: [0, 0, 0, 0, 0, 0, 0],
    },
    notificationsPreview: [
      {
        title: "Pending approvals",
        description: "Live approval queue is loading.",
      },
      {
        title: "Reservation available",
        description: "Pickup-ready reservations are loading.",
      },
      {
        title: "Payment alerts",
        description: "Payment failure alerts are loading.",
      },
    ],
  };
}

type TransactionWithBook = {
  issue_date: string | null;
  return_date?: string | null;
  user_id?: string | null;
  book_copies?: { books?: { title?: string | null } | null } | null;
};

type ReservationWithBook = {
  created_at: string | null;
  user_id?: string | null;
  book_id?: number | null;
  books?: { title?: string | null } | null;
};

async function fetchLibrarianDashboardData(): Promise<LibrarianDashboardData> {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayStartIso = dayStart.toISOString();
  const dayStartMinus7Iso = new Date(dayStart.getTime() - 7 * DAY_MS).toISOString();
  const dayStartMinus14Iso = new Date(dayStart.getTime() - 14 * DAY_MS).toISOString();
  const dayStartMinus30Iso = new Date(dayStart.getTime() - 30 * DAY_MS).toISOString();

  const [
    pendingReservationsRes,
    pendingReturnRequestsRes,
    issuesTodayRes,
    returnsTodayRes,
    overdueLongRes,
    failedPaymentsRes,
    latestIssueRes,
    latestReturnRes,
    latestPaymentRes,
    latestReservationRes,
    booksTotalsRes,
    reservedBooksRes,
    lowStockTitlesRes,
    newBooksRes,
    issueUsersTodayRes,
    returnUsersTodayRes,
    recentIssuesRes,
    registrationsRes,
    topBorrowersRowsRes,
    finesPaidTodayRes,
    pendingFinesRes,
    failedPaymentsTodayRes,
    recentReturnedRes,
    processedReturnReqRes,
    completedReservationsRes,
    issueForCompletedReservationsRes,
    issuesLast7dRes,
    reservationsLast7dRes,
    finesLast7dRes,
    approvedReservationsRes,
  ] = await Promise.all([
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "waiting"),
    supabase.from("return_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("transactions").select("id", { count: "exact", head: true }).gte("issue_date", dayStartIso),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .not("return_date", "is", null)
      .gte("return_date", dayStartIso),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .is("return_date", null)
      .lt("due_date", dayStartMinus7Iso),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed"),
    supabase
      .from("transactions")
      .select("issue_date,book_copies(books(title))")
      .gte("issue_date", dayStartMinus14Iso)
      .order("issue_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("return_date,book_copies(books(title))")
      .not("return_date", "is", null)
      .gte("return_date", dayStartMinus14Iso)
      .order("return_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("amount,created_at")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reservations")
      .select("created_at,books(title)")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("books").select("total_copies,available_copies"),
    supabase.from("reservations").select("id", { count: "exact", head: true }).in("status", ["waiting", "approved"]),
    supabase.from("books").select("id", { count: "exact", head: true }).gt("total_copies", 0).lte("available_copies", 1),
    supabase.from("books").select("id", { count: "exact", head: true }).gte("created_at", dayStartMinus7Iso),
    supabase.from("transactions").select("user_id").gte("issue_date", dayStartIso),
    supabase.from("transactions").select("user_id").not("return_date", "is", null).gte("return_date", dayStartIso),
    supabase.from("transactions").select("user_id").gte("issue_date", dayStartIso),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", dayStartIso),
    supabase.from("transactions").select("user_id").gte("issue_date", dayStartMinus7Iso),
    supabase.from("fines").select("amount").not("paid_at", "is", null).gte("paid_at", dayStartIso),
    supabase.from("fines").select("amount").is("paid_at", null),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", dayStartIso),
    supabase
      .from("transactions")
      .select("issue_date,return_date")
      .not("return_date", "is", null)
      .gte("return_date", dayStartMinus30Iso),
    supabase
      .from("return_requests")
      .select("requested_at,processed_at")
      .in("status", ["approved", "rejected"])
      .not("processed_at", "is", null)
      .gte("requested_at", dayStartMinus30Iso),
    supabase
      .from("reservations")
      .select("user_id,book_id,created_at")
      .eq("status", "completed")
      .gte("created_at", dayStartMinus14Iso),
    supabase
      .from("transactions")
      .select("user_id,issue_date,book_copies(book_id)")
      .gte("issue_date", dayStartMinus14Iso),
    supabase.from("transactions").select("issue_date").gte("issue_date", dayStartMinus7Iso),
    supabase.from("reservations").select("created_at").gte("created_at", dayStartMinus7Iso),
    supabase.from("fines").select("paid_at,amount").not("paid_at", "is", null).gte("paid_at", dayStartMinus7Iso),
    supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "approved"),
  ]);

  const pendingReservations = asNumber(pendingReservationsRes.count);
  const pendingReturnRequests = asNumber(pendingReturnRequestsRes.count);
  const issuesToday = asNumber(issuesTodayRes.count);
  const returnsToday = asNumber(returnsTodayRes.count);
  const overdueLong = asNumber(overdueLongRes.count);
  const failedPayments = asNumber(failedPaymentsRes.count);

  const books = Array.isArray(booksTotalsRes.data)
    ? booksTotalsRes.data
    : [];
  const totalCopies = books.reduce((sum, row) => sum + asNumber(row.total_copies), 0);
  const availableCopies = books.reduce((sum, row) => sum + asNumber(row.available_copies), 0);
  const availablePercent = totalCopies > 0 ? Math.round((availableCopies / totalCopies) * 100) : 0;

  const issueUsersToday = Array.isArray(issueUsersTodayRes.data) ? issueUsersTodayRes.data : [];
  const returnUsersToday = Array.isArray(returnUsersTodayRes.data) ? returnUsersTodayRes.data : [];
  const activeUsersToday = new Set(
    [...issueUsersToday, ...returnUsersToday]
      .map((row) => row.user_id)
      .filter((v): v is string => typeof v === "string" && v.length > 0),
  ).size;

  const recentIssuesRows = Array.isArray(recentIssuesRes.data) ? recentIssuesRes.data : [];
  const weeklyBorrowerRows = Array.isArray(topBorrowersRowsRes.data) ? topBorrowersRowsRes.data : [];

  const todayIssueCountByUser = new Map<string, number>();
  for (const row of recentIssuesRows) {
    const userId = row.user_id;
    if (!userId) {
      continue;
    }
    todayIssueCountByUser.set(userId, (todayIssueCountByUser.get(userId) ?? 0) + 1);
  }

  const issueCountByUser = new Map<string, number>();
  for (const row of weeklyBorrowerRows) {
    const userId = row.user_id;
    if (!userId) {
      continue;
    }
    issueCountByUser.set(userId, (issueCountByUser.get(userId) ?? 0) + 1);
  }

  const suspiciousUsers = Array.from(todayIssueCountByUser.values()).filter((count) => count >= 5).length;

  const topBorrowerIds = Array.from(issueCountByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([userId]) => userId);

  let topBorrowers = "No active borrowers";
  if (topBorrowerIds.length > 0) {
    const topProfilesRes = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", topBorrowerIds);

    const profiles = Array.isArray(topProfilesRes.data) ? topProfilesRes.data : [];
    const namesById = new Map<string, string>();
    for (const profile of profiles) {
      if (profile.id) {
        namesById.set(profile.id, profile.full_name ?? "Member");
      }
    }

    const names = topBorrowerIds.map((id) => namesById.get(id) ?? "Member");
    topBorrowers = names.join(", ");
  }

  const finesPaidToday = Array.isArray(finesPaidTodayRes.data)
    ? finesPaidTodayRes.data.reduce((sum, row) => sum + asNumber(row.amount), 0)
    : 0;
  const paidFineCount = Array.isArray(finesPaidTodayRes.data) ? finesPaidTodayRes.data.length : 0;

  const pendingFineAmount = Array.isArray(pendingFinesRes.data)
    ? pendingFinesRes.data.reduce((sum, row) => sum + asNumber(row.amount), 0)
    : 0;

  const failedPaymentsToday = asNumber(failedPaymentsTodayRes.count);
  const avgFineValueToday = paidFineCount > 0 ? Math.round(finesPaidToday / paidFineCount) : 0;

  const recentReturnedRows = Array.isArray(recentReturnedRes.data)
    ? recentReturnedRes.data
    : [];
  const loanDurations = recentReturnedRows
    .map((row) => {
      const issueTs = Date.parse(String(row.issue_date ?? ""));
      const returnTs = Date.parse(String(row.return_date ?? ""));
      if (Number.isNaN(issueTs) || Number.isNaN(returnTs) || returnTs <= issueTs) {
        return 0;
      }
      return returnTs - issueTs;
    })
    .filter((ms) => ms > 0);

  const turnaroundMedian = median(loanDurations);

  const processedReturnRows = Array.isArray(processedReturnReqRes.data)
    ? processedReturnReqRes.data
    : [];
  const returnProcessingDurations = processedReturnRows
    .map((row) => {
      const requestedTs = Date.parse(String(row.requested_at ?? ""));
      const processedTs = Date.parse(String(row.processed_at ?? ""));
      if (Number.isNaN(requestedTs) || Number.isNaN(processedTs) || processedTs <= requestedTs) {
        return 0;
      }
      return processedTs - requestedTs;
    })
    .filter((ms) => ms > 0);

  const avgReturnProcessing =
    returnProcessingDurations.length > 0
      ? returnProcessingDurations.reduce((sum, value) => sum + value, 0) / returnProcessingDurations.length
      : 0;

  const completedReservations = Array.isArray(completedReservationsRes.data)
    ? (completedReservationsRes.data as ReservationWithBook[])
    : [];
  const issueRowsForCompleted = Array.isArray(issueForCompletedReservationsRes.data)
    ? (issueForCompletedReservationsRes.data as Array<{
        user_id: string | null;
        issue_date: string | null;
        book_copies: { book_id?: number | null } | null;
      }>)
    : [];

  const issueLeadTimes: number[] = [];

  for (const reservation of completedReservations) {
    const reservationUser = reservation.user_id;
    const reservationBookId = reservation.book_id;
    const reservationTs = Date.parse(String(reservation.created_at ?? ""));

    if (!reservationUser || !reservationBookId || Number.isNaN(reservationTs)) {
      continue;
    }

    const matchingIssues = issueRowsForCompleted
      .filter((issue) => {
        if (!issue.user_id || issue.user_id !== reservationUser) {
          return false;
        }
        const issueBookId = issue.book_copies?.book_id;
        if (!issueBookId || issueBookId !== reservationBookId) {
          return false;
        }

        const issueTs = Date.parse(String(issue.issue_date ?? ""));
        return !Number.isNaN(issueTs) && issueTs >= reservationTs;
      })
      .map((issue) => Date.parse(String(issue.issue_date ?? "")))
      .filter((issueTs) => !Number.isNaN(issueTs));

    if (matchingIssues.length === 0) {
      continue;
    }

    const firstIssueTs = Math.min(...matchingIssues);
    if (firstIssueTs > reservationTs) {
      issueLeadTimes.push(firstIssueTs - reservationTs);
    }
  }

  const avgIssueLeadTime =
    issueLeadTimes.length > 0
      ? issueLeadTimes.reduce((sum, value) => sum + value, 0) / issueLeadTimes.length
      : 0;

  const elapsedDayHours = Math.max(1, (Date.now() - dayStart.getTime()) / (60 * 60 * 1000));
  const queueSpeed = (issuesToday + returnsToday) / elapsedDayHours;

  const latestIssue = latestIssueRes.data as TransactionWithBook | null;
  const latestReturn = latestReturnRes.data as TransactionWithBook | null;
  const latestPayment = latestPaymentRes.data as { amount?: number | null; created_at?: string | null } | null;
  const latestReservation = latestReservationRes.data as ReservationWithBook | null;

  const { labels, keys } = buildDayLabels(7);
  const issuesLast7Rows = Array.isArray(issuesLast7dRes.data) ? issuesLast7dRes.data : [];
  const reservationsLast7Rows = Array.isArray(reservationsLast7dRes.data) ? reservationsLast7dRes.data : [];
  const finesLast7Rows = Array.isArray(finesLast7dRes.data) ? finesLast7dRes.data : [];

  const loansByDay = new Map<string, number>();
  const requestsByDay = new Map<string, number>();
  const finesByDay = new Map<string, number>();

  for (const row of issuesLast7Rows) {
    const key = String(row.issue_date ?? "").slice(0, 10);
    if (!key) continue;
    loansByDay.set(key, (loansByDay.get(key) ?? 0) + 1);
  }

  for (const row of reservationsLast7Rows) {
    const key = String(row.created_at ?? "").slice(0, 10);
    if (!key) continue;
    requestsByDay.set(key, (requestsByDay.get(key) ?? 0) + 1);
  }

  for (const row of finesLast7Rows) {
    const key = String(row.paid_at ?? "").slice(0, 10);
    if (!key) continue;
    finesByDay.set(key, (finesByDay.get(key) ?? 0) + asNumber(row.amount));
  }

  const loansTrend = keys.map((key) => loansByDay.get(key) ?? 0);
  const requestsTrend = keys.map((key) => requestsByDay.get(key) ?? 0);
  const finesTrend = keys.map((key) => Math.round(finesByDay.get(key) ?? 0));

  const registrationsToday = asNumber(registrationsRes.count);

  return {
    kpis: [
      { label: "Desk queue", value: formatCount(pendingReservations + pendingReturnRequests) },
      { label: "Issues today", value: formatCount(issuesToday) },
      { label: "Returns today", value: formatCount(returnsToday) },
    ],
    actionRequired: [
      { label: "Overdue > 7 days", value: formatCount(overdueLong), tone: "red" },
      { label: "Pending approvals", value: formatCount(pendingReservations), tone: "orange" },
      { label: "Failed transactions", value: formatCount(failedPayments), tone: "yellow" },
      { label: "Unprocessed returns", value: formatCount(pendingReturnRequests), tone: "blue" },
    ],
    liveActivity: [
      {
        event: latestIssue?.book_copies?.books?.title
          ? `Book issued -> ${latestIssue.book_copies.books.title}`
          : "No recent issue event",
        time: formatTimeAgo(latestIssue?.issue_date ?? null),
        type: "issue",
      },
      {
        event: latestReturn?.book_copies?.books?.title
          ? `Book returned -> ${latestReturn.book_copies.books.title}`
          : "No recent return event",
        time: formatTimeAgo(latestReturn?.return_date ?? null),
        type: "return",
      },
      {
        event: latestPayment?.amount
          ? `Fine paid -> ${formatCurrency(asNumber(latestPayment.amount))}`
          : "No recent payment event",
        time: formatTimeAgo(latestPayment?.created_at ?? null),
        type: "payment",
      },
      {
        event: latestReservation?.books?.title
          ? `Reservation request -> ${latestReservation.books.title}`
          : "No recent request event",
        time: formatTimeAgo(latestReservation?.created_at ?? null),
        type: "request",
      },
    ],
    inventorySnapshot: [
      {
        label: "Available books %",
        value: `${availablePercent}%`,
        hint: `${formatCount(availableCopies)} of ${formatCount(totalCopies)} copies currently available`,
      },
      {
        label: "Reserved books",
        value: formatCount(asNumber(reservedBooksRes.count)),
        hint: "Awaiting pickup or issue",
      },
      {
        label: "Low stock titles",
        value: formatCount(asNumber(lowStockTitlesRes.count)),
        hint: "Needs procurement follow-up",
      },
      {
        label: "Newly added books",
        value: formatCount(asNumber(newBooksRes.count)),
        hint: "Added in last 7 days",
      },
    ],
    memberInsights: [
      {
        label: "Active users today",
        value: formatCount(activeUsersToday),
        hint: "At least one issue/return",
      },
      {
        label: "New registrations",
        value: formatCount(registrationsToday),
        hint: "Joined in last 24 hours",
      },
      {
        label: "Top borrowers",
        value: topBorrowers,
        hint: "Highest loan volume this week",
      },
      {
        label: "Suspicious activity",
        value: `${formatCount(suspiciousUsers)} flags`,
        hint: "Unusual rapid transactions",
      },
    ],
    financialSnapshot: [
      {
        label: "Fines collected today",
        value: formatCurrency(finesPaidToday),
        hint: `${formatCount(paidFineCount)} successful collections`,
      },
      {
        label: "Pending fines",
        value: formatCurrency(pendingFineAmount),
        hint: "Needs reminder push",
      },
      {
        label: "Failed payments",
        value: formatCount(failedPaymentsToday),
        hint: "Failed payment attempts today",
      },
      {
        label: "Avg fine value",
        value: formatCurrency(avgFineValueToday),
        hint: "Across paid transactions today",
      },
    ],
    systemEfficiency: [
      {
        label: "Avg issue time",
        value: formatDuration(avgIssueLeadTime),
        hint: "Reservation to issue completion",
      },
      {
        label: "Avg return processing",
        value: formatDuration(avgReturnProcessing),
        hint: "Request to approval/rejection",
      },
      {
        label: "Queue speed",
        value: `${queueSpeed.toFixed(1)} req/hr`,
        hint: "Current day throughput",
      },
      {
        label: "Turnaround time",
        value: formatDuration(turnaroundMedian),
        hint: "Issue to return median",
      },
    ],
    miniTrends: {
      labels,
      loans: loansTrend,
      requests: requestsTrend,
      fines: finesTrend,
    },
    notificationsPreview: [
      {
        title: "Pending approvals",
        description: `${formatCount(pendingReservations)} reservation approvals waiting for review.`,
      },
      {
        title: "Reservation available",
        description: `${formatCount(asNumber(approvedReservationsRes.count))} reservations are approved for pickup flow.`,
      },
      {
        title: "Payment alerts",
        description: `${formatCount(failedPaymentsToday)} failed payments detected today.`,
      },
    ],
  };
}

export function useLibrarianDashboardData() {
  const initial = useMemo(() => createInitialData(), []);
  const [data, setData] = useState<LibrarianDashboardData>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await fetchLibrarianDashboardData();
      setData(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load librarian dashboard data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, 60000);

    return () => {
      window.clearInterval(interval);
    };
  }, [refresh]);

  return { data, loading, error, refresh };
}
