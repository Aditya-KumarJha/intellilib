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

  if (!Number.isFinite(txId) || txId <= 0) {
    return NextResponse.json({ error: "Invalid transactionId" }, { status: 400 });
  }

  const { data: txRows, error: txErr } = await supabaseAdmin
    .from("transactions")
    .select("id,book_copy_id,book_copies!inner(book_id,books(id,title))")
    .eq("id", txId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (txErr || !txRows) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const bookTitle = txRows.book_copies?.books?.title ?? "your book";

  if (mode === "instant") {
    const now = new Date().toISOString();
    const { error: updErr } = await supabaseAdmin
      .from("transactions")
      .update({ return_date: now })
      .eq("id", txId)
      .eq("user_id", user.id)
      .is("return_date", null);

    if (updErr) return NextResponse.json({ error: updErr.message ?? "Could not return book" }, { status: 500 });

    // notify user
    await notifyUserById(user.id, {
      inAppMessage: `${bookTitle} marked returned. Thank you!`,
      subject: "IntelliLib: Book Return Received",
      text: `We have recorded your return for ${bookTitle}. Thank you!`,
      html: `<p>We have recorded your return for <strong>${bookTitle}</strong>. Thank you!</p>`,
    });

    return NextResponse.json({ ok: true, returned: true });
  }

  // mode === 'request' -> create a return request notification for staff
  try {
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

    return NextResponse.json({ ok: true, requested: true });
  } catch {
    return NextResponse.json({ error: "Could not create return request" }, { status: 500 });
  }
}
