import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import PublicSearchClient from "@/components/search/PublicSearchClient";

export default function PublicSearchPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <Navbar />
      <main>
        <PublicSearchClient />
      </main>
      <Footer />
    </div>
  );
}
