import { buildMetadata } from "@/lib/seo";
import PublicBookDetailPage from "@/components/search/PublicBookDetailPage";

export const metadata = buildMetadata({
  title: "Book Details",
  description: "View full book details, availability, and related books.",
  path: "/search",
});

export default async function BookPageRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <PublicBookDetailPage id={resolvedParams.id} />;
}
