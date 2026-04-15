import PanelCard from "@/components/dashboard/admin/PanelCard";
import { getPendingReservations } from "@/lib/server/librarianRequests";
import { getPendingReturnRequests } from "@/lib/server/librarianCirculation";
import RequestsTable from "./RequestsTable";

export default async function RequestsPanel() {
  const [reservations, returnRequests] = await Promise.all([
    getPendingReservations(),
    getPendingReturnRequests(),
  ]);

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard 
        title="Pending Requests" 
        subtitle="Manage and approve member requests."
        className="w-full mx-auto"
      >
        <p className="mb-4 text-sm text-foreground/60">
          Review reservation queue activity and moderate pending return requests.
        </p>
        <RequestsTable
          initialReservations={reservations}
          pendingReturnRequests={returnRequests}
        />
      </PanelCard>
    </div>
  );
}
