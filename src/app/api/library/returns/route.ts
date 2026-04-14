import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { notifyUserById } from "@/lib/server/libraryNotifications";
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
        return NextResponse.json({ ok: true, requested: true, inProcess: true, message: "Return request already in process." });
      }
      return NextResponse.json({ error: reqError.message ?? "Could not create return request" }, { status: 500 });
    }

    const message = `${user.email ?? user.id} requested to return ${bookTitle} (tx:${txId}).`;

    // Find staff users
    const { data: staff } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("role", ["librarian", "admin"]);

    if (Array.isArray(staff) && staff.length > 0) {
      const inserts = (staff as StaffProfile[]).map((staffUser) => ({
        user_id: staffUser.id,
        type: "reservation_update" as const,
        message,
        is_read: false,
      }));
      await supabaseAdmin.from("notifications").insert(inserts);
    }

    // also notify the requesting user
    await notifyUserById(user.id, {
      inAppMessage: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
      subject: "IntelliLib: Return Requested",
      text: `Return requested for ${bookTitle}. A librarian will process it shortly.`,
      html: `<p>Return requested for <strong>${bookTitle}</strong>. A librarian will process it shortly.</p>`,
    });

    return NextResponse.json({ ok: true, requested: true, inProcess: true });
  } catch {
    return NextResponse.json({ error: "Could not create return request" }, { status: 500 });
  }
}
