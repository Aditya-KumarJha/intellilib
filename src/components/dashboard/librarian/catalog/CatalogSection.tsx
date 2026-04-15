"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import { Search, X, Plus, Sparkles, Upload } from "lucide-react";

import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-toastify";
import LibrarianBookCard from "./LibrarianBookCard";
import Dropdown from "@/components/dashboard/user/search/Dropdown";
import type { SmartSearchBook } from "@/components/dashboard/user/search/types";

type FormatFilter = "all" | "physical" | "digital" | "both";
type SortBy = "title-asc" | "title-desc" | "latest" | "availability-desc";

type CatalogBook = SmartSearchBook & {
  category_id: number | null;
};

type CatalogPayload = {
  id?: number | string;
  title: string;
  author: string;
  type: "physical" | "digital" | "both";
  copies: number;
  isbn: string;
  publisher: string;
  description: string;
  category_id?: number;
  category_name?: string;
  published_year: number;
  coverBase64?: string;
  coverName?: string;
  pdfBase64?: string;
  pdfName?: string;
  cover_url?: string;
  pdf_url?: string;
};

const formatOptions: Array<{ value: FormatFilter; label: string }> = [
  { value: "all", label: "All formats" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "both", label: "Hybrid" },
];

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "title-asc", label: "Title A-Z" },
  { value: "title-desc", label: "Title Z-A" },
  { value: "latest", label: "Latest Added" },
  { value: "availability-desc", label: "Most Available" },
];

