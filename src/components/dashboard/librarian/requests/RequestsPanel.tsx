import PanelCard from "@/components/dashboard/admin/PanelCard";
import { getPendingReservations } from "@/lib/server/librarianRequests";
import RequestsTable from "./RequestsTable";

export default async function RequestsPanel() {
  const reservations = await getPendingReservations();

  return (
    <div className="mx-auto w-full space-y-6">
      <PanelCard 
        title="Pending Requests" 
        subtitle="Manage and approve member requests."
        className="w-full mx-auto"
      >
        <p className="mb-4 text-sm text-foreground/60">
          Reservations and queue statuses are updated in real-time.
        </p>
        <RequestsTable initialReservations={reservations} />
      </PanelCard>
    </div>
  );
}
