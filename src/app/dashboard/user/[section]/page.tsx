import { notFound } from "next/navigation";

import DashboardSectionPlaceholder from "@/components/dashboard/DashboardSectionPlaceholder";
import UserMyBooksSection from "@/components/dashboard/user/my-books/UserMyBooksSection";
import UserSmartSearchSection from "@/components/dashboard/user/search/UserSmartSearchSection";
import UserFinesSection from "@/components/dashboard/user/fines/UserFinesSection";
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

  if (section === "search") {
    return <UserSmartSearchSection />;
  }

  if (section === "my-books") {
    return <UserMyBooksSection />;
  }

  if (section === "fines") {
    return <UserFinesSection />;
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
