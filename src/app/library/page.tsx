import { buildMetadata } from "@/lib/seo";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import {
  Calendar,
  Megaphone,
  Clock,
  BookOpen,
  MapPin,
  Users,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import supabaseAdmin from "@/lib/supabaseServerClient";

export const metadata = buildMetadata({
  title: "Library Info & Events",
  description: "Workshops, reading sessions, new collection launches, and holiday timings.",
  path: "/library",
});

export default async function LibraryPage() {
  const { data: latestBooks } = await supabaseAdmin
    .from("books")
    .select("id, title, author, cover_url, created_at, available_copies, total_copies")
    .order("created_at", { ascending: false })
    .limit(4);

  const newCollections = latestBooks || [];

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-100 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <Navbar />
      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
            Library Info & <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-cyan-500">Events</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-3xl mx-auto">
            Stay informed about our public events, announcements, interactive workshops, and reading sessions. Be the first to explore our new collection launches and take note of our holiday timings.
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          
          {/* Main Content Area: Events, Workshops, Announcements */}
          <div className="space-y-10">
            
            {/* Announcements Section */}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <Megaphone className="w-6 h-6 text-purple-500" /> Public Announcements
              </h2>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Annual Membership Drive</h3>
                    <span className="text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 px-2.5 py-1 rounded-full">New</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    IntelliLib is launching its annual membership drive packed with new digital privileges. Upgrade your profile to get faster priority queues for physical reservations and extended e-book access.
                  </p>
                  <div className="flex items-center text-xs text-zinc-500 font-medium">
                    <Calendar className="w-4 h-4 mr-1.5" /> Effective from 1st of next month
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">System Upgrade Notice</h3>
                    <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2.5 py-1 rounded-full">Update</span>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    We are migrating to a real-time tracking architecture. Supabase Realtime synchronization will briefly be paused for scheduled maintenance this Sunday night. Expect minor delays in book availability statuses.
                  </p>
                  <div className="flex items-center text-xs text-zinc-500 font-medium">
                    <Clock className="w-4 h-4 mr-1.5" /> Sunday, 2:00 AM - 4:00 AM AST
                  </div>
                </div>
              </div>
            </section>

            {/* Workshops & Reading Sessions */}
            <section className="mt-10">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <Users className="w-6 h-6 text-cyan-500" /> Workshops & Reading Sessions
              </h2>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-2">Intro to AI Reading Session</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Join us for an introductory reading circle where we decode popular AI literature, from basic neural networks to LLM paradigms guiding platforms like ours.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <div className="flex items-center text-xs text-zinc-500 font-medium">
                      <Calendar className="w-4 h-4 mr-1.5" /> Saturday, June 29th
                    </div>
                    <div className="flex items-center text-xs text-zinc-500 font-medium">
                      <MapPin className="w-4 h-4 mr-1.5" /> Main Library Conference Room
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-2">Modern Web Frameworks Workshop</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    A hands-on workshop led by senior developers covering Next.js, full-stack principles, and state management techniques. Laptop required.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 border-t border-zinc-100 dark:border-zinc-800 pt-3">
                    <div className="flex items-center text-xs text-zinc-500 font-medium">
                      <Calendar className="w-4 h-4 mr-1.5" /> Friday, July 5th &bull; 4:00 PM
                    </div>
                    <div className="flex items-center text-xs text-zinc-500 font-medium">
                      <MapPin className="w-4 h-4 mr-1.5" /> Virtual Session
                    </div>
                  </div>
                </div>
              </div>
            </section>

          </div>

          {/* Sidebar Area: Launches & Holiday Timings */}
          <div className="space-y-10">
            
            {/* Real Data: New Collection Launches */}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <Sparkles className="w-6 h-6 text-rose-500" /> New Collection Launches
              </h2>
              <div className="grid gap-4">
                {newCollections.map((book) => (
                  <div key={`col-${book.id}`} className="flex gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition group">
                    <div className="w-16 h-24 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1">{book.title}</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 mb-2">{book.author}</p>
                      <div className="text-[10px] text-zinc-500 font-medium mb-2">
                        {book.available_copies ?? 0} of {book.total_copies ?? 0} available
                      </div>
                      <Link href={`/search/${book.id}`} className="inline-flex w-max text-[10px] font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300">
                        View Details &rarr;
                      </Link>
                    </div>
                  </div>
                ))}

                {newCollections.length === 0 && (
                  <div className="text-sm text-zinc-500">No new collections out yet. Check back soon.</div>
                )}
              </div>
            </section>

            {/* Holiday Timings */}
            <section>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                 <AlertCircle className="w-6 h-6 text-emerald-500" /> Holiday Timings
              </h2>
              <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                <ul className="space-y-4">
                  <li className="flex justify-between items-center text-sm border-b border-emerald-200 dark:border-emerald-500/20 pb-3">
                    <span className="font-semibold text-zinc-900 dark:text-emerald-100">Independence Day (Aug 15)</span>
                    <span className="text-zinc-600 dark:text-emerald-200/70 font-medium">Closed</span>
                  </li>
                  <li className="flex justify-between items-center text-sm border-b border-emerald-200 dark:border-emerald-500/20 pb-3">
                    <span className="font-semibold text-zinc-900 dark:text-emerald-100">Diwali Week</span>
                    <span className="text-zinc-600 dark:text-emerald-200/70 font-medium text-right">09:00 AM - 01:00 PM<br/>(Half days)</span>
                  </li>
                  <li className="flex justify-between items-center text-sm pt-1">
                    <span className="font-semibold text-zinc-900 dark:text-emerald-100">Christmas & New Year</span>
                    <span className="text-zinc-600 dark:text-emerald-200/70 font-medium">Closed (Dec 25 - Jan 1)</span>
                  </li>
                </ul>
              </div>
            </section>

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
