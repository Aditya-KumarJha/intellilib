import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import {
  compactQueuePositions,
  getApprovedReservationForUser,
  getIssueDurationDays,
  getMaxBooksPerUser,
  getPhysicalAvailableCopyIds,
  hasApprovedReservationForAnotherUser,
} from "@/lib/server/reservationService";
import supabaseAdmin from "@/lib/supabaseServerClient";

type IssueBody = {
  bookId?: number;
};

function addDays(start: Date, days: number) {
  const value = new Date(start);
  value.setDate(value.getDate() + days);
  return value;
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const dueDateValue = tx.due_date ? new Date(tx.due_date).getTime() : Number.POSITIVE_INFINITY;
    return tx.status === "overdue" || dueDateValue < Date.now();
  });

  if (hasOverdue) {
    return NextResponse.json(
      { error: "You have overdue books. Return them before issuing a new one." },
      { status: 409 },
    );
  }

  const maxBooksPerUser = await getMaxBooksPerUser();
  if ((activeTransactions?.length ?? 0) >= maxBooksPerUser) {
    return NextResponse.json(
      { error: `You have reached your issue limit of ${maxBooksPerUser} active books.` },
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

  const issueDays = await getIssueDurationDays();
  const now = new Date();
  const dueDate = addDays(now, issueDays).toISOString();

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
        due_date: dueDate,
        status: "issued",
      })
      .select("id,book_copy_id")
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

  const dueText = new Date(dueDate).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  await notifyUserById(user.id, {
    inAppMessage: `${bookRow.title} issued successfully. Collect from the counter with your ID card before ${dueText}.`,
    subject: "IntelliLib: Book Issued Successfully",
    text: `Your book "${bookRow.title}" has been issued. Please bring your ID card and collect it from the counter. Due date: ${dueText}.`,
    html: `<p>Your book <strong>${bookRow.title}</strong> has been issued.</p><p>Please bring your ID card and collect it from the library counter.</p><p><strong>Due date:</strong> ${dueText}</p>`,
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
