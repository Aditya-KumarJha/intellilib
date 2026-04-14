import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import { getSectionMeta, isValidDashboardSection, getDashboardNav } from "@/lib/dashboardNav";
import NotificationsSection from "@/components/dashboard/librarian/notifications/NotificationsSection";
import AuditLogSection from "@/components/dashboard/librarian/audit/AuditLogSection";
import AnalyticsPage from "@/components/dashboard/librarian/analytics/AnalyticsPage";
import RequestsPage from "@/components/dashboard/librarian/requests/RequestsPage";
import MembersPage from "@/components/dashboard/librarian/members/MembersPage";
import CirculationPage from "@/components/dashboard/librarian/circulation/CirculationPage";

type PageProps = {
  params: Promise<{ section: string }>;
};

export function generateStaticParams() {
  return getDashboardNav("librarian")
    .filter((item) => item.segment !== null)
    .map((item) => ({
      section: item.segment as string,
    }));
}

export default async function LibrarianDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  const safeSection = section.trim().toLowerCase();
  const meta = getSectionMeta("librarian", safeSection);

  if (safeSection === "notifications") {
    return <NotificationsSection />;
  }

  if (safeSection === "members") {
    return <MembersPage />;
  }

  if (safeSection === "circulation") {
    return <CirculationPage />;
  }

  if (safeSection === "audit") {
    return <AuditLogSection />;
  }

  if (safeSection === "analytics") {
    return <AnalyticsPage />;
  }

  if (safeSection === "requests") {
    return <RequestsPage />;
  }

  if (!isValidDashboardSection("librarian", safeSection)) {
    return (
      <DashboardSectionPlaceholder
        role="librarian"
        title="Section"
        description={`This section (${safeSection}) is not available yet.`}
      />
    );
  }

  return (
    <DashboardSectionPlaceholder
      role="librarian"
      title={meta?.label ?? "Section"}
      description={meta?.description ?? `This section (${safeSection}) is not available yet.`}
    />
  );
}
