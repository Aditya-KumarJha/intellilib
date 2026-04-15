import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseServerClient";
import { getUserFromRequest } from "@/lib/server/apiAuth";

export async function POST(req: Request) {
  try {
    const caller = await getUserFromRequest(req);
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabaseAdmin.from("profiles").select("id,role").eq("id", caller.id).single();
    const role = profile?.role ?? null;
    if (role !== "librarian" && role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const targetId = body.targetId;
    const amount = body.amount !== undefined ? Number(body.amount) : undefined;

    if (!action || !targetId) {
      return NextResponse.json({ error: "Missing action or targetId" }, { status: 400 });
    }

    if (action === "suspend_user") {
      // Prevent suspending staff roles
      const { data: target } = await supabaseAdmin.from("profiles").select("id,role,full_name").eq("id", String(targetId)).maybeSingle();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (target.role === "librarian" || target.role === "admin") return NextResponse.json({ error: "Cannot suspend staff accounts" }, { status: 400 });

      const { error } = await supabaseAdmin.from("profiles").update({ status: "suspended" }).eq("id", String(targetId));
      if (error) throw error;
      return NextResponse.json({ reply: `User ${String(targetId)} suspended.` });
    }

    if (action === "activate_user") {
      const { data: target } = await supabaseAdmin.from("profiles").select("id,role,full_name").eq("id", String(targetId)).maybeSingle();
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
      if (target.role === "librarian" || target.role === "admin") return NextResponse.json({ error: "Cannot activate staff accounts via this assistant" }, { status: 400 });

      const { error } = await supabaseAdmin.from("profiles").update({ status: "active" }).eq("id", String(targetId));
      if (error) throw error;
      return NextResponse.json({ reply: `User ${String(targetId)} activated.` });
    }

    if (action === "add_copies") {
      const amt = Number(amount ?? 1);
      if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      // Try RPC first (if available), otherwise fetch+update
      try {
        await supabaseAdmin.rpc("increment_book_copies", { p_book_id: Number(targetId), p_amount: amt });
      } catch (rpcErr) {
        const { data: book } = await supabaseAdmin.from("books").select("available_copies,total_copies").eq("id", Number(targetId)).maybeSingle();
        if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
        const newAvailable = Number((book.available_copies ?? 0)) + amt;
        const newTotal = Number((book.total_copies ?? 0)) + amt;
        const { error } = await supabaseAdmin.from("books").update({ available_copies: newAvailable, total_copies: newTotal }).eq("id", Number(targetId));
        if (error) throw error;
      }

      return NextResponse.json({ reply: `Added ${amt} copies to book ${String(targetId)}.` });
    }

    if (action === "remove_copies") {
      const amt = Number(amount ?? 1);
      if (!Number.isFinite(amt) || amt <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

      const { data: book } = await supabaseAdmin.from("books").select("id,available_copies,total_copies").eq("id", Number(targetId)).maybeSingle();
      if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });
      const total = Number(book.total_copies ?? 0);
      if (amt > total) return NextResponse.json({ error: "Cannot remove more copies than total" }, { status: 400 });

      const newTotal = Math.max(0, total - amt);
      const available = Number(book.available_copies ?? 0);
      const newAvailable = Math.max(0, available - amt);

      const { error } = await supabaseAdmin.from("books").update({ total_copies: newTotal, available_copies: newAvailable }).eq("id", Number(targetId));
      if (error) throw error;
      return NextResponse.json({ reply: `Removed ${amt} copies from book ${String(targetId)}.` });
    }

    if (action === "approve_return") {
      // targetId is return_request id
      const { data: rr } = await supabaseAdmin.from("return_requests").select("id,transaction_id").eq("id", Number(targetId)).maybeSingle();
      if (!rr) return NextResponse.json({ error: "Return request not found" }, { status: 404 });

      // mark return_request completed
      const { error: err1 } = await supabaseAdmin.from("return_requests").update({ status: "completed" }).eq("id", Number(targetId));
      if (err1) throw err1;

      // update transaction return_date and status
      const now = new Date().toISOString();
      const { error: err2 } = await supabaseAdmin.from("transactions").update({ return_date: now, status: "returned" }).eq("id", Number(rr.transaction_id));
      if (err2) throw err2;

      // find book_copy id for transaction
      const { data: tx } = await supabaseAdmin.from("transactions").select("book_copy_id").eq("id", Number(rr.transaction_id)).maybeSingle();
      const copyId = tx?.book_copy_id;
      if (copyId) {
        await supabaseAdmin.from("book_copies").update({ status: "available" }).eq("id", Number(copyId));
      }

      return NextResponse.json({ reply: `Return request ${String(targetId)} approved and transaction updated.` });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    console.error("Action error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export const runtime = "edge";