export default function CatalogSection() {
  const [query, setQuery] = useState("");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("title-asc");
  const [books, setBooks] = useState<CatalogBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const PAGE_SIZE = 20;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [showTop, setShowTop] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);

  const loadBooks = useCallback(
    async (page = 0, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let builder = supabase
          .from("books")
          .select("id,title,author,type,cover_url,pdf_url,total_copies,available_copies,isbn,publisher,published_year,description,category_id,categories(name)")
          .range(from, to);

        if (sortBy === "title-asc") {
          builder = builder.order("title", { ascending: true });
        } else if (sortBy === "title-desc") {
          builder = builder.order("title", { ascending: false });
        } else if (sortBy === "latest") {
          builder = builder.order("id", { ascending: false });
        } else {
          builder = builder.order("available_copies", { ascending: false });
        }

        if (format !== "all") {
          builder = builder.eq("type", format);
        }

        const q = query.trim();
        if (q.length >= 2) {
          const like = `%${q}%`;
          builder = builder.or(`title.ilike.${like},author.ilike.${like},isbn.ilike.${like}`);
        }

        const { data, error } = await builder;
        if (error) throw new Error(error.message || "Could not fetch books");

        const mapped = (data ?? []).map((r) => {
          const categoryName = Array.isArray(r.categories)
            ? (r.categories[0] as { name?: string | null } | undefined)?.name ?? null
            : (r.categories as { name?: string | null } | null)?.name ?? null;

          return ({
          id: r.id,
          title: r.title,
          author: r.author,
          type: r.type,
          cover_url: r.cover_url,
          pdf_url: r.pdf_url,
          isbn: r.isbn,
          publisher: r.publisher,
          published_year: r.published_year,
          description: r.description,
          category_id: r.category_id,
          category: categoryName,
          copies: [],
          totalCopies: Number(r.total_copies ?? 0),
          availableCopies: Number(r.available_copies ?? 0),
          });
        });

        setBooks((prev) => (append ? [...prev, ...mapped] : mapped));
        setHasMore((data?.length ?? 0) === PAGE_SIZE);
      } catch (err: unknown) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [query, format, sortBy]
  );

  useEffect(() => {
    pageRef.current = 0;
    void loadBooks(0, false);

    const onScroll = () => setShowTop(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [loadBooks]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("name", { ascending: true });
      if (error) {
        toast.error(error.message || "Could not load categories");
        return;
      }
      setCategories((data ?? []) as Array<{ id: number; name: string }>);
    })();
  }, []);

  const [showModal, setShowModal] = useState(false);
  const [editingBook, setEditingBook] = useState<CatalogBook | null>(null);

  function refresh() {
    pageRef.current = 0;
    void loadBooks(0, false);
  }

  async function handleSave(payload: CatalogPayload) {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const effectiveId = payload.id ?? editingBook?.id;
      const isEdit = effectiveId !== undefined && effectiveId !== null && String(effectiveId).trim().length > 0;
      const endpoint = isEdit ? `/api/librarian/catalog/${encodeURIComponent(String(effectiveId))}` : "/api/librarian/catalog";

      const res = await fetch(endpoint, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? (isEdit ? "Update failed" : "Create failed"));
      toast.success(isEdit ? "Book updated" : "Book created");
      setShowModal(false);
      setEditingBook(null);
      refresh();
    } catch (err: unknown) {
      toast.error(String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <div className="mx-auto space-y-6">
      <section className="max-w-6xl rounded-3xl border border-black/10 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">
              <Sparkles className="h-3.5 w-3.5" />
              Librarian Workspace
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Catalog</h2>
            <p className="mt-1 text-sm text-foreground/65">Manage books, adjust quantities, and fulfill reservation queues.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setEditingBook(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-r from-fuchsia-600 to-violet-600 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-800/30 transition hover:scale-[1.02]"
            >
              <Plus className="h-4 w-4" /> Add New Book
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row items-center">
          <label className="relative block lg:flex-[0.8]">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Search className="h-4 w-4 text-foreground/45" />
            </span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author or ISBN"
              className="h-12 w-full rounded-2xl border border-black/10 bg-white/90 pl-11 pr-11 text-sm text-foreground outline-none transition placeholder:text-foreground/40 focus:border-purple-500/40 focus:ring-2 focus:ring-purple-500/20 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-white dark:placeholder:text-zinc-400"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-3 my-auto h-8 rounded-full p-1 text-foreground/60 transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <div className="ml-auto flex gap-3 w-full lg:w-auto">
            <div className="w-full lg:w-52">
              <Dropdown
                title="Format"
                id="catalog-format"
                name="catalog-format"
                value={format}
                onChange={(e) => setFormat(e.target.value as FormatFilter)}
                options={formatOptions.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>

            <div className="w-full lg:w-52">
              <Dropdown
                title="Sort"
                id="catalog-sort"
                name="catalog-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                options={sortOptions.map((option) => ({ value: option.value, label: option.label }))}
              />
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl border border-black/10 bg-white/60" />
          ))}
        </div>
      ) : (
        <InfiniteScroll dataLength={books.length} next={() => {
          const nextPage = pageRef.current + 1; pageRef.current = nextPage; setLoadingMore(true); void loadBooks(nextPage, true);
        }} hasMore={hasMore} loader={loadingMore ? <div>Loading...</div> : null}>
          <div className="grid gap-4 lg:grid-cols-2">
            {books.map((b) => (
              <LibrarianBookCard
                key={b.id}
                book={b}
                onUpdated={refresh}
                onEdit={() => {
                  setEditingBook(b);
                  setShowModal(true);
                }}
              />
            ))}
          </div>
        </InfiniteScroll>
      )}

      {showTop ? (
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top" className="fixed right-6 bottom-6 z-50 rounded-full bg-purple-600/95 p-3 text-white shadow-lg transition hover:scale-105">↑</button>
      ) : null}

      {showModal && (
        <AddBookModal
          key={editingBook?.id ?? "new-book"}
          onClose={() => {
            setShowModal(false);
            setEditingBook(null);
          }}
          onCreate={handleSave}
          initialBook={editingBook}
          categories={categories}
        />
      )}
    </div>
  );
}

