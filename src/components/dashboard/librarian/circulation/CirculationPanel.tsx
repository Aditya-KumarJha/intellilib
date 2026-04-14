import PanelCard from "@/components/dashboard/admin/PanelCard";
import {
  getCirculationSummary,
  getDeskSeedData,
  getPendingReturnRequests,
  getRecentCirculationRows,
} from "@/lib/server/librarianCirculation";

import CirculationDesk from "./CirculationDesk";
import CirculationStatsRow from "./CirculationStatsRow";

export default async function CirculationPanel() {
  const [summary, deskSeed, pendingRequests, recentRows] = await Promise.all([
    getCirculationSummary(),
    getDeskSeedData(),
    getPendingReturnRequests(50),
    getRecentCirculationRows(100),
  ]);

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard
        title="Issue and Return"
        subtitle="Desk operations with live availability, queue-safe issuing, and return processing."
        className="w-full mx-auto"
      >
        <p className="mb-4 text-sm text-foreground/60">
          This section is wired to real Supabase data for transactions, return requests, and member/book availability.
        </p>

        <CirculationStatsRow summary={summary} />

        <div className="mt-5">
          <CirculationDesk
            summary={summary}
            members={deskSeed.members}
            books={deskSeed.books}
            pendingRequests={pendingRequests}
            recentRows={recentRows}
          />
        </div>
      </PanelCard>
    </div>
  );
}
