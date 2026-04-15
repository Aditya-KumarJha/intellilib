import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSectionMeta, isValidDashboardSection, getDashboardNav } from "@/lib/dashboardNav";
import { buildMetadata } from "@/lib/seo";

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

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }): Promise<Metadata> {
  const { section } = await params;
  const safeSection = section.trim().toLowerCase();

  if (!isValidDashboardSection("librarian", safeSection)) {
    return buildMetadata({
      title: "Librarian Dashboard",
      description: "Private librarian dashboard section.",
      path: "/dashboard/librarian",
      noIndex: true,
    });
  }

  const meta = getSectionMeta("librarian", safeSection);
  const sectionLabel = meta?.label ?? "Librarian Dashboard";
  const sectionDescription = meta?.description ?? "Private librarian dashboard section.";

  return buildMetadata({
    title: `${sectionLabel} - Librarian Dashboard`,
    description: sectionDescription,
    path: `/dashboard/librarian/${safeSection}`,
    noIndex: true,
  });
}

export default async function LibrarianDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;
  const safeSection = section.trim().toLowerCase();
  if (!isValidDashboardSection("librarian", safeSection)) {
    notFound();
  }

  const meta = getSectionMeta("librarian", safeSection);

  if (!meta) {
    notFound();
  }

  if (safeSection === "members") {
    const Component = (await import("@/components/dashboard/librarian/members/MembersPage")).default;
    return <Component />;
  }

  if (safeSection === "catalog") {
    const Component = (await import("@/components/dashboard/librarian/catalog/CatalogSection")).default;
    return <Component />;
  }

  if (safeSection === "assistant") {
    const Component = (await import("@/components/dashboard/librarian/assistant/LibrarianAssistantSection")).default;
    return <Component />;
  }

  if (safeSection === "circulation") {
    const Component = (await import("@/components/dashboard/librarian/circulation/CirculationPage")).default;
    return <Component />;
  }

  if (safeSection === "audit") {
    const Component = (await import("@/components/dashboard/librarian/audit/AuditLogSection")).default;
    return <Component />;
  }

  if (safeSection === "analytics") {
    const Component = (await import("@/components/dashboard/librarian/analytics/AnalyticsPage")).default;
    return <Component />;
  }

  if (safeSection === "requests") {
    const Component = (await import("@/components/dashboard/librarian/requests/RequestsPage")).default;
    return <Component />;
  }

  notFound();
}
