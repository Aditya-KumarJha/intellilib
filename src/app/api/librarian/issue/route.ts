import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import {
  compactQueuePositions,
  getApprovedReservationForUser,
  getMaxBooksPerUser,
  getPhysicalAvailableCopyIds,
  hasApprovedReservationForAnotherUser,
} from "@/lib/server/reservationService";
import { syncOutstandingFinesForUser } from "@/lib/server/finesService";
import supabaseAdmin from "@/lib/supabaseServerClient";
import { isDbTimestampPast } from "@/lib/dateTime";

type IssueBody = {
  memberId?: string;
  bookId?: number;
};

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "librarian";
}

const MAX_BOOKS_REACHED_MESSAGE =
  "Member already has the maximum allowed issued books. Ask them to return one first.";

export async function POST(req: Request) {
  const caller = await getUserFromRequest(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("id,role,full_name")
    .eq("id", caller.id)
    .maybeSingle();

  if (!callerProfile || !isStaffRole(callerProfile.role)) {
    return NextResponse.json({ error: "Only librarians and admins can issue books." }, { status: 403 });
  }

  const body: IssueBody = await req.json().catch(() => ({}));
  const memberId = String(body.memberId ?? "").trim();
  const bookId = Number(body.bookId);

  if (!memberId || !Number.isFinite(bookId) || bookId <= 0) {
    return NextResponse.json({ error: "memberId and valid bookId are required." }, { status: 400 });
  }

  const { data: memberProfile } = await supabaseAdmin
    .from("profiles")
    .select("id,role,status,full_name")
    .eq("id", memberId)
    .maybeSingle();

  if (!memberProfile) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (memberProfile.role !== "user") {
    return NextResponse.json({ error: "Only user accounts can be issued books from this desk." }, { status: 409 });
  }

  if ((memberProfile.status ?? "active") !== "active") {
    return NextResponse.json({ error: "Selected member is not active." }, { status: 409 });
  }

  const { data: bookRow, error: bookError } = await supabaseAdmin
    .from("books")
    .select("id,title,type")
    .eq("id", bookId)
    .maybeSingle();

  if (bookError || !bookRow) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  if (bookRow.type === "digital") {
    return NextResponse.json({ error: "Digital titles do not require physical issue." }, { status: 409 });
  }

  const { data: activeTransactions } = await supabaseAdmin
    .from("transactions")
    .select("id,status,due_date")
    .eq("user_id", memberId)
    .is("return_date", null);

  const hasOverdue = (activeTransactions ?? []).some((row: { status: string | null; due_date: string | null }) => {
    return row.status === "overdue" || isDbTimestampPast(row.due_date);
  });

  if (hasOverdue) {
    await syncOutstandingFinesForUser(memberId).catch(() => {
      // Best-effort sync; issuing still stays blocked for overdue members.
    });
    return NextResponse.json({ error: "Member has overdue books and cannot issue a new one." }, { status: 409 });
  }

  const maxBooksPerUser = await getMaxBooksPerUser();
  if ((activeTransactions?.length ?? 0) >= maxBooksPerUser) {
    return NextResponse.json({ error: MAX_BOOKS_REACHED_MESSAGE }, { status: 409 });
  }

  const { data: duplicateIssue } = await supabaseAdmin
    .from("transactions")
    .select("id,book_copies!inner(book_id)")
    .eq("user_id", memberId)
    .is("return_date", null)
    .eq("book_copies.book_id", bookId)
    .limit(1);

  if ((duplicateIssue ?? []).length > 0) {
    return NextResponse.json({ error: "Member already holds an active copy of this title." }, { status: 409 });
  }

  const ownApprovedReservation = await getApprovedReservationForUser(bookId, memberId);
  const reservedForAnotherUser = ownApprovedReservation
    ? false
    : await hasApprovedReservationForAnotherUser(bookId, memberId);

  if (reservedForAnotherUser) {
    return NextResponse.json(
      { error: "This title is currently on hold for another member with approved reservation." },
      { status: 409 },
    );
  }

  const availableCopyIds = await getPhysicalAvailableCopyIds(bookId);
  if (availableCopyIds.length === 0) {
    return NextResponse.json({ error: "No physical copy is available right now." }, { status: 409 });
  }

  const now = new Date();
  let inserted: { id: number; book_copy_id: number; due_date: string | null } | null = null;
  let lastErrorMessage: string | null = null;

  for (const copyId of availableCopyIds) {
    const { data, error } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: memberId,
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

    const text = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();
    const raceConflict = error?.code === "23505" || text.includes("unique_active_issue") || text.includes("duplicate key");
    if (raceConflict) continue;

    if (text.includes("reached max limit") || text.includes("max limit")) {
      return NextResponse.json({ error: MAX_BOOKS_REACHED_MESSAGE }, { status: 409 });
    }

    lastErrorMessage = error?.message ?? "Could not issue this title right now.";
    break;
  }

  if (!inserted) {
    return NextResponse.json({ error: lastErrorMessage ?? "Issue failed due to copy availability race." }, { status: 409 });
  }

  if (ownApprovedReservation?.id) {
    await supabaseAdmin
      .from("reservations")
      .update({ status: "completed", queue_position: null })
      .eq("id", ownApprovedReservation.id);
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

  await notifyUserById(memberId, {
    inAppMessage: `${bookRow.title} has been issued by library desk. Due: ${dueText}.`,
    subject: "IntelliLib: Book Issued",
    text: `A librarian issued ${bookRow.title} to your account. Due date: ${dueText}.`,
    html: `<p>A librarian issued <strong>${bookRow.title}</strong> to your account.</p><p><strong>Due:</strong> ${dueText}</p>`,
  });

  await logAuditEvent({
    userId: caller.id,
    action: "librarian_issue",
    entity: "transaction",
    entityId: inserted.id,
    metadata: {
      memberId,
      memberName: memberProfile.full_name ?? null,
      bookId,
      bookTitle: bookRow.title,
      copyId: inserted.book_copy_id,
      dueDate,
    },
  });

  return NextResponse.json({
    ok: true,
    transactionId: inserted.id,
    dueDate,
    message: "Book issued successfully.",
  });
}
