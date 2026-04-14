import PanelCard from "@/components/dashboard/admin/PanelCard";
import { getMembers } from "@/lib/server/members";
import MembersTable from "./MembersTable";
import MembersStatsRow from "./MembersStatsRow";

export default async function MembersPanel() {
  const members = await getMembers();

  const needsServiceKey = process.env.NODE_ENV === "development" && !process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard title="Members" subtitle="Member profiles, roles, and account status.">
        <p className="mb-4 text-sm text-foreground/60">Manage members, change roles, and view account statuses.</p>

        <MembersStatsRow members={members} />

        {needsServiceKey && members.length > 0 && members.every((m) => !m.email) ? (
          <div className="mb-4 rounded-md border border-yellow-600/20 bg-yellow-600/6 p-3 text-sm text-foreground/70">
            Email addresses are not shown because the Supabase service role key is not set in this environment.
            To show emails locally, add your service role key to <span className="font-medium">.env.local</span> as
            <span className="font-medium"> NEXT_SUPABASE_SERVICE_ROLE_KEY</span>, then restart the dev server.
          </div>
        ) : null}

        <MembersTable initialMembers={members} />
      </PanelCard>
    </div>
  );
}
