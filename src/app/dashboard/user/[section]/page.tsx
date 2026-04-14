import type { Metadata } from "next";
import { notFound } from "next/navigation";

import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import { getSectionMeta, isValidDashboardSection } from "@/lib/dashboardNav";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  params: Promise<{ section: string }>;
};

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
    const UserSmartSearchSection = (await import("@/components/dashboard/user/search/UserSmartSearchSection")).default;
    return <UserSmartSearchSection />;
  }

  if (section === "my-books") {
    const UserMyBooksSection = (await import("@/components/dashboard/user/my-books/UserMyBooksSection")).default;
    return <UserMyBooksSection />;
  }

  if (section === "fines") {
    const UserFinesSection = (await import("@/components/dashboard/user/fines/UserFinesSection")).default;
    return <UserFinesSection />;
  }

  if (section === "reservations") {
    const UserReservationsSection = (await import("@/components/dashboard/user/reservations/UserReservationsSection")).default;
    return <UserReservationsSection />;
  }

  if (section === "assistant") {
    const UserAssistantSection = (await import("@/components/dashboard/user/assistant/UserAssistantSection")).default;
    return <UserAssistantSection />;
  }

  if (section === "notifications") {
    const NotificationsSection = (await import("@/components/dashboard/user/notifications/NotificationsSection")).default;
    return <NotificationsSection />;
  }

  if (section === "history") {
    const UserHistorySection = (await import("@/components/dashboard/user/history/UserHistorySection")).default;
    return <UserHistorySection />;
  }

  return (
    <DashboardSectionPlaceholder
      role="user"
      title={meta.label}
      description={meta.description}
    />
  );
}
