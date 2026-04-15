export type PublicBook = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  category: string | null;
  type: "physical" | "digital" | "both" | null;
  coverUrl: string | null;
  availableCopies: number;
  totalCopies: number;
};

export type PublicBookApiRow = {
  id: number;
  title: string;
  author: string;
  description: string | null;
  category?: string | null;
  type?: "physical" | "digital" | "both" | null;
  cover_url?: string | null;
  available_copies?: number | null;
  total_copies?: number | null;
};

export type PublicSearchSort = "relevance" | "title-asc" | "title-desc" | "availability";
