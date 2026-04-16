import { buildMetadata } from "@/lib/seo";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import { Calendar, Megaphone, TrendingUp, Star, Clock, BookMarked, BookOpen } from "lucide-react";
import Link from "next/link";
import supabaseAdmin from "@/lib/supabaseServerClient";

export const metadata = buildMetadata({
  title: "Discover & Events",
  description: "Discover new arrivals, staff picks, and library events.",
  path: "/discover",
});

export default async function DiscoverPage() {
  const [newBooksRes, popularRes, randomRes] = await Promise.all([
    supabaseAdmin.from('books').select('id, title, author, cover_url, created_at, available_copies, total_copies').order('created_at', { ascending: false }).limit(3),
    supabaseAdmin.from('books').select('id, title, author, cover_url, total_copies, available_copies').order('total_copies', { ascending: false }).limit(3),
    supabaseAdmin.from('books').select('id, title, author, cover_url, available_copies, total_copies').limit(3)
  ]);

  const newBooks = newBooksRes.data || [];
  const mostBorrowedBooks = popularRes.data || [];
  const staffPicks = randomRes.data || [];

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-100 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <Navbar />
      <main className="flex-1 pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-4">
            Discover <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-500 to-cyan-500">IntelliLib</span>
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
            Stay updated with our latest events, announcements, and explore the newest additions to our collection.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Left Column: Events & Announcements */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <Megaphone className="w-6 h-6 text-purple-500" /> Events & Announcements
            </h2>
            
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Summer Reading Workshop</h3>
                  <span className="text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 px-2.5 py-1 rounded-full">Upcoming</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">Join us for an interactive session on effective reading methodologies.</p>
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-500 font-medium">
                  <Calendar className="w-4 h-4 mr-1.5" /> Saturday, 24th June &bull; 10:00 AM
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Sci-Fi Collection Launch</h3>
                  <span className="text-xs font-medium bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 px-2.5 py-1 rounded-full">New</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">We just added 50+ classic and modern sci-fi novels to our digital collection.</p>
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-500 font-medium">
                  <Clock className="w-4 h-4 mr-1.5" /> Available Now
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Holiday Timings</h3>
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 px-2.5 py-1 rounded-full">Notice</span>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">The library will be operating from 10 AM to 2 PM during the upcoming public holidays.</p>
                <div className="flex items-center text-xs text-zinc-500 dark:text-zinc-500 font-medium">
                  <Calendar className="w-4 h-4 mr-1.5" /> Starting next week
                </div>
              </div>
            </div>

            <div className="mt-10">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <BookOpen className="w-6 h-6 text-emerald-500" /> Library Resources
              </h2>
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-2">Digital Archives</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Access thousands of digitized historical documents, newspapers, and academic journals remotely.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-2">Private Study Rooms</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Need to focus? Reserve our quiet study rooms for group discussions or deep work sessions.</p>
                </div>
                <div className="p-5 rounded-2xl bg-linear-to-br from-purple-500/10 to-transparent border border-purple-500/20 shadow-sm">
                  <h3 className="font-semibold text-lg text-zinc-900 dark:text-white mb-2">Can't Find Something?</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">Our librarians are always here to help you navigate the catalog or locate specific research materials.</p>
                  <Link href="/library" className="inline-flex py-2 px-4 rounded-xl text-sm font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition">
                    View Library Info
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: New Arrivals & Trending */}
          <div className="space-y-10">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <Star className="w-6 h-6 text-blue-500" /> New This Week
              </h2>
              <div className="grid gap-4">
                {newBooks.map((book) => (
                  <div key={`new-${book.id}`} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                    <div className="w-20 h-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{book.title}</h4>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{book.author}</p>
                        </div>
                        <span className="shrink-0 inline-block text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 px-2 py-0.5 rounded-sm uppercase tracking-wide">Newly Added</span>
                      </div>
                      
                      <div className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {book.available_copies ?? 0} of {book.total_copies ?? 0} copies available
                      </div>

                      <div className="mt-auto pt-3">
                        <Link href={`/search/${book.id}`} className="inline-flex w-full sm:w-auto justify-center py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <TrendingUp className="w-6 h-6 text-rose-500" /> Most Borrowed
              </h2>
              <div className="grid gap-4">
                {mostBorrowedBooks.map((book) => (
                  <div key={`borrowed-${book.id}`} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                    <div className="w-20 h-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{book.title}</h4>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{book.author}</p>
                        </div>
                        <span className="shrink-0 inline-block text-[10px] font-semibold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 px-2 py-0.5 rounded-sm uppercase tracking-wide">Trending</span>
                      </div>
                      
                      <div className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {book.available_copies ?? 0} of {book.total_copies ?? 0} copies available
                      </div>

                      <div className="mt-auto pt-3">
                        <Link href={`/search/${book.id}`} className="inline-flex w-full sm:w-auto justify-center py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2 text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-3 mb-6">
                <BookMarked className="w-6 h-6 text-emerald-500" /> Staff Picks
              </h2>
              <div className="grid gap-4">
                {staffPicks.map((book) => (
                  <div key={`staff-${book.id}`} className="flex flex-col sm:flex-row gap-4 p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition">
                    <div className="w-20 h-28 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-6 h-6 text-zinc-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-zinc-900 dark:text-white line-clamp-1">{book.title}</h4>
                          <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{book.author}</p>
                        </div>
                        <span className="shrink-0 inline-block text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 px-2 py-0.5 rounded-sm uppercase tracking-wide">Recommended</span>
                      </div>
                      
                      <div className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {book.available_copies ?? 0} of {book.total_copies ?? 0} copies available
                      </div>

                      <div className="mt-auto pt-3">
                        <Link href={`/search/${book.id}`} className="inline-flex w-full sm:w-auto justify-center py-2 px-4 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition">
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
