import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getSectionMeta, isValidDashboardSection, getDashboardNav } from "@/lib/dashboardNav";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ section: string }>;
};

export function generateStaticParams() {
  return getDashboardNav("user")
    .filter((item) => item.segment !== null)
    .map((item) => ({
      section: item.segment as string,
    }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { section } = await params;

  if (!isValidDashboardSection("user", section)) {
    return buildMetadata({
      title: "Member Dashboard",
      description: "Private member dashboard section.",
      path: "/dashboard/user",
      noIndex: true,
    });
  }

  const meta = getSectionMeta("user", section);
  const sectionLabel = meta?.label ?? "Member Dashboard";
  const sectionDescription = meta?.description ?? "Private member dashboard section.";

  return buildMetadata({
    title: `${sectionLabel} - Member Dashboard`,
    description: sectionDescription,
    path: `/dashboard/user/${section}`,
    noIndex: true,
  });
}

export default async function UserDashboardSectionPage({ params }: PageProps) {
  const { section } = await params;

  if (!isValidDashboardSection("user", section)) {
    notFound();
  }

  const meta = getSectionMeta("user", section);

  if (!meta) {
    notFound();
  }

  if (section === "search") {
    const Component = (await import("@/components/dashboard/user/search/UserSmartSearchSection")).default;
    return <Component />;
  }

  if (section === "my-books") {
    const Component = (await import("@/components/dashboard/user/my-books/UserMyBooksSection")).default;
    return <Component />;
  }

  if (section === "fines") {
    const Component = (await import("@/components/dashboard/user/fines/UserFinesSection")).default;
    return <Component />;
  }

  if (section === "reservations") {
    const Component = (await import("@/components/dashboard/user/reservations/UserReservationsSection")).default;
    return <Component />;
  }

  if (section === "assistant") {
    const Component = (await import("@/components/dashboard/user/assistant/UserAssistantSection")).default;
    return <Component />;
  }

  if (section === "notifications") {
    const Component = (await import("@/components/dashboard/user/notifications/NotificationsSection")).default;
    return <Component />;
  }

  if (section === "history") {
    const Component = (await import("@/components/dashboard/user/history/UserHistorySection")).default;
    return <Component />;
  }

  notFound();
}
