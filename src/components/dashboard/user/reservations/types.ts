export type ReservationStatus = "waiting" | "approved" | "cancelled" | "completed";

export type ReservationRow = {
  id: number;
  book_id: number;
  status: ReservationStatus;
  queue_position: number | null;
  created_at: string;
  books:
    | {
        id: number;
        title: string;
        author: string;
        cover_url: string | null;
        type: "physical" | "digital" | "both";
        available_copies: number | null;
        total_copies: number | null;
      }
    | Array<{
        id: number;
        title: string;
        author: string;
        cover_url: string | null;
        type: "physical" | "digital" | "both";
        available_copies: number | null;
        total_copies: number | null;
      }>
    | null;
};

export type ReservationItem = {
  id: number;
  bookId: number;
  status: ReservationStatus;
  queuePosition: number | null;
  updatedAt: string;
  holdExpiresAt: string | null;
  book: {
    title: string;
    author: string;
    coverUrl: string | null;
    type: "physical" | "digital" | "both";
    availableCopies: number;
    totalCopies: number;
  };
};
