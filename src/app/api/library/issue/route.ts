import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById, insertNotificationRows } from "@/lib/server/libraryNotifications";
import {
  compactQueuePositions,
  getApprovedReservationForUser,
  getMaxBooksPerUser,
  getPhysicalAvailableCopyIds,
  hasApprovedReservationForAnotherUser,
} from "@/lib/server/reservationService";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import { syncOutstandingFinesForUser } from "@/lib/server/finesService";
import supabaseAdmin from "@/lib/supabaseServerClient";
import { isDbTimestampPast } from "@/lib/dateTime";

type IssueBody = {
  bookId?: number;
};

const MAX_BOOKS_REACHED_MESSAGE =
  "You have reached the maximum allowed issued books. Please return a book first to issue more.";

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 });
  }

  const body: IssueBody = await req.json().catch(() => ({}));
  const bookId = Number(body.bookId);

  if (!Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "Invalid bookId" }, { status: 400 });
  }

  const { data: bookRow, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id,title,type,pdf_url")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError || !bookRow) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (bookRow.type === "digital") {
    return NextResponse.json({
      ok: true,
      mode: "digital_access",
      message: "Digital books are instantly accessible. No physical issue needed.",
      accessUrl: bookRow.pdf_url,
    });
  }

  const { data: activeTransactions } = await supabaseAdmin
    .from("transactions")
    .select("id,status,due_date")
    .eq("user_id", user.id)
    .is("return_date", null);

  const hasOverdue = (activeTransactions ?? []).some((tx) => {
    return tx.status === "overdue" || isDbTimestampPast(tx.due_date);
  });

  if (hasOverdue) {
    await syncOutstandingFinesForUser(user.id).catch(() => {
      // Best-effort sync; blocking reason remains overdue regardless.
    });
    return NextResponse.json(
      { error: "You have overdue books. Return them before issuing a new one." },
      { status: 409 },
    );
  }

  const maxBooksPerUser = await getMaxBooksPerUser();
  if ((activeTransactions?.length ?? 0) >= maxBooksPerUser) {
    return NextResponse.json(
      { error: MAX_BOOKS_REACHED_MESSAGE },
      { status: 409 },
    );
  }

  const { data: duplicateIssue } = await supabaseAdmin
    .from("transactions")
    .select("id,book_copies!inner(book_id)")
    .eq("user_id", user.id)
    .is("return_date", null)
    .eq("book_copies.book_id", bookId)
    .limit(1);

  if ((duplicateIssue ?? []).length > 0) {
    return NextResponse.json(
      { error: "You already hold an active copy of this title." },
      { status: 409 },
    );
  }

  const now = new Date();

  const ownApprovedReservation = await getApprovedReservationForUser(bookId, user.id);
  const reservedForAnotherUser = ownApprovedReservation
    ? false
    : await hasApprovedReservationForAnotherUser(bookId, user.id);

  if (reservedForAnotherUser) {
    return NextResponse.json(
      {
        error: "This title is currently on hold for another member's approved reservation.",
        canReserve: true,
      },
      { status: 409 },
    );
  }

  const availableCopyIds = await getPhysicalAvailableCopyIds(bookId);
  if (availableCopyIds.length === 0) {
    return NextResponse.json(
      {
        error: "No physical copy available right now.",
        canReserve: true,
      },
      { status: 409 },
    );
  }

  let inserted:
    | {
        id: number;
        book_copy_id: number;
        due_date: string | null;
      }
    | null = null;
  let raceFailures = 0;
  let lastFatalErrorMessage: string | null = null;

  for (const copyId of availableCopyIds) {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: user.id,
        book_copy_id: copyId,
        issue_date: now.toISOString(),
        status: "issued",
      })
      .select("id,book_copy_id,due_date")
      .maybeSingle();

    if (!error && data) {
      inserted = data;
      break;
    }

    if (!error) continue;

    const message = String(error.message || "");
    const details = String(error.details || "");
    const combined = `${message} ${details}`.toLowerCase();

    if (
      error.code === "23505" ||
      combined.includes("unique_active_issue") ||
      combined.includes("duplicate key")
    ) {
      raceFailures += 1;
      continue;
    }

    if (combined.includes("already has an active copy of book")) {
      return NextResponse.json(
        { error: "You already hold an active copy of this title." },
        { status: 409 },
      );
    }

    if (combined.includes("has overdue books")) {
      return NextResponse.json(
        { error: "You have overdue books. Return them before issuing a new one." },
        { status: 409 },
      );
    }

    if (combined.includes("reached max limit") || combined.includes("max limit")) {
      return NextResponse.json(
        { error: MAX_BOOKS_REACHED_MESSAGE },
        { status: 409 },
      );
    }

    lastFatalErrorMessage = message || "Could not issue the selected book right now.";
    break;
  }

  if (!inserted) {
    if (lastFatalErrorMessage) {
      return NextResponse.json(
        { error: lastFatalErrorMessage },
        { status: 409 },
      );
    }

    if (raceFailures > 0) {
      return NextResponse.json(
        {
          error: "Book was picked by another user first. Please reserve it.",
          canReserve: true,
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error: "Could not issue the book right now. Please try again.",
        canReserve: true,
      },
      { status: 409 },
    );
  }

  const reservation = ownApprovedReservation
    ?? (await supabaseAdmin
      .from("reservations")
      .select("id")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .in("status", ["waiting", "approved"])
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()).data;

  if (reservation?.id) {
    await supabaseAdmin
      .from("reservations")
      .update({ status: "completed", queue_position: null })
      .eq("id", reservation.id);
    await compactQueuePositions(bookId);
  }

  const dueDate = inserted.due_date;
  const dueText = dueDate
    ? new Date(dueDate).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "as per current library policy";

  await notifyUserById(user.id, {
    inAppMessage: `${bookRow.title} issued successfully. Collect from the counter with your ID card before ${dueText}.`,
    subject: "IntelliLib: Book Issued Successfully",
    text: `Your book "${bookRow.title}" has been issued. Please bring your ID card and collect it from the counter. Due date: ${dueText}.`,
    html: `<p>Your book <strong>${bookRow.title}</strong> has been issued.</p><p>Please bring your ID card and collect it from the library counter.</p><p><strong>Due date:</strong> ${dueText}</p>`,
  });

  // Create librarian-targeted notifications so staff see the issuance in their dashboard
  try {
    const message = `${user.email ?? user.id} issued ${bookRow.title} (tx:${inserted.id}).`;
    const { data: staff } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["librarian", "admin"]);

    if (Array.isArray(staff) && staff.length > 0) {
      const inserts = (staff as { id: string }[]).map((s) => ({
        user_id: s.id,
        // use an allowed notification type (schema-enforced). 'reservation_update'
        // is a generic librarian-facing type used elsewhere.
        type: "reservation_update",
        message,
        is_read: false,
        target_role: "librarian",
        metadata: {
          transactionId: inserted.id,
          userId: user.id,
          userEmail: user.email,
          bookId,
          copyId: inserted.book_copy_id,
          dueDate,
        },
      }));

      await insertNotificationRows(inserts);
    }
  } catch (err) {
    // non-fatal: log and continue
    console.error("[issue.route] failed to create librarian notifications:", err);
  }

  await logAuditEvent({
    userId: user.id,
    action: "book_issued",
    entity: "transaction",
    entityId: inserted.id,
    metadata: {
      bookId,
      copyId: inserted.book_copy_id,
      dueDate,
      source: "issue_api",
    },
  });

  return NextResponse.json({
    ok: true,
    mode: "physical_issue",
    transactionId: inserted.id,
    dueDate,
    copyId: inserted.book_copy_id,
    message: "Book issued successfully.",
  });
}
