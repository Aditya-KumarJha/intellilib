import { NextResponse } from "next/server";
import supabaseAdmin from "@/lib/supabaseServerClient";

type CreateOrderBody = {
  amount: number; // rupees
  currency?: string;
  fineIds?: number[];
};

export async function POST(req: Request) {
  const body: CreateOrderBody = await req.json().catch(() => ({} as any));
  const amount = Math.max(0, Number(body.amount) || 0);
  const currency = body.currency || "INR";
  const fineIds = Array.isArray(body.fineIds) ? body.fineIds : [];

  const keyId = process.env.RZP_KEY_ID;
  const keySecret = process.env.RZP_KEY_SECRET;

  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 });
  }

  // create a razorpay order
  try {
    const orderPayload = {
      amount: Math.round(amount * 100),
      currency,
      receipt: `fines_${Date.now()}`,
      payment_capture: 1,
      notes: { fine_ids: fineIds.join(",") },
    };

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data, ok: false }, { status: 500 });
    }

    // create a server-side placeholder record for tracking attempt (optional)
    // store a pending payment record so we can later update it atomically on verify
    try {
      await supabaseAdmin.from("payments").insert([
        {
          user_id: null,
          fine_id: null,
          amount: amount,
          razorpay_order_id: data.id,
          method: "razorpay",
        },
      ]);
    } catch (e) {
      // ignore if payments table not yet exists or other issues; verification will still record
    }

    return NextResponse.json({ ok: true, order: data, key_id: keyId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
