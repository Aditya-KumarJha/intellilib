import { notFound } from "next/navigation";

import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import { getSectionMeta, isValidDashboardSection, getDashboardNav } from "@/lib/dashboardNav";

type PageProps = {
  params: Promise<{ section: string }>;
};

export function generateStaticParams() {
  return getDashboardNav("admin")
    .filter((item) => item.segment !== null)
    .map((item) => ({
      section: item.segment as string,
    }));
}

export default async function AdminDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  if (!isValidDashboardSection("admin", section)) {
    notFound();
  }

  const meta = getSectionMeta("admin", section);
  if (!meta) {
    notFound();
  }

  return (
    <DashboardSectionPlaceholder
      role="admin"
      title={meta.label}
      description={meta.description}
    />
  );
}
