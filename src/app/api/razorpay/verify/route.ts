import { NextResponse } from "next/server";
import crypto from "crypto";
import supabaseAdmin from "@/lib/supabaseServerClient";

type VerifyBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  fineIds?: number[];
  userId?: string;
};

export async function POST(req: Request) {
  const body: VerifyBody = await req.json().catch(() => ({} as any));
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, fineIds = [], userId } = body;

  const keySecret = process.env.RZP_KEY_SECRET;
  if (!keySecret) return NextResponse.json({ error: "Razorpay secret missing" }, { status: 500 });

  const generated = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (generated !== razorpay_signature) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    // record payment rows for each fine or a single aggregated payment
    const paymentsToInsert: any[] = [];
    const now = new Date().toISOString();
    if (fineIds.length > 0) {
      for (const fid of fineIds) {
        paymentsToInsert.push({
          user_id: userId || null,
          fine_id: fid,
          amount: null,
          razorpay_payment_id,
          razorpay_order_id,
          method: "razorpay",
          paid_at: now,
        });
      }
    } else {
      paymentsToInsert.push({
        user_id: userId || null,
        fine_id: null,
        amount: null,
        razorpay_payment_id,
        razorpay_order_id,
        method: "razorpay",
        paid_at: now,
      });
    }

    const insertRes = await supabaseAdmin.from("payments").insert(paymentsToInsert).select();

    // mark fines as paid
    if (fineIds.length > 0) {
      await supabaseAdmin
        .from("fines")
        .update({ paid_at: now })
        .in("id", fineIds)
        .select();
    }

    return NextResponse.json({ ok: true, payments: insertRes.data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
