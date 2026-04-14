import PanelCard from "@/components/dashboard/admin/PanelCard";
import supabaseAdmin from "@/lib/supabaseServerClient";
import AuditLogEntry from "./AuditLogEntry";

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
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-black/6 bg-white/60 p-6 text-center text-sm text-foreground/60 dark:border-white/6 dark:bg-white/3">
              No audit events found.
            </div>
          ) : (
            rows.map((a) => <AuditLogEntry key={a.id} a={a} />)
          )}
        </div>
        {error ? <p className="mt-3 text-xs text-red-500">{String(error.message || error)}</p> : null}
      </PanelCard>
    </div>
  );
}
