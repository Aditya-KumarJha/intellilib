import AnalyticsPanel from "./AnalyticsPanel";
import LiveActivityPanel from "./LiveActivityPanel";

export default async function AnalyticsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <AnalyticsPanel />
      <LiveActivityPanel />
    </div>
  );
}