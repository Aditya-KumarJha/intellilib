import { NextResponse } from "next/server";
import crypto from "crypto";

import { getUserFromRequest } from "@/lib/server/apiAuth";
import { logAuditEvent } from "@/lib/server/auditLogs";
import { ensureActionAllowedForUser } from "@/lib/server/suspensionGuard";
import supabaseAdmin from "@/lib/supabaseServerClient";

type CreateOrderBody = {
  fineIds?: number[];
  currency?: string;
};

type FineRow = {
  id: number;
  amount: number;
};

export async function POST(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permission = await ensureActionAllowedForUser(user.id);
  if (!permission.allowed) {
    return NextResponse.json({ error: permission.message }, { status: 403 });
  }

  const body: CreateOrderBody = await req.json().catch(() => ({}));
  const fineIds = Array.isArray(body.fineIds)
    ? Array.from(new Set(body.fineIds.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0)))
    : [];
  const currency = body.currency || "INR";

  if (fineIds.length === 0) {
    return NextResponse.json({ error: "Select at least one unpaid fine." }, { status: 400 });
  }

  const keyId = process.env.RZP_KEY_ID;
  const keySecret = process.env.RZP_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Razorpay credentials not configured" }, { status: 500 });
  }

  const { data: fineRows, error: fineError } = await supabaseAdmin
    .from("fines")
    .select("id,amount")
    .eq("user_id", user.id)
    .is("paid_at", null)
    .in("id", fineIds);

  if (fineError) {
    return NextResponse.json({ error: "Could not validate fines." }, { status: 500 });
  }

  const normalizedFines = (fineRows ?? []) as FineRow[];
  if (normalizedFines.length !== fineIds.length) {
    return NextResponse.json({ error: "Some selected fines are no longer payable." }, { status: 409 });
  }

  const totalAmount = normalizedFines.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json({ error: "Selected fines do not have a valid payable amount." }, { status: 409 });
  }

  const orderPayload = {
    amount: Math.round(totalAmount * 100),
    currency,
    receipt: makeReceipt(user.id),
    notes: {
      user_id: user.id,
      fine_ids: normalizedFines.map((row) => row.id).join(","),
    },
  };

  function makeReceipt(userId: string | number) {
    const base = `fines_${String(userId)}`;
    const candidate = `${base}_${Date.now().toString(36)}`;
    if (candidate.length <= 40) return candidate;
    const hash = crypto.createHash("sha256").update(`${userId}:${Date.now()}`).digest("hex").slice(0, 12);
    return `fines_${hash}`;
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const resText = await res.text().catch(() => "");
    let data: { id?: string; amount?: number; currency?: string; error?: unknown } | string = {};
    try {
      data = resText ? JSON.parse(resText) : {};
    } catch {
      data = resText;
    }

    if (!res.ok || !(typeof data === "object" && (data as any).id)) {
      console.error("Razorpay order creation failed:", { status: res.status, statusText: res.statusText, body: data });
      return NextResponse.json(
        { error: "Could not create Razorpay order.", detail: { status: res.status, statusText: res.statusText, body: data } },
        { status: 500 }
      );
    }

    await supabaseAdmin
      .from("payments")
      .insert({
        user_id: user.id,
        fine_id: normalizedFines[0]?.id ?? null,
        amount: totalAmount,
        provider: "razorpay",
        razorpay_order_id: data.id,
        status: "created",
        method: "razorpay",
      });

    await logAuditEvent({
      userId: user.id,
      action: "payment_order_created",
      entity: "payment",
      entityId: null,
      metadata: {
        provider: "razorpay",
        orderId: data.id,
        fineIds: normalizedFines.map((row) => row.id),
        fineCount: normalizedFines.length,
        amount: totalAmount,
        currency,
      },
    });

    return NextResponse.json({
      ok: true,
      key: keyId,
      order: {
        id: data.id,
        amount: data.amount ?? orderPayload.amount,
        currency: data.currency ?? currency,
      },
      payableAmount: totalAmount,
      fineCount: normalizedFines.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
