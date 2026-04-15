import type { PublicBook, PublicBookApiRow, PublicSearchSort } from "@/components/public/search/types";

export function mapPublicBook(row: PublicBookApiRow): PublicBook {
  return {
    id: Number(row.id),
    title: row.title ?? "Untitled",
    author: row.author ?? "Unknown",
    description: row.description ?? null,
    category: row.category ?? null,
    type: row.type ?? "physical",
    coverUrl: row.cover_url ?? null,
    availableCopies: Number(row.available_copies ?? 0),
    totalCopies: Number(row.total_copies ?? 0),
  };
}

export function sortPublicBooks(books: PublicBook[], sortBy: PublicSearchSort): PublicBook[] {
  const list = [...books];

  list.sort((a, b) => {
    if (sortBy === "title-asc") {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === "title-desc") {
      return b.title.localeCompare(a.title);
    }

    if (sortBy === "availability") {
      const availabilityDiff = b.availableCopies - a.availableCopies;
      if (availabilityDiff !== 0) {
        return availabilityDiff;
      }
      return a.title.localeCompare(b.title);
    }

    return a.title.localeCompare(b.title);
  });

  return list;
}

export function getSuggestionOptions(books: PublicBook[], query: string): string[] {
  const normalized = query.trim().toLowerCase();
  const values = new Set<string>();

  for (const book of books) {
    values.add(book.title);
    values.add(book.author);
    if (book.category) {
      values.add(book.category);
    }
  }

  return [...values]
    .filter((value) => value.trim().length > 0)
    .filter((value) => {
      if (!normalized) {
        return true;
      }
      return value.toLowerCase().includes(normalized);
    })
    .slice(0, 8);
}

export function availabilityLabel(availableCopies: number, totalCopies: number): string {
  if (totalCopies <= 0) {
    return "No copies listed";
  }

  if (availableCopies <= 0) {
    return "Currently unavailable";
  }

  return `${availableCopies} of ${totalCopies} available`;
}
