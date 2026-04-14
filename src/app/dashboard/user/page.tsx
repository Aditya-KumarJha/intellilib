import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Member Dashboard",
  description:
    "Personalized member workspace for reading activity, smart recommendations, and account actions.",
  path: "/dashboard/user",
  noIndex: true,
});

export default async function UserDashboardRoutePage() {
  const UserDashboardPage = (await import("@/pages/UserDashboardPage")).default;
  return <UserDashboardPage />;
}
