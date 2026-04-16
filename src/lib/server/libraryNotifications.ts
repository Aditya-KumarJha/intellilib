import amqplib from "amqplib";
import { Resend } from "resend";

import supabaseAdmin from "@/lib/supabaseServerClient";

const MAIL_QUEUE = "library_notifications";

type MailJob = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type NotificationRowInsert = Record<string, unknown>;

export type NotificationType = "due_reminder" | "fine_alert" | "payment_success" | "payment_failed" | "reservation_update";

export async function createInAppNotification(userId: string, message: string) {
  await insertNotificationRows({
    user_id: userId,
    type: "reservation_update",
    message,
    is_read: false,
    target_role: "user",
  });
}

// Helper that attempts to insert notification rows with optional fields like `target_role` and `metadata`.
// If the DB doesn't have those columns yet, it will retry without them to remain backward compatible.
export async function insertNotificationRows(rows: NotificationRowInsert | NotificationRowInsert[]) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const primary = await supabaseAdmin.from("notifications").insert(payload);
  if (!primary.error) return;

  const err = primary.error as { code?: string; message?: string };
  const msg = typeof err?.message === "string" ? err.message : "";
  const missingOptionalColumns =
    err?.code === "42703"
    || (msg.includes("column") && msg.includes("does not exist"))
    // Supabase sometimes reports missing columns via schema cache errors like:
    // "Could not find the 'metadata' column of 'notifications' in the schema cache"
    || msg.includes("Could not find the '")
    || msg.includes("schema cache");

  if (!missingOptionalColumns) {
    throw primary.error;
  }

  // Fallback for older schemas without optional columns.
  const cleaned = payload.map((r) => {
    const copy = { ...r };
    delete copy.target_role;
    delete copy.metadata;
    return copy;
  });

  const fallback = await supabaseAdmin.from("notifications").insert(cleaned);
  if (fallback.error) {
    throw fallback.error;
  }
}

export async function queueMail(job: MailJob) {
  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    await sendMailDirect(job);
    return;
  }

  let connection: amqplib.ChannelModel | null = null;
  try {
    connection = await amqplib.connect(rabbitUrl);
    const channel = await connection.createChannel();
    await channel.assertQueue(MAIL_QUEUE, { durable: true });
    channel.sendToQueue(MAIL_QUEUE, Buffer.from(JSON.stringify(job), "utf8"), {
      persistent: true,
      contentType: "application/json",
    });
    await channel.close();
  } catch {
    await sendMailDirect(job);
  } finally {
    await connection?.close().catch(() => undefined);
  }
}

async function sendMailDirect(job: MailJob) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) return;

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: job.to,
    subject: job.subject,
    html: job.html,
    text: job.text,
  });
}

export async function notifyUserById(
  userId: string,
  payload: {
    inAppMessage: string;
    subject: string;
    html: string;
    text: string;
    type?: NotificationType;
    metadata?: Record<string, unknown> | null;
  },
) {
  await insertNotificationRows({
    user_id: userId,
    type: payload.type ?? "reservation_update",
    message: payload.inAppMessage,
    is_read: false,
    target_role: "user",
    metadata: payload.metadata ?? null,
  });

  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const email = data.user?.email;
  if (!email) return;

  await queueMail({
    to: email,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function notifyPaymentSuccess(
  userId: string,
  amount: number,
  fineCount: number,
  provider: string,
  method?: string,
) {
  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Payment provider";
  const methodLabel = method ? ` via ${method}` : "";
  const inAppMessage = `Payment successful for ${fineCount} fine${fineCount > 1 ? "s" : ""}${methodLabel}.`;
  const subject = `IntelliLib: Payment Successful`;
  const text = `Your ${providerLabel} payment was verified successfully for INR ${amount}.`;
  const html = `<p>Your ${providerLabel} payment was verified successfully for <strong>INR ${amount}</strong>.</p>`;

  await notifyUserById(userId, {
    inAppMessage,
    subject,
    text,
    html,
    type: "payment_success",
    metadata: { provider, method, amount, fineCount },
  });
}

export async function notifyPaymentFailure(
  userId: string,
  amount: number | null,
  reason: string,
  provider: string,
  method?: string,
) {
  const providerLabel = provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : "Payment provider";
  const methodLabel = method ? ` via ${method}` : "";
  const inAppMessage = `Payment failed${methodLabel}. Reason: ${reason}`;
  const subject = `IntelliLib: Payment Failed`;
  const text = amount ? `Your ${providerLabel} payment for INR ${amount} failed. Reason: ${reason}` : `Your ${providerLabel} payment failed. Reason: ${reason}`;
  const html = `<p>Your ${providerLabel} payment ${amount ? `for <strong>INR ${amount}</strong> ` : ""}failed. Reason: ${reason}</p>`;

  await notifyUserById(userId, {
    inAppMessage,
    subject,
    text,
    html,
    type: "payment_failed",
    metadata: { provider, method, amount, reason },
  });
}

export async function hasRecentNotification(
  userId: string,
  type: NotificationType,
  message: string,
  sinceIso: string,
) {
  const { data } = await supabaseAdmin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("message", message)
    .gte("created_at", sinceIso)
    .limit(1)
    .maybeSingle();

  return Boolean(data?.id);
}
