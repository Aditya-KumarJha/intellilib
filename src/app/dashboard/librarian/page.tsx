import LibrarianDashboardPage from "@/pages/LibrarianDashboardPage";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Librarian Dashboard",
  description:
    "Librarian operations hub for circulation, inventory health, member activity, and service workflows.",
  path: "/dashboard/librarian",
  noIndex: true,
});

export default function RouteWrapper() {
  return <LibrarianDashboardPage />;
}
