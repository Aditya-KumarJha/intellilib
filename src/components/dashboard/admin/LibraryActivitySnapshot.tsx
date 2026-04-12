import CompactMetricCard from "@/components/dashboard/admin/CompactMetricCard";
import PanelCard from "@/components/dashboard/admin/PanelCard";
import { activityMetrics } from "@/components/dashboard/admin/data";

export default function LibraryActivitySnapshot() {
  return (
    <PanelCard
      title="Library Activity Snapshot"
      subtitle="What is happening in the last 24 hours"
      delay={0.05}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {activityMetrics.map((item, index) => (
          <CompactMetricCard
            key={item.label}
            label={item.label}
            value={item.value}
            hint={item.hint}
            icon={item.icon}
            tone={item.tone}
            delay={index * 0.04}
          />
        ))}
      </div>
    </PanelCard>
  );
}
