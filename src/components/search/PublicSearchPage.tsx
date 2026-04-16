import { Suspense } from "react";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import PublicSearchClient from "@/components/search/PublicSearchClient";

export default function PublicSearchPage() {
  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <Navbar />
      <main>
        <Suspense fallback={<div className="min-h-[50vh] flex items-center justify-center p-8">Loading search...</div>}>
          <PublicSearchClient />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
