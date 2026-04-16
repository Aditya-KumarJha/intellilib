import PanelCard from "@/components/dashboard/admin/PanelCard";
import supabaseAdmin from "@/lib/supabaseServerClient";
import AuditLogSectionClient from "./AuditLogSectionClient";

export default async function AuditLogSection() {
  const { data, error } = await supabaseAdmin
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="mx-auto max-w-6xl">
      <PanelCard title="Audit Log" subtitle="Immutable trail of issues, returns, and edits.">
        <AuditLogSectionClient initialRows={rows} />
        {error ? <p className="mt-3 text-xs text-red-500">{String(error.message || error)}</p> : null}
      </PanelCard>
    </div>
  );
}
