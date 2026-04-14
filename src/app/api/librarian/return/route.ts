import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import supabaseAdmin from "@/lib/supabaseServerClient";

type ReturnBody = {
  transactionId?: number;
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
    return NextResponse.json({ error: "Only librarians and admins can process returns." }, { status: 403 });
  }

  const body: ReturnBody = await req.json().catch(() => ({}));
  const notes = String(body.notes ?? "").trim();
  let transactionId = Number(body.transactionId);
  const returnRequestId = Number(body.returnRequestId);

  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    if (Number.isFinite(returnRequestId) && returnRequestId > 0) {
      const { data: requestRow } = await supabaseAdmin
        .from("return_requests")
        .select("id,transaction_id,status")
        .eq("id", returnRequestId)
        .maybeSingle();

      if (!requestRow) {
        return NextResponse.json({ error: "Return request not found." }, { status: 404 });
      }

      if (requestRow.status !== "pending") {
        return NextResponse.json({ error: "Return request is already processed." }, { status: 409 });
      }

      transactionId = Number(requestRow.transaction_id);
    }
  }

  if (!Number.isFinite(transactionId) || transactionId <= 0) {
    return NextResponse.json({ error: "Valid transactionId or pending returnRequestId is required." }, { status: 400 });
  }

  const { data: txRow, error: txError } = await supabaseAdmin
    .from("transactions")
    .select("id,user_id,book_copy_id,return_date,due_date")
    .eq("id", transactionId)
    .maybeSingle();

  if (txError || !txRow) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  if (txRow.return_date) {
    return NextResponse.json({ error: "Transaction is already returned." }, { status: 409 });
  }

  const { data: copyRow } = await supabaseAdmin
    .from("book_copies")
    .select("id,book_id")
    .eq("id", txRow.book_copy_id)
    .maybeSingle();

  let bookRow: { id: number; title: string | null } | null = null;
  if (copyRow) {
    const { data } = await supabaseAdmin
      .from("books")
      .select("id,title")
      .eq("id", copyRow.book_id)
      .maybeSingle();
    bookRow = data;
  }

  const nowIso = new Date().toISOString();

  const { data: updatedTx, error: updateTxError } = await supabaseAdmin
    .from("transactions")
    .update({ return_date: nowIso, status: "returned" })
    .eq("id", transactionId)
    .is("return_date", null)
    .select("id,user_id")
    .maybeSingle();

  if (updateTxError || !updatedTx) {
    return NextResponse.json({ error: updateTxError?.message ?? "Could not process return." }, { status: 409 });
  }

  const requestFilter = Number.isFinite(returnRequestId) && returnRequestId > 0
    ? supabaseAdmin.from("return_requests").update({
        status: "approved",
        processed_at: nowIso,
        processed_by: caller.id,
        notes: notes || null,
      }).eq("id", returnRequestId)
    : supabaseAdmin
        .from("return_requests")
        .update({
          status: "approved",
          processed_at: nowIso,
          processed_by: caller.id,
          notes: notes || null,
        })
        .eq("transaction_id", transactionId)
        .eq("status", "pending");

  await requestFilter;

  const title = bookRow?.title ?? "your book";
  const processedAt = new Date(nowIso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  await notifyUserById(String(txRow.user_id), {
    inAppMessage: `${title} return has been approved and processed at ${processedAt}.`,
    subject: "IntelliLib: Return Processed",
    text: `Your return for ${title} was processed at ${processedAt}.`,
    html: `<p>Your return for <strong>${title}</strong> was processed at ${processedAt}.</p>`,
  });

  await logAuditEvent({
    userId: caller.id,
    action: "librarian_return_processed",
    entity: "transaction",
    entityId: transactionId,
    metadata: {
      memberId: txRow.user_id,
      bookId: copyRow?.book_id ?? null,
      bookTitle: title,
      returnRequestId: Number.isFinite(returnRequestId) ? returnRequestId : null,
      notes: notes || null,
      processedAt: nowIso,
    },
  });

  return NextResponse.json({
    ok: true,
    transactionId,
    message: "Return processed successfully.",
  });
}
