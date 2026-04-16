"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/common/Navbar";
import Footer from "@/components/common/Footer";
import { BookOpen, Layers, Tag, ArrowLeft, Share2, Copy, Check } from "lucide-react";
import Link from "next/link";
import PublicBookmarkButton from "./PublicBookmarkButton";
import { availabilityLabel } from "./search-utils";

type DetailBook = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  category: string | null;
  type: "physical" | "digital" | "both" | null;
  coverUrl: string | null;
  available_copies: number;
  total_copies: number;
  publisher: string | null;
  published_year: number | null;
  isbn: string | null;
};

type RelatedBook = {
  id: number;
  title: string;
  author: string;
  cover_url: string | null;
  type: string | null;
};

export default function PublicBookDetailPage({ id }: { id: string }) {
  const [book, setBook] = useState<DetailBook | null>(null);
  const [related, setRelated] = useState<RelatedBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchBook() {
      try {
        const res = await fetch(`/api/library/books/${id}`);
        if (!res.ok) throw new Error("Failed to load book");
        const data = await res.json();
        setBook({
          ...data.book,
          coverUrl: data.book.cover_url,
        });
        setRelated(data.relatedBooks || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchBook();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center pt-24 pb-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-zinc-950">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12">
          <h1 className="text-2xl font-bold dark:text-white">Book not found</h1>
          <Link href="/search" className="mt-4 text-violet-500 hover:underline">
            ← Back to search
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-linear-to-b from-slate-100 via-white to-slate-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
      <Navbar />
      <main className="flex-1 pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <Link href="/search" className="inline-flex items-center text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to search results
        </Link>
        
        <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-sm relative">
          <div className="absolute right-6 top-6 flex items-center gap-3">
            <button
              onClick={copyLink}
              className="p-2 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              title="Copy share link"
            >
              {copied ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
            </button>
            <PublicBookmarkButton bookId={book.id} initialBookmarked={false} onChange={() => {}} />
          </div>

          <div className="flex flex-col md:flex-row gap-10">
            {/* Book Cover */}
            <div className="w-full md:w-1/3 lg:w-1/4 shrink-0">
              <div className="aspect-2/3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800 shadow-md flex items-center justify-center">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <BookOpen className="w-16 h-16 text-zinc-400" />
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="flex-1 space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="rounded-full border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                    {book.type === "both" ? "Physical + Digital" : book.type || "Physical"}
                  </span>
                  {book.category && (
                    <span className="rounded-full border border-violet-400/35 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">
                      {book.category}
                    </span>
                  )}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2">
                  {book.title}
                </h1>
                <p className="text-lg text-zinc-600 dark:text-zinc-300 font-medium">by {book.author}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Publisher</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">{book.publisher || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Published Year</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">{book.published_year || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">ISBN</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">{book.isbn || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Availability</p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mt-1">
                     {availabilityLabel(Number(book.available_copies ?? 0), Number(book.total_copies ?? 0))}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-white mb-3">Description</h3>
                <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {book.description ? (
                    <p>{book.description}</p>
                  ) : (
                    <p className="opacity-70 italic">No description available.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Books */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-6">Related Books</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {related.map((rel) => (
                <Link key={rel.id} href={`/search/${rel.id}`} className="group cursor-pointer">
                  <div className="aspect-2/3 overflow-hidden rounded-xl bg-zinc-200 dark:bg-zinc-800 shadow-sm mb-3">
                    {rel.cover_url ? (
                      <img src={rel.cover_url} alt={rel.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex w-full h-full items-center justify-center text-zinc-400">
                        <BookOpen className="w-10 h-10" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-violet-500 transition-colors">{rel.title}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-1">{rel.author}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
