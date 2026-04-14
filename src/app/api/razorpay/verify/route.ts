import crypto from "crypto";
import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyUserById } from "@/lib/server/libraryNotifications";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import supabaseAdmin from "@/lib/supabaseServerClient";

type VerifyBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
};

type RazorpayOrderResponse = {
  id?: string;
  notes?: {
    user_id?: string;
    fine_ids?: string;
  };
};

type FineRecord = {
  id: number;
  amount: number;
  transaction_id: number;
};

async function fetchOrderDetails(orderId: string, keyId: string, keySecret: string) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  return (await res.json().catch(() => null)) as RazorpayOrderResponse | null;
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 });
  }

  const body: VerifyBody = await req.json().catch(() => ({}));
  const razorpayOrderId = body.razorpay_order_id?.trim() ?? "";
  const razorpayPaymentId = body.razorpay_payment_id?.trim() ?? "";
  const razorpaySignature = body.razorpay_signature?.trim() ?? "";

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return NextResponse.json({ error: "Missing payment verification fields." }, { status: 400 });
  }

  const keyId = process.env.RZP_KEY_ID;
  const keySecret = process.env.RZP_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 });
  }

  const generated = crypto
    .createHmac("sha256", keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (generated !== razorpaySignature) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    const order = await fetchOrderDetails(razorpayOrderId, keyId, keySecret);
    if (!order?.id) {
      return NextResponse.json({ ok: false, error: "Could not verify order details." }, { status: 500 });
    }

    if (order.notes?.user_id !== user.id) {
      return NextResponse.json({ ok: false, error: "Payment does not belong to the current user." }, { status: 403 });
    }

    const fineIds = (order.notes?.fine_ids ?? "")
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);

    if (fineIds.length === 0) {
      return NextResponse.json({ ok: false, error: "No payable fines were attached to this order." }, { status: 409 });
    }

    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id,status")
      .eq("razorpay_order_id", razorpayOrderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingPayment?.status === "success") {
      await logAuditEvent({
        userId: user.id,
        action: "payment_verify_duplicate",
        entity: "payment",
        entityId: existingPayment.id,
        metadata: {
          provider: "razorpay",
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        },
      });
      return NextResponse.json({ ok: true, alreadyProcessed: true });
    }

    const { data: fineRows, error: fineError } = await supabaseAdmin
      .from("fines")
      .select("id,amount,transaction_id")
      .eq("user_id", user.id)
      .in("id", fineIds)
      .is("paid_at", null);

    if (fineError) {
      return NextResponse.json({ ok: false, error: "Could not load fines for verification." }, { status: 500 });
    }

    const payableFines = (fineRows ?? []) as FineRecord[];
    if (payableFines.length !== fineIds.length) {
      return NextResponse.json({ ok: false, error: "Some fines are already paid or unavailable." }, { status: 409 });
    }

    const now = new Date().toISOString();
    const totalAmount = payableFines.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    const paymentPayload = {
      user_id: user.id,
      fine_id: payableFines[0]?.id ?? null,
      amount: totalAmount,
      provider: "razorpay",
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: "success" as const,
      method: "razorpay",
    };

    if (existingPayment?.id) {
      await supabaseAdmin
        .from("payments")
        .update(paymentPayload)
        .eq("id", existingPayment.id);
    } else {
      await supabaseAdmin
        .from("payments")
        .insert(paymentPayload);
    }

    await supabaseAdmin
      .from("fines")
      .update({ paid_at: now, status: "paid" })
      .eq("user_id", user.id)
      .in("id", fineIds)
      .is("paid_at", null);

    await logAuditEvent({
      userId: user.id,
      action: "payment_verified",
      entity: "payment",
      entityId: existingPayment?.id ?? null,
      metadata: {
        provider: "razorpay",
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        fineIds,
        fineCount: fineIds.length,
        totalAmount,
      },
    });

    for (const fine of payableFines) {
      await logAuditEvent({
        userId: user.id,
        action: "fine_paid",
        entity: "fine",
        entityId: fine.id,
        metadata: {
          transactionId: fine.transaction_id,
          amount: fine.amount,
          provider: "razorpay",
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        },
      });
    }

    await notifyUserById(user.id, {
      inAppMessage: `Payment successful for ${fineIds.length} fine${fineIds.length > 1 ? "s" : ""}.`,
      subject: "IntelliLib: Payment Successful",
      text: `Your Razorpay payment was verified successfully for INR ${totalAmount}.`,
      html: `<p>Your Razorpay payment was verified successfully for <strong>INR ${totalAmount}</strong>.</p>`,
      type: "payment_success",
    });

    return NextResponse.json({ ok: true, amount: totalAmount, fineCount: fineIds.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
