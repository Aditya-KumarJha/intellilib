import { notFound } from "next/navigation";

import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import { getSectionMeta, isValidDashboardSection } from "@/lib/dashboardNav";

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function UserDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  if (!isValidDashboardSection("user", section)) {
    notFound();
  }

  const meta = getSectionMeta("user", section);
  if (!meta) {
    notFound();
  }

  return (
    <DashboardSectionPlaceholder
      role="user"
      title={meta.label}
      description={meta.description}
    />
  );
}
