import { buildMetadata } from "@/lib/seo";
import PublicSearchPage from "@/components/search/PublicSearchPage";

export const metadata = buildMetadata({
  title: "Search Books",
  description:
    "Browse IntelliLib's catalog as a guest. Search by title, author, or category and bookmark books when logged in.",
  path: "/search",
  keywords: ["public book search", "library catalog", "bookmarks", "guest search"],
});

export default function SearchPageRoute() {
  return <PublicSearchPage />;
}
