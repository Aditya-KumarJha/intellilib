import DashboardStatCard from "@/components/dashboard/DashboardStatCard";
import type { Member } from "@/lib/server/members";
import * as Icons from "lucide-react";

type Props = {
  members: Member[];
};

function monthStartIso() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start.toISOString();
}

export default function MembersStatsRow({ members }: Props) {
  const monthStart = monthStartIso();

  const summary = members.reduce(
    (acc, member) => {
      acc.total += 1;
      if ((member.status ?? "active") === "active") acc.active += 1;
      if ((member.status ?? "") === "suspended") acc.suspended += 1;
      if (member.role === "librarian" || member.role === "admin") acc.staff += 1;
      if (member.joinedAt && member.joinedAt >= monthStart) acc.newThisMonth += 1;
      return acc;
    },
    { total: 0, active: 0, suspended: 0, staff: 0, newThisMonth: 0 },
  );

  const cards = [
    {
      label: "Total Members",
      value: String(summary.total),
      hint: `${summary.staff} staff accounts`,
      icon: "Users" as keyof typeof Icons,
      tone: "violet" as const,
    },
    {
      label: "Active Accounts",
      value: String(summary.active),
      hint: "Can issue and reserve",
      icon: "UserCheck" as keyof typeof Icons,
      tone: "emerald" as const,
    },
    {
      label: "Suspended",
      value: String(summary.suspended),
      hint: "Restricted activity",
      icon: "ShieldAlert" as keyof typeof Icons,
      tone: "rose" as const,
    },
    {
      label: "New This Month",
      value: String(summary.newThisMonth),
      hint: "Fresh registrations",
      icon: "UserPlus" as keyof typeof Icons,
      tone: "cyan" as const,
    },
  ];

  return (
    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card, index) => (
        <DashboardStatCard
          key={card.label}
          label={card.label}
          value={card.value}
          hint={card.hint}
          icon={card.icon}
          tone={card.tone}
          delay={index * 0.03}
        />
      ))}
    </div>
  );
}