function AddBookModal({
  onClose,
  onCreate,
  initialBook,
  categories,
}: {
  onClose: () => void;
  onCreate: (payload: CatalogPayload) => Promise<void>;
  initialBook?: CatalogBook | null;
  categories: Array<{ id: number; name: string }>;
}) {
  const [title, setTitle] = useState(() => String(initialBook?.title ?? ""));
  const [author, setAuthor] = useState(() => String(initialBook?.author ?? ""));
  const [type, setType] = useState<"physical" | "digital" | "both">(() => (initialBook?.type ?? "physical"));
  const [copies, setCopies] = useState(() => Number(initialBook?.totalCopies ?? 1));
  const [isbn, setIsbn] = useState(() => String(initialBook?.isbn ?? ""));
  const [publisher, setPublisher] = useState(() => String(initialBook?.publisher ?? ""));
  const [publishedYear, setPublishedYear] = useState<number | "">(() => (initialBook?.published_year ? Number(initialBook.published_year) : ""));
  const [description, setDescription] = useState(() => String(initialBook?.description ?? ""));
  const [categoryInput, setCategoryInput] = useState(() => {
    if (initialBook?.category && String(initialBook.category).trim()) return String(initialBook.category);
    if (initialBook?.category_id) {
      const found = categories.find((c) => c.id === Number(initialBook.category_id));
      return found?.name ?? "";
    }
    return "";
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const needsPhysicalCopies = type === "physical" || type === "both";
  useEffect(() => {
    if (needsPhysicalCopies && (typeof copies !== "number" || copies < 1)) {
      setCopies(1);
    }
  }, [needsPhysicalCopies]);
  const needsDigitalPdf = type === "digital" || type === "both";
  const isEdit = Boolean(initialBook?.id);

  async function toBase64(file: File) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",").pop() ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !author.trim() || !isbn.trim() || !publisher.trim() || !description.trim() || publishedYear === "" || !categoryInput.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    const existingCoverUrl = String(initialBook?.cover_url ?? "");
    const existingPdfUrl = String(initialBook?.pdf_url ?? "");

    if (!coverFile && !existingCoverUrl) {
      toast.error("Cover image is required.");
      return;
    }

    if (needsDigitalPdf && !pdfFile && !existingPdfUrl) {
      toast.error("PDF file is required for digital or hybrid books.");
      return;
    }

    setSubmitting(true);

    const normalizedCategory = categoryInput.trim();
    const matchedCategory = categories.find((category) => category.name.toLowerCase() === normalizedCategory.toLowerCase());

    const payload: CatalogPayload = {
      id: initialBook?.id,
      title,
      author,
      type,
      copies: needsPhysicalCopies ? Math.max(1, copies) : 0,
      isbn: isbn.trim(),
      publisher: publisher.trim(),
      description: description.trim(),
      category_id: matchedCategory?.id,
      category_name: normalizedCategory,
      published_year: Number(publishedYear),
      cover_url: existingCoverUrl || undefined,
      pdf_url: existingPdfUrl || undefined,
    };
    if (coverFile) {
      payload.coverBase64 = await toBase64(coverFile);
      payload.coverName = coverFile.name;
    }
    if (pdfFile) {
      payload.pdfBase64 = await toBase64(pdfFile);
      payload.pdfName = pdfFile.name;
    }
    try {
      await onCreate(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="mx-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-5 text-zinc-900 shadow-2xl shadow-black/20 dark:border-white/10 dark:bg-linear-to-br dark:from-zinc-900/95 dark:via-black/95 dark:to-zinc-900/95 dark:text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">{isEdit ? "Edit Book" : "Add New Book"}</h3>
            <p className="text-sm text-zinc-500 dark:text-white/60">{isEdit ? "Update metadata and replace files if needed." : "Upload assets, set metadata, and publish to catalog."}</p>
          </div>
          <button onClick={onClose} className="text-sm text-zinc-500 transition hover:text-zinc-800 dark:text-white/70 dark:hover:text-white">Close</button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Title <span className="text-rose-500">*</span></label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Author <span className="text-rose-500">*</span></label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              />
            </div>
          </div>

          <div className={`grid gap-3 ${needsPhysicalCopies ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Type <span className="text-rose-500">*</span></label>
              <select value={type} onChange={(e) => setType(e.target.value as "physical" | "digital" | "both")} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100">
                <option value="physical">Physical</option>
                <option value="digital">Digital</option>
                <option value="both">Both</option>
              </select>
            </div>

            {needsPhysicalCopies ? (
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Copies <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  value={copies}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isNaN(v)) setCopies(1);
                    else setCopies(Math.max(1, v));
                  }}
                  className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100"
                />
              </div>
            ) : null}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">ISBN <span className="text-rose-500">*</span></label>
              <input value={isbn} onChange={(e) => setIsbn(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Category <span className="text-rose-500">*</span></label>
            <input
              list="catalog-categories"
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Select or type a custom category"
              className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100"
            />
            <datalist id="catalog-categories">
              {categories.map((category) => (
                <option key={category.id} value={category.name} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-zinc-500 dark:text-white/55">You can type a custom category if none matches.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Publisher <span className="text-rose-500">*</span></label>
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Published Year <span className="text-rose-500">*</span></label>
              <input
                type="number"
                value={publishedYear}
                onChange={(e) => setPublishedYear(e.target.value ? Number(e.target.value) : "")}
                className="mt-1 h-10 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Description <span className="text-rose-500">*</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-zinc-900 outline-none transition focus:border-violet-400/60 focus:ring-2 focus:ring-violet-500/20 dark:border-zinc-700 dark:bg-zinc-800/75 dark:text-zinc-100" />
          </div>

          <div className={`grid gap-3 ${needsDigitalPdf ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
              <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">Cover <span className="text-rose-500">*</span></label>
              <p className="mt-1 text-xs text-zinc-500 dark:text-white/50">Required for physical and hybrid books.</p>
              <label className="mt-3 flex h-32 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-white/20 bg-transparent">
                <div className="flex w-full h-full items-center justify-center gap-3 text-base font-medium text-zinc-700 dark:text-white/90">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Upload className="h-5 w-5" />
                    <span className="text-center">{coverFile ? "Change cover" : "Upload cover"}</span>
                  </div>
                </div>
                <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
              <p className="mt-2 truncate text-xs text-zinc-500 dark:text-white/55">{coverFile?.name ?? "No file selected"}</p>
              {!coverFile && initialBook?.cover_url ? <p className="mt-1 truncate text-xs text-zinc-500 dark:text-white/55">Existing cover saved</p> : null}
            </div>

            {needsDigitalPdf ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-4 dark:border-zinc-700 dark:bg-zinc-900/60">
                <label className="block text-sm font-medium text-zinc-700 dark:text-white/90">PDF <span className="text-rose-500">*</span></label>
                <p className="mt-1 text-xs text-zinc-500 dark:text-white/50">Required for digital and hybrid books.</p>
                <label className="mt-3 flex h-32 w-full cursor-pointer rounded-xl border border-zinc-300 dark:border-white/20 bg-transparent">
                  <div className="flex w-full h-full items-center justify-center gap-3 text-base font-medium text-zinc-700 dark:text-white/90">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="h-5 w-5" />
                      <span className="text-center">{pdfFile ? "Change PDF" : "Upload PDF"}</span>
                    </div>
                  </div>
                  <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} className="hidden" />
                </label>
                <p className="mt-2 truncate text-xs text-zinc-500 dark:text-white/55">{pdfFile?.name ?? "No file selected"}</p>
                {!pdfFile && initialBook?.pdf_url ? <p className="mt-1 truncate text-xs text-zinc-500 dark:text-white/55">Existing PDF saved</p> : null}
              </div>
            ) : null}
          </div>

          {/* Legend for required fields */}
          <p className="text-xs text-rose-500">* means required</p>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-300 px-4 py-2 text-zinc-700 transition hover:bg-zinc-100 dark:border-white/20 dark:text-white/85 dark:hover:bg-white/10">Cancel</button>
            <button type="submit" disabled={submitting} className="rounded-xl bg-linear-to-r from-fuchsia-600 to-violet-600 px-4 py-2 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? (isEdit ? "Saving..." : "Creating...") : isEdit ? "Save Changes" : "Create Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
