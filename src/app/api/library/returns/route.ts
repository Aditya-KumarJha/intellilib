import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById, insertNotificationRows } from "@/lib/server/libraryNotifications";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import supabaseAdmin from "@/lib/supabaseServerClient";

type ReturnBody = {
  transactionId?: number;
  mode?: "request" | "instant";
};

type StaffProfile = {
  id: string;
};

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 });
  }

  const body: ReturnBody = await req.json().catch(() => ({}));
  const txId = Number(body.transactionId);
  const mode = body.mode ?? "request";

  if (mode !== "request") {
    return NextResponse.json({ error: "Direct returns are disabled. Please request return for librarian approval." }, { status: 400 });
  }

  if (!Number.isFinite(txId) || txId <= 0) {
    return NextResponse.json({ error: "Invalid transactionId" }, { status: 400 });
  }

  const { data: txRows, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,return_date,book_copy_id,book_copies!inner(book_id,books(id,title))")
    .eq("id", txId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txErr || !txRows) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const copy = Array.isArray(txRows.book_copies) ? txRows.book_copies[0] : txRows.book_copies;
  const book = Array.isArray(copy?.books) ? copy?.books[0] : copy?.books;
  const bookTitle = book?.title ?? "your book";

  if (txRows.return_date) {
    return NextResponse.json({ error: "This transaction is already returned." }, { status: 400 });
  }

  // mode === 'request' -> create a return request notification for staff
  try {
    const { data: existingPending } = await supabaseAdmin
      .from("return_requests")
      .select("id")
      .eq("transaction_id", txId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPending?.id) {
      await logAuditEvent({
        userId: user.id,
        action: "return_request_duplicate",
        entity: "return_request",
        entityId: existingPending.id,
        metadata: { transactionId: txId },
      });
      return NextResponse.json({ ok: true, requested: true, inProcess: true, message: "Return request already in process." });
    }

    const { error: reqError } = await supabaseAdmin
      .from("return_requests")
      .insert({
        transaction_id: txId,
        user_id: user.id,
        status: "pending",
      });

    if (reqError) {
      if (reqError.code === "23505") {
        await logAuditEvent({
          userId: user.id,
          action: "return_request_duplicate",
          entity: "return_request",
          entityId: null,
          metadata: { transactionId: txId },
        });
        return NextResponse.json({ ok: true, requested: true, inProcess: true, message: "Return request already in process." });
      }
      return NextResponse.json({ error: reqError.message ?? "Could not create return request" }, { status: 500 });
    }

    const message = `${user.email ?? user.id} requested to return ${bookTitle} (tx:${txId}).`;

    // Find staff users and insert notifications for them. These are best-effort —
    // if notifications/email delivery fails, the return request itself has already
    // been created and we should still return success. Log failures for diagnosis.
    try {
      const { data: staff, error: staffError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .in("role", ["librarian", "admin"]);

      if (staffError) {
        await logAuditEvent({
          userId: user.id,
          action: "return_request_notify_staff_failed",
          entity: "return_request",
          entityId: null,
          metadata: { transactionId: txId, error: staffError.message ?? String(staffError) },
        });
      } else if (Array.isArray(staff) && staff.length > 0) {
        const inserts = (staff as StaffProfile[]).map((staffUser) => ({
          user_id: staffUser.id,
          type: "reservation_update",
          message,
          is_read: false,
          target_role: "librarian",
          metadata: {
            requested_by: user.id,
            requested_email: user.email,
            transactionId: txId,
            bookTitle,
          },
        }));

        try {
          await insertNotificationRows(inserts);
        } catch (notifErr: unknown) {
          await logAuditEvent({
            userId: user.id,
            action: "return_request_notify_staff_failed",
            entity: "return_request",
            entityId: null,
            metadata: {
              transactionId: txId,
              error: notifErr instanceof Error ? notifErr.message : String(notifErr),
            },
          });
        }
      }
    } catch (err: unknown) {
      await logAuditEvent({
        userId: user.id,
        action: "return_request_notify_staff_failed",
        entity: "return_request",
        entityId: null,
        metadata: {
          transactionId: txId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }

    // also notify the requesting user — best-effort only
    try {
      await notifyUserById(user.id, {
        inAppMessage: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
        subject: "IntelliLib: Return Requested",
        text: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
        html: `<p>Return requested for <strong>${bookTitle}</strong>. A librarian will process it shortly.</p>`,
      });
    } catch (err: unknown) {
      await logAuditEvent({
        userId: user.id,
        action: "return_request_notify_user_failed",
        entity: "return_request",
        entityId: null,
        metadata: {
          transactionId: txId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }

    await logAuditEvent({
      userId: user.id,
      action: "return_request_created",
      entity: "return_request",
      entityId: null,
      metadata: {
        transactionId: txId,
        bookTitle,
      },
    });

    return NextResponse.json({ ok: true, requested: true, inProcess: true });
  } catch {
    return NextResponse.json({ error: "Could not create return request" }, { status: 500 });
  }
}
