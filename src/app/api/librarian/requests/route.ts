import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import { compactQueuePositions } from "@/lib/server/reservationService";
import supabaseAdmin from "@/lib/supabaseServerClient";

type RequestsActionBody = {
  action?: "cancel_reservation" | "reject_return_request";
  reservationId?: number;
  returnRequestId?: number;
  notes?: string;
};

function isStaffRole(role: string | null | undefined) {
  return role === "admin" || role === "librarian";
}

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
    return NextResponse.json({ error: "Only librarians and admins can manage requests." }, { status: 403 });
  }

  const body: RequestsActionBody = await req.json().catch(() => ({}));
  const action = body.action;
  const notes = String(body.notes ?? "").trim() || null;

  if (action === "cancel_reservation") {
    const reservationId = Number(body.reservationId);
    if (!Number.isFinite(reservationId) || reservationId <= 0) {
      return NextResponse.json({ error: "Valid reservationId is required." }, { status: 400 });
    }

    const { data: reservation } = await supabaseAdmin
      .from("reservations")
      .select("id,user_id,book_id,status")
      .eq("id", reservationId)
      .maybeSingle();

    if (!reservation) {
      return NextResponse.json({ error: "Reservation not found." }, { status: 404 });
    }

    if (!["waiting", "approved"].includes(String(reservation.status))) {
      return NextResponse.json({ error: "Only active reservations can be cancelled." }, { status: 409 });
    }

    const { data: book } = await supabaseAdmin
      .from("books")
      .select("title")
      .eq("id", reservation.book_id)
      .maybeSingle();

    const { error: updateError } = await supabaseAdmin
      .from("reservations")
      .update({ status: "cancelled", queue_position: null })
      .eq("id", reservationId)
      .in("status", ["waiting", "approved"]);

    if (updateError) {
      return NextResponse.json({ error: updateError.message ?? "Could not cancel reservation." }, { status: 500 });
    }

    await compactQueuePositions(Number(reservation.book_id));

    await notifyUserById(String(reservation.user_id), {
      inAppMessage: `${String(book?.title ?? "Your reservation")} was cancelled by library staff.`,
      subject: "IntelliLib: Reservation Cancelled",
      text: `${String(book?.title ?? "Your reservation")} was cancelled by library staff.`,
      html: `<p><strong>${String(book?.title ?? "Your reservation")}</strong> was cancelled by library staff.</p>`,
    });

    await logAuditEvent({
      userId: caller.id,
      action: "librarian_reservation_cancelled",
      entity: "reservation",
      entityId: reservationId,
      metadata: {
        bookId: reservation.book_id,
        memberId: reservation.user_id,
        previousStatus: reservation.status,
        notes,
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (action === "reject_return_request") {
    const returnRequestId = Number(body.returnRequestId);
    if (!Number.isFinite(returnRequestId) || returnRequestId <= 0) {
      return NextResponse.json({ error: "Valid returnRequestId is required." }, { status: 400 });
    }

    const { data: requestRow } = await supabaseAdmin
      .from("return_requests")
      .select("id,transaction_id,user_id,status")
      .eq("id", returnRequestId)
      .maybeSingle();

    if (!requestRow) {
      return NextResponse.json({ error: "Return request not found." }, { status: 404 });
    }

    if (requestRow.status !== "pending") {
      return NextResponse.json({ error: "Return request is already processed." }, { status: 409 });
    }

    const { data: transaction } = await supabaseAdmin
      .from("transactions")
      .select("book_copies(id,books(id,title))")
      .eq("id", requestRow.transaction_id)
      .maybeSingle();

    const copy = Array.isArray(transaction?.book_copies) ? transaction?.book_copies[0] : transaction?.book_copies;
    const book = Array.isArray(copy?.books) ? copy?.books[0] : copy?.books;
    const bookTitle = String(book?.title ?? "your book");
    const processedAt = new Date().toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("return_requests")
      .update({
        status: "rejected",
        processed_at: processedAt,
        processed_by: caller.id,
        notes,
      })
      .eq("id", returnRequestId)
      .eq("status", "pending");

    if (updateError) {
      return NextResponse.json({ error: updateError.message ?? "Could not reject return request." }, { status: 500 });
    }

    await notifyUserById(String(requestRow.user_id), {
      inAppMessage: `Return request rejected for ${bookTitle}.${notes ? ` Note: ${notes}` : ""}`,
      subject: "IntelliLib: Return Request Update",
      text: `Your return request for ${bookTitle} was rejected.${notes ? ` Note: ${notes}` : ""}`,
      html: `<p>Your return request for <strong>${bookTitle}</strong> was rejected.</p>${notes ? `<p><strong>Note:</strong> ${notes}</p>` : ""}`,
    });

    await logAuditEvent({
      userId: caller.id,
      action: "librarian_return_request_rejected",
      entity: "return_request",
      entityId: returnRequestId,
      metadata: {
        transactionId: requestRow.transaction_id,
        memberId: requestRow.user_id,
        notes,
      },
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
}
