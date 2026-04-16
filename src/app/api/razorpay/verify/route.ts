import crypto from "crypto";
import { NextResponse } from "next/server";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { notifyPaymentSuccess, notifyPaymentFailure } from "@/lib/server/libraryNotifications";
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

async function fetchPaymentDetails(paymentId: string, keyId: string, keySecret: string) {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });

  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as Record<string, unknown> | null;
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
    // record failed payment attempt and notify user
    try {
      await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        razorpay_order_id: razorpayOrderId || null,
        razorpay_payment_id: razorpayPaymentId || null,
        amount: 0,
        provider: "razorpay",
        status: "failed",
        method: "unknown",
      });
    } catch (e) {
      // ignore DB failures
    }
    await notifyPaymentFailure(user.id, null, "Invalid signature", "razorpay", "unknown");
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });
  }

  try {
    const order = await fetchOrderDetails(razorpayOrderId, keyId, keySecret);
    if (!order?.id) {
      try {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || null,
          amount: 0,
          provider: "razorpay",
          status: "failed",
          method: "unknown",
        });
      } catch {}
      await notifyPaymentFailure(user.id, null, "Could not verify order details", "razorpay", "unknown");
      return NextResponse.json({ ok: false, error: "Could not verify order details." }, { status: 500 });
    }

    if (order.notes?.user_id !== user.id) {
      try {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || null,
          amount: 0,
          provider: "razorpay",
          status: "failed",
          method: "unknown",
        });
      } catch {}
      await notifyPaymentFailure(user.id, null, "Payment does not belong to the current user", "razorpay", "unknown");
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
      try {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || null,
          amount: 0,
          provider: "razorpay",
          status: "failed",
          method: "unknown",
        });
      } catch {}
      await notifyPaymentFailure(user.id, null, "Could not load fines for verification", "razorpay", "unknown");
      return NextResponse.json({ ok: false, error: "Could not load fines for verification." }, { status: 500 });
    }

    const payableFines = (fineRows ?? []) as FineRecord[];
    const totalAmount = payableFines.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
    if (payableFines.length !== fineIds.length) {
      try {
        await supabaseAdmin.from("payments").insert({
          user_id: user.id,
          razorpay_order_id: razorpayOrderId || null,
          razorpay_payment_id: razorpayPaymentId || null,
          amount: totalAmount,
          provider: "razorpay",
          status: "failed",
          method: "unknown",
        });
      } catch {}
      await notifyPaymentFailure(user.id, totalAmount, "Some fines are already paid or unavailable", "razorpay", "unknown");
      return NextResponse.json({ ok: false, error: "Some fines are already paid or unavailable." }, { status: 409 });
    }

    const now = new Date().toISOString();

    const paymentDetails = await fetchPaymentDetails(razorpayPaymentId, keyId, keySecret);
    const rawMethod = paymentDetails && typeof paymentDetails.method === "string" ? (paymentDetails.method as string) : "unknown";
    // Build a human-friendly label for the UI, include card/UPI info when available
    let methodLabel = rawMethod;
    try {
      if (rawMethod === "card" && paymentDetails && typeof paymentDetails.card === "object") {
        const card = paymentDetails.card as Record<string, any>;
        const last4 = card?.last4 || card?.last_4 || card?.last || null;
        methodLabel = last4 ? `Card ending ${last4}` : "Card";
      } else if (rawMethod === "upi" && paymentDetails && typeof paymentDetails.vpa === "string") {
        methodLabel = `UPI (${paymentDetails.vpa})`;
      } else if (rawMethod === "netbanking" && paymentDetails && typeof paymentDetails.bank === "string") {
        methodLabel = `Netbanking (${paymentDetails.bank})`;
      } else if (rawMethod === "wallet" && paymentDetails && typeof paymentDetails.wallet === "string") {
        methodLabel = `Wallet (${paymentDetails.wallet})`;
      } else {
        // normalize common tokens
        methodLabel = rawMethod === "upi" ? "UPI" : rawMethod === "card" ? "Card" : rawMethod === "netbanking" ? "Netbanking" : rawMethod;
      }
    } catch (e) {
      methodLabel = rawMethod;
    }

    const paymentPayload = {
      user_id: user.id,
      fine_id: payableFines[0]?.id ?? null,
      amount: totalAmount,
      provider: "razorpay",
      razorpay_order_id: razorpayOrderId,
      razorpay_payment_id: razorpayPaymentId,
      razorpay_signature: razorpaySignature,
      status: "success" as const,
      method: rawMethod,
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
        method: rawMethod,
        method_label: methodLabel,
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
          method: rawMethod,
          method_label: methodLabel,
          orderId: razorpayOrderId,
          paymentId: razorpayPaymentId,
        },
      });
    }

    await notifyPaymentSuccess(user.id, totalAmount, fineIds.length, "razorpay", methodLabel);

    return NextResponse.json({ ok: true, amount: totalAmount, fineCount: fineIds.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
