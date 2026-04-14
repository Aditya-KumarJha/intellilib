import { NextResponse } from "next/server";

import { logAuditEvent } from "@/lib/server/auditLogs";
import supabaseAdmin from "@/lib/supabaseServerClient";
import { getUserFromRequest } from "@/lib/server/apiAuth";
import { insertNotificationRows, notifyUserById } from "@/lib/server/libraryNotifications";

type ProfileRoleRow = {
  role: string | null;
  full_name?: string | null;
  status?: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null) {
    const maybe = err as { message?: unknown; error_description?: unknown; details?: unknown };
    if (typeof maybe.message === "string" && maybe.message) return maybe.message;
    if (typeof maybe.error_description === "string" && maybe.error_description) return maybe.error_description;
    if (typeof maybe.details === "string" && maybe.details) return maybe.details;
    try {
      return JSON.stringify(err);
    } catch {
      return "Unexpected server error";
    }
  }
  return typeof err === "string" ? err : "Unexpected server error";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body ?? {};

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    if (!["active", "suspended"].includes(String(status))) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Authenticate caller
    const caller = await getUserFromRequest(request);
    if (!caller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load caller profile role
    const { data: callerProfile, error: callerErr } = await supabaseAdmin
      .from("profiles")
      .select("role,full_name")
      .eq("id", caller.id)
      .single();

    if (callerErr) {
      return NextResponse.json({ error: "Could not verify caller profile" }, { status: 500 });
    }

    // Load target profile role
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("profiles")
      .select("role,full_name,status")
      .eq("id", id)
      .single();

    if (targetErr) {
      return NextResponse.json({ error: "Could not load target profile" }, { status: 500 });
    }

    // Prevent self-modification
    if (caller.id === id) {
      return NextResponse.json({ error: "Cannot modify your own account" }, { status: 403 });
    }

    // Prevent non-admins from modifying admin or librarian accounts
    const callerProfileRow = (callerProfile as ProfileRoleRow | null) ?? null;
    const targetProfileRow = (targetProfile as ProfileRoleRow | null) ?? null;
    const callerRole = callerProfileRow?.role ?? null;
    const targetRole = targetProfileRow?.role ?? null;
    if (callerRole !== "admin" && (targetRole === "admin" || targetRole === "librarian")) {
      return NextResponse.json({ error: "Insufficient permission to modify this account" }, { status: 403 });
    }

    if (targetProfileRow?.status === status) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message ?? "Could not update member status" }, { status: 500 });
    }

    const actorEmail = caller.email ?? "staff@library";
    const actorName = callerProfileRow?.full_name ?? actorEmail;
    const targetName = targetProfileRow?.full_name ?? id;
    const actionAtIso = new Date().toISOString();
    const actionAtText = new Date(actionAtIso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    if (status === "suspended") {
      await logAuditEvent({
        userId: caller.id,
        action: "member_suspended",
        entity: "profile",
        entityId: null,
        metadata: {
          targetUserId: id,
          targetRole,
          targetName,
          suspendedByName: actorName,
          suspendedByEmail: actorEmail,
          suspendedByRole: callerRole,
          suspendedAt: actionAtIso,
        },
      });

      try {
        await insertNotificationRows([
          {
            user_id: id,
            type: "reservation_update",
            message: `Your account is suspended by ${actorEmail} at ${actionAtText}.`,
            is_read: false,
            target_role: "user",
            metadata: {
              action: "member_suspended",
              targetUserId: id,
              suspendedByUserId: caller.id,
              suspendedByName: actorName,
              suspendedByEmail: actorEmail,
              suspendedAt: actionAtIso,
            },
          },
          {
            user_id: caller.id,
            type: "reservation_update",
            message: `You suspended ${targetName}.`,
            is_read: false,
            target_role: "librarian",
            metadata: {
              action: "member_suspended",
              targetUserId: id,
              targetName,
              suspendedByEmail: actorEmail,
              suspendedAt: actionAtIso,
            },
          },
        ]);

        // Also queue emails for both parties
        try {
          await notifyUserById(id, {
            inAppMessage: `Your account is suspended by ${actorName} (${actorEmail}) on ${actionAtText}. Contact ${actorEmail} to request reactivation.`,
            subject: "Your IntelliLib account has been suspended",
            html: `<p>Your account was suspended by <strong>${actorName}</strong> (${actorEmail}) on ${actionAtText}.</p><p>To request reactivation, please contact <a href=\"mailto:${actorEmail}\">${actorEmail}</a>.</p>`,
            text: `Your account was suspended by ${actorName} (${actorEmail}) on ${actionAtText}. Contact ${actorEmail} to request reactivation.`,
            type: "reservation_update",
            metadata: {
              action: "member_suspended",
              suspendedByUserId: caller.id,
            },
          });

          await notifyUserById(caller.id, {
            inAppMessage: `You suspended ${targetName} (${id}) on ${actionAtText}.`,
            subject: `You suspended ${targetName}`,
            html: `<p>You suspended <strong>${targetName}</strong> (${id}) on ${actionAtText}.</p>`,
            text: `You suspended ${targetName} (${id}) on ${actionAtText}.`,
            type: "reservation_update",
            metadata: {
              action: "member_suspended",
              targetUserId: id,
            },
          });
        } catch (mailErr) {
          console.error("[members.toggle] queued mail for suspension failed:", getErrorMessage(mailErr));
        }
      } catch (notifyError) {
        console.error("[members.toggle] suspension notifications failed:", getErrorMessage(notifyError));
      }
    } else {
      await logAuditEvent({
        userId: caller.id,
        action: "member_reactivated",
        entity: "profile",
        entityId: null,
        metadata: {
          targetUserId: id,
          targetRole,
          targetName,
          reactivatedByName: actorName,
          reactivatedByEmail: actorEmail,
          reactivatedByRole: callerRole,
          reactivatedAt: actionAtIso,
        },
      });

      try {
        await insertNotificationRows([
          {
            user_id: id,
            type: "reservation_update",
            message: `Your account is reactivated by ${actorEmail} at ${actionAtText}.`,
            is_read: false,
            target_role: "user",
            metadata: {
              action: "member_reactivated",
              targetUserId: id,
              reactivatedByUserId: caller.id,
              reactivatedByName: actorName,
              reactivatedByEmail: actorEmail,
              reactivatedAt: actionAtIso,
            },
          },
          {
            user_id: caller.id,
            type: "reservation_update",
            message: `You reactivated ${targetName}.`,
            is_read: false,
            target_role: "librarian",
            metadata: {
              action: "member_reactivated",
              targetUserId: id,
              targetName,
              reactivatedByEmail: actorEmail,
              reactivatedAt: actionAtIso,
            },
          },
        ]);

        // queue confirmation emails for both parties
        try {
          await notifyUserById(id, {
            inAppMessage: `Your account was reactivated by ${actorName} (${actorEmail}) on ${actionAtText}. You can now sign in.`,
            subject: "Your IntelliLib account has been reactivated",
            html: `<p>Your account was reactivated by <strong>${actorName}</strong> (${actorEmail}) on ${actionAtText}. You can now sign in.</p>`,
            text: `Your account was reactivated by ${actorName} (${actorEmail}) on ${actionAtText}. You can now sign in.`,
            type: "reservation_update",
            metadata: { action: "member_reactivated" },
          });

          await notifyUserById(caller.id, {
            inAppMessage: `You reactivated ${targetName} (${id}) on ${actionAtText}.`,
            subject: `You reactivated ${targetName}`,
            html: `<p>You reactivated <strong>${targetName}</strong> (${id}) on ${actionAtText}.</p>`,
            text: `You reactivated ${targetName} (${id}) on ${actionAtText}.`,
            type: "reservation_update",
            metadata: { action: "member_reactivated", targetUserId: id },
          });
        } catch (mailErr) {
          console.error("[members.toggle] queued mail for reactivation failed:", getErrorMessage(mailErr));
        }
      } catch (notifyError) {
        console.error("[members.toggle] reactivation notifications failed:", getErrorMessage(notifyError));
      }
    }

    return NextResponse.json({ data });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
