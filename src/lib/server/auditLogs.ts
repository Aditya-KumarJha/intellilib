import supabaseAdmin from "@/lib/supabaseServerClient";

type JsonRecord = Record<string, unknown>;

type AuditLogInput = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: number | null;
  metadata?: JsonRecord;
};

export async function logAuditEvent(input: AuditLogInput) {
  const payload = {
    user_id: input.userId ?? null,
    action: input.action,
    entity: input.entity,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  };

  try {
    await supabaseAdmin.from("audit_logs").insert(payload);
  } catch {
    // best-effort logging: business flow should not fail because audit insert failed
  }
}
