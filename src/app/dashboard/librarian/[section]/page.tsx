import { notFound } from "next/navigation";

import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import { getSectionMeta, isValidDashboardSection } from "@/lib/dashboardNav";

type PageProps = {
  params: Promise<{ section: string }>;
};

export default async function LibrarianDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  if (!isValidDashboardSection("librarian", section)) {
    notFound();
  }

  const meta = getSectionMeta("librarian", section);
  if (!meta) {
    notFound();
  }

  return (
    <DashboardSectionPlaceholder
      role="librarian"
      title={meta.label}
      description={meta.description}
    />
  );
}
