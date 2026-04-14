export type BookCopy = {
  id: number;
  type: "physical" | "digital";
  status: "available" | "issued" | "reserved" | "lost" | "maintenance";
  location: string | null;
  access_url: string | null;
};

export type SmartSearchBook = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  type: "physical" | "digital" | "both";
  isbn: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  publisher: string | null;
  published_year: number | null;
  category: string | null;
  copies: BookCopy[];
  totalCopies: number;
  availableCopies: number;
};

export type BookRow = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  type: "physical" | "digital" | "both";
  isbn: string | null;
  cover_url: string | null;
  pdf_url: string | null;
  publisher: string | null;
  published_year: number | null;
  categories: { name: string | null }[] | { name: string | null } | null;
  book_copies: BookCopy[] | null;
  reservations: { status: "waiting" | "approved" | "cancelled" | "completed" }[] | null;
};
