import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import { userStats } from "@/components/dashboard/user/data";

export default function UserStatsRow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {userStats.map((item, index) => (
        <DashboardStatCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          icon={item.icon}
          tone={item.tone}
          delay={index * 0.05}
        />
      ))}
    </div>
  );
}
