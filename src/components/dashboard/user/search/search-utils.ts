import type { BookRow, SmartSearchBook } from "@/components/dashboard/user/search/types";

export type SearchFormatFilter = "all" | "physical" | "digital";

export function mapBookRow(row: BookRow): SmartSearchBook {
  const copies = row.book_copies ?? [];
  const rawAvailableCopies = copies.filter((copy) => copy.status === "available").length;
  const approvedReservationCount = (row.reservations ?? []).filter((reservation) => reservation.status === "approved").length;
  const availableCopies = Math.max(0, rawAvailableCopies - approvedReservationCount);
  const category = Array.isArray(row.categories)
    ? row.categories[0]?.name ?? null
    : row.categories?.name ?? null;

  return {
    id: row.id,
    title: row.title,
    author: row.author,
    description: row.description,
    type: row.type,
    isbn: row.isbn,
    cover_url: row.cover_url,
    pdf_url: row.pdf_url,
    publisher: row.publisher,
    published_year: row.published_year,
    category,
    copies,
    totalCopies: copies.length,
    availableCopies,
  };
}

export function matchesFormat(bookType: SmartSearchBook["type"], format: SearchFormatFilter): boolean {
  if (format === "all") return true;
  if (bookType === "both") return true;
  return bookType === format;
}

export function filterBooks(
  books: SmartSearchBook[],
  query: string,
  format: SearchFormatFilter
): SmartSearchBook[] {
  const q = query.trim().toLowerCase();

  return books
    .filter((book) => matchesFormat(book.type, format))
    .filter((book) => {
      if (!q) return true;
      return [book.title, book.author, book.category ?? "", book.publisher ?? "", book.isbn ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
    .sort((a, b) => {
      if (a.availableCopies !== b.availableCopies) {
        return b.availableCopies - a.availableCopies;
      }
      return a.title.localeCompare(b.title);
    });
}

export function getSuggestions(books: SmartSearchBook[], query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const bag = new Set<string>();
  for (const book of books) {
    if (book.title.toLowerCase().includes(q)) bag.add(book.title);
    if (book.author.toLowerCase().includes(q)) bag.add(book.author);
    if (book.category && book.category.toLowerCase().includes(q)) bag.add(book.category);
  }

  return Array.from(bag).slice(0, 6);
}
